"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/cn";

type VoiceWaveformProps = {
  stream: MediaStream | null;
  className?: string;
};

const BAR_GAP = 3;
const BAR_WIDTH = 2;
const HISTORY = 96;

/**
 * ChatGPT-style mic visualizer: quiet = dots, speech = taller bars,
 * scrolling so recent energy sits on the right.
 */
export function VoiceWaveform({ stream, className }: VoiceWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let disposed = false;
    let raf = 0;
    let audioCtx: AudioContext | null = null;
    let analyser: AnalyserNode | null = null;
    const history = new Float32Array(HISTORY);
    let writeAt = 0;
    let idlePhase = 0;

    const paint = (): void => {
      const dpr = window.devicePixelRatio || 1;
      const cssW = canvas.clientWidth;
      const cssH = canvas.clientHeight;
      if (cssW === 0 || cssH === 0) return;

      const w = Math.floor(cssW * dpr);
      const h = Math.floor(cssH * dpr);
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }

      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, cssW, cssH);

      const muted = getComputedStyle(canvas)
        .getPropertyValue("--color-muted")
        .trim();
      const text = getComputedStyle(canvas)
        .getPropertyValue("--color-text")
        .trim();
      const quietColor = muted || "rgba(235,235,245,0.45)";
      const loudColor = text || "#ffffff";

      const step = BAR_WIDTH + BAR_GAP;
      const count = Math.max(8, Math.floor(cssW / step));
      const midY = cssH / 2;

      for (let i = 0; i < count; i++) {
        const histIndex = (writeAt - (count - i) + HISTORY * 4) % HISTORY;
        const level = history[histIndex] ?? 0;
        const x = i * step + BAR_WIDTH / 2;

        if (level < 0.08) {
          ctx.beginPath();
          ctx.fillStyle = quietColor;
          ctx.arc(x, midY, 1.15, 0, Math.PI * 2);
          ctx.fill();
          continue;
        }

        const barH = Math.max(3, level * (cssH * 0.88));
        ctx.fillStyle = loudColor;
        const left = x - BAR_WIDTH / 2;
        const top = midY - barH / 2;
        const r = Math.min(BAR_WIDTH / 2, barH / 2);
        ctx.beginPath();
        ctx.moveTo(left + r, top);
        ctx.arcTo(left + BAR_WIDTH, top, left + BAR_WIDTH, top + barH, r);
        ctx.arcTo(left + BAR_WIDTH, top + barH, left, top + barH, r);
        ctx.arcTo(left, top + barH, left, top, r);
        ctx.arcTo(left, top, left + BAR_WIDTH, top, r);
        ctx.closePath();
        ctx.fill();
      }
    };

    const pushLevel = (level: number): void => {
      history[writeAt] = level;
      writeAt = (writeAt + 1) % HISTORY;
    };

    const frame = (): void => {
      if (disposed) return;

      if (analyser) {
        const buf = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(buf);
        let sum = 0;
        const from = 2;
        const to = Math.min(buf.length, 40);
        for (let i = from; i < to; i++) sum += buf[i] ?? 0;
        const avg = sum / Math.max(1, to - from) / 255;
        pushLevel(Math.min(1, avg * 1.85));
      } else {
        idlePhase += 0.12;
        // Soft breathing ripple on the right when waiting for audio.
        const ripple = 0.04 + Math.max(0, Math.sin(idlePhase) * 0.06);
        pushLevel(ripple);
      }

      paint();
      raf = requestAnimationFrame(frame);
    };

    const start = async (): Promise<void> => {
      if (stream && !reduced) {
        try {
          audioCtx = new AudioContext();
          const source = audioCtx.createMediaStreamSource(stream);
          analyser = audioCtx.createAnalyser();
          analyser.fftSize = 256;
          analyser.smoothingTimeConstant = 0.72;
          source.connect(analyser);
        } catch {
          analyser = null;
        }
      }
      raf = requestAnimationFrame(frame);
    };

    void start();

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      void audioCtx?.close();
    };
  }, [stream]);

  return (
    <canvas
      ref={canvasRef}
      className={cn("block h-9 w-full", className)}
      aria-hidden
    />
  );
}
