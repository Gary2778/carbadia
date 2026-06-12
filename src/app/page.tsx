"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api, fmtMoney, fmtQty } from "@/lib/format";

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
};

export default function Home() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    api<Asset[]>("/api/assets")
      .then(setAssets)
      .catch((e) => setErr(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-10">
      <section className="text-center pt-12 pb-6 sm:pt-20 sm:pb-10">
        <p className="text-accent font-semibold mb-4 tracking-tight">Carbadia · 碳信用交易所</p>
        <h1 className="text-5xl sm:text-6xl font-semibold tracking-tight leading-[1.05] mb-6">
          让每一吨碳
          <br className="hidden sm:block" />
          都有公允的价格
        </h1>
        <p className="text-lg sm:text-xl text-muted max-w-2xl mx-auto leading-relaxed">
          交易经核证的碳减排量。订单簿撮合的标准化现货，面向大宗的 OTC 挂牌，
          清晰透明，一处成交。
        </p>
        <div className="flex flex-wrap gap-3 justify-center mt-9">
          <Link
            href="/portfolio"
            className="px-6 py-3 rounded-full bg-accent text-background font-medium hover:bg-accent-strong transition-colors"
          >
            开始交易
          </Link>
          <Link
            href="/otc"
            className="px-6 py-3 rounded-full bg-surface-2 text-foreground font-medium hover:bg-border/60 transition-colors"
          >
            浏览 OTC 挂牌 →
          </Link>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-surface shadow-card overflow-hidden">
        <div className="px-5 py-3 border-b border-border flex items-center justify-between">
          <h2 className="font-semibold">现货行情</h2>
          <span className="text-xs text-muted">{assets.length} 个标的</span>
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
                  <th className="text-left font-medium px-3 py-3 hidden lg:table-cell">类型</th>
                  <th className="text-right font-medium px-3 py-3">最新价</th>
                  <th className="text-right font-medium px-3 py-3 hidden sm:table-cell">买一 / 卖一</th>
                  <th className="text-right font-medium px-5 py-3">24h 量(吨)</th>
                </tr>
              </thead>
              <tbody>
                {assets.map((a) => (
                  <tr key={a.id} className="border-b border-border/50 hover:bg-surface-2 transition-colors">
                    <td className="px-5 py-3">
                      <Link href={`/market/${a.symbol}`} className="block group">
                        <div className="font-medium group-hover:text-accent transition-colors">{a.symbol}</div>
                        <div className="text-xs text-muted truncate max-w-[200px]">{a.name}</div>
                      </Link>
                    </td>
                    <td className="px-3 py-3 hidden md:table-cell">
                      <span className="text-xs px-2 py-0.5 rounded bg-surface-2 border border-border">{a.standard}</span>
                    </td>
                    <td className="px-3 py-3 text-muted hidden lg:table-cell">{a.projectType}</td>
                    <td className="px-3 py-3 text-right tnum font-medium">
                      {a.lastPrice == null ? <span className="text-muted">—</span> : `¥${fmtMoney(a.lastPrice)}`}
                    </td>
                    <td className="px-3 py-3 text-right tnum hidden sm:table-cell">
                      <span className="text-up">{a.bestBid == null ? "—" : fmtMoney(a.bestBid)}</span>
                      <span className="text-muted mx-1">/</span>
                      <span className="text-down">{a.bestAsk == null ? "—" : fmtMoney(a.bestAsk)}</span>
                    </td>
                    <td className="px-5 py-3 text-right tnum text-muted">{fmtQty(a.volume24h)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
