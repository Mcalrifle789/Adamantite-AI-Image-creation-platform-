import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  DEFAULT_ACCOUNT_DATA_DIR,
  createJsonAccountStore,
} from '@/lib/server/auth/stores/jsonAccountStore';
import { AccountNotFoundError, EmailTakenError } from '@/lib/server/auth/types';

let dataDir: string;

beforeEach(async () => {
  dataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ada-accounts-'));
});

afterEach(async () => {
  await fs.rm(dataDir, { recursive: true, force: true });
});

function store() {
  return createJsonAccountStore(dataDir);
}

const BASE_INPUT = {
  id: 'usr_one',
  displayName: 'Ada Lovelace',
  email: 'ada@example.com',
  passwordHash: 'scrypt$32768$8$1$ab$cd',
  planId: 'port' as const,
  createdAt: '2026-08-29T12:00:00.000Z',
};

describe('json account store', () => {
  it('uses the Adamantite database directory as the default local account file location', () => {
    expect(DEFAULT_ACCOUNT_DATA_DIR).toBe('E:\\Adamantite\\Database');
  });

  it('creates and reads back an account', async () => {
    const subject = store();
    await subject.init();

    const created = await subject.create(BASE_INPUT);
    expect(created.token_version).toBe(1);
    expect(created.last_login_at).toBeNull();

    await expect(subject.findById('usr_one')).resolves.toMatchObject({ email: 'ada@example.com' });
    await expect(subject.findByEmail('ada@example.com')).resolves.toMatchObject({ id: 'usr_one' });
  });

  it('matches emails case-insensitively, so ADA@ cannot become a second account', async () => {
    const subject = store();
    await subject.init();
    await subject.create(BASE_INPUT);

    await expect(subject.findByEmail('ADA@EXAMPLE.COM')).resolves.toMatchObject({ id: 'usr_one' });
    await expect(subject.create({ ...BASE_INPUT, id: 'usr_two', email: 'ADA@example.com' })).rejects.toBeInstanceOf(
      EmailTakenError,
    );
  });

  it('serialises concurrent creates instead of losing one to a read-modify-write race', async () => {
    const subject = store();
    await subject.init();

    await Promise.all(
      Array.from({ length: 8 }, (_, index) =>
        subject.create({ ...BASE_INPUT, id: `usr_${index}`, email: `user${index}@example.com` }),
      ),
    );

    const written = JSON.parse(await fs.readFile(path.join(dataDir, 'accounts.json'), 'utf8'));
    expect(written).toHaveLength(8);
  });

  it('updates a row and refuses to move an email onto a taken address', async () => {
    const subject = store();
    await subject.init();
    await subject.create(BASE_INPUT);
    await subject.create({ ...BASE_INPUT, id: 'usr_two', email: 'grace@example.com' });

    const updated = await subject.update('usr_one', { display_name: 'Ada L.', token_version: 2 });
    expect(updated.display_name).toBe('Ada L.');
    expect(updated.token_version).toBe(2);

    await expect(subject.update('usr_one', { email: 'grace@example.com' })).rejects.toBeInstanceOf(
      EmailTakenError,
    );
    // Keeping your own email on an update is not a collision with yourself.
    await expect(subject.update('usr_one', { email: 'ada@example.com' })).resolves.toMatchObject({
      id: 'usr_one',
    });
  });

  it('throws AccountNotFoundError for an unknown id', async () => {
    const subject = store();
    await subject.init();

    await expect(subject.update('usr_missing', { display_name: 'x' })).rejects.toBeInstanceOf(
      AccountNotFoundError,
    );
  });

  it('reads an empty list before anything is written', async () => {
    const subject = store();
    await subject.init();

    await expect(subject.findByEmail('nobody@example.com')).resolves.toBeNull();
  });
});
