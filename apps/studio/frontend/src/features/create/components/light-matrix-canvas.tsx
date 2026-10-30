'use client';

import { useEffect, useRef } from 'react';
import { cn } from '@/lib/cn';
import { mediaWidthFromAspect, parseAspect } from '../media-size';

const SPACING = 18;
const BASE_RADIUS = 1.2;
const LIGHT_SPEED = 0.014;
const LIGHT_EASE = 0.035;

function noise(t: number): number {
  return (
    Math.sin(t * 1.0) * 0.5 +
    Math.sin(t * 2.3) * 0.25 +
    Math.sin(t * 4.7) * 0.15 +
    Math.sin(t * 8.1) * 0.1
  );
}

/** Resolve any CSS color (incl. var(--token)) to RGB via the browser. */
function resolveRgb(
  el: HTMLElement,
  cssColor: string,
  fallback: [number, number, number],
): [number, number, number] {
  const probe = document.createElement('span');
  probe.style.cssText = `position:absolute;left:-9999px;color:${cssColor}`;
  el.appendChild(probe);
  const raw = getComputedStyle(probe).color;
  probe.remove();
  const m = raw.match(/(\d+)[,\s]+(\d+)[,\s]+(\d+)/);
  if (!m) return fallback;
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

/** Soft drifting light-matrix placeholder sized to the chosen aspect ratio. */
export function LightMatrixCanvas({
  aspectRatio,
  width,
  className,
  label,
}: {
  aspectRatio?: string;
  /** Explicit CSS width — must match the final image display width. */
  width?: number;
  className?: string;
  label?: string;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { w: aw, h: ah } = parseAspect(aspectRatio);
  const boxW = width ?? mediaWidthFromAspect(aspectRatio);

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let raf = 0;
    let disposed = false;
    let dots: { x: number; y: number }[] = [];
    let noiseTimeX = Math.random() * 1000;
    let noiseTimeY = Math.random() * 1000;
    let cssW = 0;
    let cssH = 0;
    let lightRadius = 220;
    let dotRgb: [number, number, number] = [10, 132, 255];
    let bgRgb: [number, number, number] = [0, 0, 0];
    const light = { x: 0, y: 0, targetX: 0, targetY: 0 };

    const readTheme = () => {
      bgRgb = resolveRgb(wrap, 'var(--background)', [0, 0, 0]);
      dotRgb = resolveRgb(wrap, 'var(--primary)', [10, 132, 255]);
    };

    const layout = () => {
      cssW = wrap.clientWidth;
      cssH = wrap.clientHeight;
      if (cssW < 2 || cssH < 2) return;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(cssW * dpr);
      canvas.height = Math.floor(cssH * dpr);
      canvas.style.width = `${cssW}px`;
      canvas.style.height = `${cssH}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      lightRadius = Math.max(cssW, cssH) * 0.55;
      light.x = cssW / 2;
      light.y = cssH / 2;
      light.targetX = light.x;
      light.targetY = light.y;

      dots = [];
      const pad = SPACING;
      for (let x = pad; x < cssW - pad; x += SPACING) {
        for (let y = pad; y < cssH - pad; y += SPACING) {
          dots.push({ x, y });
        }
      }
      readTheme();
    };

    const draw = () => {
      if (disposed) return;
      if (cssW < 2 || cssH < 2) {
        raf = requestAnimationFrame(draw);
        return;
      }

      if (!reduced) {
        noiseTimeX += LIGHT_SPEED;
        noiseTimeY += LIGHT_SPEED * 0.8;
        light.targetX = cssW / 2 + noise(noiseTimeX) * cssW * 0.8;
        light.targetY = cssH / 2 + noise(noiseTimeY) * cssH * 0.8;
        light.x += (light.targetX - light.x) * LIGHT_EASE;
        light.y += (light.targetY - light.y) * LIGHT_EASE;
      }

      const [br, bg, bb] = bgRgb;
      const [pr, pg, pb] = dotRgb;
      ctx.fillStyle = `rgb(${br},${bg},${bb})`;
      ctx.fillRect(0, 0, cssW, cssH);

      for (const dot of dots) {
        const dx = dot.x - light.x;
        const dy = dot.y - light.y;
        const distance = Math.hypot(dx, dy);
        let brightness = 0;
        if (distance < lightRadius) {
          const t = distance / lightRadius;
          brightness = Math.pow((Math.cos(t * Math.PI) + 1) * 0.5, 1.5);
        }
        const alpha = 0.04 + brightness * 0.92;
        const radius = BASE_RADIUS + brightness * 2;
        ctx.beginPath();
        ctx.arc(dot.x, dot.y, radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${pr},${pg},${pb},${alpha})`;
        ctx.fill();
      }

      if (!reduced) raf = requestAnimationFrame(draw);
    };

    const ro = new ResizeObserver(() => {
      layout();
      if (reduced) draw();
    });
    ro.observe(wrap);
    layout();
    draw();

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [aspectRatio, boxW]);

  return (
    <div
      ref={wrapRef}
      className={cn(
        'relative w-full overflow-hidden rounded-[var(--radius-control)] border border-border bg-background',
        className,
      )}
      style={{
        width: boxW,
        maxWidth: '100%',
        aspectRatio: `${aw} / ${ah}`,
      }}
      aria-hidden={!label}
      aria-label={label}
      role={label ? 'img' : undefined}
    >
      <canvas ref={canvasRef} className="block h-full w-full" />
    </div>
  );
}
