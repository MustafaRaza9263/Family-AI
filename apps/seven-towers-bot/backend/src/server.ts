import { createApp } from './app';
import { env } from './config/env';
import { connect, disconnect } from './db/connection';
import { logger } from './lib/logger';
import { abortAllChats } from './middleware/chat-gates';
import { logPromptSize } from './guardrails/context.guard';
import { createKnowledgeStore } from './services/knowledge.service';
import { createLlmClient } from './services/llm.service';
import { buildSystemPrompt } from './services/prompt.service';

async function main(): Promise<void> {
  try {
    await connect();
  } catch (err) {
    logger.fatal({ err }, 'MongoDB unreachable at startup');
    process.exit(1);
  }

  const knowledge = createKnowledgeStore();
  try {
    await knowledge.loadAll();
  } catch (err) {
    logger.fatal({ err }, 'Failed to load knowledge packs');
    process.exit(1);
  }

  for (const projectId of knowledge.listProjectIds()) {
    const prompt = await buildSystemPrompt(knowledge.getProject(projectId));
    logPromptSize(projectId, prompt);
  }

  const llm = createLlmClient();
  const app = createApp({ llm, knowledge });

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
      abortAllChats();
      try {
        await disconnect();
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
