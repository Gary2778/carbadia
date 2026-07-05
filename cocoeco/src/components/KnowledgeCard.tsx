import { parseEmphasis } from "./emphasis";

export function KnowledgeCard({
  title,
  body,
  note,
}: {
  title: string;
  body: string;
  note?: string;
}) {
  return (
    <details className="group rounded-lg border border-[var(--card-border)] bg-[var(--card)]/70 px-5 py-4 backdrop-blur-sm open:bg-[var(--card)]">
      <summary className="cursor-pointer list-none font-medium tracking-wide marker:content-none">
        <span className="me-2 inline-block text-[var(--accent)] transition-transform group-open:rotate-90">
          ›
        </span>
        {title}
      </summary>
      <p className="mt-3 leading-relaxed text-[0.95rem]">{parseEmphasis(body)}</p>
      {note ? (
        <p className="mt-2 text-sm leading-relaxed opacity-60">{note}</p>
      ) : null}
    </details>
  );
}
