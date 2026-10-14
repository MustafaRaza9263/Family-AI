import { loadSystemMarkdown } from '../services/prompt.service';
import { logger } from '../lib/logger';

export const EMPTY_ANSWER_FALLBACK =
  "Sorry, I couldn't produce an answer. Please try rephrasing your question.";

export type OutputGuardResult = {
  text: string;
  guardFlags: string[];
  /** True when the empty fallback was substituted and should be emitted as a token. */
  emittedFallback: boolean;
};

let systemMdCache: string | null = null;

async function getSystemMd(): Promise<string> {
  if (!systemMdCache) {
    systemMdCache = await loadSystemMarkdown();
  }
  return systemMdCache;
}

/**
 * Post-answer checks.
 * Streamed text cannot be retracted, so most findings are flags/logs only;
 * empty answers get a fallback message that is also emitted as a token.
 */
export async function guardOutput(
  text: string,
  finishReason: string,
): Promise<OutputGuardResult> {
  const guardFlags: string[] = [];
  let out = text;
  let emittedFallback = false;

  if (out.trim().length === 0) {
    out = EMPTY_ANSWER_FALLBACK;
    emittedFallback = true;
    guardFlags.push('empty_output');
    logger.warn({ flag: 'empty_output' }, 'Empty model output; using fallback');
  }

  if (finishReason === 'length') {
    guardFlags.push('truncated');
    logger.warn({ flag: 'truncated' }, 'Model output hit length limit');
  }

  const systemMd = await getSystemMd();
  if (containsVerbatimChunk(out, systemMd, 60)) {
    guardFlags.push('possible_prompt_leak');
    logger.warn({ flag: 'possible_prompt_leak' }, 'Possible system prompt leak');
  }

  return { text: out, guardFlags, emittedFallback };
}

function containsVerbatimChunk(answer: string, source: string, minLen: number): boolean {
  if (answer.length < minLen || source.length < minLen) {
    return false;
  }
  for (let i = 0; i <= source.length - minLen; i++) {
    const chunk = source.slice(i, i + minLen);
    if (answer.includes(chunk)) {
      return true;
    }
  }
  return false;
}

export function clearOutputGuardCache(): void {
  systemMdCache = null;
}
