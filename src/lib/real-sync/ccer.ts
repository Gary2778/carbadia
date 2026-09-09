// CCER 公示同步: ccer.cets.org.cn 的 /api/projectmanage/open/* 匿名公示端点(免登录)。
// 只调 /open/ 开放端点, 不碰任何需 token 的登记/账户/管理数据; 不抓行情。
//
// ===== 端点语义(2026-07-19 逐状态实测确认, 与侦察底稿的假设不同, 以下为准) =====
// 列表 POST /api/projectmanage/open/getOpeningApply, body {pageNumber,pageSize,dataType}:
// - 请求体里的 applyStatus 会被服务端忽略(逐状态 01-07 试调, 返回集完全相同);
//   页签由 dataType 区分, 条目自带的 applyStatus/statusName 才是权威状态。
// - dataType 实测枚举(总量为 2026-07-19 实测值):
//     "1" = 公示中项目   (7 条,   条目 applyStatus="03")
//     "2" = 已登记项目   (41 条,  条目 applyStatus=null, statusName="已登记")
//     "3" = 公示中减排量 (4 条,   核证申请, applyStatus="03")
//     "4" = 已登记减排量 (21 条,  条目带 certificationId)
//     "5" = 已签发减排量 (114 条, 条目带 ccerId, statusName="已签发")
//     "6"/"7" = 有效但当前为空(公示结束/已注销页签, 保留轮询以待其上线)
// - ⚠️ 跨页签重叠(2026-07-19 探针实测): 同一 applyId 流经多个页签(公示中减排量→已登记→已签发),
//   五页签列表项合计 187、去重后 81——按 applyId upsert 后行数 ≈81 是正确的, 别拿 187 当预期值。
//   迭代顺序 1→5 使后签(更晚阶段)覆盖先签, 与"展示最新状态"语义一致。
// 详情 POST /api/projectmanage/open/getOpeningApplyDetail:
// - body 需带 applyId + 条目自带的次级 id(dt2 要 projectInfoId / dt4 要 certificationId /
//   dt5 要 ccerId), 否则报 "公示编号为空"; 统一把条目的四个 id 原样回传即可全页签通用。
// - methodology/province/expectYearNum/certifiedNum/publicStartDate 等字段只在详情返回;
//   日期是无分隔的 "20260717"。
const BASE = "https://ccer.cets.org.cn/api/projectmanage/open";
const LIST_URL = `${BASE}/getOpeningApply`;
const DETAIL_URL = `${BASE}/getOpeningApplyDetail`;

/** 实测确认的非空页签 1-5 + 预留的 6/7(当前返回 total=0, 空结果直接跳过) */
export const CCER_DATA_TYPES = ["1", "2", "3", "4", "5", "6", "7"] as const;

const PAGE_SIZE = 50;
/** 对政府站点克制频率: 任意两次请求间隔 ≥1s */
const REQUEST_INTERVAL_MS = 1_100;
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

export interface CcerListItem {
  applyId: string;
  projectInfoId?: string | null;
  certificationId?: string | null;
  ccerId?: string | null;
  projectName?: string | null;
  orgCustomerName?: string | null;
  projectType?: string | null;
  projectTypeName?: string | null;
  applyStatus?: string | null;
  statusName?: string | null;
  dataType?: string | null;
}

export interface CcerDetail {
  methodologyNum?: string | null;
  methodologyName?: string | null;
  provinceName?: string | null;
  expectYearNum?: number | null;
  certifiedNum?: number | null;
  publicStartDate?: string | null;
  publicEndDate?: string | null;
}

/** 字段与 CcerProject 模型一一对应(syncedAt 由落库时补) */
export interface CcerRow {
  id: string;
  dataType: string;
  applyStatus: string;
  statusName: string;
  name: string;
  owner: string | null;
  projectType: string | null;
  methodology: string | null;
  province: string | null;
  expectYearNum: number | null;
  certifiedNum: number | null;
  publicStart: string | null;
  publicEnd: string | null;
}

/** 空串/空白归一为 null */
function str(v: string | null | undefined): string | null {
  const t = v?.trim() ?? "";
  return t === "" ? null : t;
}

/** 整数容错: 数字或数字字符串取整, 非法归 null */
function int(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(n) : null;
}

/** "20260717" → "2026-07-17"; 其余格式原样保留 */
function ymd(v: string | null | undefined): string | null {
  const t = str(v);
  if (!t) return null;
  return /^\d{8}$/.test(t) ? `${t.slice(0, 4)}-${t.slice(4, 6)}-${t.slice(6, 8)}` : t;
}

/** 列表条目 + 详情(可缺失)→ CcerProject 行; 所有字段缺失容错 */
export function mapCcerApply(
  item: CcerListItem,
  dataType: string,
  detail: CcerDetail | null
): CcerRow {
  const methodology =
    [str(detail?.methodologyNum), str(detail?.methodologyName)].filter(Boolean).join(" ") || null;
  return {
    id: item.applyId,
    dataType: str(item.dataType) ?? dataType,
    applyStatus: str(item.applyStatus) ?? "", // 已登记/已签发页签源值为 null, 归一空串(模型列非空)
    statusName: str(item.statusName) ?? "",
    name: str(item.projectName) ?? "",
    owner: str(item.orgCustomerName),
    projectType: str(item.projectTypeName) ?? str(item.projectType),
    methodology,
    province: str(detail?.provinceName),
    expectYearNum: int(detail?.expectYearNum),
    certifiedNum: int(detail?.certifiedNum),
    publicStart: ymd(detail?.publicStartDate),
    publicEnd: ymd(detail?.publicEndDate),
  };
}

interface ListEnvelope {
  successful?: boolean;
  msg?: string | null;
  total?: number;
  dataInfo?: CcerListItem[] | null;
}

interface DetailEnvelope {
  successful?: boolean;
  msg?: string | null;
  dataInfo?: CcerDetail | null;
}

/**
 * 分页终止判据: 整页未满(已是最后一页)或已拿满服务端宣告的 total。
 * total 缺失时回退 Infinity, 只靠"整页未满"终止——若回退为 fetched 会恒真,
 * 即便整页满(如 dt5 共 114 条需 3 页)也会在第 1 页后静默截断丢数据。
 */
export function isLastCcerPage(
  batchLength: number,
  fetched: number,
  total: number | null | undefined
): boolean {
  return batchLength < PAGE_SIZE || fetched >= (total ?? Infinity);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function post<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", "user-agent": UA },
    body: JSON.stringify(body),
    cache: "no-store",
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) throw new Error(`CCER HTTP ${res.status}: ${url}`);
  return (await res.json()) as T;
}

/**
 * 全量同步: 逐页签(dataType 1-7)分页拉列表 → 逐条拉详情 → 单事务 upsert(量级仅百级)。
 * 每次 HTTP 请求间隔 ≥1s; 单条详情失败不弃整条, 落列表级字段。
 */
export async function syncCcer(): Promise<{ rows: number; dataAsOf: string | null }> {
  const { prisma } = await import("../db"); // 延迟加载: 测试只用纯函数, 不拉起数据库客户端
  const run = await prisma.syncRun.create({ data: { source: "ccer" } });
  try {
    const rows: CcerRow[] = [];
    for (const dataType of CCER_DATA_TYPES) {
      const items: CcerListItem[] = [];
      for (let pageNumber = 1; ; pageNumber++) {
        const page = await post<ListEnvelope>(LIST_URL, {
          pageNumber,
          pageSize: PAGE_SIZE,
          dataType,
        });
        if (page.successful === false) throw new Error(`CCER 列表失败: ${page.msg}`);
        const batch = page.dataInfo ?? [];
        items.push(...batch);
        await sleep(REQUEST_INTERVAL_MS);
        if (isLastCcerPage(batch.length, items.length, page.total)) break;
      }
      if (items.length === 0) continue; // 空页签(实测 6/7)跳过
      console.log(`[sync] CCER: 页签 dataType=${dataType} 共 ${items.length} 条, 逐条拉详情`);

      for (const item of items) {
        if (!item.applyId) continue;
        let detail: CcerDetail | null = null;
        try {
          const d = await post<DetailEnvelope>(DETAIL_URL, {
            applyId: item.applyId,
            projectInfoId: item.projectInfoId ?? null,
            certificationId: item.certificationId ?? null,
            ccerId: item.ccerId ?? null,
            dataType,
            applyStatus: item.applyStatus ?? null,
          });
          detail = d.successful === false ? null : (d.dataInfo ?? null);
          if (!detail) console.warn(`[sync] CCER: 详情为空 applyId=${item.applyId}: ${d.msg}`);
        } catch (e) {
          console.warn(`[sync] CCER: 详情拉取失败 applyId=${item.applyId}`, e);
        }
        rows.push(mapCcerApply(item, dataType, detail));
        await sleep(REQUEST_INTERVAL_MS);
      }
    }

    // 同一 applyId 可能随状态流转出现在多个页签, 后出现的(更新的状态)覆盖
    const byId = new Map(rows.map((r) => [r.id, r]));
    const syncedAt = new Date();
    await prisma.$transaction(
      [...byId.values()].map((r) => {
        const { id, ...data } = r;
        return prisma.ccerProject.upsert({
          where: { id },
          create: { id, ...data, syncedAt },
          update: { ...data, syncedAt },
        });
      })
    );

    await prisma.syncRun.update({
      where: { id: run.id },
      data: { status: "OK", finishedAt: new Date(), rowsUpserted: byId.size },
    });
    console.log(`[sync] CCER: 完成, 共 ${byId.size} 条`);
    return { rows: byId.size, dataAsOf: null };
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    console.error("[sync] CCER: 失败", error);
    await prisma.syncRun
      .update({ where: { id: run.id }, data: { status: "FAILED", finishedAt: new Date(), error } })
      .catch(() => {});
    throw e;
  }
}
