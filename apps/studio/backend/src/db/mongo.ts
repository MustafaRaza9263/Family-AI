import { MongoClient, type Db } from 'mongodb';
import type { Logger } from '../lib/logger.js';

let client: MongoClient | null = null;
let db: Db | null = null;

export async function connectMongo(
  uri: string,
  logger: Logger,
): Promise<Db> {
  const next = new MongoClient(uri, {
    serverSelectionTimeoutMS: 5000,
  });
  await next.connect();
  client = next;
  db = next.db();
  logger.info('MongoDB connected');
  return db;
}

export function getDb(): Db {
  if (!db) {
    throw new Error('MongoDB is not connected');
  }
  return db;
}

export async function pingDb(): Promise<boolean> {
  if (!db) {
    return false;
  }
  try {
    await db.command({ ping: 1 });
    return true;
  } catch {
    return false;
  }
}

export async function closeMongo(logger?: Logger): Promise<void> {
  if (client) {
    await client.close();
    client = null;
    db = null;
    logger?.info('MongoDB disconnected');
  }
}
