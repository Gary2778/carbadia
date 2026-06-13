"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api, fmtMoney, fmtQty, fmtTime } from "@/lib/format";
import { NumberTicker } from "@/components/anim/NumberTicker";
import { Reveal } from "@/components/anim/Reveal";

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
      <Link href="/login" className="text-accent">前往登录 →</Link>
    </div>
  );
  if (!p) return <div className="text-muted text-center py-16">加载中…</div>;

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold">我的资产</h1>

      <Reveal>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Stat label="总资产估值" value={p.totalAssets} accent />
          <Stat label="可用现金" value={p.cashBalance} />
          <Stat label="冻结现金" value={p.lockedCash} />
          <Stat label="持仓市值" value={p.holdingsValue} />
        </div>
      </Reveal>

      <Reveal delay={0.05}>
        <Card title="持仓">
          {p.positions.length === 0 ? <Empty text="暂无持仓" /> : (
            <Table head={["标的", "数量(吨)", "冻结", "最新价", "市值"]}>
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
        <Card title="当前委托">
          {p.openOrders.length === 0 ? <Empty text="无未完成委托" /> : (
            <Table head={["标的", "方向", "类型", "价格", "已成交/总量", "操作"]}>
              {p.openOrders.map((o) => (
                <tr key={o.id} className="border-b border-border/40">
                  <td className="px-4 py-2.5 font-medium">{o.asset.symbol}</td>
                  <td className={`px-3 py-2.5 font-medium ${o.side === "BUY" ? "text-up" : "text-down"}`}>{o.side === "BUY" ? "买入" : "卖出"}</td>
                  <td className="px-3 py-2.5 text-muted">{o.type === "LIMIT" ? "限价" : "市价"}</td>
                  <td className="px-3 py-2.5 text-right tnum">{o.price == null ? "市价" : fmtMoney(o.price)}</td>
                  <td className="px-3 py-2.5 text-right tnum">{fmtQty(o.filledQuantity)} / {fmtQty(o.quantity)}</td>
                  <td className="px-4 py-2.5 text-right">
                    <button
                      onClick={async () => { try { await api(`/api/orders/${o.id}`, { method: "DELETE" }); load(); } catch {} }}
                      className="text-xs text-muted hover:text-down">撤单</button>
                  </td>
                </tr>
              ))}
            </Table>
          )}
        </Card>
      </Reveal>

      {p.otcListings.length > 0 && (
        <Reveal delay={0.15}>
          <Card title="我的 OTC 挂牌">
            <Table head={["标的", "单价", "可售(吨)", "操作"]}>
              {p.otcListings.map((l) => (
                <tr key={l.id} className="border-b border-border/40">
                  <td className="px-4 py-2.5 font-medium">{l.asset.symbol}</td>
                  <td className="px-3 py-2.5 text-right tnum text-accent">¥{fmtMoney(l.pricePerUnit)}</td>
                  <td className="px-3 py-2.5 text-right tnum">{fmtQty(l.quantity)}</td>
                  <td className="px-4 py-2.5 text-right">
                    <button onClick={async () => { try { await api(`/api/otc/${l.id}`, { method: "DELETE" }); load(); } catch {} }}
                      className="text-xs text-muted hover:text-down">撤销</button>
                  </td>
                </tr>
              ))}
            </Table>
          </Card>
        </Reveal>
      )}

      <Reveal delay={0.2}>
        <Card title="成交历史">
          {p.trades.length === 0 ? <Empty text="暂无成交" /> : (
            <Table head={["时间", "标的", "方向", "价格", "数量(吨)", "金额"]}>
              {p.trades.map((t) => (
                <tr key={t.id} className="border-b border-border/40">
                  <td className="px-4 py-2.5 text-muted text-xs">{fmtTime(t.createdAt)}</td>
                  <td className="px-3 py-2.5 font-medium">{t.asset.symbol}</td>
                  <td className={`px-3 py-2.5 font-medium ${t.direction === "BUY" ? "text-up" : "text-down"}`}>{t.direction === "BUY" ? "买入" : "卖出"}</td>
                  <td className="px-3 py-2.5 text-right tnum">{fmtMoney(t.price)}</td>
                  <td className="px-3 py-2.5 text-right tnum">{fmtQty(t.quantity)}</td>
                  <td className="px-4 py-2.5 text-right tnum">¥{fmtMoney(t.price * t.quantity)}</td>
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
