"use client";

import type { Components } from "react-markdown";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { MarkdownCodeBlock } from "./MarkdownCodeBlock";

type MarkdownProps = {
  content: string;
};

const components: Components = {
  a: ({ href, children }) => (
    <a href={href} target="_blank" rel="noopener noreferrer" className="text-accent underline">
      {children}
    </a>
  ),
  img: () => null,
  table: ({ children }) => (
    <div className="my-3 overflow-x-auto">
      <table className="w-full border-collapse text-sm">{children}</table>
    </div>
  ),
  pre: ({ children }) => <>{children}</>,
  code: ({ className, children }) => {
    const text = String(children).replace(/\n$/, "");
    if (!className) {
      return (
        <code className="rounded bg-surface-2 px-1 py-0.5 text-sm">{children}</code>
      );
    }
    const language = className.replace("language-", "");
    return <MarkdownCodeBlock code={text} language={language} />;
  },
};

export function Markdown({ content }: MarkdownProps) {
  return (
    <div className="max-w-none text-text [&_ol]:my-2 [&_p]:my-2 [&_ul]:my-2">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
