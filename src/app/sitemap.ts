import type { MetadataRoute } from "next";
import { prisma } from "@/lib/db";
import { listArticles } from "@/lib/articles";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = "https://carbadia.io";
  const articles = listArticles();
  // 文章栏目在有第一篇之前不对外宣告(站内入口同样隐藏)
  const statics = ["", "/exchange", "/exchange/otc", "/observatory", "/observatory/data", "/observatory/rating", "/studio", ...(articles.length ? ["/observatory/articles"] : []), "/terms", "/privacy"].map((p) => ({
    url: `${base}${p}`,
    changeFrequency: "daily" as const,
    priority: p === "" ? 1 : 0.6,
  }));
  const assets = await prisma.asset.findMany({ select: { symbol: true } });
  return [
    ...statics,
    ...assets.map((a) => ({ url: `${base}/exchange/market/${a.symbol}`, changeFrequency: "hourly" as const, priority: 0.8 })),
    ...articles.map((a) => ({
      url: `${base}/observatory/articles/${a.slug}`,
      lastModified: new Date(a.date),
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
  ];
}
