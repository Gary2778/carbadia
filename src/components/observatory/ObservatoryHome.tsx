"use client";

import Link from "next/link";
import { useState } from "react";
import { usePolling } from "@/lib/usePolling";
import { api, fmtTonnes } from "@/lib/format";
import { Reveal } from "@/components/anim/Reveal";
import { PixelMorphEntry } from "@/components/rating/PixelMorphEntry";
import { useT } from "@/lib/i18n";
import { ProductPageHeader } from "@/components/ProductPageHeader";

type Overview = {
  asOf: string | null;
  totals: { projects: number; issued: number; retired: number };
  registries: { registry: string }[];
  beneficiaries: { name: string; tonnes: number }[];
};

// 聚合表里空受益人的合并桶名(store.ts 约定),落地页摘要只展示具名受益人
const UNDISCLOSED = "UNDISCLOSED";

const day = (iso: string | null) => (iso ? iso.slice(0, 10) : "—");

export type ObsLatest = { slug: string; issue: number; title: string; date: string; summary: string } | null;

export function ObservatoryHome({ latest }: { latest: ObsLatest }) {
  const t = useT("obs");
  const tr = useT("real"); // 数据标签/CCER 免责与数据页共用同一份文案(红线口径只维护一处)
  const tm = useT("market"); // 轮询失败小字提示与行情页共用同一 key
  const [ov, setOv] = useState<Overview | null>(null);
  const [err, setErr] = useState("");
  usePolling(
    () =>
      api<Overview>("/api/real/overview")
        .then((o) => {
          setOv(o);
          setErr("");
        })
        .catch((e) => {
          setErr(e.message);
          throw e;
        }),
    120_000
  );

  // 首载占位:ov 未到时用同款卡渲染『—』,布局零跳动(STATES-5)
  const stats: [string, string][] = ov
    ? [
        [tr.statProjects, ov.totals.projects.toLocaleString()],
        [tr.statIssued, fmtTonnes(ov.totals.issued)],
        [tr.statRetired, fmtTonnes(ov.totals.retired)],
        [tr.statRegistries, String(ov.registries.length)],
      ]
    : [
        [tr.statProjects, "—"],
        [tr.statIssued, "—"],
        [tr.statRetired, "—"],
        [tr.statRegistries, "—"],
      ];

  // 主栏摘要 = 注销排行前 6(具名受益人):谁在替谁注销,是国际市场最有观察价值的一列
  const topRetirers = (ov?.beneficiaries ?? []).filter((b) => b.name !== UNDISCLOSED).slice(0, 6);

  return (
    <div className="space-y-10">
      {/* 刊头:编辑部质感的落地锚点 */}
      <ProductPageHeader
        eyebrow="OBSERVATORY"
        title={t.title}
        description={t.tagline}
        meta={ov?.asOf ? tr.asOf(day(ov.asOf)) : undefined}
      />

      {/* 数据速览条:失败不清空已有数据——有数据时只在上方加一行小字提示,ov 为 null 才占据速览位置显示错误(STATES-5) */}
      {err && ov && <div className="text-down text-xs">{tm.refreshFailed}</div>}
      {err && !ov ? (
        <div className="text-down text-sm">{err}</div>
      ) : (
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {stats.map(([label, value]) => (
            <div key={label} className="rounded-2xl border border-border bg-surface shadow-card px-4 py-3">
              <div className="text-xs text-muted truncate">{label}</div>
              <div className="tnum text-xl font-semibold mt-0.5">{value}</div>
            </div>
          ))}
        </section>
      )}

      {/* 红线: 速览数字源自 OffsetsDB 聚合,署名不可少(文案与数据页同 key) */}
      <p className="text-xs text-muted -mt-6">
        {tr.attributionPre}
        <a href="https://carbonplan.org/research/offsets-db" target="_blank" rel="noreferrer" className="underline hover:text-foreground">
          CarbonPlan OffsetsDB
        </a>
        {tr.attributionPost}
      </p>

      {/* 主栏 注销排行摘要 + 侧栏最新文章(还没有文章时侧栏整块不出现,主栏占满) */}
      <section className={latest ? "grid gap-6 lg:grid-cols-3" : ""}>
        <div className={`${latest ? "lg:col-span-2 " : ""}rounded-2xl border border-border bg-surface shadow-card overflow-hidden`}>
          <div className="px-5 py-3 border-b border-border flex items-center justify-between">
            <h2 className="font-serif font-semibold">{tr.retireTitle}</h2>
            {ov?.asOf && <span className="text-xs text-muted">{tr.asOf(day(ov.asOf))}</span>}
          </div>
          <ul className="divide-y divide-border/50">
            {/* 首载占位:同款行高的空行撑住列表底,高度稳定不跳动(STATES-5) */}
            {!ov &&
              Array.from({ length: 6 }, (_, i) => (
                <li key={i} className="px-5 py-3 text-sm flex items-center gap-3">
                  <span className="text-xs text-muted tnum w-4 shrink-0">{i + 1}</span>
                  <span className="flex-1 min-w-0 truncate text-muted">—</span>
                </li>
              ))}
            {topRetirers.map((b, i) => (
              <li key={b.name} className="px-5 py-3 text-sm flex items-center gap-3">
                <span className="text-xs text-muted tnum w-4 shrink-0">{i + 1}</span>
                <span className="flex-1 min-w-0 truncate" title={b.name}>{b.name}</span>
                <span className="text-xs text-accent tnum shrink-0">{fmtTonnes(b.tonnes)}</span>
              </li>
            ))}
          </ul>
          <div className="px-5 py-3 border-t border-border">
            <Link href="/observatory/data" className="text-accent text-sm font-medium hover:underline">
              {t.dataCta}
            </Link>
          </div>
        </div>

        {latest && (
          <Reveal>
            <aside className="rounded-2xl border border-border bg-surface shadow-card p-5 h-full flex flex-col">
              <div className="text-xs text-muted mb-2">{t.latestIssue}</div>
              <div className="font-mono text-[10px] tracking-[0.2em] text-accent mb-1">
                {t.issueN(latest.issue)} · {latest.date}
              </div>
              <h3 className="font-serif text-xl leading-snug">{latest.title}</h3>
              {latest.summary && <p className="text-sm text-muted mt-2 leading-relaxed">{latest.summary}</p>}
              <Link href={`/observatory/articles/${latest.slug}`} className="text-accent text-sm font-medium mt-auto pt-4 hover:underline">
                {t.readIssue}
              </Link>
            </aside>
          </Reveal>
        )}
      </section>

      {/* 评级入口条:沿用首页原 PixelMorphEntry(动画资产整体迁居于此) */}
      <section className="py-2">
        <PixelMorphEntry />
      </section>
    </div>
  );
}
