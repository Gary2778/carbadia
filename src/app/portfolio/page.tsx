"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { api, ApiError, fmtMoney, fmtQty, fmtTime } from "@/lib/format";
import { usePolling } from "@/lib/usePolling";
import { NumberTicker } from "@/components/anim/NumberTicker";
import { Reveal } from "@/components/anim/Reveal";
import { useToast } from "@/components/anim/Toast";
import { useT, useLang, htmlLang } from "@/lib/i18n";
import { tName } from "@/lib/data-i18n";

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
  const t = useT("portfolio");
  const { lang } = useLang();
  const [p, setP] = useState<Portfolio | null>(null);
  const [err, setErr] = useState("");
  const [unauthorized, setUnauthorized] = useState(false);

  const load = useCallback(async () => {
    try {
      setP(await api<Portfolio>("/api/portfolio"));
      setErr("");
      setUnauthorized(false);
    } catch (e) {
      // 只有明确的 401 才引导登录；其他错误（网络抖动/服务端异常）不应误判为未登录
      if (e instanceof ApiError && e.status === 401) {
        setUnauthorized(true);
      } else {
        setErr((e as Error).message);
      }
      throw e;
    }
  }, []);

  // 可见性感知轮询:后台标签页自动暂停
  usePolling(load, 3000);

  if (unauthorized) return (
    <div className="text-center py-16 space-y-3">
      <div className="text-muted">{t.notLoggedIn}</div>
      <Link href="/login?returnTo=%2Fportfolio" className="text-accent">{t.goToLogin} →</Link>
    </div>
  );
  if (!p) {
    if (err) return <div className="text-down text-sm text-center py-16">{t.loadFailed}</div>;
    return <div className="text-muted text-center py-16">{t.loading}</div>;
  }

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold">{t.myPortfolio}</h1>

      {/* 轮询失败不清空已有数据，只提示刷新异常 */}
      {err && <div className="text-down text-sm">{err}</div>}

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
          {p.positions.length === 0 ? (
            <div className="text-center py-6 space-y-2">
              <Empty text={t.noHoldings} />
              <Link href="/" className="text-accent text-sm inline-block">{t.noHoldingsCta}</Link>
            </div>
          ) : (
            <Table head={[t.instrument, t.qtyTonnes, t.locked, t.lastPrice, t.marketValue]}>
              {p.positions.map((h) => (
                <tr key={h.assetId} className="border-b border-border/40 hover:bg-surface-2">
                  <td className="px-4 py-2.5">
                    <Link href={`/market/${h.symbol}`} className="font-medium hover:text-accent">{h.symbol}</Link>
                    <div className="text-xs text-muted truncate max-w-[200px]">{tName(h.symbol, h.name, lang)}</div>
                  </td>
                  <td className="px-3 py-2.5 text-end tnum">{fmtQty(h.quantity)}</td>
                  <td className="px-3 py-2.5 text-end tnum text-muted">{fmtQty(h.locked)}</td>
                  <td className="px-3 py-2.5 text-end tnum">{h.lastPrice == null ? "—" : fmtMoney(h.lastPrice)}</td>
                  <td className="px-4 py-2.5 text-end tnum text-accent">${fmtMoney(h.marketValue)}</td>
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
                  <td className="px-3 py-2.5 text-end tnum">{o.price == null ? t.market : fmtMoney(o.price)}</td>
                  <td className="px-3 py-2.5 text-end tnum">{fmtQty(o.filledQuantity)} / {fmtQty(o.quantity)}</td>
                  <td className="px-4 py-2.5 text-end">
                    <CancelBtn url={`/api/orders/${o.id}`} label={t.cancel} onDone={load} />
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
                  <td className="px-3 py-2.5 text-end tnum text-accent">${fmtMoney(l.pricePerUnit)}</td>
                  <td className="px-3 py-2.5 text-end tnum">{fmtQty(l.quantity)}</td>
                  <td className="px-4 py-2.5 text-end">
                    <CancelBtn url={`/api/otc/${l.id}`} label={t.cancelListing} onDone={load} />
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
                  <td className="px-4 py-2.5 text-muted text-xs">{fmtTime(tr.createdAt, htmlLang(lang))}</td>
                  <td className="px-3 py-2.5 font-medium">{tr.asset.symbol}</td>
                  <td className={`px-3 py-2.5 font-medium ${tr.direction === "BUY" ? "text-up" : "text-down"}`}>{tr.direction === "BUY" ? t.buy : t.sell}</td>
                  <td className="px-3 py-2.5 text-end tnum">{fmtMoney(tr.price)}</td>
                  <td className="px-3 py-2.5 text-end tnum">{fmtQty(tr.quantity)}</td>
                  <td className="px-4 py-2.5 text-end tnum">${fmtMoney(tr.price * tr.quantity)}</td>
                </tr>
              ))}
            </Table>
          )}
        </Card>
      </Reveal>
    </div>
  );
}

// 撤单/撤挂牌共用：busy 态防连点，失败用 toast 提示而不是静默吞掉
function CancelBtn({ url, label, onDone }: { url: string; label: string; onDone: () => void }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  return (
    <button
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          await api(url, { method: "DELETE" });
          onDone();
        } catch (e) {
          toast("err", (e as Error).message);
          setBusy(false);
        }
      }}
      className="text-xs text-muted hover:text-down disabled:opacity-40"
    >{label}</button>
  );
}

function Stat({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className="rounded-2xl border border-border bg-surface shadow-card p-4">
      <div className="text-xs text-muted">{label}</div>
      <div className={`tnum text-lg font-semibold mt-1 ${accent ? "text-accent" : ""}`}>
        $<NumberTicker value={value} />
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
              <th key={h} className={`px-3 py-2 font-medium ${i === 0 ? "text-start px-4" : "text-end"} ${i === head.length - 1 ? "px-4" : ""}`}>{h}</th>
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
