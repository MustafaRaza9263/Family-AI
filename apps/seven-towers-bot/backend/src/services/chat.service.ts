import { env } from '../config/env';
import { MAX_HISTORY_MESSAGES } from '../config/limits';
import { trimHistoryForContext } from '../guardrails/context.guard';
import { guardOutput } from '../guardrails/output.guard';
import { AppError, ErrorCodes } from '../lib/errors';
import { logger } from '../lib/logger';
import type { SseWriter } from '../lib/sse';
import { Conversation } from '../models/conversation.model';
import { Message } from '../models/message.model';
import { runChat } from './agent.service';
import type { KnowledgeStore } from './knowledge.service';
import { buildSystemPrompt, type ChatHistoryMessage } from './prompt.service';
import type { LlmClient } from '../types/llm';

export async function handleChat(options: {
  userId: string;
  body: { conversationId?: string; projectId: string; message: string };
  llm: LlmClient;
  knowledge: KnowledgeStore;
  signal: AbortSignal;
  sse: SseWriter;
  /** Flags from the controller's pre-SSE input.guard (message is already normalised). */
  inputFlags?: string[];
}): Promise<void> {
  const inputFlags = options.inputFlags ?? [];
  const message = options.body.message;
  const project = options.knowledge.getProject(options.body.projectId);

  let conversation;
  if (options.body.conversationId) {
    conversation = await Conversation.findOne({
      _id: options.body.conversationId,
      userId: options.userId,
    });
    if (!conversation) {
      throw new AppError(404, ErrorCodes.NOT_FOUND, 'Conversation not found');
    }
  } else {
    conversation = await Conversation.create({
      userId: options.userId,
      projectId: project.projectId,
      title: message.slice(0, 60),
    });
  }

  const userMessage = await Message.create({
    conversationId: conversation._id,
    userId: options.userId,
    role: 'user',
    content: message,
  });

  options.sse.send('meta', {
    conversationId: conversation._id.toString(),
    userMessageId: userMessage._id.toString(),
    model: env.LLM_MODEL,
  });

  const recent = await Message.find({ conversationId: conversation._id })
    .sort({ createdAt: -1 })
    .limit(MAX_HISTORY_MESSAGES + 1)
    .lean();

  // Exclude the message we just saved; reverse to oldest-first.
  const historyDocs = recent
    .filter((m) => m._id.toString() !== userMessage._id.toString())
    .reverse();

  const history: ChatHistoryMessage[] = historyDocs.map((m) => ({
    role: m.role as 'user' | 'assistant',
    content: m.content,
    attachments: m.attachments as unknown[] | undefined,
  }));

  const systemPrompt = await buildSystemPrompt(project);
  const trimmed = trimHistoryForContext(systemPrompt, history, message);

  let result;
  try {
    result = await runChat({
      llm: options.llm,
      project,
      history: trimmed,
      userMessage: message,
      signal: options.signal,
      emit: (event) => {
        if (options.sse.closed) {
          return;
        }
        if (event.type === 'token') {
          options.sse.send('token', { text: event.text });
        } else {
          options.sse.send('attachment', event.payload);
        }
      },
    });
  } catch (err) {
    if (options.signal.aborted) {
      await Message.create({
        conversationId: conversation._id,
        userId: options.userId,
        role: 'assistant',
        content: '',
        finishReason: 'aborted',
        guardFlags: inputFlags,
      });
      return;
    }
    throw err;
  }

  const output = await guardOutput(result.text, result.finishReason);
  if (output.emittedFallback && !options.sse.closed) {
    options.sse.send('token', { text: output.text });
  }

  const finishReason = options.signal.aborted ? 'aborted' : result.finishReason;
  const allFlags = [
    ...new Set([...inputFlags, ...result.guardFlags, ...output.guardFlags]),
  ];

  const assistant = await Message.create({
    conversationId: conversation._id,
    userId: options.userId,
    role: 'assistant',
    content: output.emittedFallback ? output.text : result.text,
    attachments: result.attachments,
    model: env.LLM_MODEL,
    promptTokens: result.usage.promptTokens,
    completionTokens: result.usage.completionTokens,
    ttftMs: result.ttftMs ?? undefined,
    latencyMs: result.latencyMs,
    finishReason,
    guardFlags: allFlags.length > 0 ? allFlags : undefined,
  });

  conversation.updatedAt = new Date();
  await conversation.save();

  logger.info(
    {
      conversationId: conversation._id.toString(),
      messageId: assistant._id.toString(),
      finishReason,
      ttftMs: result.ttftMs,
      latencyMs: result.latencyMs,
      promptTokens: result.usage.promptTokens,
      completionTokens: result.usage.completionTokens,
      attachmentCount: result.attachments.length,
      guardFlags: allFlags,
    },
    'Chat completed',
  );

  if (!options.sse.closed) {
    options.sse.send('done', {
      messageId: assistant._id.toString(),
      finishReason,
      usage: {
        promptTokens: result.usage.promptTokens,
        completionTokens: result.usage.completionTokens,
      },
      ttftMs: result.ttftMs,
      latencyMs: result.latencyMs,
    });
  }
}
