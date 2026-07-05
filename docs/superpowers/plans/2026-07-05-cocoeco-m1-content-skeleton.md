# cocoeco.io 里程碑 1:内容骨架站 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 搭起全新 `cocoeco/` Next.js 16 应用,把审定文案 v2.1 全量上屏——一个可在浏览器里从序幕滚到黎明、读完 10 幕全部文案的纯 DOM 叙事长页(暂无 3D),含导航、分子进度条、知识卡、邮箱表单三态。

**Architecture:** 单路由长滚动页;所有文案存于 `dictionary.ts`(zh 先行,类型按 16 语设计);`scenes/registry.ts` 是 10 幕顺序唯一事实源;组件全部使用 CSS 逻辑属性(为 ar RTL 预留);视觉先用"夜色中性 token"(CSS 变量),里程碑 0 风格定向后只改 token 值。

**Tech Stack:** Next.js 16.2.7 · React 19.2.4 · TypeScript 5 · Tailwind CSS v4 · Vitest 4(+ jsdom / @testing-library/react)。3D 依赖(three/R3F/gsap)本里程碑**不安装**,留给 M2。

## 项目路线图(用户同步用;每个里程碑一个检查点)

| 里程碑 | 内容 | 用户检查点 |
|---|---|---|
| M0 视觉风格定向 | 3 个艺术方向提案(配色/材质/字体/氛围) | **你选一个方向**(本计划批准后立即进行) |
| **M1 内容骨架站(本计划)** | 全部文案上屏的可滚动长页 | **浏览器里滚完 10 幕**,确认结构与排版 |
| M2 3D 管线 + 序幕/卧室 | three.js 基础设施 + 第一个 Blender 场景 | 定妆图确认 → 实机确认 |
| M3–M6 逐幕制作 | 城市/大气层 → 森林海洋 → 市场/评级所 → 新生/营地/黎明 | 每幕定妆图 + 实机各一次确认 |
| M7 过场帧序列 + 声音 | Blender 预渲染滚动过场、音效开关 | 完整旅程试滚 |
| M8 16 语翻译 + RTL | 翻译工作包派发、ar 全站 RTL | 抽查 2–3 个语言 |
| M9 终审 | 性能分档/无障碍/SEO/部署准备 | 上线前总验收 |

M2 起每个里程碑在其前置检查点通过后**另写详细计划**(3D 细节依赖 M0 风格结论,现在锁死是浪费)。

## Global Constraints(每个任务默认包含)

- 应用位于仓库 `cocoeco/`,独立 package.json;dev 端口 **3100**。
- **写任何代码前先读 `node_modules/next/dist/docs/` 相关指南**(AGENTS.md 强制;本仓库 Next 16 与训练数据可能不同)。仓库根已有 next 16.2.7 可查文档;cocoeco 自装依赖。
- `next.config.ts` 必须含 `turbopack: { root: path.join(__dirname) }`(嵌套 worktree 防误判根目录)。
- eslint 用 `eslint-config-next@16.2.7`(react-hooks@7 React Compiler 级规则:渲染期禁读写 ref)。
- 文案唯一来源:`docs/superpowers/specs/2026-07-05-cocoeco-copy-zh-v1.md`(v2.1)。**逐字转写,不得改写**;剥离〔占位〕〔口径〕〔译注〕等作者标记;词典值内不得出现"〔"或"〕"。
- 口号三词只存 `common.creed: [string,string,string]` 一处;其余出现点(宣言、理念三条标题、roadmap 小字、metadata description)一律由 creed 组装,词典其他值禁止出现"被看见/被定价/被认领"字样。
- 免责声明只存 `common.disclaimer`、`common.ratingDisclaimer` 各一处。
- CSS 一律逻辑属性(`margin-inline-start` 等,Tailwind 用 `ms-*/me-*/ps-*/pe-*`),不用 left/right 物理属性;箭头等方向符号由组件渲染,不进词典。
- 所有正文文案渲染为真实 DOM 文本(SEO/无障碍),不进图片。
- 每个任务结束:`npm --prefix cocoeco run lint && npm --prefix cocoeco run test` 全绿再提交。

## File Structure

```
cocoeco/
  package.json  next.config.ts  tsconfig.json  postcss.config.mjs
  eslint.config.mjs  vitest.config.ts
  src/
    app/layout.tsx        # html lang/dir、metadata(由 dict 组装)、I18nProvider
    app/page.tsx          # 组装 TopNav + 10 幕 + Footer
    app/globals.css       # 设计 token(CSS 变量)+ 基础排版
    app/icon.svg
    i18n/config.ts        # Lang 16 语、LANG_META(复用交易所结构)
    i18n/I18nProvider.tsx # zh 默认;useDict()/useLang()
    content/dictionary.ts # Dict 类型 + zh 全量
    content/dictionary.test.ts
    scenes/registry.ts    # SCENES 10 幕顺序事实源
    scenes/registry.test.ts
    components/TopNav.tsx  ProgressBar.tsx  SceneSection.tsx
    components/KnowledgeCard.tsx  EmailForm.tsx  Footer.tsx
    components/*.test.tsx
```

职责:`registry.ts` 只管顺序与锚点 id;`dictionary.ts` 只管文案;组件只消费两者,不内嵌文案。

---

### Task 1: 脚手架与工具链

**Files:**
- Create: `cocoeco/package.json`, `cocoeco/next.config.ts`, `cocoeco/tsconfig.json`, `cocoeco/postcss.config.mjs`, `cocoeco/eslint.config.mjs`, `cocoeco/vitest.config.ts`, `cocoeco/src/app/layout.tsx`(临时最小版), `cocoeco/src/app/page.tsx`(临时占位), `cocoeco/src/app/globals.css`
- Modify: `.claude/launch.json`(仓库根,新增 cocoeco 配置)

**Interfaces:**
- Produces: 可启动的空应用(端口 3100);`globals.css` 输出设计 token 变量 `--bg/--fg/--muted/--accent/--card`,后续任务全部用它们。

- [ ] **Step 1: 读 Next 16 文档**

读 `node_modules/next/dist/docs/` 下 app-router 项目结构、`next.config` 与 metadata 相关章节(仓库根的 node_modules 即可)。确认 create app 的当前约定后再动手。

- [ ] **Step 2: 写配置文件**

`cocoeco/package.json`(版本与旧版验证过的一致,不装 3D 依赖):

```json
{
  "name": "cocoeco",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev -p 3100",
    "build": "next build",
    "start": "next start -p 3100",
    "lint": "eslint",
    "test": "vitest run"
  },
  "dependencies": {
    "next": "16.2.7",
    "react": "19.2.4",
    "react-dom": "19.2.4"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "^4",
    "@testing-library/react": "^16.3.0",
    "@types/node": "^20",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "eslint": "^9",
    "eslint-config-next": "16.2.7",
    "jsdom": "^26.0.0",
    "tailwindcss": "^4",
    "typescript": "^5",
    "vitest": "^4.1.8"
  }
}
```

`cocoeco/next.config.ts`:

```ts
import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: { root: path.join(__dirname) },
};

export default nextConfig;
```

`cocoeco/vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: { environment: "jsdom", include: ["src/**/*.test.{ts,tsx}"] },
  esbuild: { jsx: "automatic" },
});
```

`cocoeco/postcss.config.mjs`:

```js
export default { plugins: { "@tailwindcss/postcss": {} } };
```

`cocoeco/tsconfig.json` 与 `eslint.config.mjs`:参照仓库根同名文件的 Next 16 写法(strict、`@/*` 路径别名指向 `src/*`;eslint 继承 `eslint-config-next` flat config)。

- [ ] **Step 3: 写最小 layout/page/globals.css**

`globals.css`(夜色中性 token,M0 风格定向后只改值):

```css
@import "tailwindcss";

:root {
  --bg: #0b0f1a;        /* 深夜蓝黑 */
  --bg-soft: #121829;
  --fg: #ece8dd;        /* 暖白 */
  --muted: #8f96a8;
  --accent: #7ad0a6;    /* 生态绿(占位,待 M0 定稿) */
  --card: #161d31;
}

html { color-scheme: dark; }
body {
  background: var(--bg);
  color: var(--fg);
  font-family: var(--font-sans, ui-sans-serif, system-ui), sans-serif;
}
```

`layout.tsx` 临时版:`<html lang="zh-CN" dir="ltr">`,引入 globals.css,title 先写 "cocoeco"。`page.tsx` 临时版:`<main>cocoeco 骨架</main>`。

- [ ] **Step 4: 安装依赖并启动验证**

```bash
npm --prefix cocoeco install
npm --prefix cocoeco run lint
```

在仓库根 `.claude/launch.json` 的 `configurations` 数组追加:

```json
{ "name": "cocoeco", "runtimeExecutable": "npm", "runtimeArgs": ["--prefix", "cocoeco", "run", "dev"], "port": 3100 }
```

用 preview_start("cocoeco") 启动,preview_snapshot 确认页面出现"cocoeco 骨架"、无控制台错误。

- [ ] **Step 5: Commit**

```bash
git add cocoeco .claude/launch.json
git commit -m "feat: cocoeco M1 脚手架(Next 16 + Tailwind v4 + Vitest,端口 3100)"
```

---

### Task 2: 场景注册表 + i18n 基座

**Files:**
- Create: `cocoeco/src/scenes/registry.ts`, `cocoeco/src/scenes/registry.test.ts`, `cocoeco/src/i18n/config.ts`, `cocoeco/src/i18n/I18nProvider.tsx`

**Interfaces:**
- Produces:
  - `SCENES: readonly SceneId[]`(10 个,顺序即滚动顺序);`type SceneId = "prologue" | "bedroom" | "city" | "atmosphere" | "forestSea" | "market" | "rating" | "rebirth" | "camp" | "dawn"`
  - `type Lang`(16 语)与 `LANG_META: Record<Lang, {label: string; htmlLang: string; dir: "ltr" | "rtl"}>`
  - `I18nProvider`、`useDict(): Dict`、`useLang(): Lang`(M1 恒为 "zh",接口先立)

- [ ] **Step 1: 写失败测试** `registry.test.ts`

```ts
import { describe, expect, it } from "vitest";
import { SCENES } from "./registry";

describe("scene registry", () => {
  it("有且仅有 10 幕,顺序为序幕→黎明", () => {
    expect(SCENES).toEqual([
      "prologue", "bedroom", "city", "atmosphere", "forestSea",
      "market", "rating", "rebirth", "camp", "dawn",
    ]);
  });
  it("id 无重复", () => {
    expect(new Set(SCENES).size).toBe(SCENES.length);
  });
});
```

- [ ] **Step 2: 运行确认失败**

`npm --prefix cocoeco run test` → FAIL(registry 不存在)。

- [ ] **Step 3: 实现**

`registry.ts`:

```ts
export const SCENES = [
  "prologue", "bedroom", "city", "atmosphere", "forestSea",
  "market", "rating", "rebirth", "camp", "dawn",
] as const;

export type SceneId = (typeof SCENES)[number];
```

`i18n/config.ts`:16 语 `Lang` 联合类型与 `LANG_META`,**逐字复制仓库根 `src/i18n/config.ts` 的 LANG_META 表**(en/da/de/es/fr/it/nl/pl/pt/fi/sv/ja/ko/ar/zh/zh-TW;ar 为 rtl)。

`I18nProvider.tsx`("use client"):context 持有 `lang`(M1 固定 "zh")与 `dict`(来自 Task 3 的 `dictionary.zh`;本任务先 re-export 类型、provider 骨架,在 Task 3 后接通——若先行合并,可暂以 `as Dict` 空实现占位使测试聚焦 registry/config)。导出 `useDict`/`useLang`,渲染期不读写 ref。

- [ ] **Step 4: 测试通过** → `npm --prefix cocoeco run test` PASS
- [ ] **Step 5: Commit** `git commit -m "feat: cocoeco 场景注册表(10 幕事实源)与 16 语 i18n 基座"`

---

### Task 3: 中文字典(文案全量转写)

**Files:**
- Create: `cocoeco/src/content/dictionary.ts`, `cocoeco/src/content/dictionary.test.ts`
- Modify: `cocoeco/src/i18n/I18nProvider.tsx`(接通真实 dict)

**Interfaces:**
- Produces: `type Dict`、`dictionary: { zh: Dict }`、`resolveDict(lang: Lang): Dict`(非 zh 暂回退 zh)。
- 后续所有组件只从 `useDict()` 取文案。

- [ ] **Step 1: 定义 Dict 类型**(核心结构,完整):

```ts
import type { SceneId } from "@/scenes/registry";

export type KnowledgeCard = { title: string; body: string; note?: string };

export type Dict = {
  ui: {
    brand: string; topCta: string; journeyMenu: string; language: string;
    soundOn: string; soundOff: string; readingMode: string; backToImmersive: string;
    hintScroll: string; hintDrag: string; cardClose: string;
    loading: string; loadFailed: string; retry: string; enterReading: string;
    liteMode: string; reducedMotion: string; progressAria: string;
  };
  meta: { titleBase: string; descriptionParts: [string, string]; ogImageAlt: string };
  common: {
    creed: [string, string, string];           // ["被看见","被定价","被认领"]
    disclaimer: string; ratingDisclaimer: string;
  };
  scenes: Record<SceneId, SceneCopy>;
  footer: { rights: string };
};

export type SceneCopy = {
  menuName: string;                 // 章节菜单名(序幕/卧室/…/黎明)
  seoTitle: string;                 // 章节标题(阅读模式/SEO)
  narration: string[];              // 旁白/逐行浮现(每项一个节拍)
  interactionHint?: string;
  interactionFeedback?: string[];
  bigLines?: string[];              // 数据大字/核心转折/宣言前导等居中大字组
  cards?: KnowledgeCard[];
  blocks?: { heading?: string; lines: string[] }[];  // 场景专属段落(碳市场两句话、归宿三则、理念三条 body 等)
  features?: { name: string; detail: string }[];     // market 专用
  gates?: { name: string; desc: string }[];          // rating 专用
  roadmap?: { done: string[]; doing: string[]; planned: string[]; note: string };
  form?: { pitch: string; placeholder: string; button: string; privacy: string;
           success: string; invalid: string; failed: string };
  actions?: { name: string; desc: string; status: string; placeholder: boolean }[];
  team?: { name: string; role: string; placeholder: boolean }[];
  cta?: { label: string; kind: "exchange" | "email" | "rating-link" }[];
  claimedCount?: (n: number) => string;              // market 专用
  transition?: string;                               // 过场字幕
};
```

- [ ] **Step 2: 写失败的约束测试** `dictionary.test.ts`

```ts
import { describe, expect, it } from "vitest";
import { dictionary } from "./dictionary";
import { SCENES } from "@/scenes/registry";

const zh = dictionary.zh;
const wholeText = () =>
  JSON.stringify(zh, (_k, v) => (typeof v === "function" ? "" : v));

describe("zh dictionary 约束", () => {
  it("覆盖全部 10 幕", () => {
    expect(Object.keys(zh.scenes).sort()).toEqual([...SCENES].sort());
  });
  it("作者标记已剥离(无〔〕)", () => {
    expect(wholeText()).not.toMatch(/[〔〕]/);
  });
  it("口号三词只存于 common.creed 一处", () => {
    expect(zh.common.creed).toEqual(["被看见", "被定价", "被认领"]);
    const textWithoutCreed = JSON.stringify(
      { ...zh, common: { ...zh.common, creed: [] } },
      (_k, v) => (typeof v === "function" ? "" : v),
    );
    for (const word of zh.common.creed) {
      expect(textWithoutCreed).not.toContain(word);
    }
  });
  it("免责声明单点存储", () => {
    const t = wholeText();
    expect(t.split(zh.common.disclaimer).length).toBe(2); // 只出现一次
  });
  it("每幕旁白非空", () => {
    for (const id of SCENES) {
      expect(zh.scenes[id].narration.length).toBeGreaterThan(0);
      for (const line of zh.scenes[id].narration) expect(line.trim()).not.toBe("");
    }
  });
  it("市场幕计数为复数安全函数", () => {
    const f = zh.scenes.market.claimedCount!;
    expect(f(3)).toContain("3");
  });
  it("占位内容带 placeholder 标记", () => {
    expect(zh.scenes.camp.team!.every((m) => m.placeholder)).toBe(true);
    expect(zh.scenes.camp.actions!.every((a) => a.placeholder)).toBe(true);
  });
});
```

- [ ] **Step 3: 运行确认失败** → FAIL(dictionary 不存在)

- [ ] **Step 4: 转写 zh 全量文案**

来源:`docs/superpowers/specs/2026-07-05-cocoeco-copy-zh-v1.md`(v2.1)。规则:逐字转写、剥离〔〕标记、粗体 `**…**` 原样保留(渲染层解析)、"→"箭头不进词典。两个完整示例(其余幕同法):

```ts
prologue: {
  menuName: "序幕",
  seoTitle: "我醒来的那个晚上",
  narration: [
    "我是一颗碳原子。比太阳还老。",
    "我当过大理石,当过一片浅海里的珊瑚,当过一整片石炭纪的森林。",
    "然后,我睡了三亿年。",
    "三个小时前,有人把我从煤里叫醒,送出了烟囱。",
    "现在的我,是一颗二氧化碳分子。",
    "你可以叫我——可可。",
  ],
  bigLines: [
    "这名字打哪儿来,路上我慢慢讲。",
    "旅行,我见得多了。但这一次不太一样:",
    "这条路的尽头,这个名字才真正落到账本上——连同一个价格,和一个归宿。",
  ],
  blocks: [{ lines: ["今晚,我想请你陪我走完这段路。——cocoeco"] }],
},
market: {
  menuName: "市场",
  seoTitle: "在这里,我第一次有了价格",
  narration: ["在这颗星球上转了四十六亿年,我头一次排队——也头一次,有人为我出价。"],
  blocks: [
    { heading: "碳市场做的事,说穿了很简单:", lines: [
      "**让排碳的人付钱,让减碳的人赚钱。**",
      "排放要花钱买额度;真实的减排,能变成“碳信用”卖出去。",
      "账本一立,风向就变了。",
    ]},
    { lines: [
      "**Carbadia** 是 cocoeco 生态中的碳信用交易所。",
      "Carbadia 把交易真实减排量这件事,做得像买一杯咖啡一样简单明白。",
    ]},
  ],
  features: [
    { name: "订单簿现货", detail: "限价、市价随你下,价格好、来得早的先成交——资金和持仓当场两清。" },
    { name: "OTC 大宗", detail: "大额买卖一口价,可以只买一部分,起买多少卖家说了算。" },
    { name: "16 种语言", detail: "全球的账,全球人一起记。" },
  ],
  cta: [{ label: "去 carbadia.io,看看今天的碳价", kind: "exchange" }],
  interactionHint: "给漂过的分子贴上今天的价格",
  claimedCount: (n: number) => `已认领 ${n} 颗`,
  transition: "我揣着自己的凭证,走向下一道门。门口的牌子上,画着一枚放大镜。",
},
```

其余 8 幕(bedroom/city/atmosphere/forestSea/rating/rebirth/camp/dawn)与 `ui`/`meta`/`common`/`footer` 按同样规则从文案稿对应小节逐字转写;`meta.descriptionParts` 拆两段存(creed 处由组件拼装,避免词典出现口号词);团队/行动占位项 `placeholder: true`,name 写"待公布"。免责声明只在 `common.disclaimer` 出现,第 5 幕与页脚由组件引用。

`resolveDict`:

```ts
export const dictionary = { zh } as const;
export function resolveDict(_lang: string) {
  return dictionary.zh; // M8 接入其余 15 语
}
```

接通 `I18nProvider`(useState 惰性初始化,不在渲染期读 ref)。

- [ ] **Step 5: 测试通过** → 全部 PASS
- [ ] **Step 6: Commit** `git commit -m "feat: cocoeco zh 词典全量转写(v2.1)+ 结构约束测试"`

---

### Task 4: 页面骨架 A——序幕到大气层(0–3 幕)

**Files:**
- Create: `cocoeco/src/components/SceneSection.tsx`, `cocoeco/src/components/KnowledgeCard.tsx`
- Modify: `cocoeco/src/app/page.tsx`, `cocoeco/src/app/layout.tsx`(metadata 由 dict 组装)
- Test: `cocoeco/src/components/SceneSection.test.tsx`

**Interfaces:**
- Produces: `<SceneSection id={SceneId} …>`——渲染 `<section id={id} aria-labelledby={id+"-title"}>`,内含 seoTitle 的 `<h2>`(序幕用 `<h1>`)、narration 逐行 `<p>`、bigLines 大字、cards(KnowledgeCard 列表)、blocks、transition 小字。粗体 `**…**` 解析为 `<strong>`(写一个 8 行的受控 parseEmphasis 工具函数,只处理成对 `**`)。
- `KnowledgeCard`:`<details><summary>{title}</summary><p>{body}</p>{note && <p class=muted>}</details>`。

- [ ] **Step 1: 写失败测试**(SceneSection 渲染标题/旁白/强调解析):

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SceneSection } from "./SceneSection";

describe("SceneSection", () => {
  it("渲染锚点、标题与旁白,并解析 ** 强调", () => {
    render(
      <SceneSection id="city" seoTitle="测试标题"
        narration={["第一行", "有**重点**的行"]} />,
    );
    const section = document.getElementById("city")!;
    expect(section).toBeTruthy();
    expect(screen.getByText("测试标题").id).toBe("city-title");
    expect(screen.getByText("重点").tagName).toBe("STRONG");
  });
});
```

- [ ] **Step 2: 确认失败** → FAIL
- [ ] **Step 3: 实现 SceneSection/KnowledgeCard/parseEmphasis**,并在 `page.tsx` 用 `useDict()` 渲染前 4 幕(prologue 含 hintScroll/hintDrag 提示与品牌句;atmosphere 的宣言块:前导行来自 narration/bigLines,三联句由 `common.creed.map(w => "被"+…)`——**不对**,creed 数组即三词本身,组件渲染为 `{creed.join("。")+"。"}` 大字;理念三条标题取 `creed[i]`,body 来自 blocks)。`layout.tsx` metadata:`title = meta.titleBase`,`description = descriptionParts[0] + creed.join("、") + descriptionParts[1]`。
- [ ] **Step 4: 测试通过 + preview_snapshot 目检前 4 幕文案齐全**
- [ ] **Step 5: Commit** `git commit -m "feat: cocoeco 骨架 0-3 幕(SceneSection/知识卡/宣言组装)"`

---

### Task 5: 页面骨架 B——森林与海到黎明(4–9 幕)+ 页脚

**Files:**
- Create: `cocoeco/src/components/Footer.tsx`
- Modify: `cocoeco/src/app/page.tsx`
- Test: `cocoeco/src/components/Footer.test.tsx`

**Interfaces:**
- Consumes: SceneSection/KnowledgeCard(Task 4 签名)。
- Produces: 完整 10 幕 DOM;Footer 渲染 `footer.rights` + `common.disclaimer`(单一来源)+ 语言/法务占位。

- [ ] **Step 1: 失败测试**(Footer 渲染免责声明,与 market 幕同引 `common.disclaimer`):

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Footer } from "./Footer";
import { dictionary } from "@/content/dictionary";

it("页脚渲染唯一来源的免责声明", () => {
  render(<Footer />);
  expect(screen.getByText(dictionary.zh.common.disclaimer)).toBeTruthy();
});
```

- [ ] **Step 2: 确认失败** → **Step 3: 实现**:4–9 幕上屏(market:features 列表+免责+CTA 按钮(箭头为组件内 `<span aria-hidden>` 渲染);rating:四道门 gates + 盖章交互占位按钮(通过/存疑,点击显示对应 feedback 文本);rebirth:roadmap 三组;camp:actions 占位卡(带"筹备中"badge)、团队占位、联系、双 CTA;dawn:narration + 署名 + 最终 CTA;Footer 挂 page 底部)。
- [ ] **Step 4: 测试通过 + preview 滚动目检全部 10 幕**
- [ ] **Step 5: Commit** `git commit -m "feat: cocoeco 骨架 4-9 幕与页脚(免责单源)"`

---

### Task 6: 顶部导航 + 分子进度条

**Files:**
- Create: `cocoeco/src/components/TopNav.tsx`, `cocoeco/src/components/ProgressBar.tsx`
- Modify: `cocoeco/src/app/page.tsx`
- Test: `cocoeco/src/components/TopNav.test.tsx`

**Interfaces:**
- Consumes: `SCENES`、`useDict()`。
- Produces: TopNav(品牌、10 章菜单锚点链接、语言按钮占位禁用、"去 carbadia.io" CTA→`https://carbadia.io`);ProgressBar(固定顶部细条:滚动百分比宽度 + 10 个可点击刻度,`aria-label={ui.progressAria}`,刻度 title=menuName)。

- [ ] **Step 1: 失败测试**:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TopNav } from "./TopNav";
import { dictionary } from "@/content/dictionary";
import { SCENES } from "@/scenes/registry";

it("菜单含全部 10 幕且锚点正确", () => {
  render(<TopNav />);
  for (const id of SCENES) {
    const item = screen.getByRole("link", {
      name: dictionary.zh.scenes[id].menuName,
    });
    expect(item.getAttribute("href")).toBe(`#${id}`);
  }
});
```

- [ ] **Step 2: 确认失败** → **Step 3: 实现**(ProgressBar 为 "use client":scroll 监听 + `requestAnimationFrame` 节流写 state;渲染期不读 ref;移动端菜单折叠为下拉)。
- [ ] **Step 4: 测试通过 + preview 点击菜单跳章、进度条随滚动增长**
- [ ] **Step 5: Commit** `git commit -m "feat: cocoeco 顶部导航与分子进度条(锚点跳章/aria)"`

---

### Task 7: 邮箱表单三态

**Files:**
- Create: `cocoeco/src/components/EmailForm.tsx`
- Modify: `cocoeco/src/app/page.tsx`(camp 幕挂载)
- Test: `cocoeco/src/components/EmailForm.test.tsx`

**Interfaces:**
- Produces: `<EmailForm />`——输入+按钮;客户端校验(`/^[^\s@]+@[^\s@]+\.[^\s@]+$/`);M1 提交为本地 stub(写 `localStorage["cocoeco-waitlist"]`,后端 M9 前接入),三态文案全部取自 `scenes.camp.form`。

- [ ] **Step 1: 失败测试**:

```tsx
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EmailForm } from "./EmailForm";
import { dictionary } from "@/content/dictionary";

const form = dictionary.zh.scenes.camp.form!;

it("非法邮箱显示格式错误文案", () => {
  render(<EmailForm />);
  fireEvent.change(screen.getByRole("textbox"), { target: { value: "不是邮箱" } });
  fireEvent.click(screen.getByRole("button", { name: form.button }));
  expect(screen.getByText(form.invalid)).toBeTruthy();
});

it("合法邮箱显示成功文案", () => {
  render(<EmailForm />);
  fireEvent.change(screen.getByRole("textbox"), { target: { value: "a@b.co" } });
  fireEvent.click(screen.getByRole("button", { name: form.button }));
  expect(screen.getByText(form.success)).toBeTruthy();
});
```

- [ ] **Step 2: 确认失败** → **Step 3: 实现**(useState 状态机 idle/invalid/success/failed;隐私小字 `form.privacy` 常显)。
- [ ] **Step 4: 测试通过** → **Step 5: Commit** `git commit -m "feat: cocoeco 邮箱表单三态(本地 stub)"`

---

### Task 8: M1 终检与用户检查点

**Files:**
- Modify:(仅修复项)

- [ ] **Step 1: 全量验证**

```bash
npm --prefix cocoeco run lint      # 0 error
npx --prefix cocoeco tsc --noEmit  # 0 error
npm --prefix cocoeco run test      # 全绿
```

- [ ] **Step 2: preview 全流程走查**:preview_start → 滚完 10 幕(对照文案稿逐幕核对无缺漏)→ 菜单跳章 → 知识卡展开 → 盖章交互占位 → 表单三态 → 移动端 viewport(preview_resize mobile)不横向滚动 → preview_screenshot 存证。
- [ ] **Step 3: 修复走查发现的问题并提交**
- [ ] **Step 4: 向用户汇报**:截图 + 本地预览方法(端口 3100),请用户滚完 10 幕确认结构与文案呈现 → **M1 检查点**。通过后进入 M2 计划(3D 管线 + 序幕卧室)。

## Self-Review 记录

- Spec 覆盖:M1 范围 = spec §4(信息架构/导航/DOM 内容层)+ §5 的 i18n 字典约束(函数值/string[]/内联强调/单键法务)+ §6 流程第 1 步产物上屏;3D/过场/降级分档/16 语/阅读模式切换按路线图归 M2/M7/M8(阅读模式在 M1 即整站形态,开关按钮 M2 引入 3D 时才有意义——已在计划中注明)。
- 无占位:各任务均含真实代码/命令;字典转写以已提交的文案稿为唯一来源属确定性数据录入,非 TBD。
- 类型一致:SceneId/Dict/SceneCopy 在 Task 2/3 定义,Task 4–7 消费处签名一致;creed 为三词数组,组装规则在 Task 4 写明。
