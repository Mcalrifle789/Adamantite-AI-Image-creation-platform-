import './testEnvSetup';

import { promises as fs } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { DEFAULT_DATA_DIR, JsonStore, resolveDataDir } from '../../../lib/server/db/jsonStore';

interface Row {
  id: string;
  value: number;
}

let dataDir: string;

beforeEach(async () => {
  dataDir = await fs.mkdtemp(path.join(tmpdir(), 'adamantite-jsonstore-'));
});

afterEach(async () => {
  await fs.rm(dataDir, { recursive: true, force: true });
});

describe('JsonStore', () => {
  it('defaults local JSON persistence to the Adamantite database directory', () => {
    expect(DEFAULT_DATA_DIR).toBe('E:\\Adamantite\\Database');
    expect(resolveDataDir()).toBe(path.resolve('E:\\Adamantite\\Database'));
  });

  it('read returns an empty array when the table file does not exist yet', async () => {
    const store = new JsonStore(dataDir);
    await expect(store.read<Row>('users')).resolves.toEqual([]);
  });

  it('atomic write + read-back round trip: a fresh JsonStore reading the same directory sees it', async () => {
    const writer = new JsonStore(dataDir);
    await writer.mutate<Row>('users', (rows) => [...rows, { id: 'a', value: 1 }]);

    const onDiskPath = path.join(dataDir, 'users.json');
    const raw = JSON.parse(await fs.readFile(onDiskPath, 'utf8'));
    expect(raw).toEqual({ version: 1, rows: [{ id: 'a', value: 1 }] });

    // No leftover .tmp file after a successful write (atomic rename completed).
    await expect(fs.access(`${onDiskPath}.tmp`)).rejects.toThrow();

    // A second store instance created from cold (no cache warm) reads the persisted bytes back.
    const reader = new JsonStore(dataDir);
    // Force this instance's own read path — it may share the process-wide cache keyed by
    // `dataDir` (data-model.md §1's "pinned to globalThis"), which is itself the point: it must
    // still observe the true on-disk state, since both instances share one resolved directory.
    await expect(reader.read<Row>('users')).resolves.toEqual([{ id: 'a', value: 1 }]);
  });

  it('mutate persists the exact rows fn returns, and read reflects them without re-reading disk', async () => {
    const store = new JsonStore(dataDir);
    await store.mutate<Row>('projects', (rows) => [...rows, { id: 'p1', value: 10 }]);
    await store.mutate<Row>('projects', (rows) =>
      rows.map((row) => (row.id === 'p1' ? { ...row, value: 20 } : row)),
    );

    await expect(store.read<Row>('projects')).resolves.toEqual([{ id: 'p1', value: 20 }]);

    const onDisk = JSON.parse(await fs.readFile(path.join(dataDir, 'projects.json'), 'utf8'));
    expect(onDisk.rows).toEqual([{ id: 'p1', value: 20 }]);
  });

  it('writes an advisory .lock file into the data directory on first mutate', async () => {
    const store = new JsonStore(dataDir);
    await store.mutate<Row>('users', (rows) => [...rows, { id: 'a', value: 1 }]);
    await expect(fs.access(path.join(dataDir, '.lock'))).resolves.toBeUndefined();
  });

  it('serializes concurrent mutations so interleaved writes produce a consistent final state', async () => {
    const store = new JsonStore(dataDir);
    const observedLengths: number[] = [];

    const mutations = Array.from({ length: 8 }, (_, i) =>
      store.mutate<Row>('generations', (rows) => {
        observedLengths.push(rows.length);
        return [...rows, { id: `gen-${i}`, value: rows.length }];
      }),
    );

    await Promise.all(mutations);

    const final = await store.read<Row>('generations');
    expect(final).toHaveLength(8);
    expect(observedLengths.slice().sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);

    // What is on disk matches what the store reports in memory — no torn write.
    const onDisk = JSON.parse(await fs.readFile(path.join(dataDir, 'generations.json'), 'utf8'));
    expect(onDisk.rows).toHaveLength(8);
  });

  it('a rejected mutation writes nothing and does not wedge the queue', async () => {
    const store = new JsonStore(dataDir);
    await store.mutate<Row>('users', (rows) => [...rows, { id: 'a', value: 1 }]);

    await expect(
      store.mutate<Row>('users', () => {
        throw new Error('boom');
      }),
    ).rejects.toThrow('boom');

    await expect(store.read<Row>('users')).resolves.toEqual([{ id: 'a', value: 1 }]);

    await store.mutate<Row>('users', (rows) => [...rows, { id: 'b', value: 2 }]);
    await expect(store.read<Row>('users')).resolves.toEqual([
      { id: 'a', value: 1 },
      { id: 'b', value: 2 },
    ]);
  });

  it('throws on a corrupt (non-JSON) table file rather than silently discarding it', async () => {
    await fs.mkdir(dataDir, { recursive: true });
    await fs.writeFile(path.join(dataDir, 'users.json'), '{ not valid json', 'utf8');

    const store = new JsonStore(dataDir);
    await expect(store.read<Row>('users')).rejects.toThrow(/Corrupt table file/);
  });
});
