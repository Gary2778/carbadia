"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { api, fmtMoney, fmtQty } from "@/lib/format";
import { Sparkline } from "@/components/charts/Sparkline";
import { FlashCell } from "@/components/anim/FlashCell";
import { ParticleHero } from "@/components/anim/ParticleHero";

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

const HERO_LINES = ["让每一吨碳", "都有公允的价格"];

export default function Home() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const reduced = useReducedMotion();

  useEffect(() => {
    const load = () =>
      api<Asset[]>("/api/assets")
        .then((a) => {
          setAssets(a);
          setErr("");
        })
        .catch((e) => setErr(e.message))
        .finally(() => setLoading(false));
    load();
    const t = setInterval(load, 2000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="space-y-10">
      <section className="relative text-center pt-12 pb-6 sm:pt-20 sm:pb-10">
        <ParticleHero />
        <motion.p
          className="text-accent font-semibold mb-4 tracking-tight"
          initial={reduced ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          Carbadia · 碳信用交易所 · 模拟盘
        </motion.p>
        <h1 className="text-5xl sm:text-6xl font-semibold tracking-tight leading-[1.05] mb-6">
          {HERO_LINES.map((line, li) => (
            <span key={li} className="block">
              {[...line].map((ch, i) => (
                <motion.span
                  key={i}
                  className="inline-block"
                  initial={reduced ? false : { opacity: 0, y: 26 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: reduced ? 0 : 0.06 * (li * line.length + i) + 0.15, duration: 0.55, ease: [0.21, 0.7, 0.3, 1] }}
                >
                  {ch}
                </motion.span>
              ))}
            </span>
          ))}
        </h1>
        <motion.p
          className="text-lg sm:text-xl text-muted max-w-2xl mx-auto leading-relaxed"
          initial={reduced ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: reduced ? 0 : 0.9, duration: 0.5 }}
        >
          交易经核证的碳减排量。订单簿撮合的标准化现货，面向大宗的 OTC 挂牌，
          清晰透明，一处成交。
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
              开始交易
            </Link>
          </motion.span>
          <motion.span whileHover={reduced ? undefined : { scale: 1.04 }} whileTap={{ scale: 0.97 }}>
            <Link
              href="/otc"
              className="inline-block px-6 py-3 rounded-full bg-surface-2 text-foreground font-medium hover:bg-border/60 transition-colors"
            >
              浏览 OTC 挂牌 →
            </Link>
          </motion.span>
        </motion.div>
      </section>

      <section className="rounded-2xl border border-border bg-surface shadow-card overflow-hidden">
        <div className="px-5 py-3 border-b border-border flex items-center justify-between">
          <h2 className="font-semibold">现货行情</h2>
          <span className="text-xs text-muted">{assets.length} 个标的 · 实时模拟行情</span>
        </div>
        {loading ? (
          <div className="p-8 text-center text-muted">加载中…</div>
        ) : err ? (
          <div className="p-8 text-center text-down">{err}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-muted text-xs">
                <tr className="border-b border-border">
                  <th className="text-left font-medium px-5 py-3">代码 / 项目</th>
                  <th className="text-left font-medium px-3 py-3 hidden md:table-cell">标准</th>
                  <th className="text-right font-medium px-3 py-3">最新价</th>
                  <th className="text-right font-medium px-3 py-3">24h 涨跌</th>
                  <th className="text-center font-medium px-3 py-3 hidden lg:table-cell">24h 走势</th>
                  <th className="text-right font-medium px-3 py-3 hidden sm:table-cell">买一 / 卖一</th>
                  <th className="text-right font-medium px-5 py-3">24h 量(吨)</th>
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
                    <td className="px-5 py-3">
                      <Link href={`/market/${a.symbol}`} className="block group">
                        <div className="font-medium group-hover:text-accent transition-colors">{a.symbol}</div>
                        <div className="text-xs text-muted truncate max-w-[200px]">{a.name}</div>
                      </Link>
                    </td>
                    <td className="px-3 py-3 hidden md:table-cell">
                      <span className="text-xs px-2 py-0.5 rounded bg-surface-2 border border-border">{a.standard}</span>
                    </td>
                    <td className="px-3 py-3 text-right tnum font-medium">
                      <FlashCell value={a.lastPrice} className="inline-block px-1 -mx-1">
                        {a.lastPrice == null ? <span className="text-muted">—</span> : `¥${fmtMoney(a.lastPrice)}`}
                      </FlashCell>
                    </td>
                    <td className="px-3 py-3 text-right">
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
                    <td className="px-3 py-3 text-right tnum hidden sm:table-cell">
                      <span className="text-up">{a.bestBid == null ? "—" : fmtMoney(a.bestBid)}</span>
                      <span className="text-muted mx-1">/</span>
                      <span className="text-down">{a.bestAsk == null ? "—" : fmtMoney(a.bestAsk)}</span>
                    </td>
                    <td className="px-5 py-3 text-right tnum text-muted">{fmtQty(a.volume24h)}</td>
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
