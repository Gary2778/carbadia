"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api, fmtMoney, fmtQty } from "@/lib/format";
import { Reveal } from "@/components/anim/Reveal";
import { useToast } from "@/components/anim/Toast";

type Listing = {
  id: string;
  quantity: number;
  pricePerUnit: number;
  minQuantity: number;
  createdAt: string;
  sellerId: string;
  asset: { symbol: string; name: string; standard: string; projectType: string; vintage: number };
  seller: { name: string };
};
type Asset = { id: string; symbol: string; name: string };
type Me = { id: string } | null;

export default function OtcPage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [me, setMe] = useState<Me>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    try {
      const [ls, a, m] = await Promise.all([
        api<Listing[]>("/api/otc"),
        api<Asset[]>("/api/assets"),
        api<Me>("/api/auth/me"),
      ]);
      setListings(ls);
      setAssets(a);
      setMe(m);
    } catch (e) {
      setErr((e as Error).message);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">OTC 挂牌</h1>
          <p className="text-muted text-sm">场外大宗碳信用交易 — 卖方挂牌，买方直接成交</p>
        </div>
        {me && (
          <button
            onClick={() => setShowCreate((s) => !s)}
            className="px-4 py-2 rounded-full bg-accent text-background text-sm font-medium hover:bg-accent-strong transition-colors hover:opacity-90"
          >{showCreate ? "收起" : "+ 发布挂牌"}</button>
        )}
      </div>

      {err && <div className="text-down text-sm">{err}</div>}

      {showCreate && me && <CreateListing assets={assets} onDone={() => { setShowCreate(false); load(); }} />}

      <Reveal>
        <div className="rounded-2xl border border-border bg-surface shadow-card overflow-hidden">
          {listings.length === 0 ? (
            <div className="p-10 text-center text-muted">暂无挂牌{!me && <>，<Link href="/login" className="text-accent">登录</Link>后可发布</>}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-muted text-xs">
                  <tr className="border-b border-border">
                    <th className="text-left px-5 py-3 font-medium">标的</th>
                    <th className="text-left px-3 py-3 font-medium hidden md:table-cell">卖方</th>
                    <th className="text-right px-3 py-3 font-medium">单价</th>
                    <th className="text-right px-3 py-3 font-medium">可售(吨)</th>
                    <th className="text-right px-3 py-3 font-medium hidden sm:table-cell">最小购买</th>
                    <th className="text-right px-5 py-3 font-medium">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {listings.map((l) => (
                    <tr key={l.id} className="border-b border-border/40 hover:bg-surface-2">
                      <td className="px-5 py-3">
                        <Link href={`/market/${l.asset.symbol}`} className="font-medium hover:text-accent">{l.asset.symbol}</Link>
                        <div className="text-xs text-muted truncate max-w-[180px]">{l.asset.name}</div>
                      </td>
                      <td className="px-3 py-3 text-muted hidden md:table-cell">{l.seller.name}</td>
                      <td className="px-3 py-3 text-right tnum text-accent">¥{fmtMoney(l.pricePerUnit)}</td>
                      <td className="px-3 py-3 text-right tnum">{fmtQty(l.quantity)}</td>
                      <td className="px-3 py-3 text-right tnum text-muted hidden sm:table-cell">{fmtQty(l.minQuantity)}</td>
                      <td className="px-5 py-3 text-right">
                        {me?.id === l.sellerId ? (
                          <CancelListing id={l.id} onDone={load} />
                        ) : me ? (
                          <BuyListing listing={l} onDone={load} />
                        ) : (
                          <Link href="/login" className="text-xs text-accent">登录购买</Link>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Reveal>
    </div>
  );
}

function CreateListing({ assets, onDone }: { assets: Asset[]; onDone: () => void }) {
  const toast = useToast();
  const [assetId, setAssetId] = useState(assets[0]?.id ?? "");
  const [quantity, setQuantity] = useState("");
  const [price, setPrice] = useState("");
  const [minQty, setMinQty] = useState("1");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function submit() {
    setBusy(true); setErr("");
    try {
      await api("/api/otc", {
        method: "POST",
        body: JSON.stringify({
          assetId,
          quantity: Number(quantity),
          pricePerUnit: Number(price),
          minQuantity: Number(minQty) || 1,
        }),
      });
      toast("ok", "挂牌已发布");
      onDone();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-surface shadow-card p-5 space-y-3">
      <h2 className="font-semibold text-sm">发布 OTC 挂牌</h2>
      <p className="text-xs text-muted">挂牌将冻结你对应标的的可用持仓。</p>
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <label className="block sm:col-span-1">
          <span className="text-xs text-muted">标的</span>
          <select value={assetId} onChange={(e) => setAssetId(e.target.value)}
            className="w-full mt-1 bg-surface-2 border border-border rounded-md px-2 py-2 text-sm outline-none focus:border-accent">
            {assets.map((a) => <option key={a.id} value={a.id}>{a.symbol}</option>)}
          </select>
        </label>
        <Field label="数量(吨)" value={quantity} onChange={setQuantity} />
        <Field label="单价(元/吨)" value={price} onChange={setPrice} step="0.01" />
        <Field label="最小购买(吨)" value={minQty} onChange={setMinQty} />
      </div>
      {err && <div className="text-down text-xs">{err}</div>}
      <button onClick={submit} disabled={busy || !assetId || !quantity || !price}
        className="px-4 py-2 rounded-full bg-accent text-background text-sm font-medium hover:bg-accent-strong transition-colors disabled:opacity-40">
        {busy ? "提交中…" : "确认发布"}
      </button>
    </div>
  );
}

function Field({ label, value, onChange, step }: { label: string; value: string; onChange: (v: string) => void; step?: string }) {
  return (
    <label className="block">
      <span className="text-xs text-muted">{label}</span>
      <input type="number" min="0" step={step ?? "1"} value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full mt-1 bg-surface-2 border border-border rounded-xl px-3.5 py-2.5 text-sm tnum outline-none focus:border-accent" />
    </label>
  );
}

function BuyListing({ listing, onDone }: { listing: Listing; onDone: () => void }) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [qty, setQty] = useState(String(listing.minQuantity));
  const [busy, setBusy] = useState(false);

  if (!open) return <button onClick={() => setOpen(true)} className="text-xs px-3 py-1 rounded bg-up text-background font-medium">购买</button>;

  async function buy() {
    setBusy(true);
    try {
      await api(`/api/otc/${listing.id}/buy`, { method: "POST", body: JSON.stringify({ quantity: Number(qty) }) });
      toast("ok", `已购买 ${qty} 吨`);
      setOpen(false);
      onDone();
    } catch (e) {
      toast("err", (e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-1 justify-end">
      <input type="number" value={qty} min={1} max={listing.quantity} onChange={(e) => setQty(e.target.value)}
        className="w-16 bg-surface-2 border border-border rounded px-2 py-1 text-xs tnum outline-none focus:border-accent" />
      <button onClick={buy} disabled={busy} className="text-xs px-2 py-1 rounded bg-up text-background font-medium disabled:opacity-40">
        {busy ? "…" : "确认"}
      </button>
      <button onClick={() => setOpen(false)} className="text-xs text-muted px-1">×</button>
    </div>
  );
}

function CancelListing({ id, onDone }: { id: string; onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  return (
    <button disabled={busy} onClick={async () => { setBusy(true); try { await api(`/api/otc/${id}`, { method: "DELETE" }); onDone(); } catch { setBusy(false); } }}
      className="text-xs text-muted hover:text-down disabled:opacity-40">撤销挂牌</button>
  );
}
