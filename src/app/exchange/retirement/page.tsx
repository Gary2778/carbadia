"use client";

import { Suspense, useCallback, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useLang } from "@/lib/i18n";
import { tName } from "@/lib/data-i18n";
import { api, ApiError, fmtQty } from "@/lib/format";
import { retirementOutcomeUncertain } from "@/lib/retirement-outcome";
import { usePolling } from "@/lib/usePolling";
import { useToast } from "@/components/anim/Toast";
import type {
  RetirementInput,
  RetirementOverview,
  RetirementPosition,
  RetirementRecord,
} from "@/lib/retirement";

const RETIREMENT_REASONS = [
  { value: "Personal Carbon Offset", zh: "個人碳抵銷" },
  { value: "Corporate Emissions Offset", zh: "企業排放抵銷" },
  { value: "Event Offset", zh: "活動碳抵銷" },
  { value: "Product Carbon Neutrality", zh: "產品碳中和" },
  { value: "ESG Commitment", zh: "ESG 承諾" },
  { value: "Other", zh: "其他" },
];

const copy = {
  en: {
    eyebrow: "CARBON CREDIT LIFECYCLE",
    title: "Retire credits",
    subtitle:
      "Practice the final step. Create a lasting record of a simulated retirement.",
    simulation: "Simulation only",
    warning:
      "This permanently removes credits from your demo holdings. No real credits are held or retired in a registry, and no emissions claim or environmental benefit is created.",
    details: "Details",
    review: "Review",
    certificate: "Certificate",
    choose: "Choose credits",
    chooseHelp:
      "Only available project credits can be retired. Scenario indices and credits locked in sell orders or OTC listings are excluded.",
    credit: "Held credit",
    select: "Select a credit from your holdings",
    available: "Available",
    locked: "Locked",
    amount: "Amount to retire",
    unit: "Whole simulated credits · 1 credit represents 1 modelled tCO2e",
    reason: "Reason",
    reasonPlaceholder: "For example, learning how retirement works",
    beneficiary: "Beneficiary",
    beneficiaryPlaceholder: "Person or organisation for this simulation",
    purpose: "Purpose",
    purposePlaceholder: "Describe the purpose of this demonstration retirement",
    message: "Public message",
    optional: "optional",
    messageHelp:
      "This optional message is saved on your private certificate. It is not published by Carbadia.",
    next: "Review retirement",
    reviewTitle: "Review your simulation",
    reviewHelp:
      "Check the amount and beneficiary before confirming. This action cannot be reversed in your demo account.",
    project: "Project",
    registry: "Registry label in demo",
    standard: "Standard label in demo",
    vintage: "Vintage",
    acknowledgement:
      "I understand that these simulated credits will be permanently removed from my available holdings. This does not retire real credits or support a real emissions claim.",
    confirm: "Confirm simulated retirement",
    edit: "Edit details",
    confirming: "Recording simulation…",
    doneTitle: "Simulation recorded",
    doneBody:
      "The credits have been removed from your demo holdings. Your private simulation certificate is ready.",
    reference: "Unique simulation reference",
    date: "Simulation date",
    modelled: "Modelled quantity",
    view: "View / print certificate",
    download: "Download HTML certificate",
    another: "Retire more demo credits",
    portfolio: "View portfolio",
    history: "Retirement history",
    historyHelp:
      "Your latest 100 simulations. Certificates remain private to your account.",
    noHistory: "No simulations yet",
    noHistoryBody:
      "Your completed retirements and certificates will appear here.",
    status: "Status",
    recorded: "Recorded · simulated",
    total: "Total simulated retirements",
    totalHelp: "Modelled tCO2e recorded in this demo account",
    processTitle: "From holding to record",
    processBody:
      "Choose an available balance, review the details, then keep a simulation receipt. Your cash balance is unaffected.",
    noHoldings: "No available credits to retire",
    noHoldingsHelp:
      "Acquire demo credits in the marketplace, or release credits locked in your open sell orders or OTC listings.",
    market: "Browse marketplace",
    login: "Sign in to retire demo credits",
    loginHelp:
      "Your holdings, simulation records and beneficiary details are private to your account.",
    loginLink: "Sign in",
    loading: "Loading your holdings and records…",
    loadFailed: "Could not load your retirement workspace.",
    retry: "Try again",
    invalidAmount:
      "Enter a positive whole amount within your available holdings.",
    saved: "Simulated retirement recorded",
    retryHelp:
      "The result could not be confirmed. Keep these details and retry the same request; repeated submissions cannot remove the credits twice.",
    missingRegistry: "Not provided",
    refreshError:
      "Could not refresh your account. The displayed balances may have changed.",
  },
  zh: {
    eyebrow: "碳信用生命週期",
    title: "註銷碳信用",
    subtitle: "練習最後一步，為模擬註銷建立持久紀錄。",
    simulation: "僅供模擬",
    warning:
      "此操作會永久扣除您的示範持倉。本平台不託管真實碳信用，也不會在登記簿註銷碳信用，且不產生真實減排聲明或環境效益。",
    details: "填寫資料",
    review: "核對確認",
    certificate: "模擬憑證",
    choose: "選擇碳信用",
    chooseHelp:
      "僅能註銷可用的專案碳信用。情境指數，以及賣單或場外掛牌已鎖定的數量不包含在內。",
    credit: "持有的碳信用",
    select: "從持倉選擇碳信用",
    available: "可用數量",
    locked: "已鎖定",
    amount: "註銷數量",
    unit: "整數模擬碳信用 · 每單位代表 1 模擬 tCO2e",
    reason: "註銷原因",
    reasonPlaceholder: "例如：學習註銷流程",
    beneficiary: "受益人",
    beneficiaryPlaceholder: "本次模擬的個人或機構名稱",
    purpose: "用途",
    purposePlaceholder: "描述本次示範註銷的用途",
    message: "公開留言",
    optional: "選填",
    messageHelp: "此選填留言僅保存在您的私人憑證中，Carbadia 不會將其公開。",
    next: "核對註銷資料",
    reviewTitle: "核對您的模擬註銷",
    reviewHelp: "確認前請核對數量及受益人。此操作無法在示範帳戶中撤銷。",
    project: "專案",
    registry: "示範登記簿標籤",
    standard: "示範標準標籤",
    vintage: "年份",
    acknowledgement:
      "我理解這些模擬碳信用將永久從可用持倉中扣除。此操作不會註銷真實碳信用，也不能作為真實減排聲明的依據。",
    confirm: "確認模擬註銷",
    edit: "修改資料",
    confirming: "正在記錄模擬註銷…",
    doneTitle: "模擬註銷已記錄",
    doneBody: "碳信用已從示範持倉中扣除，您的私人模擬憑證已備妥。",
    reference: "唯一模擬編號",
    date: "模擬日期",
    modelled: "模擬數量",
    view: "檢視／列印憑證",
    download: "下載 HTML 憑證",
    another: "再次模擬註銷",
    portfolio: "檢視投資組合",
    history: "註銷紀錄",
    historyHelp: "最近 100 筆模擬紀錄，憑證僅限您的帳戶存取。",
    noHistory: "尚無模擬紀錄",
    noHistoryBody: "完成的註銷紀錄與憑證將顯示於此。",
    status: "狀態",
    recorded: "已記錄 · 模擬",
    total: "累計模擬註銷",
    totalHelp: "此示範帳戶記錄的模擬 tCO2e",
    processTitle: "從持倉到紀錄",
    processBody:
      "選擇可用數量、核對資料，再保留模擬憑證。此操作不影響您的現金餘額。",
    noHoldings: "沒有可註銷的碳信用",
    noHoldingsHelp:
      "您可在市場取得示範碳信用，或取消未成交賣單及場外掛牌以釋放鎖定持倉。",
    market: "瀏覽市場",
    login: "登入以模擬註銷碳信用",
    loginHelp: "您的持倉、模擬紀錄及受益人資料僅供本人存取。",
    loginLink: "登入",
    loading: "正在載入持倉與紀錄…",
    loadFailed: "無法載入註銷工作區。",
    retry: "重試",
    invalidAmount: "請輸入可用持倉範圍內的正整數。",
    saved: "模擬註銷已記錄",
    retryHelp:
      "暫時無法確認結果。請保留這些資料並重試相同請求；重複提交不會再次扣除碳信用。",
    missingRegistry: "未提供",
    refreshError: "無法更新帳戶，顯示的持倉可能已變更。",
  },
};

const inputClass =
  "w-full rounded-xl border border-border bg-background px-3.5 py-3 text-sm text-foreground outline-none focus:border-accent focus:ring-2 focus:ring-accent/15 disabled:opacity-50";
const primaryClass =
  "inline-flex min-h-11 items-center justify-center rounded-full bg-accent px-5 py-3 text-sm font-semibold text-background transition hover:bg-accent-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-45";
const secondaryClass =
  "inline-flex min-h-11 items-center justify-center rounded-full border border-border bg-surface px-4 py-2.5 text-sm font-medium hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-45";

export default function RetirementPage() {
  const { lang } = useLang();
  return (
    <Suspense
      fallback={
        <p role="status" className="p-8 text-sm text-muted">
          {lang === "zh-TW" ? copy.zh.loading : copy.en.loading}
        </p>
      }
    >
      <RetirementRoute />
    </Suspense>
  );
}

function RetirementRoute() {
  const searchParams = useSearchParams();
  const initialAssetId = searchParams.get("asset") ?? "";
  return (
    <RetirementWorkspace key={initialAssetId} initialAssetId={initialAssetId} />
  );
}

function RetirementWorkspace({ initialAssetId }: { initialAssetId: string }) {
  const { lang } = useLang();
  const t = lang === "zh-TW" ? copy.zh : copy.en;
  const toast = useToast();
  const [data, setData] = useState<RetirementOverview | null>(null);
  const [loadError, setLoadError] = useState("");
  const [unauthorized, setUnauthorized] = useState(false);
  const [assetId, setAssetId] = useState(initialAssetId);
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("");
  const [customReason, setCustomReason] = useState("");
  const [beneficiary, setBeneficiary] = useState("");
  const [purpose, setPurpose] = useState("");
  const [publicMessage, setPublicMessage] = useState("");
  const [draft, setDraft] = useState<{
    input: RetirementInput;
    position: RetirementPosition;
  } | null>(null);
  const [acknowledged, setAcknowledged] = useState(false);
  const [busy, setBusy] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  const [formError, setFormError] = useState("");
  const [completed, setCompleted] = useState<RetirementRecord | null>(null);
  const stageTitle = useRef<HTMLHeadingElement>(null);

  const load = useCallback(async () => {
    try {
      const result = await api<RetirementOverview>("/api/retirements", {
        cache: "no-store",
      });
      setData(result);
      setAssetId((current) =>
        result.positions.some((position) => position.assetId === current)
          ? current
          : "",
      );
      setUnauthorized(false);
      setLoadError("");
    } catch (error) {
      if (error instanceof ApiError && error.status === 401)
        setUnauthorized(true);
      else setLoadError((error as Error).message);
      throw error;
    }
  }, []);
  usePolling(load, 15_000);

  const selected = data?.positions.find(
    (position) => position.assetId === assetId,
  );
  const returnTo = `/exchange/retirement${initialAssetId ? `?asset=${encodeURIComponent(initialAssetId)}` : ""}`;
  const hasAvailable = data?.positions.some(
    (position) => position.available > 0,
  );
  const step = completed ? 2 : draft ? 1 : 0;
  const date = (value: string) =>
    new Date(value).toLocaleString(lang === "zh-TW" ? "zh-TW" : "en", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  const focusStage = () =>
    requestAnimationFrame(() => stageTitle.current?.focus());
  const displayReason = (value: string) => {
    if (lang !== "zh-TW") return value;
    if (value.startsWith("Other: ")) return `其他：${value.slice(7)}`;
    return (
      RETIREMENT_REASONS.find((option) => option.value === value)?.zh ?? value
    );
  };

  function review(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const amount = Number(quantity);
    if (
      !selected ||
      !Number.isSafeInteger(amount) ||
      amount <= 0 ||
      amount > selected.available
    ) {
      setFormError(t.invalidAmount);
      return;
    }
    const enteredReason = reason === "Other" ? customReason.trim() : reason;
    if (!enteredReason || !beneficiary.trim() || !purpose.trim()) {
      setFormError(
        lang === "zh-TW"
          ? "請填寫註銷原因、受益人及用途。"
          : "Enter a reason, beneficiary and purpose before reviewing.",
      );
      return;
    }
    setFormError("");
    setAcknowledged(false);
    setUncertain(false);
    setDraft({
      position: { ...selected },
      input: {
        assetId,
        quantity: amount,
        reason: reason === "Other" ? `Other: ${enteredReason}` : enteredReason,
        beneficiary: beneficiary.trim(),
        purpose: purpose.trim(),
        publicMessage: publicMessage.trim(),
        idempotencyKey: crypto.randomUUID(),
        acknowledged: true,
      },
    });
    focusStage();
  }

  async function confirm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft || !acknowledged || busy) return;
    setBusy(true);
    setFormError("");
    try {
      const result = await api<{
        retirement: RetirementRecord;
        replayed: boolean;
      }>("/api/retirements", {
        method: "POST",
        body: JSON.stringify(draft.input),
      });
      setCompleted(result.retirement);
      setDraft(null);
      setUncertain(false);
      toast("ok", t.saved);
      focusStage();
      void load().catch(() => {});
    } catch (error) {
      setUncertain((current) => retirementOutcomeUncertain(error, current));
      setFormError((error as Error).message);
      toast("err", (error as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function startAgain() {
    setCompleted(null);
    setDraft(null);
    setQuantity("");
    setAcknowledged(false);
    setFormError("");
    focusStage();
  }

  return (
    <div className="space-y-6 pb-8">
      <header>
        <h1 className="text-xl font-bold">{t.title}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
          {t.subtitle}
        </p>
      </header>

      <div className="flex gap-3 rounded-2xl border border-border bg-surface p-4 text-foreground shadow-card">
        <span
          aria-hidden="true"
          className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-accent text-accent text-xs font-bold"
        >
          i
        </span>
        <div>
          <p className="text-sm font-semibold">{t.simulation}</p>
          <p className="mt-1 max-w-4xl text-xs leading-5">{t.warning}</p>
        </div>
      </div>

      {unauthorized ? (
        <section className="rounded-2xl border border-border bg-surface px-6 py-16 text-center shadow-card">
          <h2 className="text-lg font-semibold">{t.login}</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted">
            {t.loginHelp}
          </p>
          <Link
            href={`/login?returnTo=${encodeURIComponent(returnTo)}`}
            className={`${primaryClass} mt-6`}
          >
            {t.loginLink}
          </Link>
        </section>
      ) : !data ? (
        <section
          className="rounded-2xl border border-border bg-surface p-12 text-center shadow-card"
          aria-live="polite"
        >
          <p className="text-sm text-muted">
            {loadError ? t.loadFailed : t.loading}
          </p>
          {loadError && (
            <button
              type="button"
              onClick={() => void load().catch(() => {})}
              className={`${secondaryClass} mt-4`}
            >
              {t.retry}
            </button>
          )}
        </section>
      ) : (
        <>
          {loadError && (
            <div
              role="alert"
              className="rounded-xl border border-down/20 bg-down/5 p-3 text-sm text-down"
            >
              {t.refreshError}
            </div>
          )}
          <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_290px]">
            <section className="overflow-hidden rounded-2xl border border-border bg-surface shadow-card">
              <ol
                className="grid grid-cols-3 border-b border-border bg-surface-2/60 px-4 py-4"
                aria-label={t.title}
              >
                {[t.details, t.review, t.certificate].map((label, index) => (
                  <li
                    key={index}
                    aria-current={step === index ? "step" : undefined}
                    className={`flex items-center justify-center gap-2 text-xs ${step === index ? "font-semibold text-accent" : "text-muted"}`}
                  >
                    <span
                      aria-hidden="true"
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] ${step >= index ? "bg-accent text-background" : "border border-border bg-surface"}`}
                    >
                      {step > index ? "✓" : index + 1}
                    </span>
                    <span>{label}</span>
                  </li>
                ))}
              </ol>

              {completed ? (
                <div className="p-5 sm:p-7">
                  <div
                    aria-hidden="true"
                    className="mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-accent/10 text-xl text-accent"
                  >
                    ✓
                  </div>
                  <h2
                    ref={stageTitle}
                    tabIndex={-1}
                    className="text-xl font-semibold outline-none"
                  >
                    {t.doneTitle}
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-muted">
                    {t.doneBody}
                  </p>
                  <div className="mt-6 rounded-xl border border-accent/20 bg-accent/5 p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-accent">
                          {t.simulation}
                        </p>
                        <p className="mt-2 text-3xl font-semibold tnum">
                          {fmtQty(completed.quantity)}{" "}
                          <span className="text-base font-normal text-muted">
                            tCO2e
                          </span>
                        </p>
                      </div>
                      <span className="rounded-md border border-accent/20 px-2 py-1 text-[10px] font-semibold text-accent">
                        SIMULATED
                      </span>
                    </div>
                    <dl className="mt-5 space-y-3 text-sm">
                      <Detail
                        label={t.project}
                        value={`${completed.symbol} · ${tName(completed.symbol, completed.projectName, lang)}`}
                      />
                      <Detail
                        label={t.registry}
                        value={completed.registry || t.missingRegistry}
                      />
                      <Detail
                        label={t.vintage}
                        value={String(completed.vintage)}
                      />
                      <Detail
                        label={t.beneficiary}
                        value={completed.beneficiary}
                      />
                      <Detail
                        label={t.reason}
                        value={displayReason(completed.reason)}
                      />
                      <Detail label={t.purpose} value={completed.purpose} />
                      {completed.publicMessage && (
                        <Detail
                          label={t.message}
                          value={completed.publicMessage}
                        />
                      )}
                      <Detail
                        label={t.date}
                        value={date(completed.createdAt)}
                      />
                    </dl>
                    <div className="mt-5 border-t border-accent/15 pt-4">
                      <p className="text-xs text-muted">{t.reference}</p>
                      <p className="mt-1 break-all font-mono text-xs">
                        {completed.reference}
                      </p>
                    </div>
                  </div>
                  <div className="mt-5 flex flex-wrap gap-3">
                    <a
                      href={completed.certificateUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={primaryClass}
                    >
                      {t.view} ↗
                    </a>
                    <a
                      href={`${completed.certificateUrl}?download=1`}
                      className={secondaryClass}
                    >
                      {t.download} ↓
                    </a>
                  </div>
                  <div className="mt-6 flex flex-wrap gap-x-6 gap-y-3 text-sm">
                    <button
                      type="button"
                      onClick={startAgain}
                      className="font-medium text-accent hover:underline"
                    >
                      {t.another}
                    </button>
                    <Link
                      href="/exchange/portfolio"
                      className="text-muted hover:text-foreground"
                    >
                      {t.portfolio} →
                    </Link>
                  </div>
                </div>
              ) : draft ? (
                <form
                  onSubmit={confirm}
                  className="p-5 sm:p-7"
                  aria-busy={busy}
                >
                  <h2
                    ref={stageTitle}
                    tabIndex={-1}
                    className="text-lg font-semibold outline-none"
                  >
                    {t.reviewTitle}
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-muted">
                    {t.reviewHelp}
                  </p>
                  <div className="my-6 flex flex-wrap items-center justify-between gap-4 rounded-xl bg-surface-2 p-5">
                    <div>
                      <p className="text-xs text-muted">{t.amount}</p>
                      <p className="mt-1 text-3xl font-semibold tnum">
                        {fmtQty(draft.input.quantity)}{" "}
                        <span className="text-base font-normal text-muted">
                          tCO2e
                        </span>
                      </p>
                    </div>
                    <span className="rounded-md border border-border bg-surface px-2 py-1 text-[10px] font-semibold text-muted">
                      SIMULATED
                    </span>
                  </div>
                  <dl className="space-y-4 text-sm">
                    <Detail
                      label={t.project}
                      value={`${draft.position.symbol} · ${tName(draft.position.symbol, draft.position.name, lang)}`}
                    />
                    <Detail
                      label={t.registry}
                      value={draft.position.registry || t.missingRegistry}
                    />
                    <Detail
                      label={t.standard}
                      value={draft.position.standard || t.missingRegistry}
                    />
                    <Detail
                      label={t.vintage}
                      value={String(draft.position.vintage)}
                    />
                    <Detail
                      label={t.beneficiary}
                      value={draft.input.beneficiary}
                    />
                    <Detail
                      label={t.reason}
                      value={displayReason(draft.input.reason)}
                    />
                    <Detail label={t.purpose} value={draft.input.purpose} />
                    {draft.input.publicMessage && (
                      <Detail
                        label={t.message}
                        value={draft.input.publicMessage}
                      />
                    )}
                  </dl>
                  <label className="mt-7 flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-surface-2/50 p-4">
                    <input
                      type="checkbox"
                      required
                      checked={acknowledged}
                      onChange={(event) =>
                        setAcknowledged(event.target.checked)
                      }
                      disabled={busy}
                      className="mt-0.5 h-4 w-4 shrink-0 accent-accent"
                    />
                    <span className="text-xs leading-5">
                      {t.acknowledgement}
                    </span>
                  </label>
                  {formError && (
                    <div
                      role="alert"
                      className="mt-4 rounded-xl border border-down/20 bg-down/5 p-4 text-sm text-down"
                    >
                      <p>{formError}</p>
                      {uncertain && (
                        <p className="mt-2 text-xs leading-5">{t.retryHelp}</p>
                      )}
                    </div>
                  )}
                  <div className="mt-6 flex flex-wrap gap-3">
                    <button
                      type="submit"
                      disabled={!acknowledged || busy}
                      className={primaryClass}
                    >
                      {busy ? t.confirming : t.confirm}
                    </button>
                    <button
                      type="button"
                      disabled={busy || uncertain}
                      onClick={() => {
                        setDraft(null);
                        setFormError("");
                        focusStage();
                      }}
                      className={secondaryClass}
                    >
                      {t.edit}
                    </button>
                  </div>
                </form>
              ) : !hasAvailable ? (
                <div className="px-6 py-12 text-center">
                  <h2
                    ref={stageTitle}
                    tabIndex={-1}
                    className="text-lg font-semibold outline-none"
                  >
                    {t.noHoldings}
                  </h2>
                  <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted">
                    {t.noHoldingsHelp}
                  </p>
                  <div className="mt-6 flex flex-wrap justify-center gap-3">
                    <Link href="/exchange" className={primaryClass}>
                      {t.market} →
                    </Link>
                    <Link href="/exchange/portfolio" className={secondaryClass}>
                      {t.portfolio}
                    </Link>
                  </div>
                </div>
              ) : (
                <form onSubmit={review} className="space-y-5 p-5 sm:p-7">
                  <div>
                    <h2
                      ref={stageTitle}
                      tabIndex={-1}
                      className="text-lg font-semibold outline-none"
                    >
                      {t.choose}
                    </h2>
                    <p
                      id="credit-help"
                      className="mt-2 max-w-xl text-sm leading-6 text-muted"
                    >
                      {t.chooseHelp}
                    </p>
                  </div>
                  <div>
                    <label
                      htmlFor="retirement-asset"
                      className="mb-2 block text-sm font-medium"
                    >
                      {t.credit}
                    </label>
                    <select
                      id="retirement-asset"
                      required
                      value={assetId}
                      onChange={(event) => {
                        setAssetId(event.target.value);
                        setQuantity("");
                        setFormError("");
                      }}
                      aria-describedby="credit-help"
                      className={inputClass}
                    >
                      <option value="">{t.select}</option>
                      {data.positions.map((position) => (
                        <option
                          key={position.assetId}
                          value={position.assetId}
                          disabled={position.available === 0}
                        >
                          {position.symbol} · {fmtQty(position.available)}{" "}
                          {t.available}
                        </option>
                      ))}
                    </select>
                  </div>
                  {selected && (
                    <div className="rounded-xl border border-border bg-surface-2/60 p-4">
                      <p className="text-sm font-medium">
                        {tName(selected.symbol, selected.name, lang)}
                      </p>
                      <p className="mt-1 text-xs text-muted">
                        {selected.registry || t.missingRegistry} · {t.vintage}{" "}
                        {selected.vintage}
                      </p>
                      <div className="mt-4 flex gap-8 text-xs">
                        <span className="text-muted">
                          {t.available}{" "}
                          <strong className="ms-2 tnum text-accent">
                            {fmtQty(selected.available)}
                          </strong>
                        </span>
                        <span className="text-muted">
                          {t.locked}{" "}
                          <strong className="ms-2 tnum text-foreground">
                            {fmtQty(selected.locked)}
                          </strong>
                        </span>
                      </div>
                    </div>
                  )}
                  <div>
                    <label
                      htmlFor="retirement-quantity"
                      className="mb-2 block text-sm font-medium"
                    >
                      {t.amount}
                    </label>
                    <div className="relative">
                      <input
                        id="retirement-quantity"
                        required
                        type="number"
                        min="1"
                        max={selected?.available ?? 0}
                        step="1"
                        inputMode="numeric"
                        value={quantity}
                        disabled={!selected}
                        onChange={(event) => setQuantity(event.target.value)}
                        aria-describedby="quantity-help"
                        className={`${inputClass} pe-20 tnum`}
                        placeholder="0"
                      />
                      <span className="absolute end-4 top-3 text-sm text-muted">
                        tCO2e
                      </span>
                    </div>
                    <p id="quantity-help" className="mt-2 text-xs text-muted">
                      {t.unit}
                    </p>
                  </div>
                  <div className="grid gap-5 sm:grid-cols-2">
                    <div>
                      <label
                        htmlFor="retirement-reason"
                        className="mb-2 block text-sm font-medium"
                      >
                        {t.reason}
                      </label>
                      <select
                        id="retirement-reason"
                        required
                        value={reason}
                        onChange={(event) => {
                          setReason(event.target.value);
                          setFormError("");
                        }}
                        className={inputClass}
                      >
                        <option value="">
                          {lang === "zh-TW"
                            ? "選擇註銷原因"
                            : "Select a reason"}
                        </option>
                        {RETIREMENT_REASONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {lang === "zh-TW" ? option.zh : option.value}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label
                        htmlFor="retirement-beneficiary"
                        className="mb-2 block text-sm font-medium"
                      >
                        {t.beneficiary}
                      </label>
                      <input
                        id="retirement-beneficiary"
                        required
                        maxLength={200}
                        value={beneficiary}
                        onChange={(event) => setBeneficiary(event.target.value)}
                        placeholder={t.beneficiaryPlaceholder}
                        className={inputClass}
                      />
                    </div>
                  </div>
                  {reason === "Other" && (
                    <div>
                      <label
                        htmlFor="retirement-custom-reason"
                        className="mb-2 block text-sm font-medium"
                      >
                        {lang === "zh-TW" ? "其他原因" : "Other reason"}
                      </label>
                      <input
                        id="retirement-custom-reason"
                        required
                        maxLength={193}
                        value={customReason}
                        onChange={(event) =>
                          setCustomReason(event.target.value)
                        }
                        placeholder={t.reasonPlaceholder}
                        className={inputClass}
                      />
                    </div>
                  )}
                  <div>
                    <label
                      htmlFor="retirement-purpose"
                      className="mb-2 block text-sm font-medium"
                    >
                      {t.purpose}
                    </label>
                    <textarea
                      id="retirement-purpose"
                      required
                      maxLength={500}
                      rows={3}
                      value={purpose}
                      onChange={(event) => setPurpose(event.target.value)}
                      placeholder={t.purposePlaceholder}
                      className={`${inputClass} resize-y`}
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="retirement-message"
                      className="mb-2 block text-sm font-medium"
                    >
                      {t.message}{" "}
                      <span className="font-normal text-muted">
                        ({t.optional})
                      </span>
                    </label>
                    <textarea
                      id="retirement-message"
                      maxLength={500}
                      rows={2}
                      value={publicMessage}
                      onChange={(event) => setPublicMessage(event.target.value)}
                      aria-describedby="message-help"
                      className={`${inputClass} resize-y`}
                    />
                    <p
                      id="message-help"
                      className="mt-2 text-xs leading-5 text-muted"
                    >
                      {t.messageHelp}
                    </p>
                  </div>
                  {formError && (
                    <p role="alert" className="text-sm text-down">
                      {formError}
                    </p>
                  )}
                  <div className="border-t border-border pt-5">
                    <button
                      type="submit"
                      disabled={!selected || !quantity}
                      className={`${primaryClass} w-full sm:w-auto`}
                    >
                      {t.next} →
                    </button>
                  </div>
                </form>
              )}
            </section>

            <aside className="space-y-4">
              <div className="rounded-xl border border-border bg-surface p-5">
                <p className="text-xs font-medium text-muted">{t.total}</p>
                <p className="mt-3 text-3xl font-semibold tnum">
                  {fmtQty(data.totalRetired)}
                </p>
                <p className="mt-2 text-xs leading-5 text-muted">
                  {t.totalHelp}
                </p>
                <div className="mt-5 border-t border-border pt-4 text-[10px] font-semibold tracking-wider text-accent">
                  SIMULATION ONLY
                </div>
              </div>
              <div className="rounded-xl border border-border bg-surface p-5">
                <h2 className="text-sm font-semibold">{t.processTitle}</h2>
                <p className="mt-2 text-xs leading-6 text-muted">
                  {t.processBody}
                </p>
                <Link
                  href="/exchange/portfolio"
                  className="mt-4 inline-block text-xs font-medium text-accent hover:underline"
                >
                  {t.portfolio} →
                </Link>
              </div>
            </aside>
          </div>

          <section className="overflow-hidden rounded-xl border border-border bg-surface">
            <div className="border-b border-border px-5 py-5">
              <h2 className="text-lg font-semibold">{t.history}</h2>
              <p className="mt-1 text-xs leading-5 text-muted">
                {t.historyHelp}
              </p>
            </div>
            {data.retirements.length === 0 ? (
              <div className="px-6 py-10 text-center">
                <p className="text-sm font-medium">{t.noHistory}</p>
                <p className="mt-2 text-xs text-muted">{t.noHistoryBody}</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[700px] text-sm">
                  <thead className="bg-surface-2/50 text-xs text-muted">
                    <tr>
                      <th
                        scope="col"
                        className="px-5 py-3 text-start font-medium"
                      >
                        {t.credit}
                      </th>
                      <th
                        scope="col"
                        className="px-4 py-3 text-end font-medium"
                      >
                        tCO2e
                      </th>
                      <th
                        scope="col"
                        className="px-4 py-3 text-start font-medium"
                      >
                        {t.beneficiary}
                      </th>
                      <th
                        scope="col"
                        className="px-4 py-3 text-start font-medium"
                      >
                        {t.date}
                      </th>
                      <th
                        scope="col"
                        className="px-4 py-3 text-start font-medium"
                      >
                        {t.status}
                      </th>
                      <th
                        scope="col"
                        className="px-5 py-3 text-end font-medium"
                      >
                        {t.certificate}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.retirements.map((record) => (
                      <tr key={record.id} className="border-t border-border/60">
                        <td className="px-5 py-4">
                          <span className="font-medium">{record.symbol}</span>
                          <p
                            className="mt-1 max-w-[200px] truncate text-xs text-muted"
                            title={record.projectName}
                          >
                            {tName(record.symbol, record.projectName, lang)}
                          </p>
                        </td>
                        <td className="px-4 py-4 text-end tnum">
                          {fmtQty(record.quantity)}
                        </td>
                        <td className="max-w-[190px] break-words px-4 py-4 text-xs">
                          {record.beneficiary}
                        </td>
                        <td className="whitespace-nowrap px-4 py-4 text-xs text-muted">
                          {date(record.createdAt)}
                        </td>
                        <td className="px-4 py-4">
                          <span className="whitespace-nowrap rounded-md bg-accent/8 px-2 py-1 text-[10px] font-medium text-accent">
                            {t.recorded}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-end">
                          <a
                            href={record.certificateUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="whitespace-nowrap text-xs font-medium text-accent hover:underline"
                            aria-label={`${t.view}: ${record.reference}`}
                          >
                            {t.certificate} ↗
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 sm:grid-cols-[150px_minmax(0,1fr)] sm:gap-5">
      <dt className="text-muted">{label}</dt>
      <dd className="break-words whitespace-pre-wrap font-medium">{value}</dd>
    </div>
  );
}
