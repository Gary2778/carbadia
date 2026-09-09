import { prisma } from "@/lib/db";
import { ok, handle } from "@/lib/api";

// 进程内 TTL 缓存: 真实市场数据源站日更, 概览对所有访客相同, 10 分钟内复用同一份
const CACHE_TTL_MS = 10 * 60_000;
let cache: { data: unknown; ts: number } | null = null;

// 非实时公开数据 → 让 CDN 长时间吸收轮询流量, 源站每 10 分钟最多回源一次
const PUBLIC_CACHE = {
  headers: { "Cache-Control": "public, s-maxage=600, stale-while-revalidate=3600" },
};

export async function GET() {
  try {
    if (cache && Date.now() - cache.ts < CACHE_TTL_MS) return ok(cache.data, PUBLIC_CACHE);

    // CCER(中国数据)已从本站下架:界面与本接口只保留国际注册处数据。
    // ccerProject 表与采集器原样保留——数据继续积累,供中文站 carbadia.co 使用。
    const [lastOffsets, byRegistry, stats, beneficiaries, byCountry, byCategory] = await Promise.all([
      prisma.syncRun.findFirst({
        where: { source: "offsetsdb", status: "OK", dataAsOf: { not: null } },
        orderBy: { startedAt: "desc" },
        select: { dataAsOf: true },
      }),
      prisma.registryProject.groupBy({
        by: ["registry"],
        _count: { _all: true },
        _sum: { issued: true, retired: true },
        orderBy: { _sum: { retired: "desc" } },
      }),
      prisma.registryStat.findMany(),
      prisma.registryBeneficiary.findMany({ orderBy: { tonnes: "desc" } }),
      // 项目浏览器筛选下拉的取值全集(客户端只见分页 50 行, 无法自行去重出完整列表)
      prisma.registryProject.groupBy({ by: ["country"], where: { country: { not: null } } }),
      prisma.registryProject.groupBy({ by: ["category"], where: { category: { not: null } } }),
    ]);

    // BigInt → number 后进 JSON(账本公约; 吨级量远在 Number 安全范围内)
    const registries = byRegistry.map((r) => ({
      registry: r.registry,
      projects: r._count._all,
      issued: Number(r._sum.issued ?? 0),
      retired: Number(r._sum.retired ?? 0),
    }));
    const totals = registries.reduce(
      (acc, r) => ({
        projects: acc.projects + r.projects,
        issued: acc.issued + r.issued,
        retired: acc.retired + r.retired,
      }),
      { projects: 0, issued: 0, retired: 0 }
    );

    // 年度签发/注销趋势: RegistryStat 是注册处×年×kind 粒度, 此处跨注册处合并
    const byYear = new Map<number, { year: number; issuance: number; retirement: number }>();
    for (const s of stats) {
      const y = byYear.get(s.year) ?? { year: s.year, issuance: 0, retirement: 0 };
      if (s.kind === "issuance") y.issuance += Number(s.tonnes);
      else if (s.kind === "retirement") y.retirement += Number(s.tonnes);
      byYear.set(s.year, y);
    }
    const years = [...byYear.values()].sort((a, b) => a.year - b.year);

    // 尚未同步时各段自然为空数组/null(空结构而非 500), 前端按空态渲染
    const data = {
      asOf: lastOffsets?.dataAsOf ?? null,
      totals,
      registries,
      years,
      beneficiaries: beneficiaries.map((b) => ({ name: b.name, tonnes: Number(b.tonnes) })),
      filters: {
        countries: byCountry
          .map((c) => c.country as string)
          .filter((c) => c && c.toLowerCase() !== "not found") // OffsetsDB 源数据脏值
          .sort((a, b) => a.localeCompare(b)),
        categories: byCategory.map((c) => c.category as string).sort((a, b) => a.localeCompare(b)),
      },
    };
    cache = { data, ts: Date.now() };
    return ok(data, PUBLIC_CACHE);
  } catch (err) {
    return handle(err);
  }
}
