"use client";

import Link from "next/link";
import { useEffect, useState, type CSSProperties } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { filterCredits, getCreditProfile } from "@/lib/carbon";
import { api, fmtMoney, fmtQty } from "@/lib/format";
import { useLang } from "@/lib/i18n";
import { tCountry, tName } from "@/lib/data-i18n";
import { ExchangeIcon } from "./ExchangeIcon";
import { useExchangeText, useMarket } from "./useExchange";
import {
  categoryLabel,
  OFFSETS_SOURCE,
  registryLabel,
  sourceUrl,
  useRegistryOverview,
} from "./RegistryData";
import "./discovery.css";

type RegistryProject = {
  id: string;
  name: string;
  registry: string;
  country: string | null;
  category: string | null;
  projectType: string | null;
  protocol: string | null;
  status: string | null;
  issued: number;
  retired: number;
  projectUrl: string | null;
  syncedAt: string;
};
type RegistryPage = {
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  data: RegistryProject[];
};

export function ProjectExplorer() {
  const c = useExchangeText();
  const router = useRouter();
  const params = useSearchParams();
  const tab = params.get("view") === "registry" ? "registry" : "demo";
  const change = (values: Record<string, string>) => {
    const next = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(values)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    router.replace(`/exchange/projects${next.size ? `?${next}` : ""}`, {
      scroll: false,
    });
  };
  return (
    <>
      <div className="ex-page-heading">
        <div>
          <h1>{c("Explore carbon projects", "探索碳信用項目")}</h1>
          <p>
            {c(
              "Start with the activity behind a credit. Explore project types, compare their attributes and follow the evidence.",
              "從碳信用背後的活動出發，探索項目類型、比較特徵，並追溯資料來源。",
            )}
          </p>
        </div>
        <Link href="/exchange/learn#quality" className="ex-button">
          <ExchangeIcon name="learn" size={15} />
          {c("What makes a quality credit?", "如何了解信用品質？")}
        </Link>
      </div>
      <div
        className="ex-market-tabs ex-discovery-tabs"
        role="group"
        aria-label={c("Project data source", "項目資料來源")}
      >
        <button
          aria-pressed={tab === "demo"}
          onClick={() => change({ view: "", page: "" })}
        >
          {c("Demo credit projects", "示範碳信用項目")}
        </button>
        <button
          aria-pressed={tab === "registry"}
          onClick={() => change({ view: "registry", page: "" })}
        >
          {c("Real registry explorer", "真實註冊處瀏覽器")}
        </button>
      </div>
      {tab === "demo" ? (
        <DemoProjects change={change} />
      ) : (
        <RegistryProjects change={change} />
      )}
    </>
  );
}

function DemoProjects({
  change,
}: {
  change: (values: Record<string, string>) => void;
}) {
  const c = useExchangeText();
  const { lang } = useLang();
  const params = useSearchParams();
  const { assets, loaded, hasData, error, reload } = useMarket();
  const q = params.get("q") ?? "",
    category = params.get("type") ?? "",
    country = params.get("location") ?? "";
  const credits = assets
    .filter((a) => !a.isScenario)
    .map((a) => ({ ...a, name: tName(a.symbol, a.name, lang) }));
  const search = q.trim().toLowerCase();
  const matchingIds = new Set(
    filterCredits(credits, { search: q }).map((a) => a.id),
  );
  const rows = filterCredits(
    credits.filter(
      (a) =>
        matchingIds.has(a.id) ||
        [
          tCountry(a.country, lang),
          tCountry(a.country, "en"),
          tCountry(a.country, "zh-TW"),
        ].some((label) => label.toLowerCase().includes(search)),
    ),
    { category, country },
  );
  const profiles = [
    ...new Map(
      credits.map((a) => {
        const p = getCreditProfile(a);
        return [p.category, p];
      }),
    ).values(),
  ].sort((a, b) => a.category.localeCompare(b.category));
  return (
    <>
      <div className="ex-market-toolbar ex-discovery-toolbar">
        <label className="ex-search-field">
          <ExchangeIcon name="search" size={15} />
          <input
            aria-label={c("Search demonstration projects", "搜尋示範項目")}
            placeholder={c(
              "Search name, country or standard",
              "搜尋名稱、國家或標準",
            )}
            value={q}
            onChange={(e) => change({ q: e.target.value })}
          />
        </label>
        <select
          className="ex-select"
          aria-label={c("Project type", "項目類型")}
          value={category}
          onChange={(e) => change({ type: e.target.value })}
        >
          <option value="">{c("All project types", "所有項目類型")}</option>
          {profiles.map((p) => (
            <option key={p.category} value={p.category}>
              {c(p.category, p.categoryZh)}
            </option>
          ))}
        </select>
        <select
          className="ex-select"
          aria-label={c("Country", "國家")}
          value={country}
          onChange={(e) => change({ location: e.target.value })}
        >
          <option value="">{c("All countries", "所有國家")}</option>
          {[...new Set(credits.map((a) => a.country))].sort().map((value) => (
            <option key={value} value={value}>
              {tCountry(value, lang)}
            </option>
          ))}
        </select>
        {(q || category || country) && (
          <button
            className="ex-button ghost"
            onClick={() => change({ q: "", type: "", location: "" })}
          >
            {c("Clear filters", "清除篩選")}
          </button>
        )}
        <span className="ex-muted" aria-live="polite">
          {hasData
            ? `${rows.length} ${c("projects", "個項目")}`
            : loaded
              ? "—"
              : c("Loading…", "載入中…")}
        </span>
      </div>
      {error && (
        <div className="ex-error" role="alert">
          <span>
            {c(
              "Demo project data could not be refreshed.",
              "無法更新示範項目資料。",
            )}
          </span>
          <button onClick={() => void reload().catch(() => {})}>
            {c("Retry", "重試")}
          </button>
        </div>
      )}
      {!loaded ? (
        <div
          className="ex-card-grid"
          aria-label={c("Loading projects", "正在載入項目")}
          role="status"
        >
          {[1, 2, 3].map((n) => (
            <div className="ex-panel" key={n}>
              <div className="ex-skeleton" />
              <div className="ex-skeleton" />
              <div className="ex-skeleton" />
            </div>
          ))}
        </div>
      ) : rows.length ? (
        <div className="ex-card-grid">
          {rows.map((a) => {
            const p = getCreditProfile(a);
            return (
              <article
                className="ex-project-card"
                key={a.id}
                style={{ "--project-color": p.color } as CSSProperties}
              >
                <div className="ex-project-art">
                  <ExchangeIcon name={p.icon} />
                  <span>{c("Demonstration project", "示範項目")}</span>
                </div>
                <div className="ex-project-copy">
                  <div className="ex-actions">
                    <span className="ex-registry-tag">
                      {a.standard === "VCS"
                        ? "Verra VCS"
                        : a.standard === "GS"
                          ? "Gold Standard"
                          : a.standard}
                    </span>
                    <span className="ex-muted">
                      {c(p.category, p.categoryZh)}
                    </span>
                  </div>
                  <h2 className="ex-project-name">
                    <Link
                      href={`/exchange/market/${encodeURIComponent(a.symbol)}`}
                    >
                      {a.name}
                    </Link>
                  </h2>
                  <p>
                    {tCountry(a.country, lang)} · {c(p.approach, p.approachZh)}
                  </p>
                  <dl className="ex-project-facts">
                    <div>
                      <dt>{c("Vintage", "減排年份")}</dt>
                      <dd>{a.vintage}</dd>
                    </div>
                    <div>
                      <dt>{c("Demo USD / credit", "模擬美元／信用")}</dt>
                      <dd>
                        {a.lastPrice == null
                          ? "—"
                          : `$${fmtMoney(a.lastPrice)}`}
                      </dd>
                    </div>
                    <div>
                      <dt>
                        {c("Available on sell orders", "公開賣單可成交量")}
                      </dt>
                      <dd>
                        {fmtQty(a.availableSupply)} {c("credits", "份")}
                      </dd>
                    </div>
                    <div>
                      <dt>{c("Registry project ID", "註冊處項目編號")}</dt>
                      <dd>{c("Not supplied", "未提供")}</dd>
                    </div>
                  </dl>
                  <p className="ex-project-provenance">
                    {c(
                      "Illustrative catalogue entry. No link to a verified, registered project.",
                      "此項目為示範目錄內容，未連結至已查證的真實註冊項目。",
                    )}
                  </p>
                  <Link
                    href={`/exchange/market/${encodeURIComponent(a.symbol)}`}
                    className="ex-button"
                  >
                    {c("View credit and project details", "查看信用與項目資料")}
                    <ExchangeIcon name="arrow" size={14} />
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        !error && (
          <div className="ex-panel ex-empty">
            <ExchangeIcon name="projects" size={30} />
            <h2>{c("No matching demo projects", "沒有符合條件的示範項目")}</h2>
            <p>
              {c(
                "Try a broader search or explore the separate registry data collection.",
                "請放寬搜尋條件，或瀏覽另一分頁中的註冊處資料。",
              )}
            </p>
            <button
              className="ex-button"
              onClick={() => change({ q: "", type: "", location: "" })}
            >
              {c("Clear filters", "清除篩選")}
            </button>
          </div>
        )
      )}
      <div className="ex-info-strip">
        <ExchangeIcon name="info" size={24} />
        <div>
          <strong>
            {c("A catalogue label is a starting point.", "目錄標籤只是起點。")}
          </strong>
          <p>
            {c(
              "Before assessing a real credit, check the registry ID, methodology, monitoring and verification reports, and retirement record.",
              "評估真實碳信用前，應核對註冊編號、方法學、監測與查證報告，以及註銷紀錄。",
            )}
          </p>
        </div>
        <Link href="/exchange/learn#quality">
          {c("See the checklist", "查看檢查清單")}
        </Link>
      </div>
    </>
  );
}

function RegistryProjects({
  change,
}: {
  change: (values: Record<string, string>) => void;
}) {
  const c = useExchangeText();
  const params = useSearchParams();
  const {
    overview,
    error: overviewError,
    reload: reloadOverview,
  } = useRegistryOverview();
  const registry = params.get("registry") ?? "",
    country = params.get("country") ?? "",
    category = params.get("category") ?? "";
  const requestedPage = Number(params.get("page") || "1");
  const page =
    Number.isSafeInteger(requestedPage) && requestedPage > 0
      ? requestedPage
      : 1;
  const query = new URLSearchParams({
    ...(registry ? { registry } : {}),
    ...(country ? { country } : {}),
    ...(category ? { category } : {}),
    page: String(page),
  }).toString();
  const [attempt, setAttempt] = useState(0);
  const [search, setSearch] = useState("");
  const [result, setResult] = useState<{
    query: string;
    attempt: number;
    data: RegistryPage | null;
    error: string;
  } | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    api<RegistryPage>(`/api/real/projects?${query}`, {
      signal: controller.signal,
    })
      .then((data) => {
        if (active) setResult({ query, attempt, data, error: "" });
      })
      .catch((error: Error) => {
        if (active)
          setResult((previous) => ({
            query,
            attempt,
            data: previous?.query === query ? previous.data : null,
            error: error.message,
          }));
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [query, attempt]);
  const current = result?.query === query ? result : null;
  const loading = !current || current.attempt !== attempt;
  const q = search.trim().toLowerCase();
  const rows =
    current?.data?.data.filter(
      (p) =>
        !q ||
        [p.id, p.name, p.country, p.protocol, p.projectType]
          .join(" ")
          .toLowerCase()
          .includes(q),
    ) ?? [];
  const pagination = current?.data?.pagination;
  const filter = (key: string, value: string) => {
    setSearch("");
    change({ [key]: value, page: "" });
  };
  return (
    <>
      <p className="ex-discovery-caption" style={{ marginBottom: 19 }}>
        {c(
          "Public registry records sourced through CarbonPlan OffsetsDB. These projects are not the demo assets traded on Carbadia. Issuance and retirement totals are historical quantities, not credits available to buy.",
          "此處透過 CarbonPlan OffsetsDB 提供公開註冊處紀錄，與 Carbadia 的示範交易標的無關。簽發及註銷量是歷史數量，不代表可購買的信用。",
        )}
      </p>
      <section
        className="ex-market-body"
        aria-label={c("Real registry projects", "真實註冊項目")}
      >
        <div className="ex-market-toolbar">
          <select
            className="ex-select"
            aria-label={c("Filter by registry", "依註冊處篩選")}
            value={registry}
            onChange={(e) => filter("registry", e.target.value)}
          >
            <option value="">{c("All registries", "所有註冊處")}</option>
            {(overview?.registries ?? []).map((r) => (
              <option key={r.registry} value={r.registry}>
                {registryLabel(r.registry)}
              </option>
            ))}
          </select>
          <select
            className="ex-select"
            aria-label={c("Filter by country", "依國家篩選")}
            value={country}
            onChange={(e) => filter("country", e.target.value)}
          >
            <option value="">{c("All countries", "所有國家")}</option>
            {overview?.filters.countries.map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
          <select
            className="ex-select"
            aria-label={c("Filter by category", "依類別篩選")}
            value={category}
            onChange={(e) => filter("category", e.target.value)}
          >
            <option value="">{c("All categories", "所有類別")}</option>
            {overview?.filters.categories.map((value) => (
              <option key={value} value={value}>
                {categoryLabel(value)}
              </option>
            ))}
          </select>
          {(registry || country || category) && (
            <button
              className="ex-button ghost"
              onClick={() => {
                setSearch("");
                change({ registry: "", country: "", category: "", page: "" });
              }}
            >
              {c("Clear filters", "清除篩選")}
            </button>
          )}
          <span className="ex-muted">
            {pagination
              ? `${fmtQty(pagination.total)} ${c("matching records", "筆符合紀錄")}`
              : c("Loading records…", "載入紀錄中…")}
          </span>
        </div>
        <div className="ex-registry-search">
          <label className="ex-search-field">
            <ExchangeIcon name="search" size={15} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={c(
                "Search this page by name or ID",
                "依名稱或編號搜尋本頁",
              )}
              aria-label={c("Search the current page only", "僅搜尋目前頁面")}
            />
          </label>
          <span>
            {c(
              "Name search covers this page. Registry, country and category filters cover all records.",
              "名稱搜尋僅涵蓋本頁；註冊處、國家及類別篩選涵蓋全部紀錄。",
            )}
          </span>
        </div>
        {current?.error && (
          <div className="ex-error" role="alert">
            <span>
              {c(
                "Registry records could not be refreshed. Any visible records are the last received page.",
                "無法更新註冊處紀錄；目前顯示的紀錄為上次載入的頁面。",
              )}
            </span>
            <button onClick={() => setAttempt((n) => n + 1)}>
              {c("Retry", "重試")}
            </button>
          </div>
        )}
        {loading && !current?.data ? (
          <div className="ex-loading" role="status">
            {c("Loading registry records…", "正在載入註冊紀錄…")}
          </div>
        ) : rows.length ? (
          <div className="ex-table-wrap" aria-busy={loading}>
            <table className="ex-table ex-registry-table">
              <thead>
                <tr>
                  <th>{c("Project / source ID", "項目／來源編號")}</th>
                  <th>{c("Registry", "註冊處")}</th>
                  <th>{c("Country", "國家")}</th>
                  <th className="numeric">
                    {c("Issued · tCO₂e", "簽發量 · tCO₂e")}
                  </th>
                  <th className="numeric">
                    {c("Retired · tCO₂e", "註銷量 · tCO₂e")}
                  </th>
                  <th>{c("Source", "來源")}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => {
                  const url = sourceUrl(p.projectUrl);
                  return (
                    <tr key={p.id}>
                      <td>
                        <strong>
                          {p.name || c("Unnamed project", "未命名項目")}
                        </strong>
                        <span className="ex-subline">
                          {p.id} ·{" "}
                          {p.category
                            ? categoryLabel(p.category)
                            : c("Category not supplied", "未提供類別")}
                        </span>
                        <details>
                          <summary>
                            {c("Project attributes", "項目屬性")}
                          </summary>
                          <p>
                            {c("Status", "狀態")}:{" "}
                            {p.status || c("Not supplied", "未提供")}
                            <br />
                            {c("Type", "類型")}:{" "}
                            {p.projectType || c("Not supplied", "未提供")}
                            <br />
                            {c("Protocol", "方法／協議")}:{" "}
                            {p.protocol || c("Not supplied", "未提供")}
                            <br />
                            {c("Synced", "同步日期")}: {p.syncedAt.slice(0, 10)}
                          </p>
                        </details>
                      </td>
                      <td>{registryLabel(p.registry)}</td>
                      <td>{p.country || "—"}</td>
                      <td className="numeric">{fmtQty(p.issued)}</td>
                      <td className="numeric">{fmtQty(p.retired)}</td>
                      <td>
                        {url ? (
                          <a
                            className="ex-learn-link"
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={`${c("Open source for", "開啟來源：")} ${p.name || p.id}`}
                          >
                            {c("View record", "查看紀錄")}
                            <ExchangeIcon name="external" size={12} />
                          </a>
                        ) : (
                          <span className="ex-muted">
                            {c("No source link", "無來源連結")}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          !current?.error && (
            <div className="ex-empty">
              <ExchangeIcon name="projects" size={30} />
              <h2>
                {q
                  ? c("No matches on this page", "本頁沒有符合紀錄")
                  : c(
                      "No registry records to display",
                      "目前沒有可顯示的註冊紀錄",
                    )}
              </h2>
              <p>
                {q
                  ? c(
                      "Clear the page search or move to another results page.",
                      "請清除本頁搜尋或切換其他結果頁面。",
                    )
                  : registry || country || category
                    ? c(
                        "Broaden your filters to find more records.",
                        "請放寬篩選条件以尋找更多紀錄。",
                      )
                    : c(
                        "A registry snapshot may not have been loaded yet. You can still visit the original data source.",
                        "系統可能尚未載入註冊處快照。您仍可前往原始資料來源查看。",
                      )}
              </p>
              {q ? (
                <button className="ex-button" onClick={() => setSearch("")}>
                  {c("Clear page search", "清除本頁搜尋")}
                </button>
              ) : (
                <a
                  className="ex-button"
                  href={OFFSETS_SOURCE}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  CarbonPlan OffsetsDB
                  <ExchangeIcon name="external" size={13} />
                </a>
              )}
            </div>
          )
        )}
        {pagination && pagination.totalPages > 0 && (
          <div className="ex-discovery-pages">
            <span aria-live="polite">
              {c(
                `Page ${pagination.page} of ${pagination.totalPages}`,
                `第 ${pagination.page}／${pagination.totalPages} 頁`,
              )}{" "}
              · {rows.length} {c("shown", "筆顯示")}
            </span>
            <div>
              <button
                className="ex-button"
                disabled={page <= 1 || loading}
                onClick={() => {
                  setSearch("");
                  change({ page: String(page - 1) });
                }}
              >
                {c("Previous", "上一頁")}
              </button>
              <button
                className="ex-button"
                disabled={page >= pagination.totalPages || loading}
                onClick={() => {
                  setSearch("");
                  change({ page: String(page + 1) });
                }}
              >
                {c("Next", "下一頁")}
              </button>
            </div>
          </div>
        )}
        <div className="ex-registry-meta">
          <span>
            {overview?.asOf
              ? c(
                  `Data as of ${overview.asOf.slice(0, 10)}`,
                  `資料截至 ${overview.asOf.slice(0, 10)}`,
                )
              : c("Snapshot date unavailable", "未提供快照日期")}
          </span>
          <a href={OFFSETS_SOURCE} target="_blank" rel="noopener noreferrer">
            CarbonPlan OffsetsDB
          </a>
          {overviewError && (
            <span role="status">
              {c(
                "Filter options could not be refreshed.",
                "無法更新篩選選項。",
              )}{" "}
              <button onClick={() => void reloadOverview().catch(() => {})}>
                {c("Retry", "重試")}
              </button>
            </span>
          )}
          <Link href="/exchange/research">
            {c("Explore market context", "查看市場背景")}
          </Link>
        </div>
      </section>
    </>
  );
}
