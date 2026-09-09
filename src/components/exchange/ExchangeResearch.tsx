"use client";

import Link from "next/link";
import { useState } from "react";
import { CREDIT_SOURCES, getCreditProfile } from "@/lib/carbon";
import { fmtQty } from "@/lib/format";
import { ExchangeIcon } from "./ExchangeIcon";
import { Stat } from "./MarketPlace";
import { useExchangeText, useMarket } from "./useExchange";
import {
  OFFSETS_SOURCE,
  registryLabel,
  useRegistryOverview,
} from "./RegistryData";
import "./discovery.css";

export function ExchangeResearch() {
  const c = useExchangeText();
  const { overview, error, reload } = useRegistryOverview();
  const market = useMarket();
  const [retrying, setRetrying] = useState(false);
  const [metric, setMetric] = useState<"issuance" | "retirement">("retirement");
  const [distribution, setDistribution] = useState<"retired" | "issued">(
    "retired",
  );
  const hasSnapshot =
    !!overview && (overview.totals.projects > 0 || !!overview.asOf);
  const loadingSnapshot = !overview && (!error || retrying);
  const snapshotStatus = loadingSnapshot
    ? c("Waiting for the registry snapshot…", "正在等待註冊處快照…")
    : c(
        "Registry data is unavailable. Use Retry above to load it again.",
        "目前無法取得註冊處資料，請使用上方的重試按鈕重新載入。",
      );
  const retryOverview = async () => {
    if (retrying) return;
    setRetrying(true);
    try {
      await reload();
    } catch {
      // The overview hook retains the last snapshot and exposes the error.
    } finally {
      setRetrying(false);
    }
  };
  const credits = market.assets.filter((a) => !a.isScenario);
  const groups = new Map<
    string,
    {
      category: string;
      categoryZh: string;
      color: string;
      volume: number;
      projects: number;
    }
  >();
  for (const asset of credits) {
    const profile = getCreditProfile(asset);
    const group = groups.get(profile.category) ?? {
      category: profile.category,
      categoryZh: profile.categoryZh,
      color: profile.color,
      volume: 0,
      projects: 0,
    };
    group.volume += asset.volume24h;
    group.projects += 1;
    groups.set(profile.category, group);
  }
  const categories = [...groups.values()].sort((a, b) => b.volume - a.volume);
  const demoVolume = categories.reduce((sum, g) => sum + g.volume, 0);
  const years = overview?.years.slice(-8) ?? [];
  const maxYear = Math.max(1, ...years.map((year) => year[metric]));
  const registries = [...(overview?.registries ?? [])].sort(
    (a, b) => b[distribution] - a[distribution],
  );
  const maxRegistry = Math.max(1, ...registries.map((r) => r[distribution]));
  const topBeneficiaries =
    overview?.beneficiaries
      .filter((b) => b.name !== "UNDISCLOSED")
      .slice(0, 5) ?? [];
  return (
    <>
      <div className="ex-page-heading">
        <div>
          <h1>{c("Carbon market research", "碳市場研究")}</h1>
          <p>
            {c(
              "Understand what has been issued, what has been retired and where the activity comes from.",
              "了解碳信用的簽發、註銷情況，以及市場活動的資料來源。",
            )}
          </p>
        </div>
        <Link href="/exchange/projects?view=registry" className="ex-button">
          <ExchangeIcon name="projects" size={15} />
          {c("Explore registry projects", "瀏覽註冊處項目")}
        </Link>
      </div>
      <div className="ex-research-source">
        <strong>{c("Real registry records", "真實註冊處紀錄")}</strong> ·{" "}
        {overview?.asOf
          ? c(
              `Snapshot: ${overview.asOf.slice(0, 10)}`,
              `快照日期：${overview.asOf.slice(0, 10)}`,
            )
          : overview
            ? c("Snapshot date unavailable", "未提供快照日期")
            : loadingSnapshot
              ? c("Loading snapshot…", "正在載入快照…")
              : c("Snapshot unavailable", "無法取得快照")}
        {overview && error && (
          <span>
            {c(" · Previous snapshot · refresh failed", " · 舊快照 · 更新失敗")}
          </span>
        )}
        <br />
        {c("Source: ", "來源：")}
        <a href={OFFSETS_SOURCE} target="_blank" rel="noopener noreferrer">
          CarbonPlan OffsetsDB
        </a>
        {c(
          ". Coverage reflects the registries in this dataset, not every carbon market. These figures do not describe Carbadia demo assets or tradable supply.",
          "。涵蓋範圍以此資料集收錄的註冊處為準，並非所有碳市場。以下數字不代表 Carbadia 示範資產或可交易供應量。",
        )}
      </div>
      {error && (
        <div className="ex-error" role="alert">
          <span>
            {overview
              ? c(
                  "Registry data could not be refreshed. The last received snapshot remains visible.",
                  "無法更新註冊處資料，目前保留上次載入的快照。",
                )
              : c("Registry data could not be loaded.", "無法載入註冊處資料。")}
          </span>
          <button
            disabled={retrying}
            aria-busy={retrying}
            onClick={() => void retryOverview()}
          >
            {retrying ? c("Retrying…", "正在重試…") : c("Retry", "重試")}
          </button>
        </div>
      )}
      <div className="ex-market-stats ex-large-value-stats">
        <Stat
          label={c("Projects in the dataset", "資料集中的項目")}
          value={hasSnapshot ? fmtQty(overview!.totals.projects) : "—"}
          note={c("Registry project records", "註冊處項目紀錄")}
          icon="projects"
        />
        <Stat
          label={c("Cumulative issuance", "累計簽發量")}
          value={hasSnapshot ? fmtQty(overview!.totals.issued) : "—"}
          unit="tCO₂e"
          note={c(
            "Reported across covered registries",
            "資料集涵蓋註冊處的報告數量",
          )}
          icon="layers"
        />
        <Stat
          label={c("Cumulative retirements", "累計註銷量")}
          value={hasSnapshot ? fmtQty(overview!.totals.retired) : "—"}
          unit="tCO₂e"
          note={c("Historical retirement records", "歷史註銷紀錄")}
          icon="retire"
        />
        <Stat
          label={c("Registries covered", "涵蓋的註冊處")}
          value={hasSnapshot ? overview!.registries.length : "—"}
          note={c(
            "Coverage can change between snapshots",
            "涵蓋範圍可能隨快照變更",
          )}
          icon="research"
        />
      </div>
      {loadingSnapshot && (
        <div className="ex-panel ex-loading" role="status">
          {c("Loading the registry snapshot…", "正在載入註冊處快照…")}
        </div>
      )}
      {overview && !hasSnapshot && (
        <div className="ex-panel ex-empty">
          <ExchangeIcon name="research" size={30} />
          <h2>
            {c("No registry records in this snapshot", "此快照尚無註冊處紀錄")}
          </h2>
          <p>
            {c(
              "Real-market charts will appear when source records are available. The original dataset and learning resources remain available below.",
              "來源紀錄可用時，將顯示真實市場圖表。您仍可使用下方的原始資料集及學習資源。",
            )}
          </p>
          <a
            href={OFFSETS_SOURCE}
            className="ex-button"
            target="_blank"
            rel="noopener noreferrer"
          >
            {c("Visit the source", "查看原始來源")}
            <ExchangeIcon name="external" size={13} />
          </a>
        </div>
      )}
      <div className="ex-research-layout" style={{ marginTop: 24 }}>
        <div>
          <section className="ex-panel ex-research-section">
            <header>
              <div>
                <h2>{c("Registry activity over time", "註冊處歷年活動")}</h2>
                <p>
                  {c(
                    "Recorded transaction year · tonnes CO₂e",
                    "紀錄中的交易年份 · 噸 CO₂e",
                  )}
                </p>
              </div>
              <div
                className="ex-research-toggle"
                role="group"
                aria-label={c("Annual activity metric", "年度活動指標")}
              >
                <button
                  aria-pressed={metric === "retirement"}
                  onClick={() => setMetric("retirement")}
                >
                  {c("Retirements", "註銷")}
                </button>
                <button
                  aria-pressed={metric === "issuance"}
                  onClick={() => setMetric("issuance")}
                >
                  {c("Issuance", "簽發")}
                </button>
              </div>
            </header>
            {!overview ? (
              <p className="ex-muted">{snapshotStatus}</p>
            ) : years.length ? (
              <div className="ex-research-bars">
                {years.map((year) => (
                  <div className="ex-research-row" key={year.year}>
                    <span>{year.year}</span>
                    <div className="ex-research-track" aria-hidden="true">
                      <div
                        style={{ width: `${(year[metric] / maxYear) * 100}%` }}
                      />
                    </div>
                    <strong>{fmtQty(year[metric])}</strong>
                  </div>
                ))}
              </div>
            ) : (
              <p className="ex-muted">
                {c(
                  "No annual records are available in the current snapshot.",
                  "目前快照未提供年度紀錄。",
                )}
              </p>
            )}
            <p className="ex-discovery-caption" style={{ marginTop: 20 }}>
              {c(
                "The most recent year may be incomplete. A transaction year is different from a credit's vintage. Counts do not measure credit quality or avoided emissions by themselves.",
                "最近年份可能尚未完整。交易年份與信用的減排年份不同；數量本身並不衡量信用品質或實際避免的排放。",
              )}
            </p>
          </section>
          <section className="ex-panel ex-research-section">
            <header>
              <div>
                <h2>{c("Activity by registry", "依註冊處比較活動")}</h2>
                <p>
                  {c(
                    "Cumulative reported volume · tonnes CO₂e",
                    "累計報告數量 · 噸 CO₂e",
                  )}
                </p>
              </div>
              <div
                className="ex-research-toggle"
                role="group"
                aria-label={c("Registry distribution metric", "註冊處分布指標")}
              >
                <button
                  aria-pressed={distribution === "retired"}
                  onClick={() => setDistribution("retired")}
                >
                  {c("Retired", "已註銷")}
                </button>
                <button
                  aria-pressed={distribution === "issued"}
                  onClick={() => setDistribution("issued")}
                >
                  {c("Issued", "已簽發")}
                </button>
              </div>
            </header>
            {!overview ? (
              <p className="ex-muted">{snapshotStatus}</p>
            ) : registries.length ? (
              <div className="ex-research-bars">
                {registries.map((r) => (
                  <div className="ex-research-row" key={r.registry}>
                    <Link
                      href={`/exchange/projects?view=registry&registry=${encodeURIComponent(r.registry)}`}
                    >
                      {registryLabel(r.registry)}
                    </Link>
                    <div className="ex-research-track" aria-hidden="true">
                      <div
                        style={{
                          width: `${(r[distribution] / maxRegistry) * 100}%`,
                        }}
                      />
                    </div>
                    <strong>{fmtQty(r[distribution])}</strong>
                  </div>
                ))}
              </div>
            ) : (
              <p className="ex-muted">
                {c(
                  "Registry distributions will appear once data is available.",
                  "資料可用時將顯示各註冊處分布。",
                )}
              </p>
            )}
            <div className="ex-learning-links">
              <Link href="/observatory/data">
                {c("Open the full Observatory data view", "開啟完整觀察站資料")}
              </Link>
            </div>
          </section>
          <section className="ex-panel ex-research-section">
            <header>
              <div>
                <h2>{c("Inside the simulator", "模擬市場內部活動")}</h2>
                <p>
                  {c(
                    "Executed demo trades by project category · last 24 hours",
                    "依項目類別呈現的示範成交 · 過去 24 小時",
                  )}
                </p>
              </div>
              <span className="ex-status-tag">
                {c("Demo data", "示範資料")}
              </span>
            </header>
            {market.error && (
              <div className="ex-error" role="alert">
                <span>
                  {c(
                    "Demo activity could not be refreshed.",
                    "無法更新示範市場活動。",
                  )}
                </span>
                <button onClick={() => void market.reload().catch(() => {})}>
                  {c("Retry", "重試")}
                </button>
              </div>
            )}
            {!market.loaded ? (
              <div className="ex-loading" role="status">
                {c("Loading simulation activity…", "正在載入模擬活動…")}
              </div>
            ) : !market.hasData ? null : demoVolume > 0 ? (
              <div className="ex-research-bars">
                {categories.map((group) => (
                  <div className="ex-research-row" key={group.category}>
                    <Link
                      href={`/exchange?category=${encodeURIComponent(group.category)}`}
                    >
                      {c(group.category, group.categoryZh)}
                    </Link>
                    <div className="ex-research-track" aria-hidden="true">
                      <div
                        style={{
                          width: `${(group.volume / demoVolume) * 100}%`,
                          background: group.color,
                        }}
                      />
                    </div>
                    <strong>{fmtQty(group.volume)}</strong>
                  </div>
                ))}
              </div>
            ) : (
              <p className="ex-muted">
                {c(
                  "No matched demo credit trades were recorded in the last 24 hours.",
                  "過去 24 小時未有碳信用模擬撮合成交紀錄。",
                )}
              </p>
            )}
            <p className="ex-discovery-caption" style={{ marginTop: 20 }}>
              {c(
                "Units: simulated credits. Includes market-making activity; excludes OTC deals and allowance/index scenarios. Categories describe the demo catalogue. This is not a signal of real-world demand, prices or climate impact.",
                "單位：模擬碳信用。包含做市活動，不含大宗交易、配額及指數情境。分類僅描述示範目錄，不代表真實市場需求、價格或氣候影響。",
              )}
            </p>
          </section>
        </div>
        <aside>
          <section className="ex-panel">
            <div className="ex-panel-heading">
              <div>
                <h2>{c("Read the primary sources", "閱讀第一手來源")}</h2>
                <p>
                  {c(
                    "Program rules and integrity frameworks",
                    "標準規則與誠信框架",
                  )}
                </p>
              </div>
            </div>
            <div className="ex-research-reading">
              <a
                href={CREDIT_SOURCES.integrity}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExchangeIcon name="check" size={18} />
                <div>
                  <strong>
                    {c("ICVCM Core Carbon Principles", "ICVCM 核心碳原則")}
                  </strong>
                  <small>
                    {c(
                      "A framework for understanding credit integrity, transparency and safeguards.",
                      "了解信用誠信、透明度與保障措施的框架。",
                    )}
                  </small>
                </div>
                <ExchangeIcon name="external" size={12} />
              </a>
              <a
                href={CREDIT_SOURCES.verra}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExchangeIcon name="layers" size={18} />
                <div>
                  <strong>
                    {c("Verra: understanding VCUs", "Verra：認識 VCU")}
                  </strong>
                  <small>
                    {c(
                      "How Verified Carbon Units are issued, transferred and retired.",
                      "核證碳單位的簽發、轉移及註銷方式。",
                    )}
                  </small>
                </div>
                <ExchangeIcon name="external" size={12} />
              </a>
              <a
                href={CREDIT_SOURCES.accu}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExchangeIcon name="forest" size={18} />
                <div>
                  <strong>
                    {c("Australia's ACCU Scheme", "澳洲 ACCU 計畫")}
                  </strong>
                  <small>
                    {c(
                      "The Clean Energy Regulator's guide to Australia's carbon credit scheme.",
                      "澳洲清潔能源監管機構的碳信用計畫指南。",
                    )}
                  </small>
                </div>
                <ExchangeIcon name="external" size={12} />
              </a>
              <a
                href={OFFSETS_SOURCE}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExchangeIcon name="research" size={18} />
                <div>
                  <strong>CarbonPlan OffsetsDB</strong>
                  <small>
                    {c(
                      "The source of the registry project and transaction records shown here.",
                      "本頁註冊項目與交易紀錄的資料來源。",
                    )}
                  </small>
                </div>
                <ExchangeIcon name="external" size={12} />
              </a>
            </div>
          </section>
          <section className="ex-panel">
            <div className="ex-panel-heading">
              <div>
                <h2>
                  {c("Recorded retirement beneficiaries", "紀錄中的註銷受益人")}
                </h2>
                <p>
                  {c(
                    "Largest named entries in this dataset",
                    "此資料集中具名紀錄的累計排序",
                  )}
                </p>
              </div>
            </div>
            {!overview ? (
              <p className="ex-muted">{snapshotStatus}</p>
            ) : topBeneficiaries.length ? (
              <div>
                {topBeneficiaries.map((b) => (
                  <div className="ex-allocation-row" key={b.name}>
                    <span>{b.name}</span>
                    <strong>{fmtQty(b.tonnes)}</strong>
                  </div>
                ))}
              </div>
            ) : (
              <p className="ex-muted">
                {c(
                  "No named beneficiary records are available.",
                  "目前沒有具名受益人紀錄。",
                )}
              </p>
            )}
            <p className="ex-discovery-caption" style={{ marginTop: 16 }}>
              {c(
                "Tonnes CO₂e recorded in the source. Undisclosed names are omitted here. A retirement record does not verify an organisation's wider climate claims.",
                "單位為來源記載的噸 CO₂e，未披露名稱的紀錄未列於此處。註銷紀錄並不驗證組織的整體氣候聲明。",
              )}
            </p>
          </section>
          <div className="ex-info-strip">
            <ExchangeIcon name="learn" size={23} />
            <div>
              <strong>
                {c("Need context for the numbers?", "想了解數字的背景？")}
              </strong>
              <p>
                {c(
                  "Learn how issuance, vintage and retirement fit together.",
                  "了解簽發、減排年份與註銷如何相互關聯。",
                )}
              </p>
            </div>
            <Link href="/exchange/learn">{c("Learn", "了解更多")}</Link>
          </div>
        </aside>
      </div>
    </>
  );
}
