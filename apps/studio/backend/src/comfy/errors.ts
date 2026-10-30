export const EngineErrorCodes = {
  ENGINE_UNAVAILABLE: 'ENGINE_UNAVAILABLE',
  ENGINE_TIMEOUT: 'ENGINE_TIMEOUT',
  ENGINE_FAILED: 'ENGINE_FAILED',
  ENGINE_CANCELLED: 'ENGINE_CANCELLED',
  ENGINE_BAD_OUTPUT: 'ENGINE_BAD_OUTPUT',
} as const;

export type EngineErrorCode =
  (typeof EngineErrorCodes)[keyof typeof EngineErrorCodes];

/** User-safe engine failure; never put ComfyUI exception text in `message`. */
export class EngineError extends Error {
  readonly code: EngineErrorCode;

  constructor(code: EngineErrorCode, message: string) {
    super(message);
    this.name = 'EngineError';
    this.code = code;
  }
}
