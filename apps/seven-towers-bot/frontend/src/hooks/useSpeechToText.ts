"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  assembleFromRecognitionResults,
  getSpeechRecognitionCtor,
  isSpeechToTextSupported,
  requestMicrophoneStream,
  speechErrorMessage,
  stopMediaStream,
  type SpeechToTextStatus,
  type TranscriptParts,
} from "@/lib/speech-to-text";

export type UseSpeechToTextOptions = {
  lang?: string;
  onTranscript?: (parts: TranscriptParts) => void;
  onError?: (message: string) => void;
};

export type UseSpeechToTextResult = {
  status: SpeechToTextStatus;
  supported: boolean;
  parts: TranscriptParts;
  /** Live mic stream for the waveform while listening (may be null). */
  mediaStream: MediaStream | null;
  start: () => void;
  stop: () => void;
  cancel: () => void;
};

export function useSpeechToText(
  options: UseSpeechToTextOptions = {},
): UseSpeechToTextResult {
  const { lang, onTranscript, onError } = options;
  const supported = isSpeechToTextSupported();
  const [status, setStatus] = useState<SpeechToTextStatus>(() =>
    supported ? "idle" : "unsupported",
  );
  const [parts, setParts] = useState<TranscriptParts>({
    finals: "",
    interim: "",
  });
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const partsRef = useRef(parts);
  const onTranscriptRef = useRef(onTranscript);
  const onErrorRef = useRef(onError);
  const startGenerationRef = useRef(0);

  useEffect(() => {
    partsRef.current = parts;
  }, [parts]);

  useEffect(() => {
    onTranscriptRef.current = onTranscript;
  }, [onTranscript]);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  const releaseStream = useCallback((): void => {
    stopMediaStream(streamRef.current);
    streamRef.current = null;
    setMediaStream(null);
  }, []);

  const fail = useCallback(
    (message: string): void => {
      if (message) {
        onErrorRef.current?.(message);
      }
      releaseStream();
      setStatus("idle");
    },
    [releaseStream],
  );

  const tearDownRecognition = useCallback((): void => {
    const rec = recognitionRef.current;
    recognitionRef.current = null;
    if (!rec) return;
    try {
      rec.onresult = null;
      rec.onerror = null;
      rec.onend = null;
      rec.abort();
    } catch {
      // Already stopped.
    }
  }, []);

  useEffect(
    () => () => {
      tearDownRecognition();
      stopMediaStream(streamRef.current);
      streamRef.current = null;
    },
    [tearDownRecognition],
  );

  const publish = useCallback((next: TranscriptParts): void => {
    partsRef.current = next;
    setParts(next);
    onTranscriptRef.current?.(next);
  }, []);

  const beginRecognition = useCallback((): void => {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      setStatus("unsupported");
      fail("Voice input not supported in this browser.");
      return;
    }

    tearDownRecognition();
    publish({ finals: "", interim: "" });

    const recognition = new Ctor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang =
      lang ??
      (typeof navigator !== "undefined" ? navigator.language : "en-US");
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: SpeechRecognitionEvent): void => {
      const next = assembleFromRecognitionResults(
        event.results,
        event.resultIndex,
        partsRef.current.finals,
      );
      publish(next);
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent): void => {
      if (event.error === "aborted") {
        return;
      }
      const message = speechErrorMessage(event.error);
      if (message) {
        onErrorRef.current?.(message);
      }
      releaseStream();
      setStatus("idle");
    };

    recognition.onend = (): void => {
      recognitionRef.current = null;
      publish({ finals: partsRef.current.finals, interim: "" });
      releaseStream();
      setStatus("idle");
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
      setStatus("listening");
    } catch {
      recognitionRef.current = null;
      fail("Could not start voice input.");
    }
  }, [fail, lang, publish, releaseStream, tearDownRecognition]);

  const start = useCallback((): void => {
    if (!getSpeechRecognitionCtor()) {
      setStatus("unsupported");
      fail("Voice input not supported in this browser.");
      return;
    }

    const generation = ++startGenerationRef.current;
    setStatus("listening");

    void requestMicrophoneStream().then((result) => {
      if (generation !== startGenerationRef.current) {
        if (result.ok && result.stream) {
          stopMediaStream(result.stream);
        }
        return;
      }
      if (!result.ok) {
        fail(result.error);
        return;
      }
      streamRef.current = result.stream;
      setMediaStream(result.stream);
      beginRecognition();
    });
  }, [beginRecognition, fail]);

  const stop = useCallback((): void => {
    startGenerationRef.current += 1;
    const rec = recognitionRef.current;
    if (!rec) {
      releaseStream();
      setStatus("idle");
      return;
    }
    try {
      rec.stop();
    } catch {
      tearDownRecognition();
      releaseStream();
      setStatus("idle");
    }
  }, [releaseStream, tearDownRecognition]);

  const cancel = useCallback((): void => {
    startGenerationRef.current += 1;
    publish({ finals: "", interim: "" });
    tearDownRecognition();
    releaseStream();
    setStatus("idle");
  }, [publish, releaseStream, tearDownRecognition]);

  return {
    status,
    supported,
    parts,
    mediaStream,
    start,
    stop,
    cancel,
  };
}
