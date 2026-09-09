"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { api, fmtMoney } from "@/lib/format";
import { useExchangeText } from "@/components/exchange/useExchange";
import { DemoButton } from "@/components/exchange/AccountData";
import { ExchangeIcon } from "@/components/exchange/ExchangeIcon";
export default function AccountPage() {
  const c = useExchangeText();
  const [me, setMe] = useState<{
      name: string;
      email: string;
      cashBalance: number;
      lockedCash: number;
    } | null>(null),
    [loaded, setLoaded] = useState(false),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    api<typeof me>("/api/auth/me")
      .then(setMe)
      .catch((e) => setError(e.message))
      .finally(() => setLoaded(true));
  }, []);
  async function logout() {
    setBusy(true);
    try {
      await api("/api/auth/logout", { method: "POST" });
      window.location.assign("/exchange");
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }
  return (
    <>
      <div className="ex-page-heading">
        <div>
          <h1>{c("Account & settings", "帳戶與設定")}</h1>
          <p>
            {c(
              "Your workspace, preferences and simulation balance.",
              "您的工作空間、偏好設定與模擬餘額。",
            )}
          </p>
        </div>
      </div>
      {error && (
        <div role="alert" className="ex-error">
          {error}
        </div>
      )}
      <div className="ex-two-column">
        <section className="ex-panel">
          <div className="ex-panel-heading">
            <h2>{c("Your account", "您的帳戶")}</h2>
            <ExchangeIcon name="account" />
          </div>
          {!loaded ? (
            <p role="status" className="ex-muted">
              {c("Loading…", "載入中…")}
            </p>
          ) : me ? (
            <>
              <dl className="grid gap-5 text-sm">
                <div>
                  <dt className="ex-muted">{c("Display name", "顯示名稱")}</dt>
                  <dd className="mt-1">{me.name}</dd>
                </div>
                <div>
                  <dt className="ex-muted">{c("Email", "電子郵件")}</dt>
                  <dd className="mt-1 break-all">{me.email}</dd>
                </div>
                <div>
                  <dt className="ex-muted">
                    {c("Account environment", "帳戶環境")}
                  </dt>
                  <dd className="mt-1">
                    {c("Carbon-market simulator", "碳市場模擬環境")}
                  </dd>
                </div>
              </dl>
              <button
                className="ex-button mt-7"
                onClick={logout}
                disabled={busy}
              >
                {busy ? c("Signing out…", "登出中…") : c("Sign out", "登出")}
              </button>
            </>
          ) : (
            <>
              <p className="ex-muted mb-5">
                {c(
                  "Create an account to keep your trading and retirement history, or try an isolated demo workspace.",
                  "建立帳戶保留交易與註銷紀錄，或使用專屬模擬工作空間。",
                )}
              </p>
              <div className="ex-actions mb-5">
                <Link
                  href="/register?returnTo=%2Fexchange%2Fportfolio"
                  className="ex-button primary"
                >
                  {c("Create account", "建立帳戶")}
                </Link>
                <Link
                  href="/login?returnTo=%2Fexchange%2Fportfolio"
                  className="ex-button"
                >
                  {c("Sign in", "登入")}
                </Link>
              </div>
              <DemoButton />
            </>
          )}
        </section>
        <div>
          <section className="ex-panel" id="funding">
            <div className="ex-panel-heading">
              <h2>{c("Demo funding", "模擬資金")}</h2>
              <ExchangeIcon name="portfolio" />
            </div>
            <p className="ex-metric-big">
              {me ? `$${fmtMoney(me.cashBalance)}` : "—"}
            </p>
            <p className="ex-muted mt-2 mb-5">
              {c("Available simulated USD", "可用模擬美元")}
            </p>
            <p className="text-xs text-muted leading-relaxed">
              {c(
                "Real deposits and withdrawals are not supported. A new guest workspace starts with $100,000 in simulated funds. These funds have no monetary value.",
                "不支援真實入金或出金。新的體驗工作空間提供 100,000 美元模擬資金，沒有實際貨幣價值。",
              )}
            </p>
          </section>
          <section className="ex-panel">
            <h2>{c("Display preferences", "顯示偏好")}</h2>
            <p className="ex-muted mt-3 leading-relaxed">
              {c(
                "Use the language and appearance controls in the top bar. Preferences and your watchlist are stored on this browser. New exchange features currently have English and Traditional Chinese copy.",
                "使用頂部工具列切換語言與明暗主題。偏好與關注清單儲存於此瀏覽器。新版交易所功能目前提供英文與繁體中文文案。",
              )}
            </p>
            <Link
              href="/exchange/learn#simulation"
              className="ex-learn-link mt-4"
            >
              {c("Understand the simulation", "了解模擬環境")}
              <ExchangeIcon name="arrow" size={14} />
            </Link>
          </section>
        </div>
      </div>
    </>
  );
}
