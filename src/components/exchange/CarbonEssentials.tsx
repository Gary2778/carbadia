"use client";

import Link from "next/link";
import { useState } from "react";
import { CREDIT_SOURCES } from "@/lib/carbon";
import { ExchangeIcon } from "./ExchangeIcon";
import { useExchangeText } from "./useExchange";
import "./discovery.css";

type Term = {
  id: string;
  en: string;
  zh: string;
  definition: string;
  definitionZh: string;
  category: "basics" | "quality" | "use";
  source: string;
  sourceName: string;
};
const VERRA_FAQ = "https://verra.org/faq/";
const TERMS: Term[] = [
  {
    id: "term-carbon-credit",
    en: "Carbon credit",
    zh: "碳信用",
    category: "basics",
    definition:
      "A unit representing one tonne of carbon dioxide equivalent reduced or removed under a crediting program. The unit alone does not tell you how the outcome was achieved or how strong the evidence is.",
    definitionZh:
      "在碳信用標準下，代表一噸二氧化碳當量減排或移除的單位。單位本身不會說明成果如何達成，或證據有多充分。",
    source: CREDIT_SOURCES.verra,
    sourceName: "Verra",
  },
  {
    id: "vintage",
    en: "Vintage",
    zh: "減排年份（Vintage）",
    category: "basics",
    definition:
      "The period when the emission reduction or removal happened. It can differ from the year a credit was issued, bought or retired. Check the precise vintage period in the project records.",
    definitionZh:
      "減排或移除發生的期間，可能與信用簽發、購買或註銷的年份不同。確切期間應以項目紀錄為準。",
    source: VERRA_FAQ,
    sourceName: "Verra",
  },
  {
    id: "registry",
    en: "Registry",
    zh: "註冊處／登記簿",
    category: "basics",
    definition:
      "The record system that identifies projects and units and tracks issuance, transfers and retirement. Follow the project ID and unit records to the original registry when checking provenance.",
    definitionZh:
      "識別項目與信用單位，並追蹤簽發、轉移和註銷的紀錄系統。查核來源時，應依項目編號及單位紀錄追溯原始註冊處。",
    source: "https://verra.org/registry/overview/",
    sourceName: "Verra Registry",
  },
  {
    id: "methodology",
    en: "Methodology",
    zh: "方法學",
    category: "basics",
    definition:
      "The rules used to define a baseline, calculate results and monitor an activity. The method and its version matter: a project category such as forestry is not a methodology.",
    definitionZh:
      "用以設定基準線、計算成果及監測活動的規則。方法及版本都很重要；例如「林業」這類項目分類並不是方法學。",
    source:
      "https://verra.org/programs/verified-carbon-standard/vcs-program-details/",
    sourceName: "Verra VCS",
  },
  {
    id: "additionality",
    en: "Additionality",
    zh: "額外性",
    category: "quality",
    definition:
      "Whether the credited outcome depends on the incentive from carbon credit revenue. Ask what would have happened without that incentive.",
    definitionZh:
      "信用所代表的成果，是否依賴碳信用收入提供的誘因。應探究：若沒有這項誘因，原本會發生什麼？",
    source: CREDIT_SOURCES.integrity,
    sourceName: "ICVCM",
  },
  {
    id: "permanence",
    en: "Permanence",
    zh: "持久性",
    category: "quality",
    definition:
      "How durable the climate outcome is. Where stored carbon can be released again, examine reversal risks and the measures used to address them.",
    definitionZh:
      "氣候成果能持續多久。若儲存的碳可能再次釋放，應檢視逆轉風險及相應處理措施。",
    source: CREDIT_SOURCES.integrity,
    sourceName: "ICVCM",
  },
  {
    id: "leakage",
    en: "Leakage",
    zh: "洩漏",
    category: "quality",
    definition:
      "An activity can move emissions elsewhere instead of eliminating them. For example, protecting one forest may displace harvesting. The methodology should identify and account for relevant leakage.",
    definitionZh:
      "某項活動可能將排放轉移至別處，而非消除排放。例如，保護一片森林可能使採伐轉往其他地點。方法學應識別並計入相關洩漏。",
    source: VERRA_FAQ,
    sourceName: "Verra",
  },
  {
    id: "verification",
    en: "Verification",
    zh: "查證",
    category: "quality",
    definition:
      "An independent check of reported project results against the program's requirements. Read the monitoring period, verifier and report; a registry name by itself is not a verification report.",
    definitionZh:
      "依標準要求，對項目所報告成果進行獨立查核。應閱讀監測期間、查證機構及報告；註冊處名稱本身不是查證報告。",
    source:
      "https://verra.org/programs/verified-carbon-standard/vcs-program-details/",
    sourceName: "Verra VCS",
  },
  {
    id: "double-counting",
    en: "Double counting",
    zh: "重複計算",
    category: "quality",
    definition:
      "Counting the same mitigation outcome more than once, through duplicate issuance, use or claims. Trace unit identifiers and retirement records, and check the applicable claims rules.",
    definitionZh:
      "透過重複簽發、使用或聲明，多次計入相同的減緩成果。應追蹤單位識別碼及註銷紀錄，並查核適用的聲明規則。",
    source: CREDIT_SOURCES.integrity,
    sourceName: "ICVCM",
  },
  {
    id: "issuance",
    en: "Issuance",
    zh: "簽發",
    category: "use",
    definition:
      "The creation of credit units after the program's required review and approval. A registered project may not yet have issued credits; an issued credit may already have been retired.",
    definitionZh:
      "經標準所要求的審查及核准後，建立信用單位的程序。已註冊項目可能尚未簽發信用；已簽發信用也可能已經註銷。",
    source: CREDIT_SOURCES.verra,
    sourceName: "Verra",
  },
  {
    id: "retirement",
    en: "Retirement",
    zh: "註銷",
    category: "use",
    definition:
      "Taking a credit out of circulation so it cannot be used again. Buying and holding a credit is different from retiring it. A real claim needs the relevant registry evidence and applicable reporting rules.",
    definitionZh:
      "將碳信用移出流通，避免再次使用。購買並持有信用與註銷不同。真實聲明需要相關註冊處證據，並遵循適用的報告規則。",
    source: CREDIT_SOURCES.verra,
    sourceName: "Verra",
  },
  {
    id: "vcu",
    en: "VCU — Verified Carbon Unit",
    zh: "VCU — 核證碳單位",
    category: "basics",
    definition:
      "The unit issued under Verra's Verified Carbon Standard. Each VCU represents one tonne CO₂e of reduction or removal. Check the underlying project and applicable program requirements.",
    definitionZh:
      "依 Verra 核證碳標準簽發的單位。每份 VCU 代表一噸 CO₂e 的減排或移除；應查核其基礎項目及適用規則。",
    source: CREDIT_SOURCES.verra,
    sourceName: "Verra",
  },
  {
    id: "accu",
    en: "ACCU — Australian Carbon Credit Unit",
    zh: "ACCU — 澳洲碳信用單位",
    category: "basics",
    definition:
      "A unit issued through Australia's ACCU Scheme, administered by the Clean Energy Regulator. One ACCU represents one tonne CO₂e stored or avoided by an eligible project.",
    definitionZh:
      "透過澳洲 ACCU 計畫簽發、由清潔能源監管機構管理的單位。每份 ACCU 代表合資格項目儲存或避免排放的一噸 CO₂e。",
    source: CREDIT_SOURCES.accu,
    sourceName: "Clean Energy Regulator",
  },
  {
    id: "removal-avoidance",
    en: "Removal and avoidance",
    zh: "移除與避免排放",
    category: "basics",
    definition:
      "Removal takes carbon from the atmosphere and stores it. Avoidance reduces emissions against a baseline. Both need credible measurement; project type alone does not establish quality.",
    definitionZh:
      "移除是從大氣中取出並儲存碳；避免排放則是相對基準線減少排放。兩者都需要可信的計量，不能僅靠項目類型判斷品質。",
    source: CREDIT_SOURCES.accu,
    sourceName: "Clean Energy Regulator",
  },
];

export function CarbonEssentials() {
  const c = useExchangeText();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [expanded, setExpanded] = useState(false);
  const q = search.trim().toLowerCase();
  const terms = TERMS.filter(
    (term) =>
      (!category || term.category === category) &&
      (!q ||
        [term.en, term.zh, term.definition, term.definitionZh]
          .join(" ")
          .toLowerCase()
          .includes(q)),
  );
  const stages = [
    [
      "Design & assess",
      "設計與評估",
      "Define the activity, baseline and method. Assess eligibility and the project design.",
      "定義活動、基準線及方法，評估資格與項目設計。",
    ],
    [
      "Monitor outcomes",
      "監測成果",
      "Measure the activity and document results over a monitoring period.",
      "在監測期間量測活動並記錄成果。",
    ],
    [
      "Verify & issue",
      "查證與簽發",
      "Check results independently. The program reviews and approves credit issuance.",
      "獨立查核成果，由標準計畫審查並核准信用簽發。",
    ],
    [
      "Transfer & hold",
      "轉移與持有",
      "Units can change ownership while their registry records identify them.",
      "信用可轉移所有權，並由註冊處紀錄持續識別。",
    ],
    [
      "Retire the credit",
      "註銷信用",
      "Remove units from circulation and record the retirement's details.",
      "將單位移出流通並記錄註銷詳情。",
    ],
  ];
  const quality = [
    [
      "Find the original record",
      "尋找原始紀錄",
      "Does the project ID match the registry and the units offered?",
      "項目編號是否對應註冊處及所提供的信用單位？",
    ],
    [
      "Understand the baseline",
      "理解基準線",
      "What is being compared, and why is the result additional?",
      "比較的基準是什麼？成果為何具額外性？",
    ],
    [
      "Read the evidence",
      "閱讀證據",
      "Which methodology, monitoring period and verification report apply?",
      "適用哪個方法學、監測期間及查證報告？",
    ],
    [
      "Examine durability",
      "檢視持久性",
      "Could the outcome reverse, and how is that risk addressed?",
      "成果是否可能逆轉？如何處理這項風險？",
    ],
    [
      "Check displaced impacts",
      "查核移轉影響",
      "Are leakage, community rights and environmental safeguards addressed?",
      "是否處理洩漏、社區權利及環境保障？",
    ],
    [
      "Trace the final use",
      "追蹤最終用途",
      "Are unit identifiers and retirement evidence available for the intended use?",
      "是否備有符合預定用途的單位識別碼及註銷證據？",
    ],
  ];
  const priceFactors = [
    [
      "Project & methodology",
      "項目與方法學",
      "Activities and locations have different implementation and monitoring needs. The methodology defines how results are measured, so buyers need to understand the specific project behind the unit.",
      "不同活動與地點有不同的執行及監測需求。方法學規範成果的計量方式，因此買方需要了解信用單位背後的具體項目。",
    ],
    [
      "Durability & reversal risk",
      "耐久性與逆轉風險",
      "How long carbon stays stored, the risk of it being released again and the protections in place can influence buyer preferences. Removal credits do not all have the same durability.",
      "碳能儲存多久、再次釋放的風險及相應保障措施，都可能影響買方偏好。不同移除信用的耐久性並不相同。",
    ],
    [
      "Evidence & confidence",
      "證據與信心",
      "Additionality, the baseline and independent verification help buyers assess whether the claimed outcome is credible. A registry name alone does not replace the project evidence.",
      "額外性、基準線及獨立查證，有助買方評估所聲稱的成果是否可信。註冊處名稱不能取代項目證據。",
    ],
    [
      "Documented co-benefits",
      "有證據支持的共同效益",
      "Some buyers value additional benefits for communities or biodiversity. Verra explains that additional certifications for these benefits can bring a price premium; the supporting evidence still matters.",
      "部分買方重視社區或生物多樣性方面的額外效益。Verra 說明，這些效益的附加認證可能帶來溢價，但仍需檢視支持證據。",
    ],
    [
      "Supply & demand",
      "供給與需求",
      "Prices also reflect how many eligible credits are offered and how much buyers want them. Prices can change when supply or demand changes, even when the underlying project has not changed.",
      "價格也反映市場提供多少合資格信用，以及買方的需求。即使基礎項目沒有改變，供給或需求變化仍可能使價格改變。",
    ],
    [
      "Fit for the intended use",
      "是否符合預定用途",
      "A buyer may need a particular program, vintage or other eligibility criteria. Check the rules for the intended use: a VCU and an ACCU are not automatically interchangeable just because both use tonnes CO₂e.",
      "買方可能需要特定標準計畫、年份或其他資格條件。應查核預定用途的規則：VCU 與 ACCU 都以噸 CO₂e 計量，不代表兩者可自動互相替代。",
    ],
  ];
  return (
    <div className="ex-discovery-stack">
      <div className="ex-page-heading" style={{ marginBottom: 0 }}>
        <div>
          <h1>{c("Carbon credit essentials", "碳信用入門")}</h1>
          <p>
            {c(
              "A practical guide to the unit, the project and the decisions that connect them.",
              "從計量單位、基礎項目到相關決策的實用指南。",
            )}
          </p>
        </div>
        <Link href="/exchange" className="ex-button">
          <ExchangeIcon name="market" size={15} />
          {c("Explore the marketplace", "探索碳信用市場")}
        </Link>
      </div>
      <section className="ex-panel ex-learning-section" id="carbon-credit">
        <div className="ex-learn-intro">
          <div>
            <h2>
              {c(
                "One unit. A project worth understanding.",
                "一個單位，背後有值得理解的項目。",
              )}
            </h2>
            <p>
              {c(
                "A carbon credit represents a tonne of carbon dioxide equivalent reduced or removed under a crediting program. To understand a credit, look beyond the quantity to its project, method and evidence.",
                "碳信用代表依標準計畫減少或移除的一噸二氧化碳當量。理解信用時，除了數量，還應檢視其項目、方法及證據。",
              )}
            </p>
            <a
              className="ex-learn-source"
              href={CREDIT_SOURCES.verra}
              target="_blank"
              rel="noopener noreferrer"
            >
              {c("Read Verra's explanation", "閱讀 Verra 的說明")}
              <ExchangeIcon name="external" size={12} />
            </a>
          </div>
          <div
            className="ex-credit-unit"
            aria-label={c(
              "One carbon credit represents one tonne of carbon dioxide equivalent",
              "一份碳信用代表一噸二氧化碳當量",
            )}
          >
            <div>
              <strong>1</strong>
              <small>{c("carbon credit", "份碳信用")}</small>
            </div>
            <span>=</span>
            <div>
              <strong>1 t</strong>
              <small>CO₂e</small>
            </div>
          </div>
        </div>
        <nav
          className="ex-learning-links"
          aria-label={c("On this page", "本頁內容")}
        >
          <a href="#prices">{c("Why prices differ", "為何價格不同")}</a>
          <a href="#lifecycle">{c("Credit lifecycle", "信用生命週期")}</a>
          <a href="#quality">{c("Quality & evidence", "品質與證據")}</a>
          <a href="#glossary">{c("Glossary", "詞彙表")}</a>
          <a href="#vcu-accu">VCU / ACCU</a>
          <a href="#simulation">
            {c("Practice in Carbadia", "在 Carbadia 練習")}
          </a>
        </nav>
      </section>
      <section className="ex-panel ex-learning-section" id="prices">
        <h2>
          {c("Why do carbon credit prices differ?", "為什麼碳信用的價格不同？")}
        </h2>
        <p>
          {c(
            "One tonne is a common unit, but credits can represent different activities, risks and permitted uses. The factors below help explain what buyers compare; they are not a formula for a fair price.",
            "一噸是共通的單位，但不同信用可能代表不同活動、風險及允許用途。以下因素說明買方會比較哪些條件，並非計算合理價格的公式。",
          )}
        </p>
        <div className="ex-learning-checks">
          {priceFactors.map(([en, zh, text, textZh]) => (
            <div key={en}>
              <ExchangeIcon name="info" size={17} />
              <div>
                <h3>{c(en, zh)}</h3>
                <p>{c(text, textZh)}</p>
              </div>
            </div>
          ))}
        </div>
        <p>
          <strong>
            {c("Price is not a quality score. ", "價格不是品質評分。")}
          </strong>
          {c(
            "A higher price does not prove additionality, permanence or a greater climate benefit. Compare the project evidence, intended use and transaction terms alongside the price.",
            "較高價格不能證明額外性、永久性或更大的氣候效益。比較價格時，應一併檢視項目證據、預定用途及交易條件。",
          )}
        </p>
        <div className="ex-learning-links">
          <a
            href={CREDIT_SOURCES.verra}
            target="_blank"
            rel="noopener noreferrer"
          >
            {c(
              "Verra: units & additional certifications",
              "Verra：單位與附加認證",
            )}{" "}
            ↗
          </a>
          <a
            href={CREDIT_SOURCES.integrity}
            target="_blank"
            rel="noopener noreferrer"
          >
            {c("ICVCM: quality principles", "ICVCM：品質原則")} ↗
          </a>
          <a
            href={`${CREDIT_SOURCES.accu}/australian-carbon-credit-units`}
            target="_blank"
            rel="noopener noreferrer"
          >
            {c("CER: ACCU supply, demand & uses", "CER：ACCU 供需及用途")} ↗
          </a>
          <a href="#quality">{c("Check the evidence", "查核證據")}</a>
        </div>
      </section>
      <section className="ex-panel ex-learning-section" id="lifecycle">
        <h2>{c("From project to retirement", "從項目到信用註銷")}</h2>
        <p>
          {c(
            "A simplified lifecycle. Each program has its own detailed requirements and review steps.",
            "以下為簡化流程，各標準計畫另有詳細要求與審查步驟。",
          )}
        </p>
        <div className="ex-lifecycle">
          {stages.map(([en, zh, text, textZh], index) => (
            <div className="ex-lifecycle-item" key={en}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <h3>{c(en, zh)}</h3>
              <p>{c(text, textZh)}</p>
            </div>
          ))}
        </div>
        <a
          className="ex-learn-source"
          href="https://verra.org/programs/verified-carbon-standard/vcs-program-details/"
          target="_blank"
          rel="noopener noreferrer"
        >
          {c("See the VCS program requirements", "查看 VCS 計畫要求")}
          <ExchangeIcon name="external" size={12} />
        </a>
      </section>
      <section className="ex-panel ex-learning-section" id="quality">
        <h2>
          {c(
            "Ask for evidence before a quality label",
            "在接受品質標籤前，先查核證據",
          )}
        </h2>
        <p>
          {c(
            "Use these questions to investigate a real project. Carbadia's demo classifications are catalogue descriptions; they do not establish verification, a quality rating or an environmental claim.",
            "可運用以下問題調查真實項目。Carbadia 的示範分類只是目錄描述，並不代表查證、品質評級或環境聲明。",
          )}
        </p>
        <div className="ex-learning-checks">
          {quality.map(([en, zh, text, textZh]) => (
            <div key={en}>
              <ExchangeIcon name="check" size={17} />
              <div>
                <h3>{c(en, zh)}</h3>
                <p>{c(text, textZh)}</p>
              </div>
            </div>
          ))}
        </div>
        <a
          className="ex-learn-source"
          href={CREDIT_SOURCES.integrity}
          target="_blank"
          rel="noopener noreferrer"
        >
          {c("Explore ICVCM's Core Carbon Principles", "探索 ICVCM 核心碳原則")}
          <ExchangeIcon name="external" size={12} />
        </a>
      </section>
      <section className="ex-learning-section" id="glossary">
        <div className="ex-learn-glossary-heading">
          <div>
            <h2>{c("The words behind the market", "理解市場用語")}</h2>
            <p>
              {c(
                "Search a term or expand a definition when you need it.",
                "搜尋詞彙，或展開您需要的說明。",
              )}
            </p>
          </div>
          <button
            className="ex-button"
            aria-expanded={expanded}
            onClick={() => setExpanded((value) => !value)}
          >
            {expanded
              ? c("Collapse definitions", "收合說明")
              : c("Expand definitions", "展開說明")}
          </button>
        </div>
        <div className="ex-market-toolbar ex-discovery-toolbar">
          <label className="ex-search-field">
            <ExchangeIcon name="search" size={15} />
            <input
              aria-label={c("Search the carbon glossary", "搜尋碳信用詞彙")}
              placeholder={c("Search terms and definitions", "搜尋詞彙及定義")}
              value={search}
              onChange={(e) => {
                const nextSearch = e.target.value;
                setSearch(nextSearch);
                if (nextSearch.trim().toLowerCase() !== q) {
                  setExpanded(!!nextSearch.trim());
                }
              }}
            />
          </label>
          <select
            className="ex-select"
            value={category}
            aria-label={c("Glossary topic", "詞彙主題")}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="">{c("All topics", "所有主題")}</option>
            <option value="basics">{c("The basics", "基本概念")}</option>
            <option value="quality">
              {c("Quality & integrity", "品質與誠信")}
            </option>
            <option value="use">{c("Issuance & use", "簽發與用途")}</option>
          </select>
          <span className="ex-muted" aria-live="polite">
            {terms.length} {c("terms", "個詞彙")}
          </span>
          {(search || category) && (
            <button
              className="ex-button ghost"
              onClick={() => {
                setSearch("");
                setCategory("");
                setExpanded(false);
              }}
            >
              {c("Clear", "清除")}
            </button>
          )}
        </div>
        {terms.length ? (
          <div className="ex-glossary">
            {terms.map((term) => (
              <details key={term.id} id={term.id} open={expanded}>
                <summary>{c(term.en, term.zh)}</summary>
                <p>{c(term.definition, term.definitionZh)}</p>
                <a href={term.source} target="_blank" rel="noopener noreferrer">
                  {c("Source", "來源")}: {term.sourceName} ↗
                </a>
              </details>
            ))}
          </div>
        ) : (
          <div className="ex-panel ex-empty">
            <ExchangeIcon name="search" size={28} />
            <h2>{c("No matching terms", "沒有符合的詞彙")}</h2>
            <p>
              {c(
                "Try a shorter word or select all topics.",
                "請嘗試較短的關鍵字，或選擇所有主題。",
              )}
            </p>
            <button
              className="ex-button"
              onClick={() => {
                setSearch("");
                setCategory("");
                setExpanded(false);
              }}
            >
              {c("Show all terms", "顯示所有詞彙")}
            </button>
          </div>
        )}
      </section>
      <section className="ex-panel ex-learning-section" id="vcu-accu">
        <h2>
          {c(
            "VCUs and ACCUs: understand the scheme",
            "VCU 與 ACCU：了解所屬計畫",
          )}
        </h2>
        <p>
          {c(
            "The tonne is a shared unit of measurement. Eligibility, methods, registry arrangements and permitted uses come from the particular scheme.",
            "噸是共通的計量單位；資格、方法、註冊安排及允許用途，則取決於各計畫。",
          )}
        </p>
        <div className="ex-table-wrap" style={{ marginTop: 20 }}>
          <table className="ex-table ex-learning-compare">
            <thead>
              <tr>
                <th>{c("Attribute", "屬性")}</th>
                <th>VCU</th>
                <th>ACCU</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>{c("Full name", "完整名稱")}</td>
                <td>Verified Carbon Unit</td>
                <td>Australian Carbon Credit Unit</td>
              </tr>
              <tr>
                <td>{c("Program", "計畫")}</td>
                <td>
                  {c("Verra's Verified Carbon Standard", "Verra 核證碳標準")}
                </td>
                <td>{c("Australia's ACCU Scheme", "澳洲 ACCU 計畫")}</td>
              </tr>
              <tr>
                <td>{c("Administration", "管理機構")}</td>
                <td>Verra</td>
                <td>
                  {c(
                    "Clean Energy Regulator, Australia",
                    "澳洲清潔能源監管機構",
                  )}
                </td>
              </tr>
              <tr>
                <td>{c("Unit", "單位")}</td>
                <td>
                  {c("1 tonne CO₂e reduced or removed", "1 噸 CO₂e 減排或移除")}
                </td>
                <td>
                  {c(
                    "1 tonne CO₂e stored or avoided",
                    "1 噸 CO₂e 儲存或避免排放",
                  )}
                </td>
              </tr>
              <tr>
                <td>{c("Primary source", "第一手來源")}</td>
                <td>
                  <a
                    className="ex-learn-source"
                    href={CREDIT_SOURCES.verra}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {c("Read about VCUs", "閱讀 VCU 說明")}
                    <ExchangeIcon name="external" size={12} />
                  </a>
                </td>
                <td>
                  <a
                    className="ex-learn-source"
                    href={CREDIT_SOURCES.accu}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {c("Read about ACCUs", "閱讀 ACCU 說明")}
                    <ExchangeIcon name="external" size={12} />
                  </a>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p>
          {c(
            "A familiar acronym is not a substitute for project due diligence. Carbadia does not register, issue, custody or retire real units under either program.",
            "熟悉的縮寫不能取代項目盡職調查。Carbadia 不在上述計畫中註冊、簽發、託管或註銷真實單位。",
          )}
        </p>
      </section>
      <div className="ex-two-column">
        <section
          className="ex-panel ex-learning-section ex-learning-simulation"
          id="simulation"
        >
          <h2>
            {c("Learn by doing in the simulation", "在模擬環境中動手學習")}
          </h2>
          <p>
            {c(
              "Carbadia uses demonstration credits and demo USD balances. Orders match within the simulator, with market-making activity providing liquidity. Prices are formed inside the simulation and are not live registry or exchange quotations.",
              "Carbadia 使用示範信用及模擬美元餘額。訂單在模擬市場內撮合，做市活動提供流動性。價格在模擬環境內形成，不是真實註冊處或交易所報價。",
            )}
          </p>
          <p>
            {c(
              "A simulated retirement removes credits from your available holdings and creates a simulation receipt. It cannot support a real offset claim, compliance surrender or registry retirement. Retired demo credits cannot be traded again.",
              "模擬註銷會從您的可用持倉中扣除信用，並產生模擬收據。這不能用於真實抵換聲明、合規繳回或註冊處註銷。已註銷的示範信用不能再次交易。",
            )}
          </p>
          <div className="ex-learning-links">
            <Link href="/login?returnTo=%2Fexchange%2Fportfolio">
              {c("Start a demo session", "開始示範體驗")}
            </Link>
            <Link href="/exchange/projects?view=registry">
              {c("Explore real registry records", "探索真實註冊紀錄")}
            </Link>
          </div>
        </section>
        <section className="ex-panel" style={{ marginTop: 0 }}>
          <h2>{c("Try a complete journey", "體驗完整流程")}</h2>
          <div className="ex-learning-practice">
            {[
              [
                "/exchange/projects",
                "Explore a project",
                "探索項目",
                "Read its category, vintage and evidence gaps.",
                "閱讀分類、減排年份與缺少的證據。",
              ],
              [
                "/exchange",
                "Compare and place an order",
                "比較並建立訂單",
                "Choose a credit, enter an amount and review the demo cost.",
                "選擇信用、輸入數量並核對模擬成本。",
              ],
              [
                "/exchange/portfolio",
                "Review your portfolio",
                "檢視資產組合",
                "Understand holdings, available credits and purchase cost.",
                "了解持倉、可用信用及購買成本。",
              ],
              [
                "/exchange/retirement",
                "Practice a retirement",
                "練習註銷",
                "Choose a beneficiary and purpose, then review the receipt.",
                "選擇受益人與用途，並檢視收據。",
              ],
            ].map(([href, en, zh, text, textZh], index) => (
              <Link key={href} href={href}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <div>
                  <strong>{c(en, zh)}</strong>
                  <small>{c(text, textZh)}</small>
                </div>
                <ExchangeIcon name="arrow" size={15} />
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
