'use client';

import { useCallback, useState } from 'react';

type CodeBlockProps = {
  title: string;
  path?: string;
  content: string;
};

export function CodeBlock({ title, path, content }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }, [content]);

  return (
    <div className="overflow-hidden rounded border border-[#3d4048] bg-[#2b2e33]">
      <div className="flex items-center justify-between gap-3 border-b border-[#3d4048] px-3 py-2">
        <div className="min-w-0">
          <p className="truncate text-xs font-medium text-[#e8eaed]">{title}</p>
          {path ? (
            <p className="truncate font-mono text-[11px] text-[#8b919a]">{path}</p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => void copy()}
          className="shrink-0 rounded border border-[#3d4048] px-2 py-1 text-xs text-[#b8bcc4] transition hover:border-[#5c6370] hover:text-[#e8eaed]"
        >
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre className="max-h-[420px] overflow-auto p-3 text-xs leading-relaxed text-[#d1d5db]">
        <code>{content}</code>
      </pre>
    </div>
  );
}
