"use client";

import Link from "next/link";
import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { usePolling } from "@/lib/usePolling";
import { api, fmtMoney, fmtQty } from "@/lib/format";
import { Sparkline } from "@/components/charts/Sparkline";
import { FlashCell } from "@/components/anim/FlashCell";
import { ParticleHero } from "@/components/anim/ParticleHero";
import { PixelMorphEntry } from "@/components/rating/PixelMorphEntry";
import { SoccerBall } from "@/components/SoccerBall";
import { RansomText, ransomParts } from "@/components/RansomText";
import { ComplianceNote } from "@/components/ComplianceNote";
import { useT, useLang } from "@/lib/i18n";
import { isCJK, splitsByWord } from "@/i18n/config";
import { tName } from "@/lib/data-i18n";
import { useTheme } from "@/lib/theme";

type Asset = {
  id: string;
  symbol: string;
  name: string;
  standard: string;
  projectType: string;
  vintage: number;
  country: string;
  lastPrice: number | null;
  bestBid: number | null;
  bestAsk: number | null;
  volume24h: number;
  change24h: number | null;
  spark: number[];
};

export default function Home() {
  const t = useT("home");
  const { lang } = useLang();
  const { theme } = useTheme();
  const dark = theme === "dark";
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const reduced = useReducedMotion();

  // 可见性感知轮询:切到后台自动暂停,回前台立即刷新(省电、省流量)
  usePolling(() => {
    api<Asset[]>("/api/assets")
      .then((a) => {
        setAssets(a);
        setErr("");
      })
      .catch((e) => setErr(e.message))
      .finally(() => setLoading(false));
  }, 2000);

  return (
    <div className="space-y-10">
      <SoccerBall />
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
        <motion.div
          className="flex flex-wrap gap-3 justify-center mt-9"
          initial={reduced ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: reduced ? 0 : 1.05, duration: 0.5 }}
        >
          <motion.span whileHover={reduced ? undefined : { scale: 1.04 }} whileTap={{ scale: 0.97 }}>
            <Link
              href="/portfolio"
              className="inline-block px-6 py-3 rounded-full bg-accent text-background font-medium hover:bg-accent-strong transition-colors"
            >
              {t.startTrading}
            </Link>
          </motion.span>
          <motion.span whileHover={reduced ? undefined : { scale: 1.04 }} whileTap={{ scale: 0.97 }}>
            <Link
              href="/otc"
              className="inline-block px-6 py-3 rounded-full bg-surface-2 text-foreground font-medium hover:bg-border/60 transition-colors"
            >
              {t.browseOtc}
            </Link>
          </motion.span>
        </motion.div>
        <ComplianceNote className="text-center mt-7 max-w-xl mx-auto" />
      </section>

      <section className="py-2">
        <PixelMorphEntry />
      </section>

      <section className="rounded-2xl border border-border bg-surface shadow-card overflow-hidden">
        <div className="px-5 py-3 border-b border-border flex items-center justify-between">
          <h2 className="font-semibold">
            <RansomText text={t.spotMarket} />
          </h2>
          <span className="text-xs text-muted">{t.instrumentsMeta(assets.length)}</span>
        </div>
        {loading ? (
          <div className="p-8 text-center text-muted">{t.loading}</div>
        ) : err ? (
          <div className="p-8 text-center text-down">{err}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-muted text-xs">
                <tr className="border-b border-border">
                  <th className="text-start font-medium px-3 sm:px-5 py-3">{t.thSymbolProject}</th>
                  <th className="text-start font-medium px-3 py-3 hidden md:table-cell">{t.thStandard}</th>
                  <th className="text-end font-medium px-3 py-3">{t.thLastPrice}</th>
                  <th className="text-end font-medium px-3 py-3">{t.thChange24h}</th>
                  <th className="text-center font-medium px-3 py-3 hidden lg:table-cell">{t.thTrend24h}</th>
                  <th className="text-end font-medium px-3 py-3 hidden sm:table-cell">{t.thBidAsk}</th>
                  <th className="text-end font-medium px-3 sm:px-5 py-3">{t.thVolume24h}</th>
                </tr>
              </thead>
              <tbody>
                {assets.map((a, i) => (
                  <motion.tr
                    key={a.id}
                    className="border-b border-border/50 hover:bg-surface-2 transition-colors"
                    initial={reduced ? false : { opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: reduced ? 0 : i * 0.05, duration: 0.35 }}
                  >
                    <td className="px-3 sm:px-5 py-3">
                      <Link href={`/market/${a.symbol}`} className="block group">
                        <div className="font-medium group-hover:text-accent transition-colors">{a.symbol}</div>
                        <div className="text-xs text-muted truncate max-w-[44vw] sm:max-w-[200px]">{tName(a.symbol, a.name, lang)}</div>
                      </Link>
                    </td>
                    <td className="px-3 py-3 hidden md:table-cell">
                      <span className="text-xs px-2 py-0.5 rounded bg-surface-2 border border-border">{a.standard}</span>
                    </td>
                    <td className="px-3 py-3 text-end tnum font-medium">
                      <FlashCell value={a.lastPrice} className="inline-block px-1 -mx-1">
                        {a.lastPrice == null ? <span className="text-muted">—</span> : `$${fmtMoney(a.lastPrice)}`}
                      </FlashCell>
                    </td>
                    <td className="px-3 py-3 text-end">
                      {a.change24h == null ? (
                        <span className="text-muted">—</span>
                      ) : (
                        <span
                          className={`tnum text-xs px-1.5 py-0.5 rounded font-medium ${
                            a.change24h >= 0 ? "bg-up/10 text-up" : "bg-down/10 text-down"
                          }`}
                        >
                          {a.change24h >= 0 ? "+" : ""}
                          {a.change24h.toFixed(2)}%
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3 hidden lg:table-cell">
                      <div className="flex justify-center">
                        <Sparkline data={a.spark} />
                      </div>
                    </td>
                    <td className="px-3 py-3 text-end tnum hidden sm:table-cell">
                      <span className="text-up">{a.bestBid == null ? "—" : fmtMoney(a.bestBid)}</span>
                      <span className="text-muted mx-1">/</span>
                      <span className="text-down">{a.bestAsk == null ? "—" : fmtMoney(a.bestAsk)}</span>
                    </td>
                    <td className="px-3 sm:px-5 py-3 text-end tnum text-muted">{fmtQty(a.volume24h)}</td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
