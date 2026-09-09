"use client";

import Link from "next/link";
import { Reveal } from "@/components/anim/Reveal";
import { useRatingReveal } from "@/components/rating/PixelTransition";
import { RansomText } from "@/components/RansomText";
import { useT } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";

const GRADES: [string, string][] = [
  ["AAA", "#066a3e"],
  ["AA", "#0a8a52"],
  ["A", "#0fae66"],
  ["BBB", "#5cb85c"],
  ["BB", "#d6a800"],
  ["B", "#e08e1b"],
  ["C", "#e0552b"],
  ["D", "#dd3322"],
];

// 维度顺序固定，文案随语言取自 DICT.dims
const DIM_KEYS = ["additionality", "permanence", "doubleCounting", "coBenefits"] as const;

// 项目元数据（代码/评级/颜色为数据，名称/类型随语言取自中央目录 data 命名空间）
const PROJECTS: { symbol: string; type: "blueCarbon" | "forestry" | "renewable" | "methane" | "efficiency"; grade: string; color: string }[] = [
  { symbol: "GS-MANG-2022", type: "blueCarbon", grade: "AA", color: "#0a8a52" },
  { symbol: "VCS-FOR-2021", type: "forestry", grade: "A", color: "#0fae66" },
  { symbol: "CCER-SOL-2023", type: "renewable", grade: "BBB", color: "#5cb85c" },
  { symbol: "GS-WIND-2022", type: "renewable", grade: "BBB", color: "#5cb85c" },
  { symbol: "CDM-METH-2019", type: "methane", grade: "BB", color: "#d6a800" },
  { symbol: "VCS-COOK-2020", type: "efficiency", grade: "B", color: "#e08e1b" },
];

export default function RatingPage() {
  useRatingReveal();
  const t = useT("rating");
  // 项目名/类型与行情页共用数据层文案,避免两处维护
  const d = useT("data");
  const dark = useTheme().theme === "dark";

  return (
    <div className="space-y-10">
      <header className="pt-6">
        <p className="font-mono text-xs tracking-[0.3em] text-accent mb-2">{t.eyebrow}</p>
        <h1 className={`text-4xl sm:text-5xl font-semibold tracking-tight ${dark ? "ransom-line" : ""}`}>
          <RansomText text={t.title} />
        </h1>
        <p className="text-muted text-lg max-w-2xl mt-4 leading-relaxed">{t.lead}</p>
        <span className="inline-block mt-4 text-xs text-muted bg-surface-2 border border-border rounded-full px-3 py-1">
          {t.disclaimer}
        </span>
      </header>

      <Reveal>
        <section className="rounded-2xl border border-border bg-surface shadow-card p-6">
          <h2 className="font-semibold text-sm mb-1">{t.ladderTitle}</h2>
          <p className="text-muted text-xs mb-4">{t.ladderSub}</p>
          <div className="flex flex-wrap gap-1.5">
            {GRADES.map(([g, c]) => (
              <span key={g} className="font-mono font-bold text-sm text-white rounded-lg px-3 py-1.5" style={{ background: c }}>
                {g}
              </span>
            ))}
          </div>
        </section>
      </Reveal>

      <Reveal delay={0.05}>
        <section>
          <h2 className="font-semibold mb-3">{t.dimsTitle}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {DIM_KEYS.map((key) => (
              <div key={key} className="rounded-2xl border border-border bg-surface shadow-soft p-4">
                <div className="font-medium text-sm">{t.dims[key].title}</div>
                <p className="text-muted text-xs mt-1.5 leading-relaxed">{t.dims[key].desc}</p>
              </div>
            ))}
          </div>
        </section>
      </Reveal>

      <Reveal delay={0.1}>
        <section className="rounded-2xl border border-border bg-surface shadow-card overflow-hidden">
          <div className="px-5 py-3 border-b border-border flex items-center justify-between">
            <h2 className="font-semibold">{t.projectsTitle}</h2>
            <span className="text-xs text-muted">{t.instrumentsCount(PROJECTS.length)}</span>
          </div>
          <div>
            {PROJECTS.map((p) => (
              <Link
                key={p.symbol}
                href={`/exchange/market/${p.symbol}`}
                className="flex items-center gap-3 px-5 py-3.5 border-b border-border/50 last:border-b-0 hover:bg-surface-2 transition-colors"
              >
                <div className="min-w-0">
                  <div className="font-medium text-sm truncate">{d.assetNames[p.symbol] ?? p.symbol}</div>
                  <div className="text-muted text-xs">{p.symbol} · {d.projectTypes[p.type]}</div>
                </div>
                <span className="ms-auto font-mono font-bold text-white rounded-lg px-3 py-1 text-sm shrink-0" style={{ background: p.color }}>
                  {p.grade}
                </span>
              </Link>
            ))}
          </div>
        </section>
      </Reveal>

      <Reveal delay={0.15}>
        <section className="rounded-2xl border border-border bg-gradient-to-br from-accent/5 to-transparent p-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="font-semibold">{t.ctaTitle}</h2>
            <p className="text-muted text-sm mt-1">{t.ctaSub}</p>
          </div>
          <Link href="/exchange" className="px-5 py-2.5 rounded-full bg-accent text-background font-medium hover:bg-accent-strong transition-colors">
            {t.ctaLink}
          </Link>
        </section>
      </Reveal>
    </div>
  );
}
