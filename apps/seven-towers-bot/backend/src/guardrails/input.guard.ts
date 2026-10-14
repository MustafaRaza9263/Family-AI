import { MAX_MESSAGE_CHARS } from '../config/limits';
import { AppError, ErrorCodes } from '../lib/errors';
import { logger } from '../lib/logger';

const INJECTION_PATTERNS: RegExp[] = [
  /ignore\s+(all\s+)?(previous|above)\s+instructions/i,
  /disregard\s+(all\s+)?(previous|above)\s+instructions/i,
  /reveal\s+(the\s+)?(system\s+)?(prompt|instructions)/i,
  /show\s+(the\s+)?(system\s+)?(prompt|instructions)/i,
  /print\s+(the\s+)?(system\s+)?(prompt|instructions)/i,
  /you\s+are\s+now/i,
  /developer\s+mode/i,
  /jailbreak/i,
  /\bDAN\b/,
];

export type InputGuardResult = {
  message: string;
  guardFlags: string[];
};

/** Normalise and validate user chat input. Injection is flagged, not blocked. */
export function guardInput(raw: string): InputGuardResult {
  let message = raw.trim();
  // Strip control chars except newline (char-code loop avoids control-regex lint).
  message = [...message]
    .filter((ch) => {
      const code = ch.charCodeAt(0);
      return code === 10 || (code >= 32 && code !== 127);
    })
    .join('');
  message = message.replace(/\n{3,}/g, '\n\n');

  if (message.length === 0) {
    throw new AppError(400, ErrorCodes.VALIDATION_ERROR, 'Message must not be empty');
  }
  if (message.length > MAX_MESSAGE_CHARS) {
    throw new AppError(413, ErrorCodes.MESSAGE_TOO_LONG, 'Message is too long');
  }

  const guardFlags: string[] = [];
  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(message)) {
      guardFlags.push('possible_injection');
      logger.warn(
        { flag: 'possible_injection', messageChars: message.length },
        'Possible prompt injection flagged',
      );
      break;
    }
  }

  return { message, guardFlags };
}
