import { logger } from '../lib/logger';

export const EMPTY_ANSWER_FALLBACK =
  "Sorry, I couldn't produce an answer. Please try rephrasing your question.";

export type OutputGuardResult = {
  text: string;
  guardFlags: string[];
  /** True when the empty fallback was substituted and should be emitted as a token. */
  emittedFallback: boolean;
};

/**
 * Post-answer checks.
 * Streamed text cannot be retracted, so most findings are flags/logs only;
 * empty answers get a fallback message that is also emitted as a token.
 * Pass the project's system.md so leak detection stays tied to the loaded pack.
 */
export async function guardOutput(
  text: string,
  finishReason: string,
  systemMd: string,
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
