import type { Request, Response, NextFunction } from 'express';
import { guardInput } from '../guardrails/input.guard';
import { activeChatAborts } from '../middleware/chat-gates';
import { AppError, ErrorCodes } from '../lib/errors';
import { openSse } from '../lib/sse';
import { handleChat } from '../services/chat.service';
import type { KnowledgeStore } from '../services/knowledge.service';
import type { LlmClient } from '../types/llm';
import type { ChatBody } from '../validators/chat.schemas';

export function createChatController(deps: {
  llm: LlmClient;
  knowledge: KnowledgeStore;
}) {
  return async function chat(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    const body = req.body as ChatBody;
    const abort = new AbortController();
    activeChatAborts.add(abort);

    const onClose = (): void => {
      abort.abort();
    };
    req.on('close', onClose);

    let sseStarted = false;

    try {
      // JSON errors must happen before SSE headers are sent.
      deps.knowledge.getProject(body.projectId);
      const input = guardInput(body.message);

      const sse = openSse(res);
      sseStarted = true;

      await handleChat({
        userId: req.user!.id,
        body: { ...body, message: input.message },
        llm: deps.llm,
        knowledge: deps.knowledge,
        signal: abort.signal,
        sse,
        inputFlags: input.guardFlags,
      });

      sse.close();
    } catch (err) {
      if (!sseStarted) {
        next(err);
        return;
      }
      const code = err instanceof AppError ? err.code : ErrorCodes.INTERNAL;
      const message =
        err instanceof AppError ? err.message : 'Internal server error';
      try {
        res.write(
          `event: error\ndata: ${JSON.stringify({ code, message })}\n\n`,
        );
      } catch {
        // Response may already be closed.
      }
      if (!res.writableEnded) {
        res.end();
      }
    } finally {
      req.off('close', onClose);
      activeChatAborts.delete(abort);
    }
  };
}
