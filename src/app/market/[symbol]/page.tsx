"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api, fmtMoney, fmtQty } from "@/lib/format";

type Level = { price: number; quantity: number };
type MarketData = {
  asset: {
    id: string; symbol: string; name: string; standard: string; projectType: string;
    vintage: number; country: string; registry: string; description: string; lastPrice: number | null;
  };
  book: { bids: Level[]; asks: Level[] };
  trades: { id: string; price: number; quantity: number; createdAt: string }[];
  holding: { quantity: number; locked: number } | null;
  myOrders: { id: string; side: string; type: string; price: number | null; quantity: number; filledQuantity: number; status: string }[];
};

export default function MarketPage({ params }: { params: Promise<{ symbol: string }> }) {
  const { symbol } = use(params);
  const [data, setData] = useState<MarketData | null>(null);
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

  useEffect(() => {
    api("/api/auth/me").then((u) => setLoggedIn(!!u)).catch(() => setLoggedIn(false));
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 3000);
    return () => clearInterval(t);
  }, [load]);

  if (err) return <div className="text-down p-8 text-center">{err}</div>;
  if (!data) return <div className="text-muted p-8 text-center">加载中…</div>;

  const { asset, book, trades, holding, myOrders } = data;
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
          <div className="tnum text-2xl font-semibold text-accent">
            {asset.lastPrice == null ? "—" : `¥${fmtMoney(asset.lastPrice)}`}
          </div>
        </div>
        <div className="text-sm text-muted space-y-0.5">
          <div>项目类型: <span className="text-foreground">{asset.projectType}</span></div>
          <div>签发年份: <span className="text-foreground">{asset.vintage}</span> · 地区: <span className="text-foreground">{asset.country}</span></div>
          <div>登记簿: <span className="text-foreground">{asset.registry}</span></div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* 订单簿 */}
        <div className="rounded-2xl border border-border bg-surface shadow-card">
          <div className="px-4 py-2.5 border-b border-border font-semibold text-sm">订单簿</div>
          <div className="p-2">
            <DepthSide levels={book.asks} side="ask" max={maxDepth} reverse />
            <div className="py-2 px-2 my-1 border-y border-border tnum text-center text-lg font-semibold">
              {asset.lastPrice == null ? <span className="text-muted text-sm">暂无成交</span> : `¥${fmtMoney(asset.lastPrice)}`}
            </div>
            <DepthSide levels={book.bids} side="bid" max={maxDepth} />
          </div>
        </div>

        {/* 下单 */}
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

        {/* 最近成交 */}
        <div className="rounded-2xl border border-border bg-surface shadow-card">
          <div className="px-4 py-2.5 border-b border-border font-semibold text-sm">最近成交</div>
          <div className="p-2">
            <div className="grid grid-cols-3 text-xs text-muted px-2 pb-1">
              <span>价格</span><span className="text-right">数量</span><span className="text-right">时间</span>
            </div>
            <div className="max-h-[340px] overflow-y-auto">
              {trades.length === 0 ? (
                <div className="text-center text-muted text-sm py-8">暂无成交</div>
              ) : (
                trades.map((t) => (
                  <div key={t.id} className="grid grid-cols-3 text-xs tnum px-2 py-1 hover:bg-surface-2 rounded">
                    <span className="text-accent">{fmtMoney(t.price)}</span>
                    <span className="text-right">{fmtQty(t.quantity)}</span>
                    <span className="text-right text-muted">{new Date(t.createdAt).toLocaleTimeString("zh-CN", { hour12: false })}</span>
                  </div>
                ))
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
      {rows.map((l, i) => (
        <div key={i} className="relative grid grid-cols-2 text-xs tnum px-2 py-1">
          <div className={`absolute inset-y-0 right-0 ${bar}`} style={{ width: `${(l.quantity / max) * 100}%` }} />
          <span className={`relative ${color}`}>{fmtMoney(l.price)}</span>
          <span className="relative text-right">{fmtQty(l.quantity)}</span>
        </div>
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
  const [side, setSide] = useState<"BUY" | "SELL">("BUY");
  const [type, setType] = useState<"LIMIT" | "MARKET">("LIMIT");
  const [price, setPrice] = useState("");
  const [quantity, setQuantity] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ t: "ok" | "err"; text: string } | null>(null);

  const available = holding ? holding.quantity - holding.locked : 0;
  const estTotal = type === "LIMIT" && price && quantity ? Number(price) * Number(quantity) : null;

  async function submit() {
    setBusy(true);
    setMsg(null);
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
      const filled = res.filledQty;
      setMsg({
        t: "ok",
        text: filled > 0 ? `成交 ${filled} 吨，订单状态: ${statusZh(res.order.status)}` : `已挂单 (${statusZh(res.order.status)})`,
      });
      setQuantity("");
      onDone();
    } catch (e) {
      setMsg({ t: "err", text: (e as Error).message });
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

      <button
        onClick={submit}
        disabled={busy || !quantity || (type === "LIMIT" && !price)}
        className={`w-full py-3 rounded-full font-medium text-background disabled:opacity-40 transition-opacity hover:opacity-90 ${side === "BUY" ? "bg-up" : "bg-down"}`}
      >
        {busy ? "提交中…" : side === "BUY" ? "买入" : "卖出"}
      </button>

      {msg && (
        <div className={`text-xs text-center ${msg.t === "ok" ? "text-up" : "text-down"}`}>{msg.text}</div>
      )}
    </div>
  );
}

function CancelOrderBtn({ id, onDone }: { id: string; onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  return (
    <button
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          await api(`/api/orders/${id}`, { method: "DELETE" });
          onDone();
        } catch {
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
