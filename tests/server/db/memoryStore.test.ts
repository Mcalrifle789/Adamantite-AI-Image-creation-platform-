import { describe, expect, it } from 'vitest';

import { MemoryStore } from '../../../lib/server/db/memoryStore';

interface Row {
  id: string;
  value: number;
}

describe('MemoryStore', () => {
  it('read returns an empty array for a table that has never been written', async () => {
    const store = new MemoryStore();
    await expect(store.read<Row>('users')).resolves.toEqual([]);
  });

  it('round-trips rows written through mutate', async () => {
    const store = new MemoryStore();
    await store.mutate<Row>('users', (rows) => [...rows, { id: 'a', value: 1 }]);
    await expect(store.read<Row>('users')).resolves.toEqual([{ id: 'a', value: 1 }]);
  });

  it('read never leaks a mutable reference to internal state', async () => {
    const store = new MemoryStore();
    await store.mutate<Row>('users', (rows) => [...rows, { id: 'a', value: 1 }]);
    const first = await store.read<Row>('users');
    first.push({ id: 'intruder', value: 999 });
    const second = await store.read<Row>('users');
    expect(second).toEqual([{ id: 'a', value: 1 }]);
  });

  it('keeps tables independent of each other', async () => {
    const store = new MemoryStore();
    await store.mutate<Row>('users', (rows) => [...rows, { id: 'u1', value: 1 }]);
    await store.mutate<Row>('projects', (rows) => [...rows, { id: 'p1', value: 2 }]);
    await expect(store.read<Row>('users')).resolves.toEqual([{ id: 'u1', value: 1 }]);
    await expect(store.read<Row>('projects')).resolves.toEqual([{ id: 'p1', value: 2 }]);
  });

  it('serializes concurrent mutations so interleaved writes produce a consistent final state', async () => {
    const store = new MemoryStore();
    const order: number[] = [];

    // Fire ten mutations "simultaneously" (no await between them) — each appends its own index
    // and records the length it observed. If mutations interleaved, two mutations could observe
    // the same pre-mutation length (a torn read) and the final array would be shorter than 10 or
    // contain duplicate observed-length values.
    const mutations = Array.from({ length: 10 }, (_, i) =>
      store.mutate<Row>('generations', (rows) => {
        order.push(rows.length);
        return [...rows, { id: `row-${i}`, value: rows.length }];
      }),
    );

    await Promise.all(mutations);

    const final = await store.read<Row>('generations');
    expect(final).toHaveLength(10);
    // Every mutation observed a strictly increasing, gap-free length — proof no two mutations
    // ran against the same snapshot.
    expect(order.slice().sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(final.map((r) => r.value)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });

  it('a rejected mutation does not corrupt the table and does not wedge the queue', async () => {
    const store = new MemoryStore();
    await store.mutate<Row>('users', (rows) => [...rows, { id: 'a', value: 1 }]);

    await expect(
      store.mutate<Row>('users', () => {
        throw new Error('boom');
      }),
    ).rejects.toThrow('boom');

    // Unaffected by the failed mutation:
    await expect(store.read<Row>('users')).resolves.toEqual([{ id: 'a', value: 1 }]);

    // The queue keeps working afterwards:
    await store.mutate<Row>('users', (rows) => [...rows, { id: 'b', value: 2 }]);
    await expect(store.read<Row>('users')).resolves.toEqual([
      { id: 'a', value: 1 },
      { id: 'b', value: 2 },
    ]);
  });
});
