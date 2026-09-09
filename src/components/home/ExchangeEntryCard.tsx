"use client";

// 首页交易所入口卡(终端感): 24h 成交量前三标的的迷你实时行情
import Link from "next/link";
import { useState } from "react";
import { usePolling } from "@/lib/usePolling";
import { api, fmtMoney } from "@/lib/format";
import { MiniCandleChart } from "@/components/charts/CandleChart";
import { useT, useLang } from "@/lib/i18n";
import { tName } from "@/lib/data-i18n";
import { homePreviewCopy } from "@/components/home/homePreviewCopy";
import type { Candle } from "@/lib/candles";
import styles from "./HomeProductPreview.module.css";

type Asset = {
  id: string;
  symbol: string;
  name: string;
  lastPrice: number | null;
  change24h: number | null;
  volume24h: number;
  miniCandles: Candle[];
};

export function ExchangeEntryCard() {
  const t = useT("home");
  const preview = homePreviewCopy.exchange;
  const { lang } = useLang();
  const [top, setTop] = useState<Asset[]>([]);
  const [err, setErr] = useState(false);
  usePolling(
    () =>
      api<Asset[]>("/api/assets?preview=home")
        .then((all) => {
          setTop([...all].sort((a, b) => b.volume24h - a.volume24h).slice(0, 3));
          setErr(false);
        })
        .catch((e) => {
          setErr(true);
          throw e;
        }),
    5000
  );
  return (
    <Link
      href="/exchange"
      className="group rounded-2xl border border-border bg-surface shadow-card p-6 flex h-full min-h-[26rem] flex-col gap-4 transition-colors hover:border-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <div className={styles.cardIntro}>
        <p className="font-mono text-[10px] tracking-[0.22em] text-accent mb-1">{preview.eyebrow}</p>
        <h2 className="text-xl font-semibold tracking-tight">{preview.title}</h2>
        <p className="text-sm text-muted mt-1 leading-relaxed">{t.exCardDesc}</p>
      </div>
      <div className="flex-1">
        <div className="text-xs text-muted mb-2">{t.exCardMeta}</div>
        {top.length === 0 ? (
          err ? <div className="text-sm text-muted">—</div> : <div className="text-sm text-muted">{t.loading}</div>
        ) : (
          <ul className="space-y-2">
            {top.map((a) => (
              <li key={a.id} className={styles.marketRow}>
                <span className={`${styles.marketSymbol} truncate text-xs font-medium sm:text-sm`}>{a.symbol}</span>
                <span className={`${styles.marketChart} min-w-0`}>
                  <MiniCandleChart
                    candles={a.miniCandles ?? []}
                    ariaLabel={`${a.symbol} · ${preview.klineLabel}`}
                    emptyLabel={`${a.symbol}: ${preview.klineEmptyLabel}`}
                  />
                </span>
                <span className={`${styles.marketPrice} tnum text-end`}>{a.lastPrice == null ? "—" : `$${fmtMoney(a.lastPrice)}`}</span>
                {a.change24h != null && (
                  <span className={`${styles.marketChange} tnum whitespace-nowrap rounded px-1.5 py-0.5 text-xs font-medium ${a.change24h >= 0 ? "bg-up/10 text-up" : "bg-down/10 text-down"}`}>
                    {a.change24h >= 0 ? "+" : ""}
                    {a.change24h.toFixed(2)}%
                  </span>
                )}
                <span className="sr-only">{tName(a.symbol, a.name, lang)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
      <span className="text-accent font-medium group-hover:underline">{t.exCardCta}</span>
    </Link>
  );
}
