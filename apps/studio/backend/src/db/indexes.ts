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

  await db.collection('threads').createIndexes([
    { key: { userId: 1, updatedAt: -1 }, name: 'threads_userId_updatedAt' },
  ]);

  await db.collection('jobs').createIndexes([
    {
      key: { status: 1, tool: 1, 'timings.queuedAt': 1 },
      name: 'jobs_status_tool_queuedAt',
    },
    { key: { userId: 1, status: 1 }, name: 'jobs_userId_status' },
    { key: { threadId: 1 }, name: 'jobs_threadId' },
  ]);

  await db.collection('assets').createIndexes([
    { key: { userId: 1, createdAt: -1 }, name: 'assets_userId_createdAt' },
    { key: { jobId: 1 }, name: 'assets_jobId' },
    { key: { deletedAt: 1, createdAt: 1 }, name: 'assets_deletedAt_createdAt' },
  ]);

  await db.collection('usage_daily').createIndexes([
    {
      key: { userId: 1, day: 1, tool: 1 },
      unique: true,
      name: 'usage_daily_userId_day_tool_unique',
    },
  ]);

  await db.collection('settings').createIndexes([
    { key: { _id: 1 }, name: 'settings_id' },
  ]);

  await db.collection('audit_logs').createIndexes([
    { key: { at: -1 }, name: 'audit_logs_at' },
    { key: { actorId: 1, at: -1 }, name: 'audit_logs_actorId_at' },
  ]);
}
