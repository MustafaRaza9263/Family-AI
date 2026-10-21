/** Pure helpers for browser speech-to-text (Web Speech API). */

export type SpeechToTextStatus =
  | "idle"
  | "listening"
  | "unsupported"
  | "error";

export type TranscriptParts = {
  finals: string;
  interim: string;
};

export function getSpeechRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  return window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null;
}

export function isSpeechToTextSupported(): boolean {
  return getSpeechRecognitionCtor() !== null;
}

/** Join snapshot + finals + interim with single spaces where needed. */
export function joinTranscript(
  snapshot: string,
  finals: string,
  interim: string,
): string {
  let out = snapshot;
  const append = (chunk: string): void => {
    const trimmedChunk = chunk.replace(/^\s+/, "");
    if (!trimmedChunk) return;
    if (!out) {
      out = trimmedChunk;
      return;
    }
    const needsSpace = !/\s$/.test(out);
    out += (needsSpace ? " " : "") + trimmedChunk;
  };
  append(finals);
  append(interim);
  return out;
}

export function clampTranscript(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  return text.slice(0, maxChars);
}

/**
 * Fold a SpeechRecognition result list into committed finals + current interim.
 * Reads from `resultIndex` so earlier finals are not duplicated when the
 * engine reports cumulative results.
 */
export function assembleFromRecognitionResults(
  results: SpeechRecognitionResultList,
  resultIndex: number,
  previousFinals: string,
): TranscriptParts {
  let finals = previousFinals;
  let interim = "";

  for (let i = resultIndex; i < results.length; i++) {
    const result = results[i];
    if (!result || result.length === 0) continue;
    const piece = result[0]?.transcript ?? "";
    if (!piece) continue;
    if (result.isFinal) {
      finals = joinTranscript(finals, piece, "");
    } else {
      interim = piece;
    }
  }

  return { finals, interim };
}

export function speechErrorMessage(code: string): string {
  switch (code) {
    case "not-allowed":
    case "service-not-allowed":
      return "Microphone permission denied.";
    case "audio-capture":
      return "No microphone found.";
    case "network":
      return "Voice input needs a network connection in this browser.";
    case "no-speech":
      return "No speech detected.";
    case "aborted":
      return "";
    default:
      return "Voice input failed. Try again.";
  }
}

export type MicStreamResult =
  | { ok: true; stream: MediaStream | null }
  | { ok: false; error: string };

/**
 * Ask for mic access so the browser permission dialog appears.
 * Caller owns the stream (stop tracks when done). `stream: null` means the
 * getUserMedia API is missing — SpeechRecognition may still work alone.
 */
export async function requestMicrophoneStream(): Promise<MicStreamResult> {
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
    return { ok: true, stream: null };
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    return { ok: true, stream };
  } catch (err) {
    if (err instanceof DOMException) {
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        return { ok: false, error: "Microphone permission denied." };
      }
      if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
        return { ok: false, error: "No microphone found." };
      }
      if (err.name === "NotReadableError" || err.name === "TrackStartError") {
        return { ok: false, error: "Microphone is already in use." };
      }
    }
    return { ok: false, error: "Could not access the microphone." };
  }
}

export function stopMediaStream(stream: MediaStream | null | undefined): void {
  if (!stream) return;
  for (const track of stream.getTracks()) {
    track.stop();
  }
}
