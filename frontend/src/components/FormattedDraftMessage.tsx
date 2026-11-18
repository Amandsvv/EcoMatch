'use client';

import React from 'react';

/**
 * Parses inline markdown:
 * - **bold**
 * - *italic*
 * - `code`
 */
function parseInline(text: string): React.ReactNode {
  const regex = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    const token = match[0];
    const key = `${match.index}-${token}`;
    if (token.startsWith('**') && token.endsWith('**')) {
      parts.push(
        <strong key={key} className="font-semibold text-[var(--eco-text)]">
          {token.slice(2, -2)}
        </strong>
      );
    } else if (token.startsWith('*') && token.endsWith('*')) {
      parts.push(
        <em key={key} className="italic text-[var(--eco-text)]">
          {token.slice(1, -1)}
        </em>
      );
    } else if (token.startsWith('`') && token.endsWith('`')) {
      parts.push(
        <code
          key={key}
          className="px-1.5 py-0.5 rounded bg-[var(--eco-surface)] border border-[var(--eco-border)] text-xs font-mono text-[var(--eco-text)]"
        >
          {token.slice(1, -1)}
        </code>
      );
    }
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? parts : text;
}

interface FormattedDraftMessageProps {
  message: string;
  className?: string;
}

export function FormattedDraftMessage({ message, className = '' }: FormattedDraftMessageProps) {
  if (!message) return null;

  // Clean outer quotes if the message is wrapped in literal quotes
  let clean = message.trim();
  clean = clean.replace(/^["“«]+/, '').replace(/["”»]+$/, '').trim();

  const lines = clean.split('\n');
  const blocks: React.ReactNode[] = [];

  let currentBullets: string[] = [];
  let currentNumbered: { num: string; text: string }[] = [];

  const flushLists = (key: string | number) => {
    if (currentBullets.length > 0) {
      blocks.push(
        <ul
          key={`ul-${key}`}
          className="my-3 space-y-2 bg-[var(--eco-surface)]/80 rounded-lg p-4 border border-[var(--eco-border)]"
        >
          {currentBullets.map((item, idx) => (
            <li key={idx} className="flex items-start gap-2.5 text-xs sm:text-sm text-[var(--eco-text-2)]">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--eco-accent)] mt-2 shrink-0" />
              <span className="leading-relaxed">{parseInline(item)}</span>
            </li>
          ))}
        </ul>
      );
      currentBullets = [];
    }

    if (currentNumbered.length > 0) {
      blocks.push(
        <ol
          key={`ol-${key}`}
          className="my-3 space-y-2 bg-[var(--eco-surface)]/80 rounded-lg p-4 border border-[var(--eco-border)]"
        >
          {currentNumbered.map((item, idx) => (
            <li key={idx} className="flex items-start gap-2.5 text-xs sm:text-sm text-[var(--eco-text-2)]">
              <span className="font-semibold text-[var(--eco-accent)] min-w-[1.2rem]">{item.num}.</span>
              <span className="leading-relaxed">{parseInline(item.text)}</span>
            </li>
          ))}
        </ol>
      );
      currentNumbered = [];
    }
  };

  lines.forEach((line, index) => {
    const trimmed = line.trim();
    if (!trimmed) {
      flushLists(index);
      return;
    }

    const bulletMatch = trimmed.match(/^[-*•]\s+(.*)$/);
    const numberedMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);

    if (bulletMatch) {
      if (currentNumbered.length > 0) flushLists(`num-before-${index}`);
      currentBullets.push(bulletMatch[1]);
    } else if (numberedMatch) {
      if (currentBullets.length > 0) flushLists(`bullet-before-${index}`);
      currentNumbered.push({ num: numberedMatch[1], text: numberedMatch[2] });
    } else {
      flushLists(index);
      blocks.push(
        <p key={`p-${index}`} className="text-xs sm:text-sm text-[var(--eco-text-2)] leading-relaxed">
          {parseInline(trimmed)}
        </p>
      );
    }
  });

  flushLists('end');

  return <div className={`space-y-3.5 ${className}`}>{blocks}</div>;
}

export default FormattedDraftMessage;
