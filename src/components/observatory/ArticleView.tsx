"use client";

import Link from "next/link";
import { useT } from "@/lib/i18n";

type Meta = { slug: string; issue: number; title: string; date: string };

export function ArticleView({ meta, html }: { meta: Meta; html: string }) {
  const t = useT("articles");
  return (
    <article className="max-w-3xl space-y-6">
      <header className="pt-6 border-b border-border pb-6">
        <Link href="/observatory/articles" className="text-sm text-muted hover:text-foreground">{t.back}</Link>
        <div className="font-mono text-[10px] tracking-[0.2em] text-accent mt-4">
          {t.issueN(meta.issue)} · {meta.date} · Carbadia Observatory
        </div>
        <h1 className="font-serif text-3xl sm:text-4xl font-semibold tracking-tight leading-tight mt-2">{meta.title}</h1>
      </header>
      {/* 正文是仓库内受控 markdown(用户终审后入库),非用户输入 */}
      <div className="article-body" dangerouslySetInnerHTML={{ __html: html }} />
      <footer className="border-t border-border pt-4 text-xs text-muted leading-relaxed">{t.disclaimer}</footer>
    </article>
  );
}
