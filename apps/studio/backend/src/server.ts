import { loadEnv } from './config/env.js';
import { createLogger } from './lib/logger.js';
import { connectMongo, closeMongo } from './db/mongo.js';
import { ensureIndexes } from './db/indexes.js';
import { MongoUserRepository } from './db/repositories/mongo-user-repository.js';
import { MongoSessionRepository } from './db/repositories/mongo-session-repository.js';
import { createApp } from './app.js';

async function main(): Promise<void> {
  let env;
  try {
    env = loadEnv();
  } catch (err) {
    process.stderr.write(
      `${err instanceof Error ? err.message : String(err)}\n`,
    );
    process.exit(1);
  }

  const logger = createLogger(env);

  let db;
  try {
    db = await connectMongo(env.MONGODB_URI, logger);
    await ensureIndexes(db);
  } catch (err) {
    logger.fatal({ err }, 'MongoDB unreachable at startup');
    process.exit(1);
  }

  const app = createApp({
    env,
    logger,
    db,
    users: new MongoUserRepository(db),
    sessions: new MongoSessionRepository(db),
  });

  const server = app.listen(env.PORT, () => {
    logger.info({ port: env.PORT }, 'Server listening');
  });

  let shuttingDown = false;

  async function shutdown(signal: string): Promise<void> {
    if (shuttingDown) {
      return;
    }
    shuttingDown = true;
    logger.info({ signal }, 'Shutting down');

    const force = setTimeout(() => {
      logger.error('Forced exit after 10s');
      process.exit(1);
    }, 10_000);
    force.unref();

    server.close(async () => {
      try {
        await closeMongo(logger);
      } catch (err) {
        logger.error({ err }, 'Error closing MongoDB');
      }
      process.exit(0);
    });
  }

  process.on('SIGINT', () => {
    void shutdown('SIGINT');
  });
  process.on('SIGTERM', () => {
    void shutdown('SIGTERM');
  });
}

void main();
