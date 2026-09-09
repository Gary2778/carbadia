import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { articleHtml, getArticle, listArticles } from "@/lib/articles";
import { ArticleView } from "@/components/observatory/ArticleView";

// 文章全部来自仓库文件,构建期定死;未列出的 slug 一律 404
export const dynamicParams = false;

export async function generateStaticParams() {
  return listArticles().map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const a = getArticle(slug);
  return a ? { title: a.title, description: a.summary } : {};
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const a = getArticle(slug);
  if (!a) notFound();
  return (
    <ArticleView
      meta={{ slug: a.slug, issue: a.issue, title: a.title, date: a.date }}
      html={articleHtml(a.body)}
    />
  );
}
