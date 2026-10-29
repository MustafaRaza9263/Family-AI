import type { Db } from 'mongodb';

export async function ensureIndexes(db: Db): Promise<void> {
  await db.collection('users').createIndexes([
    { key: { email: 1 }, unique: true, name: 'users_email_unique' },
    { key: { status: 1, createdAt: -1 }, name: 'users_status_createdAt' },
  ]);

  await db.collection('sessions').createIndexes([
    { key: { tokenHash: 1 }, unique: true, name: 'sessions_tokenHash_unique' },
    { key: { userId: 1 }, name: 'sessions_userId' },
    {
      key: { expiresAt: 1 },
      expireAfterSeconds: 0,
      name: 'sessions_expiresAt_ttl',
    },
  ]);
}
