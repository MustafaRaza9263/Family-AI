import mongoose from 'mongoose';
import { env } from '../../src/config/env';
import { connect, disconnect } from '../../src/db/connection';

export function assertTestDatabase(): string {
  const uri = env.MONGODB_URI_TEST;
  if (!uri) {
    return '';
  }
  // Database name must end in _test so we never wipe production data.
  const match = uri.match(/\/([^/?]+)(\?|$)/);
  const dbName = match?.[1] ?? '';
  if (!dbName.endsWith('_test')) {
    throw new Error(
      `Refusing to run integration tests: MONGODB_URI_TEST database name must end in "_test" (got "${dbName}")`,
    );
  }
  return uri;
}

export async function setupTestMongo(): Promise<boolean> {
  const uri = assertTestDatabase();
  if (!uri) {
    return false;
  }
  await connect(uri);
  return true;
}

export async function clearCollections(): Promise<void> {
  const collections = mongoose.connection.collections;
  for (const collection of Object.values(collections)) {
    await collection.deleteMany({});
  }
}

export async function teardownTestMongo(): Promise<void> {
  await disconnect();
}
