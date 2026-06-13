"use client";

import Link from "next/link";
import { Reveal } from "@/components/anim/Reveal";
import { useRatingReveal } from "@/components/rating/PixelTransition";
import { useT } from "@/lib/i18n";

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

// 项目元数据（代码/评级/颜色为数据，名称/类型随语言取自 DICT）
const PROJECTS: { symbol: string; type: string; grade: string; color: string }[] = [
  { symbol: "GS-MANG-2022", type: "blueCarbon", grade: "AA", color: "#0a8a52" },
  { symbol: "VCS-FOR-2021", type: "forestry", grade: "A", color: "#0fae66" },
  { symbol: "CCER-SOL-2023", type: "renewable", grade: "BBB", color: "#5cb85c" },
  { symbol: "GS-WIND-2022", type: "renewable", grade: "BBB", color: "#5cb85c" },
  { symbol: "CDM-METH-2019", type: "methane", grade: "BB", color: "#d6a800" },
  { symbol: "VCS-COOK-2020", type: "efficiency", grade: "B", color: "#e08e1b" },
];

const DICT = {
  en: {
    eyebrow: "CARBON CREDIT RATING",
    title: "Carbon Credit Rating",
    lead:
      "Exclusive to Carbadia — an independent, transparent assessment of the real emission-reduction quality of every carbon credit. Eight grades, from AAA to D, so you can read a project's quality at a glance.",
    disclaimer: "Sample ratings · For demonstration only, not investment advice",
    ladderTitle: "Rating ladder",
    ladderSub: "From investment grade (deep green) to high risk (red) — eight grades in all.",
    dimsTitle: "The four dimensions we assess",
    dims: {
      additionality: {
        title: "Additionality",
        desc: "Would the emission reduction have happened anyway without this carbon-credit revenue? The less likely, the higher the quality.",
      },
      permanence: {
        title: "Permanence",
        desc: "How great is the risk that sequestered carbon is re-released (e.g. forest fire, deforestation)?",
      },
      doubleCounting: {
        title: "Double-counting",
        desc: "Is the same tonne of reduction claimed more than once across registries or by multiple parties?",
      },
      coBenefits: {
        title: "Co-benefits",
        desc: "The project's additional positive impact on biodiversity, jobs and local communities.",
      },
    },
    projectsTitle: "Rated projects (sample)",
    instrumentsCount: (n: number) => `${n} instruments`,
    names: {
      "GS-MANG-2022": "Indonesia Mangrove Blue Carbon Restoration",
      "VCS-FOR-2021": "Yunnan Forest Management Carbon Sink",
      "CCER-SOL-2023": "Qinghai Solar PV",
      "GS-WIND-2022": "Rajasthan Wind (India)",
      "CDM-METH-2019": "Brazil Landfill Gas Capture",
      "VCS-COOK-2020": "Kenya Efficient Cookstoves",
    } as Record<string, string>,
    types: {
      blueCarbon: "Blue carbon",
      forestry: "Forestry sink",
      renewable: "Renewable energy",
      methane: "Methane capture",
      efficiency: "Efficiency",
    } as Record<string, string>,
    ctaTitle: "Bring ratings into your trading decisions",
    ctaSub: "Use ratings to pick high-quality carbon credits in the order book and OTC market.",
    ctaLink: "Go to the exchange →",
  },
  zh: {
    eyebrow: "CARBON CREDIT RATING",
    title: "碳信用评级服务",
    lead:
      "Carbadia 独家——独立、透明地评估每一笔碳信用的真实减排质量。八档信用评级，从 AAA 到 D，一眼看懂项目成色。",
    disclaimer: "示例评级 · 仅供演示，不构成投资建议",
    ladderTitle: "评级阶梯",
    ladderSub: "从投资级（深绿）到高风险（红），共八档。",
    dimsTitle: "我们评估的四个维度",
    dims: {
      additionality: {
        title: "额外性 Additionality",
        desc: "没有这笔碳信用收入，减排是否本就会发生？越不可能，质量越高。",
      },
      permanence: {
        title: "永久性 Permanence",
        desc: "已封存的碳被重新释放（如森林火灾、毁林）的风险有多大？",
      },
      doubleCounting: {
        title: "重复计算 Double-counting",
        desc: "同一吨减排是否被多个登记簿或多方重复主张？",
      },
      coBenefits: {
        title: "协同效益 Co-benefits",
        desc: "项目对生物多样性、就业与当地社区的额外正向影响。",
      },
    },
    projectsTitle: "已评级项目（示例）",
    instrumentsCount: (n: number) => `${n} 个标的`,
    names: {
      "GS-MANG-2022": "印尼红树林蓝碳修复",
      "VCS-FOR-2021": "云南森林经营碳汇项目",
      "CCER-SOL-2023": "青海光伏发电项目",
      "GS-WIND-2022": "印度拉贾斯坦风电项目",
      "CDM-METH-2019": "巴西垃圾填埋气回收",
      "VCS-COOK-2020": "肯尼亚高效炉灶项目",
    } as Record<string, string>,
    types: {
      blueCarbon: "蓝碳",
      forestry: "林业碳汇",
      renewable: "可再生能源",
      methane: "甲烷回收",
      efficiency: "能效",
    } as Record<string, string>,
    ctaTitle: "把评级带进交易决策",
    ctaSub: "在订单簿和 OTC 市场里，结合评级挑选高质量碳信用。",
    ctaLink: "前往交易所 →",
  },
};

export default function RatingPage() {
  useRatingReveal();
  const t = useT(DICT);

  return (
    <div className="space-y-10">
      <header className="pt-6">
        <p className="font-mono text-xs tracking-[0.3em] text-accent mb-2">{t.eyebrow}</p>
        <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight">{t.title}</h1>
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
                href={`/market/${p.symbol}`}
                className="flex items-center gap-3 px-5 py-3.5 border-b border-border/50 last:border-b-0 hover:bg-surface-2 transition-colors"
              >
                <div className="min-w-0">
                  <div className="font-medium text-sm truncate">{t.names[p.symbol] ?? p.symbol}</div>
                  <div className="text-muted text-xs">{p.symbol} · {t.types[p.type] ?? p.type}</div>
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
            <h2 className="font-semibold">{t.ctaTitle}</h2>
            <p className="text-muted text-sm mt-1">{t.ctaSub}</p>
          </div>
          <Link href="/" className="px-5 py-2.5 rounded-full bg-accent text-background font-medium hover:bg-accent-strong transition-colors">
            {t.ctaLink}
          </Link>
        </section>
      </Reveal>
    </div>
  );
}
