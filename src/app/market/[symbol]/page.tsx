"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { api, fmtMoney, fmtQty } from "@/lib/format";
import { CandleChart } from "@/components/charts/CandleChart";
import { DepthChart } from "@/components/charts/DepthChart";
import { NumberTicker } from "@/components/anim/NumberTicker";
import { FlashCell } from "@/components/anim/FlashCell";
import { useToast } from "@/components/anim/Toast";
import type { Candle, IntervalKey } from "@/lib/candles";

type Level = { price: number; quantity: number };
type MarketData = {
  asset: {
    id: string; symbol: string; name: string; standard: string; projectType: string;
    vintage: number; country: string; registry: string; description: string; lastPrice: number | null;
  };
  stats: { high24h: number | null; low24h: number | null; vol24h: number; change24h: number | null };
  book: { bids: Level[]; asks: Level[] };
  trades: { id: string; price: number; quantity: number; createdAt: string }[];
  holding: { quantity: number; locked: number } | null;
  myOrders: { id: string; side: string; type: string; price: number | null; quantity: number; filledQuantity: number; status: string }[];
};

const INTERVAL_TABS: { key: IntervalKey; label: string }[] = [
  { key: "1m", label: "1分" },
  { key: "5m", label: "5分" },
  { key: "1h", label: "1时" },
  { key: "1d", label: "1日" },
];

export default function MarketPage({ params }: { params: Promise<{ symbol: string }> }) {
  const { symbol } = use(params);
  const [data, setData] = useState<MarketData | null>(null);
  const [candles, setCandles] = useState<Candle[]>([]);
  const [period, setPeriod] = useState<IntervalKey>("1m");
  const [tab, setTab] = useState<"candles" | "depth">("candles");
  const [err, setErr] = useState("");
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);

  const load = useCallback(async () => {
    try {
      const d = await api<MarketData>(`/api/assets/${symbol}`);
      setData(d);
      setErr("");
    } catch (e) {
      setErr((e as Error).message);
    }
  }, [symbol]);

  const loadCandles = useCallback(async () => {
    try {
      const d = await api<{ candles: Candle[] }>(`/api/assets/${symbol}/candles?interval=${period}`);
      setCandles(d.candles);
    } catch {
      /* 图表数据失败不打断页面 */
    }
  }, [symbol, period]);

  useEffect(() => {
    api("/api/auth/me").then((u) => setLoggedIn(!!u)).catch(() => setLoggedIn(false));
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 2000);
    return () => clearInterval(t);
  }, [load]);

  useEffect(() => {
    loadCandles();
    const t = setInterval(loadCandles, 5000);
    return () => clearInterval(t);
  }, [loadCandles]);

  if (err) return <div className="text-down p-8 text-center">{err}</div>;
  if (!data) return <div className="text-muted p-8 text-center">加载中…</div>;

  const { asset, stats, book, trades, holding, myOrders } = data;
  const maxDepth = Math.max(1, ...book.bids.map((b) => b.quantity), ...book.asks.map((a) => a.quantity));

  return (
    <div className="space-y-4">
      {/* 标的头部 */}
      <div className="rounded-2xl border border-border bg-surface shadow-card p-5 flex flex-wrap items-center gap-x-8 gap-y-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold">{asset.symbol}</h1>
            <span className="text-xs px-2 py-0.5 rounded bg-surface-2 border border-border">{asset.standard}</span>
          </div>
          <div className="text-muted text-sm">{asset.name}</div>
        </div>
        <div>
          <div className="text-xs text-muted">最新成交价</div>
          <div className="flex items-baseline gap-2">
            <FlashCell value={asset.lastPrice} className="inline-block px-1 -mx-1">
              <span className="tnum text-2xl font-semibold text-accent">
                {asset.lastPrice == null ? "—" : <>¥<NumberTicker value={asset.lastPrice} /></>}
              </span>
            </FlashCell>
            {stats.change24h != null && (
              <span
                className={`tnum text-xs px-1.5 py-0.5 rounded font-medium ${
                  stats.change24h >= 0 ? "bg-up/10 text-up" : "bg-down/10 text-down"
                }`}
              >
                {stats.change24h >= 0 ? "+" : ""}
                {stats.change24h.toFixed(2)}%
              </span>
            )}
          </div>
        </div>
        <div className="text-sm space-y-0.5">
          <div className="text-xs text-muted">24h 高 / 低 / 量</div>
          <div className="tnum">
            <span className="text-up">{stats.high24h == null ? "—" : fmtMoney(stats.high24h)}</span>
            <span className="text-muted mx-1">/</span>
            <span className="text-down">{stats.low24h == null ? "—" : fmtMoney(stats.low24h)}</span>
            <span className="text-muted mx-1">/</span>
            <span>{fmtQty(stats.vol24h)} 吨</span>
          </div>
        </div>
        <div className="text-sm text-muted space-y-0.5">
          <div>项目类型: <span className="text-foreground">{asset.projectType}</span></div>
          <div>签发年份: <span className="text-foreground">{asset.vintage}</span> · 地区: <span className="text-foreground">{asset.country}</span></div>
          <div>登记簿: <span className="text-foreground">{asset.registry}</span></div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
        {/* 左侧: 图表 + 最近成交 */}
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-2xl border border-border bg-surface shadow-card">
            <div className="px-4 py-2 border-b border-border flex items-center gap-1">
              {(["candles", "depth"] as const).map((t) => (
                <button key={t} onClick={() => setTab(t)} className="relative px-3 py-1.5 text-sm rounded-full">
                  {tab === t && (
                    <motion.span
                      layoutId="chart-tab"
                      className="absolute inset-0 bg-surface-2 rounded-full"
                      transition={{ type: "spring", stiffness: 380, damping: 32 }}
                    />
                  )}
                  <span className={`relative ${tab === t ? "text-foreground font-medium" : "text-muted"}`}>
                    {t === "candles" ? "K线" : "深度"}
                  </span>
                </button>
              ))}
              {tab === "candles" && (
                <div className="ml-auto flex gap-1">
                  {INTERVAL_TABS.map((it) => (
                    <button
                      key={it.key}
                      onClick={() => setPeriod(it.key)}
                      className={`px-2.5 py-1 text-xs rounded transition-colors ${
                        period === it.key ? "bg-surface-2 text-foreground border border-border" : "text-muted hover:text-foreground"
                      }`}
                    >
                      {it.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="p-3">
              {tab === "candles" ? (
                <CandleChart candles={candles} lastPrice={asset.lastPrice} />
              ) : (
                <DepthChart bids={book.bids} asks={book.asks} />
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-surface shadow-card">
            <div className="px-4 py-2.5 border-b border-border font-semibold text-sm">最近成交</div>
            <div className="p-2">
              <div className="grid grid-cols-3 text-xs text-muted px-2 pb-1">
                <span>价格</span><span className="text-right">数量</span><span className="text-right">时间</span>
              </div>
              <div className="max-h-[280px] overflow-y-auto">
                {trades.length === 0 ? (
                  <div className="text-center text-muted text-sm py-8">暂无成交</div>
                ) : (
                  trades.map((t) => (
                    <motion.div
                      key={t.id}
                      className="grid grid-cols-3 text-xs tnum px-2 py-1 hover:bg-surface-2 rounded"
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <span className="text-accent">{fmtMoney(t.price)}</span>
                      <span className="text-right">{fmtQty(t.quantity)}</span>
                      <span className="text-right text-muted">
                        {new Date(t.createdAt).toLocaleTimeString("zh-CN", { hour12: false })}
                      </span>
                    </motion.div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 右侧: 订单簿 + 下单 */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-surface shadow-card">
            <div className="px-4 py-2.5 border-b border-border font-semibold text-sm">订单簿</div>
            <div className="p-2">
              <DepthSide levels={book.asks} side="ask" max={maxDepth} reverse />
              <div className="py-2 px-2 my-1 border-y border-border tnum text-center text-lg font-semibold">
                <FlashCell value={asset.lastPrice} className="inline-block px-2 -mx-2">
                  {asset.lastPrice == null ? <span className="text-muted text-sm">暂无成交</span> : `¥${fmtMoney(asset.lastPrice)}`}
                </FlashCell>
              </div>
              <DepthSide levels={book.bids} side="bid" max={maxDepth} />
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-surface shadow-card">
            <div className="px-4 py-2.5 border-b border-border font-semibold text-sm">下单</div>
            <div className="p-4">
              {loggedIn === false ? (
                <div className="text-center text-muted text-sm py-8">
                  请先<Link href="/login" className="text-accent mx-1">登录</Link>后交易
                </div>
              ) : (
                <OrderForm
                  assetId={asset.id}
                  bestAsk={book.asks[0]?.price ?? null}
                  bestBid={book.bids[0]?.price ?? null}
                  holding={holding}
                  onDone={load}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 我的挂单 */}
      {loggedIn && (
        <div className="rounded-2xl border border-border bg-surface shadow-card">
          <div className="px-4 py-2.5 border-b border-border font-semibold text-sm flex items-center justify-between">
            <span>我的当前委托</span>
            {holding && <span className="text-xs text-muted">持仓 {fmtQty(holding.quantity)} 吨(冻结 {fmtQty(holding.locked)})</span>}
          </div>
          {myOrders.length === 0 ? (
            <div className="text-center text-muted text-sm py-6">无未完成委托</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-muted text-xs">
                <tr className="border-b border-border">
                  <th className="text-left px-4 py-2 font-medium">方向</th>
                  <th className="text-left px-3 py-2 font-medium">类型</th>
                  <th className="text-right px-3 py-2 font-medium">价格</th>
                  <th className="text-right px-3 py-2 font-medium">已成交/总量</th>
                  <th className="text-right px-4 py-2 font-medium">操作</th>
                </tr>
              </thead>
              <tbody>
                {myOrders.map((o) => (
                  <tr key={o.id} className="border-b border-border/40">
                    <td className={`px-4 py-2 font-medium ${o.side === "BUY" ? "text-up" : "text-down"}`}>
                      {o.side === "BUY" ? "买入" : "卖出"}
                    </td>
                    <td className="px-3 py-2 text-muted">{o.type === "LIMIT" ? "限价" : "市价"}</td>
                    <td className="px-3 py-2 text-right tnum">{o.price == null ? "市价" : fmtMoney(o.price)}</td>
                    <td className="px-3 py-2 text-right tnum">{fmtQty(o.filledQuantity)} / {fmtQty(o.quantity)}</td>
                    <td className="px-4 py-2 text-right">
                      <CancelOrderBtn id={o.id} onDone={load} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}

function DepthSide({ levels, side, max, reverse }: { levels: Level[]; side: "bid" | "ask"; max: number; reverse?: boolean }) {
  const rows = reverse ? [...levels].reverse() : levels;
  const color = side === "bid" ? "text-up" : "text-down";
  const bar = side === "bid" ? "bg-up/10" : "bg-down/10";
  return (
    <div>
      {rows.length === 0 && <div className="text-center text-muted text-xs py-3">无挂单</div>}
      {rows.map((l) => (
        <motion.div
          key={l.price}
          className="relative grid grid-cols-2 text-xs tnum px-2 py-1"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.25 }}
        >
          <motion.div
            className={`absolute inset-y-0 right-0 ${bar}`}
            animate={{ width: `${(l.quantity / max) * 100}%` }}
            transition={{ type: "spring", stiffness: 120, damping: 22 }}
          />
          <span className={`relative ${color}`}>{fmtMoney(l.price)}</span>
          <span className="relative text-right">{fmtQty(l.quantity)}</span>
        </motion.div>
      ))}
    </div>
  );
}

function OrderForm({
  assetId, bestAsk, bestBid, holding, onDone,
}: {
  assetId: string;
  bestAsk: number | null;
  bestBid: number | null;
  holding: { quantity: number; locked: number } | null;
  onDone: () => void;
}) {
  const toast = useToast();
  const [side, setSide] = useState<"BUY" | "SELL">("BUY");
  const [type, setType] = useState<"LIMIT" | "MARKET">("LIMIT");
  const [price, setPrice] = useState("");
  const [quantity, setQuantity] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const available = holding ? holding.quantity - holding.locked : 0;
  const estTotal = type === "LIMIT" && price && quantity ? Number(price) * Number(quantity) : null;

  async function submit() {
    setBusy(true);
    try {
      const res = await api<{ filledQty: number; order: { status: string } }>("/api/orders", {
        method: "POST",
        body: JSON.stringify({
          assetId,
          side,
          type,
          price: type === "LIMIT" ? Number(price) : null,
          quantity: Number(quantity),
        }),
      });
      toast(
        "ok",
        res.filledQty > 0
          ? `成交 ${res.filledQty} 吨，订单${statusZh(res.order.status)}`
          : `已挂单（${statusZh(res.order.status)}）`
      );
      setQuantity("");
      setDone(true);
      setTimeout(() => setDone(false), 1200);
      onDone();
    } catch (e) {
      toast("err", (e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => setSide("BUY")}
          className={`py-2.5 rounded-xl text-sm font-medium transition-colors ${side === "BUY" ? "bg-up text-background" : "bg-surface-2 text-muted hover:text-foreground"}`}
        >买入</button>
        <button
          onClick={() => setSide("SELL")}
          className={`py-2.5 rounded-xl text-sm font-medium transition-colors ${side === "SELL" ? "bg-down text-background" : "bg-surface-2 text-muted hover:text-foreground"}`}
        >卖出</button>
      </div>

      <div className="flex gap-2 text-xs">
        {(["LIMIT", "MARKET"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setType(t)}
            className={`px-3 py-1 rounded ${type === t ? "bg-surface-2 text-foreground border border-border" : "text-muted"}`}
          >{t === "LIMIT" ? "限价单" : "市价单"}</button>
        ))}
      </div>

      {type === "LIMIT" && (
        <label className="block">
          <span className="text-xs text-muted">价格 (元/吨)</span>
          <div className="flex gap-2 mt-1">
            <input
              type="number" value={price} onChange={(e) => setPrice(e.target.value)}
              placeholder="0.00" min="0" step="0.01"
              className="flex-1 bg-surface-2 border border-border rounded-xl px-3.5 py-2.5 text-sm tnum outline-none focus:border-accent"
            />
            <button
              type="button"
              onClick={() => setPrice(String((side === "BUY" ? bestAsk : bestBid) ?? ""))}
              className="text-xs text-muted hover:text-foreground px-2 whitespace-nowrap"
            >对手价</button>
          </div>
        </label>
      )}

      <label className="block">
        <span className="text-xs text-muted">数量 (吨)</span>
        <input
          type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)}
          placeholder="0" min="1" step="1"
          className="w-full mt-1 bg-surface-2 border border-border rounded-xl px-3.5 py-2.5 text-sm tnum outline-none focus:border-accent"
        />
        {side === "SELL" && (
          <button type="button" onClick={() => setQuantity(String(available))} className="text-xs text-muted hover:text-foreground mt-1">
            可用 {fmtQty(available)} 吨 · 全部
          </button>
        )}
      </label>

      {estTotal != null && (
        <div className="text-xs text-muted flex justify-between">
          <span>预估金额</span>
          <span className="tnum text-foreground">¥{fmtMoney(estTotal)}</span>
        </div>
      )}

      <motion.button
        onClick={submit}
        disabled={busy || !quantity || (type === "LIMIT" && !price)}
        whileTap={{ scale: 0.97 }}
        animate={done ? { scale: [1, 1.04, 1] } : undefined}
        className={`w-full py-3 rounded-full font-medium text-background disabled:opacity-40 transition-colors ${
          done ? "bg-accent" : side === "BUY" ? "bg-up" : "bg-down"
        }`}
      >
        {busy ? "提交中…" : done ? "✓ 已提交" : side === "BUY" ? "买入" : "卖出"}
      </motion.button>
    </div>
  );
}

function CancelOrderBtn({ id, onDone }: { id: string; onDone: () => void }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  return (
    <button
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          await api(`/api/orders/${id}`, { method: "DELETE" });
          toast("ok", "已撤单");
          onDone();
        } catch (e) {
          toast("err", (e as Error).message);
          setBusy(false);
        }
      }}
      className="text-xs text-muted hover:text-down disabled:opacity-40"
    >撤单</button>
  );
}

function statusZh(s: string) {
  return ({ OPEN: "挂单中", PARTIAL: "部分成交", FILLED: "全部成交", CANCELLED: "已撤销" } as Record<string, string>)[s] ?? s;
}
