import type { Metadata } from "next";
import { listArticles } from "@/lib/articles";
import { ArticleList } from "@/components/observatory/ArticleList";

export const metadata: Metadata = {
  title: "Articles",
  description: "The Carbadia Observatory journal — English edition.",
};

export default function ArticlesPage() {
  const items = listArticles().map(({ slug, issue, title, date, summary }) => ({ slug, issue, title, date, summary }));
  return <ArticleList items={items} />;
}
