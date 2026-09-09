"use client";

import Link from "next/link";
import { useT } from "@/lib/i18n";

type Item = { slug: string; issue: number; title: string; date: string; summary: string };

export function ArticleList({ items }: { items: Item[] }) {
  const t = useT("articles");
  return (
    <div className="space-y-8 max-w-3xl">
      <header className="pt-6 border-b border-border pb-6">
        <p className="font-mono text-xs tracking-[0.3em] text-accent mb-2">OBSERVATORY · ARTICLES</p>
        <h1 className="font-serif text-4xl font-semibold tracking-tight">{t.title}</h1>
        <p className="text-muted mt-2">{t.subtitle}</p>
      </header>
      {items.length === 0 ? (
        <p className="text-muted italic">{t.empty}</p>
      ) : (
        <ul className="divide-y divide-border">
          {items.map((a) => (
            <li key={a.slug}>
              <Link href={`/observatory/articles/${a.slug}`} className="block py-5 group">
                <div className="font-mono text-[10px] tracking-[0.2em] text-accent">
                  {t.issueN(a.issue)} · {a.date}
                </div>
                <h2 className="font-serif text-2xl leading-snug mt-1 group-hover:text-accent transition-colors">{a.title}</h2>
                {a.summary && <p className="text-sm text-muted mt-1 leading-relaxed">{a.summary}</p>}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
