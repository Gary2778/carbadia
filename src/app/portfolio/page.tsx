"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api, fmtMoney, fmtQty, fmtTime } from "@/lib/format";
import { NumberTicker } from "@/components/anim/NumberTicker";
import { Reveal } from "@/components/anim/Reveal";
import { useT } from "@/lib/i18n";

const DICT = {
  en: {
    goToLogin: "Go to log in",
    loading: "Loading…",
    myPortfolio: "My Portfolio",
    totalAssets: "Total assets",
    availableCash: "Available cash",
    lockedCash: "Locked cash",
    holdingsValue: "Holdings value",
    holdings: "Holdings",
    noHoldings: "No holdings yet",
    instrument: "Instrument",
    qtyTonnes: "Quantity (t)",
    locked: "Locked",
    lastPrice: "Last price",
    marketValue: "Market value",
    openOrders: "Open orders",
    noOpenOrders: "No open orders",
    side: "Side",
    type: "Type",
    price: "Price",
    filledTotal: "Filled/Total",
    action: "Action",
    buy: "Buy",
    sell: "Sell",
    limit: "Limit",
    market: "Market",
    cancel: "Cancel",
    myOtcListings: "My OTC listings",
    unitPrice: "Unit price",
    availableTonnes: "Available (t)",
    cancelListing: "Cancel",
    tradeHistory: "Trade history",
    noTrades: "No trades yet",
    time: "Time",
    amount: "Amount",
  },
  zh: {
    goToLogin: "前往登录",
    loading: "加载中…",
    myPortfolio: "我的资产",
    totalAssets: "总资产估值",
    availableCash: "可用现金",
    lockedCash: "冻结现金",
    holdingsValue: "持仓市值",
    holdings: "持仓",
    noHoldings: "暂无持仓",
    instrument: "标的",
    qtyTonnes: "数量(吨)",
    locked: "冻结",
    lastPrice: "最新价",
    marketValue: "市值",
    openOrders: "当前委托",
    noOpenOrders: "无未完成委托",
    side: "方向",
    type: "类型",
    price: "价格",
    filledTotal: "已成交/总量",
    action: "操作",
    buy: "买入",
    sell: "卖出",
    limit: "限价",
    market: "市价",
    cancel: "撤单",
    myOtcListings: "我的 OTC 挂牌",
    unitPrice: "单价",
    availableTonnes: "可售(吨)",
    cancelListing: "撤销",
    tradeHistory: "成交历史",
    noTrades: "暂无成交",
    time: "时间",
    amount: "金额",
  },
};

type Portfolio = {
  cashBalance: number;
  lockedCash: number;
  holdingsValue: number;
  totalAssets: number;
  positions: { assetId: string; symbol: string; name: string; quantity: number; locked: number; lastPrice: number | null; marketValue: number }[];
  openOrders: { id: string; side: string; type: string; price: number | null; quantity: number; filledQuantity: number; status: string; asset: { symbol: string } }[];
  trades: { id: string; direction: string; price: number; quantity: number; createdAt: string; asset: { symbol: string } }[];
  otcListings: { id: string; quantity: number; pricePerUnit: number; asset: { symbol: string } }[];
};

export default function PortfolioPage() {
  const t = useT(DICT);
  const [p, setP] = useState<Portfolio | null>(null);
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    try {
      setP(await api<Portfolio>("/api/portfolio"));
    } catch (e) {
      setErr((e as Error).message);
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 3000);
    return () => clearInterval(t);
  }, [load]);

  if (err) return (
    <div className="text-center py-16 space-y-3">
      <div className="text-muted">{err}</div>
      <Link href="/login" className="text-accent">{t.goToLogin} →</Link>
    </div>
  );
  if (!p) return <div className="text-muted text-center py-16">{t.loading}</div>;

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold">{t.myPortfolio}</h1>

      <Reveal>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Stat label={t.totalAssets} value={p.totalAssets} accent />
          <Stat label={t.availableCash} value={p.cashBalance} />
          <Stat label={t.lockedCash} value={p.lockedCash} />
          <Stat label={t.holdingsValue} value={p.holdingsValue} />
        </div>
      </Reveal>

      <Reveal delay={0.05}>
        <Card title={t.holdings}>
          {p.positions.length === 0 ? <Empty text={t.noHoldings} /> : (
            <Table head={[t.instrument, t.qtyTonnes, t.locked, t.lastPrice, t.marketValue]}>
              {p.positions.map((h) => (
                <tr key={h.assetId} className="border-b border-border/40 hover:bg-surface-2">
                  <td className="px-4 py-2.5">
                    <Link href={`/market/${h.symbol}`} className="font-medium hover:text-accent">{h.symbol}</Link>
                    <div className="text-xs text-muted truncate max-w-[200px]">{h.name}</div>
                  </td>
                  <td className="px-3 py-2.5 text-right tnum">{fmtQty(h.quantity)}</td>
                  <td className="px-3 py-2.5 text-right tnum text-muted">{fmtQty(h.locked)}</td>
                  <td className="px-3 py-2.5 text-right tnum">{h.lastPrice == null ? "—" : fmtMoney(h.lastPrice)}</td>
                  <td className="px-4 py-2.5 text-right tnum text-accent">¥{fmtMoney(h.marketValue)}</td>
                </tr>
              ))}
            </Table>
          )}
        </Card>
      </Reveal>

      <Reveal delay={0.1}>
        <Card title={t.openOrders}>
          {p.openOrders.length === 0 ? <Empty text={t.noOpenOrders} /> : (
            <Table head={[t.instrument, t.side, t.type, t.price, t.filledTotal, t.action]}>
              {p.openOrders.map((o) => (
                <tr key={o.id} className="border-b border-border/40">
                  <td className="px-4 py-2.5 font-medium">{o.asset.symbol}</td>
                  <td className={`px-3 py-2.5 font-medium ${o.side === "BUY" ? "text-up" : "text-down"}`}>{o.side === "BUY" ? t.buy : t.sell}</td>
                  <td className="px-3 py-2.5 text-muted">{o.type === "LIMIT" ? t.limit : t.market}</td>
                  <td className="px-3 py-2.5 text-right tnum">{o.price == null ? t.market : fmtMoney(o.price)}</td>
                  <td className="px-3 py-2.5 text-right tnum">{fmtQty(o.filledQuantity)} / {fmtQty(o.quantity)}</td>
                  <td className="px-4 py-2.5 text-right">
                    <button
                      onClick={async () => { try { await api(`/api/orders/${o.id}`, { method: "DELETE" }); load(); } catch {} }}
                      className="text-xs text-muted hover:text-down">{t.cancel}</button>
                  </td>
                </tr>
              ))}
            </Table>
          )}
        </Card>
      </Reveal>

      {p.otcListings.length > 0 && (
        <Reveal delay={0.15}>
          <Card title={t.myOtcListings}>
            <Table head={[t.instrument, t.unitPrice, t.availableTonnes, t.action]}>
              {p.otcListings.map((l) => (
                <tr key={l.id} className="border-b border-border/40">
                  <td className="px-4 py-2.5 font-medium">{l.asset.symbol}</td>
                  <td className="px-3 py-2.5 text-right tnum text-accent">¥{fmtMoney(l.pricePerUnit)}</td>
                  <td className="px-3 py-2.5 text-right tnum">{fmtQty(l.quantity)}</td>
                  <td className="px-4 py-2.5 text-right">
                    <button onClick={async () => { try { await api(`/api/otc/${l.id}`, { method: "DELETE" }); load(); } catch {} }}
                      className="text-xs text-muted hover:text-down">{t.cancelListing}</button>
                  </td>
                </tr>
              ))}
            </Table>
          </Card>
        </Reveal>
      )}

      <Reveal delay={0.2}>
        <Card title={t.tradeHistory}>
          {p.trades.length === 0 ? <Empty text={t.noTrades} /> : (
            <Table head={[t.time, t.instrument, t.side, t.price, t.qtyTonnes, t.amount]}>
              {p.trades.map((tr) => (
                <tr key={tr.id} className="border-b border-border/40">
                  <td className="px-4 py-2.5 text-muted text-xs">{fmtTime(tr.createdAt)}</td>
                  <td className="px-3 py-2.5 font-medium">{tr.asset.symbol}</td>
                  <td className={`px-3 py-2.5 font-medium ${tr.direction === "BUY" ? "text-up" : "text-down"}`}>{tr.direction === "BUY" ? t.buy : t.sell}</td>
                  <td className="px-3 py-2.5 text-right tnum">{fmtMoney(tr.price)}</td>
                  <td className="px-3 py-2.5 text-right tnum">{fmtQty(tr.quantity)}</td>
                  <td className="px-4 py-2.5 text-right tnum">¥{fmtMoney(tr.price * tr.quantity)}</td>
                </tr>
              ))}
            </Table>
          )}
        </Card>
      </Reveal>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className="rounded-2xl border border-border bg-surface shadow-card p-4">
      <div className="text-xs text-muted">{label}</div>
      <div className={`tnum text-lg font-semibold mt-1 ${accent ? "text-accent" : ""}`}>
        ¥<NumberTicker value={value} />
      </div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-surface shadow-card overflow-hidden">
      <div className="px-4 py-2.5 border-b border-border font-semibold text-sm">{title}</div>
      {children}
    </div>
  );
}

function Table({ head, children }: { head: string[]; children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-muted text-xs">
          <tr className="border-b border-border">
            {head.map((h, i) => (
              <th key={h} className={`px-3 py-2 font-medium ${i === 0 ? "text-left px-4" : "text-right"} ${i === head.length - 1 ? "px-4" : ""}`}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="text-center text-muted text-sm py-6">{text}</div>;
}
