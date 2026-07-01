"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api, fmtMoney, fmtQty } from "@/lib/format";
import { Reveal } from "@/components/anim/Reveal";
import { useToast } from "@/components/anim/Toast";
import { ComplianceNote } from "@/components/ComplianceNote";
import { useT, useLang } from "@/lib/i18n";
import { tName, tUserName } from "@/lib/data-i18n";

const DICT = {
  en: {
    title: "OTC Listings",
    subtitle: "Over-the-counter block carbon-credit trades — sellers list, buyers fill directly",
    collapse: "Collapse",
    newListing: "+ New listing",
    emptyPre: "No listings",
    emptyMid: ", ",
    emptyLogin: "log in",
    emptyPost: " to publish",
    thInstrument: "Instrument",
    thSeller: "Seller",
    thUnitPrice: "Unit price",
    thAvailable: "Available (t)",
    thMinBuy: "Min buy",
    thAction: "Action",
    loginToBuy: "Log in to buy",
    createTitle: "New OTC Listing",
    createHint: "Listing will lock your available holdings of the selected instrument.",
    fieldInstrument: "Instrument",
    fieldQuantity: "Quantity (t)",
    fieldUnitPrice: "Unit price (¥/t)",
    fieldMinBuy: "Min buy (t)",
    submitting: "Submitting…",
    confirmPublish: "Confirm",
    listingPublished: "Listing published",
    buy: "Buy",
    confirm: "Confirm",
    bought: (qty: string) => `Bought ${qty} t`,
    cancelListing: "Cancel listing",
  },
  zh: {
    title: "OTC 挂牌",
    subtitle: "场外大宗碳信用交易 — 卖方挂牌，买方直接成交",
    collapse: "收起",
    newListing: "+ 发布挂牌",
    emptyPre: "暂无挂牌",
    emptyMid: "，",
    emptyLogin: "登录",
    emptyPost: "后可发布",
    thInstrument: "标的",
    thSeller: "卖方",
    thUnitPrice: "单价",
    thAvailable: "可售(吨)",
    thMinBuy: "最小购买",
    thAction: "操作",
    loginToBuy: "登录购买",
    createTitle: "发布 OTC 挂牌",
    createHint: "挂牌将冻结你对应标的的可用持仓。",
    fieldInstrument: "标的",
    fieldQuantity: "数量(吨)",
    fieldUnitPrice: "单价(元/吨)",
    fieldMinBuy: "最小购买(吨)",
    submitting: "提交中…",
    confirmPublish: "确认发布",
    listingPublished: "挂牌已发布",
    buy: "购买",
    confirm: "确认",
    bought: (qty: string) => `已购买 ${qty} 吨`,
    cancelListing: "撤销挂牌",
  },
};

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
  const t = useT(DICT);
  const { lang } = useLang();
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
          <h1 className="text-xl font-bold">{t.title}</h1>
          <p className="text-muted text-sm">{t.subtitle}</p>
          <ComplianceNote className="mt-1" />
        </div>
        {me && (
          <button
            onClick={() => setShowCreate((s) => !s)}
            className="px-4 py-2 rounded-full bg-accent text-background text-sm font-medium hover:bg-accent-strong transition-colors hover:opacity-90"
          >{showCreate ? t.collapse : t.newListing}</button>
        )}
      </div>

      {err && <div className="text-down text-sm">{err}</div>}

      {showCreate && me && <CreateListing assets={assets} onDone={() => { setShowCreate(false); load(); }} />}

      <Reveal>
        <div className="rounded-2xl border border-border bg-surface shadow-card overflow-hidden">
          {listings.length === 0 ? (
            <div className="p-10 text-center text-muted">{t.emptyPre}{!me && <>{t.emptyMid}<Link href="/login" className="text-accent">{t.emptyLogin}</Link>{t.emptyPost}</>}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-muted text-xs">
                  <tr className="border-b border-border">
                    <th className="text-left px-5 py-3 font-medium">{t.thInstrument}</th>
                    <th className="text-left px-3 py-3 font-medium hidden md:table-cell">{t.thSeller}</th>
                    <th className="text-right px-3 py-3 font-medium">{t.thUnitPrice}</th>
                    <th className="text-right px-3 py-3 font-medium">{t.thAvailable}</th>
                    <th className="text-right px-3 py-3 font-medium hidden sm:table-cell">{t.thMinBuy}</th>
                    <th className="text-right px-5 py-3 font-medium">{t.thAction}</th>
                  </tr>
                </thead>
                <tbody>
                  {listings.map((l) => (
                    <tr key={l.id} className="border-b border-border/40 hover:bg-surface-2">
                      <td className="px-5 py-3">
                        <Link href={`/market/${l.asset.symbol}`} className="font-medium hover:text-accent">{l.asset.symbol}</Link>
                        <div className="text-xs text-muted truncate max-w-[180px]">{tName(l.asset.symbol, l.asset.name, lang)}</div>
                      </td>
                      <td className="px-3 py-3 text-muted hidden md:table-cell">{tUserName(l.seller.name, lang)}</td>
                      <td className="px-3 py-3 text-right tnum text-accent">¥{fmtMoney(l.pricePerUnit)}</td>
                      <td className="px-3 py-3 text-right tnum">{fmtQty(l.quantity)}</td>
                      <td className="px-3 py-3 text-right tnum text-muted hidden sm:table-cell">{fmtQty(l.minQuantity)}</td>
                      <td className="px-5 py-3 text-right">
                        {me?.id === l.sellerId ? (
                          <CancelListing id={l.id} onDone={load} />
                        ) : me ? (
                          <BuyListing listing={l} onDone={load} />
                        ) : (
                          <Link href="/login" className="text-xs text-accent">{t.loginToBuy}</Link>
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
  const t = useT(DICT);
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
      toast("ok", t.listingPublished);
      onDone();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-surface shadow-card p-5 space-y-3">
      <h2 className="font-semibold text-sm">{t.createTitle}</h2>
      <p className="text-xs text-muted">{t.createHint}</p>
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <label className="block sm:col-span-1">
          <span className="text-xs text-muted">{t.fieldInstrument}</span>
          <select value={assetId} onChange={(e) => setAssetId(e.target.value)}
            className="w-full mt-1 bg-surface-2 border border-border rounded-md px-2 py-2 text-sm outline-none focus:border-accent">
            {assets.map((a) => <option key={a.id} value={a.id}>{a.symbol}</option>)}
          </select>
        </label>
        <Field label={t.fieldQuantity} value={quantity} onChange={setQuantity} />
        <Field label={t.fieldUnitPrice} value={price} onChange={setPrice} step="0.01" />
        <Field label={t.fieldMinBuy} value={minQty} onChange={setMinQty} />
      </div>
      {err && <div className="text-down text-xs">{err}</div>}
      <button onClick={submit} disabled={busy || !assetId || !quantity || !price}
        className="px-4 py-2 rounded-full bg-accent text-background text-sm font-medium hover:bg-accent-strong transition-colors disabled:opacity-40">
        {busy ? t.submitting : t.confirmPublish}
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
  const t = useT(DICT);
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [qty, setQty] = useState(String(listing.minQuantity));
  const [busy, setBusy] = useState(false);

  if (!open) return <button onClick={() => setOpen(true)} className="text-xs px-3 py-1 rounded bg-up text-background font-medium">{t.buy}</button>;

  async function buy() {
    setBusy(true);
    try {
      await api(`/api/otc/${listing.id}/buy`, { method: "POST", body: JSON.stringify({ quantity: Number(qty) }) });
      toast("ok", t.bought(qty));
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
        {busy ? "…" : t.confirm}
      </button>
      <button onClick={() => setOpen(false)} className="text-xs text-muted px-1">×</button>
    </div>
  );
}

function CancelListing({ id, onDone }: { id: string; onDone: () => void }) {
  const t = useT(DICT);
  const [busy, setBusy] = useState(false);
  return (
    <button disabled={busy} onClick={async () => { setBusy(true); try { await api(`/api/otc/${id}`, { method: "DELETE" }); onDone(); } catch { setBusy(false); } }}
      className="text-xs text-muted hover:text-down disabled:opacity-40">{t.cancelListing}</button>
  );
}
