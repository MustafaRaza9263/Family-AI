"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { copyText } from "@/lib/errors-ui";
import { IconButton } from "@/components/ui/IconButton";

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
    <div className="group relative my-3 overflow-hidden rounded-md border border-border bg-surface">
      {language ? (
        <span className="block border-b border-border px-3 py-1 text-xs text-muted">
          {language}
        </span>
      ) : null}
      <pre className="overflow-x-auto p-3 text-sm">
        <code>{code}</code>
      </pre>
      <IconButton
        label={copied ? "Copied" : "Copy code"}
        className="absolute right-2 top-2 opacity-0 transition-opacity group-hover:opacity-100"
        onClick={onCopy}
      >
        {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
      </IconButton>
    </div>
  );
}
