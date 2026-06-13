"use client";

import Link from "next/link";
import { Reveal } from "@/components/anim/Reveal";
import { useRatingReveal } from "@/components/rating/PixelTransition";

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

const DIMS: [string, string][] = [
  ["额外性 Additionality", "没有这笔碳信用收入，减排是否本就会发生？越不可能，质量越高。"],
  ["永久性 Permanence", "已封存的碳被重新释放（如森林火灾、毁林）的风险有多大？"],
  ["重复计算 Double-counting", "同一吨减排是否被多个登记簿或多方重复主张？"],
  ["协同效益 Co-benefits", "项目对生物多样性、就业与当地社区的额外正向影响。"],
];

const PROJECTS: { name: string; meta: string; symbol: string; grade: string; color: string }[] = [
  { name: "印尼红树林蓝碳修复", meta: "GS-MANG-2022 · 蓝碳", symbol: "GS-MANG-2022", grade: "AA", color: "#0a8a52" },
  { name: "云南森林经营碳汇项目", meta: "VCS-FOR-2021 · 林业碳汇", symbol: "VCS-FOR-2021", grade: "A", color: "#0fae66" },
  { name: "青海光伏发电项目", meta: "CCER-SOL-2023 · 可再生能源", symbol: "CCER-SOL-2023", grade: "BBB", color: "#5cb85c" },
  { name: "印度拉贾斯坦风电项目", meta: "GS-WIND-2022 · 可再生能源", symbol: "GS-WIND-2022", grade: "BBB", color: "#5cb85c" },
  { name: "巴西垃圾填埋气回收", meta: "CDM-METH-2019 · 甲烷回收", symbol: "CDM-METH-2019", grade: "BB", color: "#d6a800" },
  { name: "肯尼亚高效炉灶项目", meta: "VCS-COOK-2020 · 能效", symbol: "VCS-COOK-2020", grade: "B", color: "#e08e1b" },
];

export default function RatingPage() {
  useRatingReveal();

  return (
    <div className="space-y-10">
      <header className="pt-6">
        <p className="font-mono text-xs tracking-[0.3em] text-accent mb-2">CARBON CREDIT RATING</p>
        <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight">碳信用评级服务</h1>
        <p className="text-muted text-lg max-w-2xl mt-4 leading-relaxed">
          Carbadia 独家——独立、透明地评估每一笔碳信用的真实减排质量。八档信用评级，从 AAA 到 D，一眼看懂项目成色。
        </p>
        <span className="inline-block mt-4 text-xs text-muted bg-surface-2 border border-border rounded-full px-3 py-1">
          示例评级 · 仅供演示，不构成投资建议
        </span>
      </header>

      <Reveal>
        <section className="rounded-2xl border border-border bg-surface shadow-card p-6">
          <h2 className="font-semibold text-sm mb-1">评级阶梯</h2>
          <p className="text-muted text-xs mb-4">从投资级（深绿）到高风险（红），共八档。</p>
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
          <h2 className="font-semibold mb-3">我们评估的四个维度</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {DIMS.map(([title, desc]) => (
              <div key={title} className="rounded-2xl border border-border bg-surface shadow-soft p-4">
                <div className="font-medium text-sm">{title}</div>
                <p className="text-muted text-xs mt-1.5 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </section>
      </Reveal>

      <Reveal delay={0.1}>
        <section className="rounded-2xl border border-border bg-surface shadow-card overflow-hidden">
          <div className="px-5 py-3 border-b border-border flex items-center justify-between">
            <h2 className="font-semibold">已评级项目（示例）</h2>
            <span className="text-xs text-muted">{PROJECTS.length} 个标的</span>
          </div>
          <div>
            {PROJECTS.map((p) => (
              <Link
                key={p.symbol}
                href={`/market/${p.symbol}`}
                className="flex items-center gap-3 px-5 py-3.5 border-b border-border/50 last:border-b-0 hover:bg-surface-2 transition-colors"
              >
                <div className="min-w-0">
                  <div className="font-medium text-sm truncate">{p.name}</div>
                  <div className="text-muted text-xs">{p.meta}</div>
                </div>
                <span className="ml-auto font-mono font-bold text-white rounded-lg px-3 py-1 text-sm shrink-0" style={{ background: p.color }}>
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
            <h2 className="font-semibold">把评级带进交易决策</h2>
            <p className="text-muted text-sm mt-1">在订单簿和 OTC 市场里，结合评级挑选高质量碳信用。</p>
          </div>
          <Link href="/" className="px-5 py-2.5 rounded-full bg-accent text-background font-medium hover:bg-accent-strong transition-colors">
            前往交易所 →
          </Link>
        </section>
      </Reveal>
    </div>
  );
}
