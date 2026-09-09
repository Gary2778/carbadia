// 文章管线: content/articles/issue-N.md → 结构化文章(英文刊 Carbadia Observatory)。
// frontmatter 只支持 "key: value" 单行(YAGNI,不引 YAML 依赖);
// 解析失败一律返回 null —— 一篇坏文件不能拖垮整个站点构建。
import fs from "node:fs";
import path from "node:path";
import { marked } from "marked";

export type Article = {
  slug: string; // 由文件名派生,如 "issue-1"
  issue: number;
  title: string;
  date: string; // YYYY-MM-DD
  summary: string;
  body: string; // frontmatter 之后的 markdown 原文
};

const ARTICLES_DIR = path.join(process.cwd(), "content", "articles");
const FILE_RE = /^issue-(\d+)\.md$/;
const SLUG_RE = /^issue-\d+$/;

export function parseArticle(raw: string, filename: string): Article | null {
  // 文件名必须匹配 issue-N.md 模式,杜绝非文章文件(如 README)进管线
  const m = FILE_RE.exec(filename);
  if (!m) return null;

  // 有些编辑器/系统会在文件头插入 BOM,不剥掉会让 frontmatter 正则匹配失败
  raw = raw.replace(/^﻿/, "");

  // 提取 frontmatter 块
  const fm = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(raw);
  if (!fm) return null;

  // 解析 frontmatter 中的 key: value 对
  const meta: Record<string, string> = {};
  for (const line of fm[1].split(/\r?\n/)) {
    const kv = /^(\w+):\s*(.*)$/.exec(line.trim());
    if (kv) meta[kv[1]] = kv[2].replace(/^["']|["']$/g, "");
  }

  // title 和 date 必需,缺一返回 null
  if (!meta.title || !meta.date) return null;

  // issue 字段若不是合法数字(如手滑打错),回退到文件名里的期号,而不是产出 NaN
  const n = Number(meta.issue ?? m[1]);
  return {
    slug: `issue-${m[1]}`,
    issue: Number.isNaN(n) ? Number(m[1]) : n,
    title: meta.title,
    date: meta.date,
    summary: meta.summary ?? "",
    body: raw.slice(fm[0].length),
  };
}

export function listArticles(dir: string = ARTICLES_DIR): Article[] {
  let files: string[];
  try {
    files = fs.readdirSync(dir);
  } catch {
    // 目录还没建 = 还没有文章,栏目显示空态而不是构建失败
    return [];
  }

  return files
    .filter((f) => FILE_RE.test(f))
    .map((f) => {
      // 单篇读取/解析失败(如权限问题、同名目录)不能拖垮整个列表——跳过这一篇
      try {
        return parseArticle(fs.readFileSync(path.join(dir, f), "utf-8"), f);
      } catch {
        return null;
      }
    })
    .filter((a): a is Article => a !== null)
    .sort((a, b) => b.issue - a.issue); // 期号降序
}

export function getArticle(slug: string, dir: string = ARTICLES_DIR): Article | null {
  // slug 白名单检查,杜绝路径注入攻击(如 ../etc/passwd)
  if (!SLUG_RE.test(slug)) return null;
  return listArticles(dir).find((a) => a.slug === slug) ?? null;
}

export function articleHtml(body: string): string {
  // 文章是仓库内受控内容(用户终审后才入库),无用户输入,不需要 sanitize
  return marked.parse(body, { gfm: true, async: false }) as string;
}
