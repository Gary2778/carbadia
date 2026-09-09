"use client";

import { useCallback, useState } from "react";
import { usePolling } from "@/lib/usePolling";
import { api, fmtTonnes } from "@/lib/format";
import { Reveal } from "@/components/anim/Reveal";
import { Sparkline } from "@/components/charts/Sparkline";
import { useT } from "@/lib/i18n";

// ===== /api/real/* 返回结构(Task 4 定义, BigInt 已在服务端转 number) =====
// CCER(中国数据)已从本站下架,数据归中文站 carbadia.co;本页只呈现国际注册处数据。

type Overview = {
  asOf: string | null;
  totals: { projects: number; issued: number; retired: number };
  registries: { registry: string; projects: number; issued: number; retired: number }[];
  years: { year: number; issuance: number; retirement: number }[];
  beneficiaries: { name: string; tonnes: number }[];
  filters: { countries: string[]; categories: string[] };
};

type Project = {
  id: string;
  registry: string;
  name: string;
  country: string | null;
  category: string | null;
  status: string | null;
  issued: number;
  retired: number;
  projectUrl: string | null;
};

type ProjectsResp = {
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
  data: Project[];
};

// 注册处品牌名展示映射(品牌不进 i18n, 不翻译);未知值回退源站原值
const REGISTRY_LABELS: Record<string, string> = {
  verra: "Verra",
  "gold-standard": "Gold Standard",
  "american-carbon-registry": "American Carbon Registry",
  "climate-action-reserve": "Climate Action Reserve",
  "art-trees": "ART TREES",
  isometric: "Isometric",
  cercarbono: "Cercarbono",
};
const registryLabel = (r: string) => REGISTRY_LABELS[r] ?? r;

// 聚合表里空受益人的合并桶名(store.ts 约定), 展示时替换为 i18n 文案
const UNDISCLOSED = "UNDISCLOSED";

const day = (iso: string | null) => (iso ? iso.slice(0, 10) : "—");

export default function RealPage() {
  const t = useT("real");
  const [ov, setOv] = useState<Overview | null>(null);
  const [ovErr, setOvErr] = useState("");

  // 项目浏览器筛选与分页("" = 全部)
  const [registry, setRegistry] = useState("");
  const [country, setCountry] = useState("");
  const [category, setCategory] = useState("");
  const [page, setPage] = useState(1);
  const [proj, setProj] = useState<ProjectsResp | null>(null);
  const [projErr, setProjErr] = useState("");

  const loadOverview = useCallback(async () => {
    try {
      setOv(await api<Overview>("/api/real/overview"));
      setOvErr("");
    } catch (e) {
      setOvErr((e as Error).message);
      throw e; // 重抛给 usePolling 退避
    }
  }, []);

  const query = new URLSearchParams({
    ...(registry && { registry }),
    ...(country && { country }),
    ...(category && { category }),
    page: String(page),
  }).toString();

  const loadProjects = useCallback(async () => {
    try {
      setProj(await api<ProjectsResp>(`/api/real/projects?${query}`));
      setProjErr("");
    } catch (e) {
      setProjErr((e as Error).message);
      throw e;
    }
  }, [query]);

  // 源站日更、API 有 10 分钟缓存 → 低频轮询即可;筛选/翻页变化时立即重拉
  usePolling(loadOverview, 120_000);
  usePolling(loadProjects, 120_000, query);

  // 筛选变化回到第 1 页
  const setFilter = (set: (v: string) => void) => (v: string) => {
    set(v);
    setPage(1);
  };

  if (!ov) {
    if (ovErr) return <div className="text-down text-sm text-center py-16">{ovErr}</div>;
    return <div className="text-muted text-center py-16">{t.loading}</div>;
  }

  const topBeneficiaries = ov.beneficiaries.filter((b) => b.name !== UNDISCLOSED).slice(0, 15);
  const undisclosed = ov.beneficiaries.find((b) => b.name === UNDISCLOSED);

  return (
    <div className="space-y-5">
      {/* 1. 头部: 标题 + 数据截至 + CarbonPlan OffsetsDB 署名(其条款要求引用) */}
      <div>
        <p className="font-mono text-xs tracking-[0.3em] text-accent mb-2">OBSERVATORY · DATA</p>
        <h1 className="font-serif text-xl font-bold">{t.title}</h1>
        <p className="text-muted text-sm">{t.subtitle}</p>
        <p className="text-xs text-muted mt-1">
          {ov.asOf && <span className="me-2">{t.asOf(day(ov.asOf))}</span>}
          {t.attributionPre}
          <a
            href="https://carbonplan.org/research/offsets-db"
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent hover:underline"
          >
            CarbonPlan OffsetsDB
          </a>
          {t.attributionPost}
        </p>
      </div>

      {/* 轮询失败不清空已有数据, 只提示 */}
      {ovErr && <div className="text-down text-sm">{ovErr}</div>}

      {/* 2. 概览卡 ×4 */}
      <Reveal>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Stat label={t.statProjects} value={fmtTonnes(ov.totals.projects)} accent />
          <Stat label={t.statIssued} value={fmtTonnes(ov.totals.issued)} />
          <Stat label={t.statRetired} value={fmtTonnes(ov.totals.retired)} />
          <Stat label={t.statRegistries} value={String(ov.registries.length)} />
        </div>
      </Reveal>

      {/* 3. 注册处统计 + 年度趋势 */}
      <Reveal delay={0.05}>
        <Card title={t.registriesTitle}>
          {ov.registries.length === 0 ? (
            <Empty text={t.empty} />
          ) : (
            <>
              <Table head={[t.thRegistry, t.thProjects, t.thIssued, t.thRetired]}>
                {ov.registries.map((r) => (
                  <tr key={r.registry} className="border-b border-border/40 hover:bg-surface-2">
                    <td className="px-4 py-2.5 font-medium">{registryLabel(r.registry)}</td>
                    <td className="px-3 py-2.5 text-end tnum">{fmtTonnes(r.projects)}</td>
                    <td className="px-3 py-2.5 text-end tnum">{fmtTonnes(r.issued)}</td>
                    <td className="px-3 py-2.5 text-end tnum text-accent">{fmtTonnes(r.retired)}</td>
                  </tr>
                ))}
              </Table>
              {ov.years.length >= 2 && (
                <div className="flex flex-wrap items-center gap-x-8 gap-y-2 px-4 py-3 border-t border-border">
                  <span className="text-xs text-muted">
                    {t.trendTitle} · {ov.years[0].year}–{ov.years[ov.years.length - 1].year}
                  </span>
                  <span className="flex items-center gap-2 text-xs text-muted">
                    {t.trendIssuance}
                    <Sparkline data={ov.years.map((y) => y.issuance)} width={140} />
                  </span>
                  <span className="flex items-center gap-2 text-xs text-muted">
                    {t.trendRetirement}
                    <Sparkline data={ov.years.map((y) => y.retirement)} width={140} />
                  </span>
                </div>
              )}
            </>
          )}
        </Card>
      </Reveal>

      {/* 4. 项目浏览器: 筛选 + 分页表格 */}
      <Reveal delay={0.1}>
        <Card title={t.browserTitle}>
          <div className="flex flex-wrap gap-3 px-4 py-3 border-b border-border/40">
            <Filter
              label={t.filterRegistry}
              value={registry}
              onChange={setFilter(setRegistry)}
              all={t.filterAll}
              options={ov.registries.map((r) => [r.registry, registryLabel(r.registry)])}
            />
            <Filter
              label={t.filterCountry}
              value={country}
              onChange={setFilter(setCountry)}
              all={t.filterAll}
              options={ov.filters.countries.map((c) => [c, c])}
            />
            <Filter
              label={t.filterCategory}
              value={category}
              onChange={setFilter(setCategory)}
              all={t.filterAll}
              options={ov.filters.categories.map((c) => [c, c])}
            />
          </div>
          {!proj ? (
            projErr ? (
              <div className="p-8 text-center text-down text-sm">{projErr}</div>
            ) : (
              <div className="p-8 text-center text-muted">{t.loading}</div>
            )
          ) : proj.data.length === 0 ? (
            <Empty text={t.empty} />
          ) : (
            <>
              {projErr && <div className="px-4 pt-2 text-down text-xs">{projErr}</div>}
              <Table
                head={[t.thName, t.thRegistry, t.thCountry, t.thCategory, t.thIssued, t.thRetired, t.thSource]}
                startCols={4}
              >
                {proj.data.map((p) => (
                  <tr key={p.id} className="border-b border-border/40 hover:bg-surface-2">
                    <td className="px-4 py-2.5">
                      <div className="font-medium truncate max-w-[260px]">{p.name || p.id}</div>
                      <div className="text-xs text-muted">{p.id}{p.status ? ` · ${p.status}` : ""}</div>
                    </td>
                    <td className="px-3 py-2.5 text-muted">{registryLabel(p.registry)}</td>
                    <td className="px-3 py-2.5 text-muted">{p.country ?? "—"}</td>
                    <td className="px-3 py-2.5 text-muted">{p.category ?? "—"}</td>
                    <td className="px-3 py-2.5 text-end tnum">{fmtTonnes(p.issued)}</td>
                    <td className="px-3 py-2.5 text-end tnum text-accent">{fmtTonnes(p.retired)}</td>
                    <td className="px-4 py-2.5 text-end">
                      {p.projectUrl ? (
                        <a
                          href={p.projectUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-accent hover:underline"
                        >
                          {t.viewSource}
                        </a>
                      ) : (
                        <span className="text-xs text-muted">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </Table>
              <div className="flex items-center justify-between px-4 py-3 border-t border-border/40 text-sm">
                <span className="text-xs text-muted">
                  {t.pageInfo(proj.pagination.page, proj.pagination.totalPages, proj.pagination.total)}
                </span>
                <div className="flex gap-2">
                  <PageBtn
                    label={t.pagePrev}
                    disabled={proj.pagination.page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  />
                  <PageBtn
                    label={t.pageNext}
                    disabled={proj.pagination.page >= proj.pagination.totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  />
                </div>
              </div>
            </>
          )}
        </Card>
      </Reveal>

      {/* 5. 注销排行: top15 + 未披露桶(75% 注销量无受益人 → 灰色桶, 不藏数据) */}
      <Reveal delay={0.15}>
        <Card title={t.retireTitle}>
          {topBeneficiaries.length === 0 ? (
            <Empty text={t.empty} />
          ) : (
            <Table head={["#", t.thBeneficiary, t.thRetired]} startCols={2}>
              {topBeneficiaries.map((b, i) => (
                <tr key={b.name} className="border-b border-border/40 hover:bg-surface-2">
                  <td className="px-4 py-2.5 text-muted tnum">{i + 1}</td>
                  <td className="px-3 py-2.5 font-medium">
                    <div className="truncate max-w-[420px]" title={b.name}>{b.name}</div>
                  </td>
                  <td className="px-4 py-2.5 text-end tnum text-accent">{fmtTonnes(b.tonnes)}</td>
                </tr>
              ))}
              {undisclosed && (
                <tr className="border-b border-border/40 text-muted">
                  <td className="px-4 py-2.5">—</td>
                  <td className="px-3 py-2.5 italic">{t.undisclosed}</td>
                  <td className="px-4 py-2.5 text-end tnum">{fmtTonnes(undisclosed.tonnes)}</td>
                </tr>
              )}
            </Table>
          )}
        </Card>
      </Reveal>

      {/* 6. 页脚免责 */}
      <p className="text-xs text-muted">{t.footerDisclaimer}</p>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-2xl border border-border bg-surface shadow-card p-4">
      <div className="text-xs text-muted">{label}</div>
      <div className={`tnum text-lg font-semibold mt-1 ${accent ? "text-accent" : ""}`}>{value}</div>
    </div>
  );
}

function Card({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-surface shadow-card overflow-hidden">
      <div className="px-4 py-2.5 border-b border-border flex items-baseline justify-between gap-3">
        <span className="font-semibold text-sm">{title}</span>
        {sub && <span className="text-xs text-muted">{sub}</span>}
      </div>
      {children}
    </div>
  );
}

/** startCols: 前 N 列(文本列)左对齐, 其余(数值列)右对齐 */
function Table({ head, startCols = 1, children }: { head: string[]; startCols?: number; children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-muted text-xs">
          <tr className="border-b border-border">
            {head.map((h, i) => (
              <th
                key={`${h}-${i}`}
                className={`px-3 py-2 font-medium ${i < startCols ? "text-start" : "text-end"} ${i === 0 || i === head.length - 1 ? "px-4" : ""}`}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="text-center text-muted text-sm py-8">{text}</div>;
}

function Filter({
  label,
  value,
  onChange,
  all,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  all: string;
  options: [string, string][];
}) {
  return (
    <label className="flex items-center gap-2 text-xs text-muted">
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-surface-2 border border-border rounded-md px-2 py-1.5 text-sm text-foreground outline-none focus:border-accent max-w-[180px]"
      >
        <option value="">{all}</option>
        {options.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
    </label>
  );
}

function PageBtn({ label, disabled, onClick }: { label: string; disabled: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="px-3 py-1 rounded-full border border-border text-xs hover:bg-surface-2 transition-colors disabled:opacity-40"
    >
      {label}
    </button>
  );
}
