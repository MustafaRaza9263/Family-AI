import mongoose from 'mongoose';
import { env } from '../config/env';
import { logger } from '../lib/logger';

export async function connect(uri = env.MONGODB_URI): Promise<typeof mongoose> {
  mongoose.set('strictQuery', true);
  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 5000,
  });
  logger.info('MongoDB connected');
  return mongoose;
}

export async function disconnect(): Promise<void> {
  await mongoose.disconnect();
  logger.info('MongoDB disconnected');
}

export function isMongoConnected(): boolean {
  return mongoose.connection.readyState === 1;
}
