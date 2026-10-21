import { afterEach, describe, expect, it } from "vitest";
import {
  assembleFromRecognitionResults,
  clampTranscript,
  joinTranscript,
  requestMicrophoneStream,
  speechErrorMessage,
} from "./speech-to-text";

function fakeResults(
  items: { transcript: string; isFinal: boolean }[],
): SpeechRecognitionResultList {
  const list = items.map((item) => {
    const alt = { transcript: item.transcript, confidence: 1 };
    return {
      isFinal: item.isFinal,
      length: 1,
      0: alt,
      item: (i: number) => (i === 0 ? alt : alt),
    };
  });

  const results: Record<string | number, unknown> = {
    length: list.length,
    item: (i: number) => list[i]!,
  };
  for (let i = 0; i < list.length; i++) {
    results[i] = list[i];
  }
  return results as unknown as SpeechRecognitionResultList;
}

describe("joinTranscript", () => {
  it("joins snapshot, finals, and interim with spaces", () => {
    expect(joinTranscript("Hello", "world", "today")).toBe("Hello world today");
  });

  it("skips empty parts and avoids double spaces", () => {
    expect(joinTranscript("Hello ", "world", "")).toBe("Hello world");
    expect(joinTranscript("", "Hi", "")).toBe("Hi");
  });
});

describe("clampTranscript", () => {
  it("truncates to max chars", () => {
    expect(clampTranscript("abcdef", 4)).toBe("abcd");
    expect(clampTranscript("ab", 4)).toBe("ab");
  });
});

describe("assembleFromRecognitionResults", () => {
  it("appends new finals and tracks interim from resultIndex", () => {
    const results = fakeResults([
      { transcript: "Hello", isFinal: true },
      { transcript: "there", isFinal: false },
    ]);
    const first = assembleFromRecognitionResults(results, 0, "");
    expect(first.finals).toBe("Hello");
    expect(first.interim).toBe("there");

    const nextResults = fakeResults([
      { transcript: "Hello", isFinal: true },
      { transcript: "there friend", isFinal: true },
      { transcript: "now", isFinal: false },
    ]);
    const second = assembleFromRecognitionResults(
      nextResults,
      1,
      first.finals,
    );
    expect(second.finals).toBe("Hello there friend");
    expect(second.interim).toBe("now");
  });
});

describe("speechErrorMessage", () => {
  it("maps common error codes", () => {
    expect(speechErrorMessage("not-allowed")).toMatch(/permission/i);
    expect(speechErrorMessage("network")).toMatch(/network/i);
    expect(speechErrorMessage("aborted")).toBe("");
  });
});

describe("requestMicrophoneStream", () => {
  const original = navigator.mediaDevices;

  afterEach(() => {
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: original,
    });
  });

  it("maps NotAllowedError to permission denied", async () => {
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: {
        getUserMedia: async () => {
          throw new DOMException("Denied", "NotAllowedError");
        },
      },
    });
    await expect(requestMicrophoneStream()).resolves.toEqual({
      ok: false,
      error: "Microphone permission denied.",
    });
  });

  it("returns the live stream when granted", async () => {
    const fakeStream = {
      getTracks: () => [{ stop: () => undefined }],
    } as unknown as MediaStream;
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: {
        getUserMedia: async () => fakeStream,
      },
    });
    await expect(requestMicrophoneStream()).resolves.toEqual({
      ok: true,
      stream: fakeStream,
    });
  });
});
