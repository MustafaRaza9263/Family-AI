import {
  CHARS_PER_TOKEN_ESTIMATE,
  CONTEXT_OVERHEAD_TOKENS,
  MAX_ANSWER_TOKENS,
  MAX_HISTORY_MESSAGES,
} from '../config/limits';
import { env } from '../config/env';
import { AppError, ErrorCodes } from '../lib/errors';
import { logger } from '../lib/logger';
import type { ChatHistoryMessage } from '../services/prompt.service';

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / CHARS_PER_TOKEN_ESTIMATE);
}

/**
 * Trim history so system + history + new message fit the context budget.
 * Throws CONFIG_ERROR if the system prompt alone does not fit.
 */
export function trimHistoryForContext(
  systemPrompt: string,
  history: ChatHistoryMessage[],
  userMessage: string,
): ChatHistoryMessage[] {
  const systemTokens = estimateTokens(systemPrompt);
  const budget =
    env.LLM_CONTEXT_TOKENS -
    MAX_ANSWER_TOKENS -
    CONTEXT_OVERHEAD_TOKENS -
    systemTokens;

  if (budget <= 0) {
    throw new AppError(
      500,
      ErrorCodes.CONFIG_ERROR,
      'System prompt is too large for the configured LLM context window',
    );
  }

  let kept = history.slice(-MAX_HISTORY_MESSAGES);
  const userTokens = estimateTokens(userMessage);

  while (kept.length > 0) {
    const historyTokens = kept.reduce((sum, m) => sum + estimateTokens(m.content), 0);
    if (historyTokens + userTokens <= budget) {
      break;
    }
    kept = kept.slice(1);
  }

  return kept;
}

export function logPromptSize(projectId: string, systemPrompt: string): void {
  logger.info(
    {
      projectId,
      promptChars: systemPrompt.length,
      promptTokensEstimate: estimateTokens(systemPrompt),
    },
    'System prompt size estimate',
  );
}
