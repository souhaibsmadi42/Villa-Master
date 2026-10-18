import { Fragment, type ReactNode } from 'react';

// Minimal, safe markdown subset for assistant replies: paragraphs, "- " / "1." lists,
// #-headings, **bold**, and "Suggestion:" lines (rendered distinctly from facts).
// Builds React elements directly — no HTML injection.

function inline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith('**') && part.endsWith('**') && part.length > 4
      ? <strong key={i} className="font-semibold text-ink">{part.slice(2, -2)}</strong>
      : <Fragment key={i}>{part}</Fragment>);
}

export function RichText({ text }: { text: string }) {
  const blocks: ReactNode[] = [];
  const lines = text.split('\n');
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }
    if (/^\s*[-*•]\s+/.test(line) || /^\s*\d+[.)]\s+/.test(line)) {
      const ordered = /^\s*\d+[.)]\s+/.test(line);
      const items: string[] = [];
      while (i < lines.length && (/^\s*[-*•]\s+/.test(lines[i]) || /^\s*\d+[.)]\s+/.test(lines[i]))) {
        items.push(lines[i].replace(/^\s*([-*•]|\d+[.)])\s+/, '')); i++;
      }
      const L = ordered ? 'ol' : 'ul';
      blocks.push(
        <L key={blocks.length} className={ordered ? 'ml-4 list-decimal space-y-1 marker:text-faint' : 'space-y-1'}>
          {items.map((it, k) => (
            <li key={k} className={ordered ? 'pl-1' : 'flex gap-2.5'}>
              {!ordered && <span className="mt-[9px] h-px w-2.5 shrink-0 bg-accent" />}<span>{inline(it)}</span>
            </li>
          ))}
        </L>,
      );
      continue;
    }
    if (/^#{1,4}\s/.test(line)) {
      blocks.push(<div key={blocks.length} className="eyebrow pt-1 text-ink-2">{line.replace(/^#+\s/, '')}</div>);
      i++; continue;
    }
    if (/^suggestion:/i.test(line.trim())) {
      blocks.push(
        <div key={blocks.length} className="rounded-[8px] border border-accent/25 bg-accent/[0.06] px-3 py-2">
          <span className="eyebrow mb-0.5 block text-accent">Suggestion — not a recorded fact</span>
          {inline(line.trim().replace(/^suggestion:\s*/i, ''))}
        </div>,
      );
      i++; continue;
    }
    const para: string[] = [];
    while (i < lines.length && lines[i].trim() && !/^\s*([-*•]|\d+[.)])\s+/.test(lines[i]) && !/^#{1,4}\s/.test(lines[i]) && !/^suggestion:/i.test(lines[i].trim())) { para.push(lines[i]); i++; }
    blocks.push(<p key={blocks.length}>{inline(para.join(' '))}</p>);
  }
  return <div className="space-y-2.5">{blocks}</div>;
}
