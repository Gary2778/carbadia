// OffsetsDB 快照解析与聚合(纯函数, 无 IO)
// 源: CarbonPlan OffsetsDB S3 csv.zip 快照(projects.csv 18 列 / credits.csv 11 列, 实测 2026-06-01)。
// 日期形如 "2024-04-05 00:00:00+00:00"; protocol 是 Python 列表字面量字符串; 吨数是浮点字符串。
import { parse } from "csv-parse/sync";

/** 空受益人合并桶(75% 注销量的 harmonized 受益人为空, 不设桶排行严重失真) */
export const UNDISCLOSED = "UNDISCLOSED";

/** 字段与 RegistryProject 模型一一对应 */
export interface ProjectRow {
  id: string;
  registry: string;
  name: string;
  country: string | null;
  category: string | null;
  projectType: string | null;
  protocol: string | null;
  status: string | null;
  isCompliance: boolean;
  issued: bigint;
  retired: bigint;
  listedAt: string | null;
  projectUrl: string | null;
}

export interface CreditAggregate {
  stats: { registry: string; year: number; kind: string; tonnes: bigint }[];
  beneficiaries: { name: string; tonnes: bigint }[];
}

type Rec = Record<string, string>;

/** 空串归一为 null */
function str(v: string | undefined): string | null {
  const t = v?.trim() ?? "";
  return t === "" ? null : t;
}

/** 浮点字符串(实测有 "250.5")四舍五入为 BigInt 吨数; 非法值记 0 */
function tonnes(v: string | undefined): bigint {
  const n = Number(v);
  return Number.isFinite(n) ? BigInt(Math.round(n)) : BigInt(0);
}

/** "2024-04-05 00:00:00+00:00" → "2024-04-05" */
function day(v: string | undefined): string | null {
  const t = str(v);
  return t ? t.slice(0, 10) : null;
}

/** Python 列表字面量 "['ams-i-f', 'ams-iii-d']" → "ams-i-f,ams-iii-d" */
function protocolList(v: string | undefined): string | null {
  const t = str(v);
  if (!t) return null;
  const parts = t
    .replace(/^\[/, "")
    .replace(/\]$/, "")
    .split(",")
    .map((p) => p.trim().replace(/^['"]/, "").replace(/['"]$/, ""))
    .filter(Boolean);
  return parts.length ? parts.join(",") : null;
}

/** projects.csv → RegistryProject 行(缺 project_id/registry 的脏行丢弃) */
export function parseProjectsCsv(csv: string): ProjectRow[] {
  const records = parse(csv, { columns: true, skip_empty_lines: true }) as Rec[];
  const rows: ProjectRow[] = [];
  for (const r of records) {
    const id = str(r.project_id);
    const registry = str(r.registry);
    if (!id || !registry) continue;
    rows.push({
      id,
      registry,
      name: str(r.name) ?? "",
      country: str(r.country),
      category: str(r.category),
      projectType: str(r.project_type),
      protocol: protocolList(r.protocol),
      status: str(r.status),
      isCompliance: r.is_compliance?.trim() === "True",
      issued: tonnes(r.issued),
      retired: tonnes(r.retired),
      listedAt: day(r.listed_at) ?? day(r.first_issuance_at),
      projectUrl: str(r.project_url),
    });
  }
  return rows;
}

/**
 * credits.csv 逐行流式聚合(53 万行, 用 on_record 边解析边累加, 不物化全量记录数组):
 * - stats: 注册处×年份×类型(issuance|retirement)加总; cancellation、未知 project、无日期行不计入。
 * - beneficiaries: retirement 行按 harmonized 受益人加总(空值合并进 UNDISCLOSED),
 *   保留 top `topN` 具名 + UNDISCLOSED 桶(桶不占具名名额)。
 */
export function aggregateCredits(
  csv: string,
  projectRegistry: Map<string, string>,
  topN = 100
): CreditAggregate {
  const statMap = new Map<string, bigint>();
  const benMap = new Map<string, bigint>();

  parse(csv, {
    columns: true,
    skip_empty_lines: true,
    on_record: (r: Rec) => {
      const kind = str(r.transaction_type);
      if (kind !== "issuance" && kind !== "retirement") return null; // cancellation 等不计入
      const qty = tonnes(r.quantity);

      const registry = projectRegistry.get(str(r.project_id) ?? "");
      const year = Number(str(r.transaction_date)?.slice(0, 4));
      if (registry && Number.isInteger(year) && year > 0) {
        const key = `${registry}\u0000${year}\u0000${kind}`;
        statMap.set(key, (statMap.get(key) ?? BigInt(0)) + qty);
      }

      if (kind === "retirement") {
        const name = str(r.retirement_beneficiary_harmonized) ?? UNDISCLOSED;
        benMap.set(name, (benMap.get(name) ?? BigInt(0)) + qty);
      }
      return null; // 丢弃记录, 保持低内存
    },
  });

  const stats = [...statMap]
    .map(([key, t]) => {
      const [registry, year, kind] = key.split("\u0000");
      return { registry, year: Number(year), kind, tonnes: t };
    })
    .sort(
      (a, b) =>
        a.registry.localeCompare(b.registry) || a.year - b.year || a.kind.localeCompare(b.kind)
    );

  const byTonnesDesc = (a: { tonnes: bigint }, b: { tonnes: bigint }) =>
    b.tonnes > a.tonnes ? 1 : b.tonnes < a.tonnes ? -1 : 0;
  const named = [...benMap]
    .filter(([name]) => name !== UNDISCLOSED)
    .map(([name, t]) => ({ name, tonnes: t }))
    .sort(byTonnesDesc)
    .slice(0, topN);
  const undisclosed = benMap.get(UNDISCLOSED);
  if (undisclosed !== undefined) named.push({ name: UNDISCLOSED, tonnes: undisclosed });
  const beneficiaries = named.sort(byTonnesDesc);

  return { stats, beneficiaries };
}
