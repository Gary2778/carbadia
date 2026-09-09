import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { articleHtml, getArticle, listArticles, parseArticle } from "./articles";

// 文章管线是对外内容通道,解析器必须对残缺输入宽容(返回 null 而非抛错),
// 避免一篇坏文件拖垮整个构建。
const GOOD = `---
issue: 1
title: The flare goes out
date: 2026-07-30
summary: Sinopec wants to earn by not flaring gas.
---

## Section

Body text with a table:

| a | b |
|---|---|
| 1 | 2 |
`;

describe("parseArticle", () => {
  it("解析 frontmatter 与正文", () => {
    const a = parseArticle(GOOD, "issue-1.md");
    expect(a).not.toBeNull();
    expect(a!.slug).toBe("issue-1");
    expect(a!.issue).toBe(1);
    expect(a!.title).toBe("The flare goes out");
    expect(a!.date).toBe("2026-07-30");
    expect(a!.summary).toContain("Sinopec");
    expect(a!.body).toContain("## Section");
    expect(a!.body).not.toContain("---\nissue");
  });
  it("文件名不合 issue-N.md 模式 → null(README 等杂文件不进管线)", () => {
    expect(parseArticle(GOOD, "README.md")).toBeNull();
    expect(parseArticle(GOOD, "draft-issue-1.md")).toBeNull();
  });
  it("缺 frontmatter 或缺 title/date → null", () => {
    expect(parseArticle("# no frontmatter", "issue-2.md")).toBeNull();
    expect(parseArticle("---\nissue: 2\n---\nbody", "issue-2.md")).toBeNull();
  });
  it("issue 字段缺省时从文件名派生", () => {
    const a = parseArticle("---\ntitle: T\ndate: 2026-01-01\n---\nb", "issue-7.md");
    expect(a!.issue).toBe(7);
  });
  it("frontmatter 前带 BOM 也能正常解析", () => {
    const a = parseArticle("﻿" + GOOD, "issue-1.md");
    expect(a).not.toBeNull();
    expect(a!.title).toBe("The flare goes out");
  });
  it("issue 字段不是合法数字时回退到文件名里的期号", () => {
    const a = parseArticle("---\nissue: not-a-number\ntitle: T\ndate: 2026-01-01\n---\nb", "issue-7.md");
    expect(a!.issue).toBe(7);
  });
});

describe("listArticles / getArticle", () => {
  const dir = mkdtempSync(join(tmpdir(), "carbadia-articles-"));
  writeFileSync(join(dir, "issue-1.md"), GOOD);
  writeFileSync(join(dir, "issue-2.md"), "---\ntitle: Second\ndate: 2026-08-06\n---\nlater");
  writeFileSync(join(dir, "README.md"), "not an article");
  afterAll(() => rmSync(dir, { recursive: true, force: true }));

  it("列表按期号降序且忽略非 issue 文件", () => {
    const list = listArticles(dir);
    expect(list.map((a) => a.slug)).toEqual(["issue-2", "issue-1"]);
  });
  it("getArticle 命中与未命中", () => {
    expect(getArticle("issue-1", dir)!.title).toBe("The flare goes out");
    expect(getArticle("issue-99", dir)).toBeNull();
    expect(getArticle("../etc/passwd", dir)).toBeNull(); // slug 白名单
  });
  it("目录不存在 → 空列表(栏目显示空态而非构建失败)", () => {
    expect(listArticles("/nonexistent-dir-carbadia")).toEqual([]);
  });
  it("同名条目其实是目录(读取会抛错)→ 跳过而不拖垮整个列表", () => {
    const dir2 = mkdtempSync(join(tmpdir(), "carbadia-articles-badentry-"));
    writeFileSync(join(dir2, "issue-1.md"), GOOD);
    mkdirSync(join(dir2, "issue-9.md")); // 文件名匹配 issue-N.md 但其实是目录,readFileSync 会抛错
    try {
      expect(() => listArticles(dir2)).not.toThrow();
      expect(listArticles(dir2).map((a) => a.slug)).toEqual(["issue-1"]);
    } finally {
      rmSync(dir2, { recursive: true, force: true });
    }
  });
});

describe("articleHtml", () => {
  it("渲染 GFM 表格与标题", () => {
    const html = articleHtml(parseArticle(GOOD, "issue-1.md")!.body);
    expect(html).toContain("<table>");
    expect(html).toContain("<h2");
  });
});
