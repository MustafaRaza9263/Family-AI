"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { copyText } from "@/lib/errors-ui";

type MarkdownCodeBlockProps = {
  code: string;
  language?: string;
};

export function MarkdownCodeBlock({ code, language }: MarkdownCodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const onCopy = (): void => {
    void copyText(code).then((ok) => {
      if (!ok) return;
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <div className="group relative my-3 overflow-hidden rounded-lg bg-surface-2">
      {language ? (
        <span className="block px-3 py-1 text-xs text-muted">{language}</span>
      ) : null}
      <pre className="overflow-x-auto p-3 text-sm scrollbar-none">
        <code>{code}</code>
      </pre>
      <button
        type="button"
        aria-label={copied ? "Copied" : "Copy code"}
        title={copied ? "Copied" : "Copy"}
        onClick={onCopy}
        className="absolute right-2 top-2 inline-flex size-7 items-center justify-center rounded-md text-muted opacity-0 hover:bg-surface hover:text-text group-hover:opacity-100"
      >
        {copied ? (
          <Check className="size-3.5" />
        ) : (
          <Copy className="size-3.5" strokeWidth={1.75} />
        )}
      </button>
    </div>
  );
}
