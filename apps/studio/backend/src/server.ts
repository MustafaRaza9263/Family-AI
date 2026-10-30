import { compose } from './compose.js';
import { createApp } from './app.js';
import { closeMongo } from './db/mongo.js';

async function main(): Promise<void> {
  let studio;
  try {
    studio = await compose();
  } catch (err) {
    process.stderr.write(
      `${err instanceof Error ? err.message : String(err)}\n`,
    );
    process.exit(1);
  }

  const {
    env,
    logger,
    db,
    users,
    sessions,
    worker,
    telemetry,
    comfy,
    hub,
    api,
  } = studio;

  const app = createApp({
    env,
    logger,
    db,
    users,
    sessions,
    studio: api,
  });

  const server = app.listen(env.PORT, () => {
    logger.info({ port: env.PORT }, 'Server listening');
  });

  await worker.start();

  let shuttingDown = false;

  async function shutdown(signal: string): Promise<void> {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info({ signal }, 'Shutting down');

    const force = setTimeout(() => {
      logger.error('Forced exit after 35s');
      process.exit(1);
    }, 35_000);
    force.unref();

    try {
      server.close();
      await worker.stop();
      await telemetry.flush();
      comfy.close();
      hub.close();
      await closeMongo(logger);
    } catch (err) {
      logger.error({ err }, 'Error during shutdown');
    }
    process.exit(0);
  }

  process.on('SIGINT', () => {
    void shutdown('SIGINT');
  });
  process.on('SIGTERM', () => {
    void shutdown('SIGTERM');
  });
}

void main();
