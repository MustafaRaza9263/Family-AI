'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/cn';
import { greetingForNow } from '@/lib/format';

const HEADLINE = 'What will you create today?';

const IDEAS = [
  'A glass tower at golden hour, soft haze, wide angle',
  'Minimal poster of a sunrise over the city skyline',
  'Cozy living room with warm lamps and city view at night',
  'Aerial shot of a rooftop garden with an infinity pool',
] as const;

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function EmptyHero({
  name,
  onPickIdea,
}: {
  name: string;
  onPickIdea: (idea: string) => void;
}) {
  const headlineRef = useRef<HTMLHeadingElement>(null);
  const [typed, setTyped] = useState('');
  const [ideaIndex, setIdeaIndex] = useState(0);
  const words = HEADLINE.split(' ');

  useEffect(() => {
    const el = headlineRef.current;
    if (!el) return;
    const align = () => {
      const spans = el.querySelectorAll<HTMLElement>('.hero-word');
      if (spans.length === 0) return;
      const left = Math.min(...[...spans].map((s) => s.offsetLeft));
      el.style.setProperty('--hero-span', `${el.scrollWidth * 3}px`);
      spans.forEach((s) => {
        s.style.setProperty('--hero-off', `${s.offsetLeft - left}px`);
      });
    };
    align();
    const ro = new ResizeObserver(align);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | undefined;
    let pause: ReturnType<typeof setTimeout> | undefined;
    let boot: ReturnType<typeof setTimeout> | undefined;

    if (prefersReducedMotion()) {
      boot = setTimeout(() => setTyped(`Try: ${IDEAS[ideaIndex]}`), 0);
      return () => clearTimeout(boot);
    }

    const text = IDEAS[ideaIndex]!;
    let i = 0;
    let deleting = false;

    const tickDelete = () => {
      timer = setInterval(() => {
        i -= 1;
        setTyped(i <= 0 ? 'Try: ' : `Try: ${text.slice(0, i)}`);
        if (i <= 0) {
          clearInterval(timer);
          setIdeaIndex((n) => (n + 1) % IDEAS.length);
        }
      }, 18);
    };

    const start = () => {
      timer = setInterval(() => {
        if (!deleting) {
          i += 1;
          setTyped(`Try: ${text.slice(0, i)}`);
          if (i >= text.length) {
            deleting = true;
            clearInterval(timer);
            pause = setTimeout(tickDelete, 2200);
          }
        }
      }, 38);
    };

    boot = setTimeout(start, ideaIndex === 0 ? 900 : 300);
    return () => {
      clearTimeout(boot);
      clearTimeout(pause);
      clearInterval(timer);
    };
  }, [ideaIndex]);

  return (
    <header className="mb-7 w-full max-w-4xl text-center">
      <p
        className={cn(
          'hero-rise mb-2.5 text-[13px] tracking-[0.14em] text-muted-foreground uppercase',
        )}
      >
        {greetingForNow()}
        {name ? `, ${name}` : ''}
      </p>
      <h1
        ref={headlineRef}
        className="hero-headline m-0 text-[clamp(28px,5vw,44px)] leading-[1.15] font-semibold tracking-[-0.02em]"
      >
        {words.map((word, i) => (
          <span
            key={`${word}-${i}`}
            className="hero-word"
            style={{ animationDelay: `${i * 90}ms` }}
          >
            {word}
            {i < words.length - 1 ? ' ' : ''}
          </span>
        ))}
      </h1>
      <button
        type="button"
        className={cn(
          'hero-rise group mx-auto mt-3.5 block min-h-[1.5em] cursor-pointer rounded-md border-0 bg-transparent',
          'px-1.5 py-0.5 font-[inherit] text-sm text-muted-foreground',
        )}
        style={{ animationDelay: '0.5s' }}
        aria-label="Use this idea"
        onClick={() => onPickIdea(IDEAS[ideaIndex]!)}
      >
        <span className="transition-colors duration-200 group-hover:text-foreground">
          {typed}
        </span>
        <span className="hero-caret" aria-hidden />
      </button>
    </header>
  );
}
