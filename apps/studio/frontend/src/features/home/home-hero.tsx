'use client';

import { useEffect, useRef } from 'react';
import { cn } from '@/lib/cn';
import { greetingForNow } from '@/lib/format';

const HEADLINE = 'What will you create today?';

export function HomeHero({ name }: { name: string }) {
  const headlineRef = useRef<HTMLHeadingElement>(null);
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

  return (
    <section className="text-center">
      <p
        className={cn(
          'hero-rise text-sm text-muted-foreground',
        )}
      >
        {greetingForNow()}
        {name ? `, ${name}` : ''}
      </p>
      <h1
        ref={headlineRef}
        className="hero-headline m-0 mt-1.5 text-[clamp(26px,3.2vw,38px)] leading-[1.08] font-bold tracking-[-0.035em]"
      >
        {words.map((word, i) => (
          <span
            key={`${word}-${i}`}
            className="hero-word"
            style={{ animationDelay: `${i * 80}ms` }}
          >
            {word}
            {i < words.length - 1 ? ' ' : ''}
          </span>
        ))}
      </h1>
    </section>
  );
}
