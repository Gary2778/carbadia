// 观察区落地页服务端壳:读最新文章元数据,渲染交给客户端(轮询 + 动画)
import type { Metadata } from "next";
import { listArticles } from "@/lib/articles";
import { ObservatoryHome } from "@/components/observatory/ObservatoryHome";

export const metadata: Metadata = {
  title: "Observatory",
  description:
    "Field notes and live data from the world's carbon markets — registry data, retirement flows, CCRC ratings, and the Carbadia Observatory journal.",
};

export default function ObservatoryPage() {
  const a = listArticles()[0];
  return (
    <ObservatoryHome
      latest={a ? { slug: a.slug, issue: a.issue, title: a.title, date: a.date, summary: a.summary } : null}
    />
  );
}
