// 首页服务端壳:唯一职责是把最新文章元数据(fs 读取,构建期固化)递给客户端首页。
// 动画与轮询都在 HomeClient("use client")里。
import { listArticles } from "@/lib/articles";
import { HomeClient, type LatestArticleMeta } from "@/components/home/HomeClient";

export default function Home() {
  const a = listArticles()[0];
  const latest: LatestArticleMeta = a ? { slug: a.slug, issue: a.issue, title: a.title, date: a.date } : null;
  return <HomeClient latestArticle={latest} />;
}
