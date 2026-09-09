"use client";

import { motion, useReducedMotion } from "motion/react";
import { ParticleHero } from "@/components/anim/ParticleHero";
import { ransomParts } from "@/components/RansomText";
import { ComplianceNote } from "@/components/ComplianceNote";
import { useT, useLang } from "@/lib/i18n";
import { isCJK, splitsByWord } from "@/i18n/config";
import { useTheme } from "@/lib/theme";
import { ExchangeEntryCard } from "@/components/home/ExchangeEntryCard";
import { ObservatoryEntryCard } from "@/components/home/ObservatoryEntryCard";
import { StudioEntryCard } from "@/components/home/StudioEntryCard";
import { ProEntryCard } from "@/components/home/ProEntryCard";
import { homePreviewCopy } from "@/components/home/homePreviewCopy";

export type LatestArticleMeta = { slug: string; issue: number; title: string; date: string } | null;

export function HomeClient({ latestArticle }: { latestArticle: LatestArticleMeta }) {
  const t = useT("home");
  const { lang } = useLang();
  const { theme } = useTheme();
  const dark = theme === "dark";
  const reduced = useReducedMotion();

  return (
    <div className="space-y-10">
      <section className="relative text-center pt-12 pb-6 sm:pt-20 sm:pb-10">
        {/* 碳分子背景仅在浅色模式显示；深色模式用星空背景，避免叠加 */}
        {!dark && <ParticleHero />}
        <motion.p
          className="text-accent font-semibold mb-4 tracking-tight"
          initial={reduced ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {t.kicker}
        </motion.p>
        <h1 className={`text-4xl sm:text-6xl font-semibold tracking-tight ${isCJK(lang) ? "leading-tight" : "leading-[1.05]"} mb-6 ${dark ? "ransom-line" : ""}`}>
          {t.heroLines.map((line, li) => (
            // key 含 lang+theme：切语言或切换 dark/light 时整体重挂载,每个字重放逐字出场动画
            <span key={`${lang}-${theme}-${li}`} className="block">
              {/* 阿拉伯文字母连写:逐字符拆分会破坏字形,按词拆分动画 */}
              {(splitsByWord(lang) ? line.split(/(\s+)/).filter(Boolean) : [...line]).map((ch, i) => {
                if (/^\s+$/.test(ch))
                  // 空格保留为可换行的真实空白（英文标题词间距），不套 inline-block 以免被折叠
                  return <span key={`${lang}-${theme}-${i}`}>{" "}</span>;
                const delay = reduced ? 0 : 0.06 * (li * line.length + i) + 0.15;
                if (dark) {
                  // 深色：每个字是一张"剪报纸片"，倾斜/纸色稳定，逐字弹入归位
                  const p = ransomParts(line, i);
                  return (
                    <motion.span
                      key={`${lang}-${theme}-${i}`}
                      className="ransom-letter inline-block"
                      style={{ background: p.bg, color: p.fg, fontFamily: p.font }}
                      initial={reduced ? false : { opacity: 0, y: 26, rotate: p.rot - 6, scale: p.scale * 0.8 }}
                      animate={{ opacity: 1, y: 0, rotate: p.rot, scale: p.scale }}
                      transition={{ delay, duration: 0.55, ease: [0.21, 0.7, 0.3, 1] }}
                    >
                      {ch}
                    </motion.span>
                  );
                }
                return (
                  <motion.span
                    key={`${lang}-${theme}-${i}`}
                    className="inline-block"
                    initial={reduced ? false : { opacity: 0, y: 26 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay, duration: 0.55, ease: [0.21, 0.7, 0.3, 1] }}
                  >
                    {ch}
                  </motion.span>
                );
              })}
            </span>
          ))}
        </h1>
        <motion.p
          className="text-lg sm:text-xl text-muted max-w-2xl mx-auto leading-relaxed"
          initial={reduced ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: reduced ? 0 : 0.9, duration: 0.5 }}
        >
          {t.heroSubtitle}
        </motion.p>
        <ComplianceNote className="text-center mt-7 max-w-xl mx-auto" />
      </section>

      <section aria-label={homePreviewCopy.productArea.ariaLabel} className="mx-auto max-w-6xl space-y-5 pb-4">
        <div className="flex flex-col gap-2 border-b border-border pb-4 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
          <p className="font-mono text-[10px] tracking-[0.18em] text-accent">{homePreviewCopy.productArea.label}</p>
          <p className="max-w-xl text-sm leading-relaxed text-muted sm:text-end">{homePreviewCopy.productArea.summary}</p>
        </div>

        <div className="grid items-stretch gap-5 md:grid-cols-2 lg:grid-cols-3">
          <ExchangeEntryCard />
          <ObservatoryEntryCard latest={latestArticle} />
          <StudioEntryCard />
        </div>

        <div className="flex items-center gap-3 py-1 text-center font-mono text-[9px] tracking-[0.1em] text-muted" aria-hidden="true">
          <span className="h-px flex-1 bg-border" />
          <span>{homePreviewCopy.productArea.bridge}</span>
          <span className="h-px flex-1 bg-border" />
        </div>

        <ProEntryCard />
      </section>
    </div>
  );
}
