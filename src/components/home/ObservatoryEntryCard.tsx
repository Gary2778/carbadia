"use client";

// 首页观察区入口卡(编辑部感): 数据速览 + 最新一期 + 评级提示
import Link from "next/link";
import { useEffect, useState } from "react";
import { api, fmtTonnes } from "@/lib/format";
import { useT } from "@/lib/i18n";
import type { LatestArticleMeta } from "./HomeClient";
import { homePreviewCopy } from "./homePreviewCopy";
import styles from "./HomeProductPreview.module.css";

type Overview = {
  totals: { projects: number; issued: number; retired: number };
};

export function ObservatoryEntryCard({ latest }: { latest: LatestArticleMeta }) {
  const t = useT("home");
  const preview = homePreviewCopy.observatory;
  const tr = useT("real"); // 统计标签与数据页共用,不新造词
  const [ov, setOv] = useState<Overview | null>(null);
  useEffect(() => {
    api<Overview>("/api/real/overview").then(setOv).catch(() => setOv(null));
  }, []);
  return (
    <Link
      href="/observatory"
      className="group rounded-2xl border border-border bg-surface shadow-card p-6 flex h-full min-h-[26rem] flex-col gap-4 transition-colors hover:border-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <div className={styles.cardIntro}>
        <p className="font-mono text-[10px] tracking-[0.22em] text-accent mb-1">{preview.eyebrow}</p>
        <h2 className="text-xl font-semibold tracking-tight">{preview.title}</h2>
        <p className="text-sm text-muted mt-1 leading-relaxed">{t.obCardDesc}</p>
      </div>
      <div className="flex-1 space-y-3">
        {ov && (
          <div className="grid grid-cols-3 gap-2 text-center">
            {[
              [tr.statProjects, ov.totals.projects.toLocaleString()],
              [tr.statIssued, fmtTonnes(ov.totals.issued)],
              [tr.statRetired, fmtTonnes(ov.totals.retired)],
            ].map(([label, value]) => (
              <div key={label} className="rounded-lg bg-surface-2 px-2 py-2">
                <div className="text-[10px] text-muted truncate">{label}</div>
                <div className="tnum whitespace-nowrap text-[10px] font-medium sm:text-[11px] lg:text-[10px] xl:text-[10px] 2xl:text-[11px]">{value}</div>
              </div>
            ))}
          </div>
        )}
        {/* 还没有文章时整块不出现,不用"筹备中"占位 */}
        {latest && (
          <div className="border-t border-border pt-3">
            <div className="text-xs text-muted mb-1">{t.obCardLatest}</div>
            <div className="leading-snug">{latest.title}</div>
          </div>
        )}
        <div className="text-xs text-muted">{t.obCardRating} · CCRC</div>
      </div>
      <span className="text-accent font-medium group-hover:underline">{t.obCardCta}</span>
    </Link>
  );
}
