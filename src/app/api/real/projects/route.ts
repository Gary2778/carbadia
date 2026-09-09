import { type NextRequest } from "next/server";
import type { Prisma } from "@/generated/prisma";
import { prisma } from "@/lib/db";
import { ok, handle } from "@/lib/api";

const PAGE_SIZE = 50;

// 进程内 TTL 缓存: 按查询串 keyed, 5 分钟内同查询复用; key 含用户输入 → 封顶防 Map 无限膨胀
const CACHE_TTL_MS = 5 * 60_000;
const CACHE_MAX_KEYS = 200;
const cache = new Map<string, { data: unknown; ts: number }>();

// 非实时公开数据 → 让 CDN 长时间吸收轮询流量
const PUBLIC_CACHE = {
  headers: { "Cache-Control": "public, s-maxage=600, stale-while-revalidate=3600" },
};

export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const registry = sp.get("registry")?.trim() || undefined;
    const country = sp.get("country")?.trim() || undefined;
    const category = sp.get("category")?.trim() || undefined;
    // Number.isSafeInteger 挡住 Infinity/1e300 等非有限值(Prisma skip 会抛错 → 公网 500)
    const pageRaw = Number(sp.get("page"));
    const page = Number.isSafeInteger(pageRaw) && pageRaw >= 1 ? pageRaw : 1;

    const key = JSON.stringify([registry, country, category, page]);
    const hit = cache.get(key);
    if (hit && Date.now() - hit.ts < CACHE_TTL_MS) return ok(hit.data, PUBLIC_CACHE);

    // undefined 条件被 Prisma 忽略 → 未传的筛选不参与 where
    const where: Prisma.RegistryProjectWhereInput = { registry, country, category };
    const [total, rows] = await Promise.all([
      prisma.registryProject.count({ where }),
      prisma.registryProject.findMany({
        where,
        orderBy: [{ retired: "desc" }, { id: "asc" }], // id 作次序键, 保证翻页稳定
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
      }),
    ]);

    const data = {
      pagination: { page, pageSize: PAGE_SIZE, total, totalPages: Math.ceil(total / PAGE_SIZE) },
      // BigInt → number 后进 JSON(账本公约)
      data: rows.map((p) => ({ ...p, issued: Number(p.issued), retired: Number(p.retired) })),
    };
    if (cache.size >= CACHE_MAX_KEYS) cache.clear();
    cache.set(key, { data, ts: Date.now() });
    return ok(data, PUBLIC_CACHE);
  } catch (err) {
    return handle(err);
  }
}
