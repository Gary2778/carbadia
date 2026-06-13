# 主页像素评级入口 + 碳信用评级页 — 设计文档

日期: 2026-06-14
状态: 交互经浏览器实景 mockup 反复打磨、用户已确认（"很好,加到 Carbadia 里"）。

## 1. 目标

在 Carbadia 主页放一个"独家碳信用评级服务"的入口。它不是普通按钮，而是一段**会形变的像素文字**：

1. **静止** — 普通网页字体的"碳信用评级"（平滑矢量字，完全不像素）。
2. **悬停** — 文字发散、重组成英文 **CARBON RATING** 的像素字，并轻轻"呼吸"；像素随**指针移动**实时反应（光标附近的像素外凸、发亮，形成跟随光标的涟漪）。
3. **点击** — 像素**冲向屏幕、由小变大铺满整个视口**（扑面遮屏），完全遮住后**丝滑溶解**，露出底下的碳信用评级页。

## 2. 关键技术决策

- **像素来自 canvas 采样，不用像素字体**：把"碳信用评级"和"CARBON RATING"用系统字体（PingFang/系统无衬线）画到离屏 canvas，按网格采样 alpha>阈值的点 → 像素方块。好处：① 中文也能像素化（经典 8-bit 字体没有中文）；② 视觉干净可控、不依赖任何字体文件（之前 mockup 里的现成像素字"很丑"，弃用）。
- **跨路由转场用全局覆盖层**：点击发生在主页，评级页是独立路由 `/rating`。绿色像素遮罩必须**跨导航存活**，否则会闪白。因此转场画布放在**根 layout**（`PixelTransitionProvider`），通过 context 协调：遮满 → `router.push('/rating')` → 新页挂载后再揭开。View Transitions API 无法表达这种自定义像素效果，故自建覆盖层。
- **降级**：`prefers-reduced-motion` 时，入口退化为普通 `<Link href="/rating">`（静态绿色文字"碳信用评级"），无形变、无转场，直接跳转。复用已全局生效的 `MotionConfig reducedMotion="user"` 思路，但 canvas 动画需自行判断 `useReducedMotion()`。
- **性能**：入口 canvas 的 rAF 在标签页隐藏时暂停；转场画布仅在转场期间跑 rAF，结束即停。

## 3. 组件与文件

### 3.1 `src/components/rating/PixelMorphEntry.tsx`（客户端）
主页入口本体。一个 canvas：
- 渲染静止中文 → 悬停形变为呼吸像素英文（含光标反应：半径 ~104px 内像素朝光标外凸 ~18px、变亮 GLOW）。
- 采样逻辑、curPos/morph 与 mockup `transition.html` 一致（GAP=8、SQ=6、绿 `#0a8a52`/亮绿 `#16d97f`）。
- 点击：收集当前像素的**视口坐标**与点击点，调用 `useRatingTransition().enter({ points, color, click })`；随后由覆盖层接管。
- `useReducedMotion()` 为真：直接渲染一个普通 `<Link href="/rating">` 文本入口，不挂 canvas。
- 标签页隐藏时暂停 rAF。

### 3.2 `src/components/rating/PixelTransition.tsx`（客户端，Provider + 覆盖层）
- `PixelTransitionProvider`：根 layout 内挂一个 `position:fixed; inset:0; z-index:80; pointer-events:none` 的全屏 canvas；提供 context。
- `useRatingTransition()` → `{ enter(origin) }`。`enter`：
  - phase `rush`：用传入的像素点作为起点，向外加速飞行 + 逐帧放大（扑向镜头），同时绿色整屏填充 alpha 0→1；约 520ms。
  - 遮满 → phase `cover`（纯绿，约 180ms），并立即 `router.push('/rating')`。
  - 保持绿色覆盖直到揭开。
- `useRatingReveal()`：`/rating` 页挂载时调用 → phase `reveal`：把整屏切成 ~22px 网格，按自上而下 + 随机延迟逐格下沉淡出（缓动，丝滑），约 720ms → phase `idle`，停 rAF。
- 守卫：直接访问 `/rating`（无转场）时 `reveal` 为 no-op（仅当处于 cover 态才揭开）。
- 降级：reduced-motion 时 `enter` 直接 `router.push('/rating')`，不放动画。

### 3.3 `src/app/rating/page.tsx`（评级服务页）
Apple 干净风（与主页一致），挂载时调用 `useRatingReveal()`。内容（均为**演示性示例**，页面标注"示例评级,仅供演示"）：
- 标题 **碳信用评级服务** + 像素感英文小标 `CARBON CREDIT RATING` + 导语。
- **八档评级阶梯** AAA→D，深绿到红的色阶 chips。
- **四个评估维度**卡片：额外性 Additionality / 永久性 Permanence / 重复计算 Double-counting / 协同效益 Co-benefits（真实评级机构采用的维度）。
- **示例已评项目**：复用种子资产名给出示例评级（云南森林经营碳汇 A、印尼红树林蓝碳 AA、青海光伏 BBB、巴西垃圾填埋气 BB…），右侧 grade 徽标。
- 底部 CTA：返回交易所 / 说明这是模拟服务。
- 纯静态，不新增 API/DB。入场分区用 `Reveal`。

### 3.4 接线
- `src/app/layout.tsx`：在 `ToastProvider` 内层包 `PixelTransitionProvider`（覆盖层需在所有页面之上、跨路由存活）。
- `src/app/page.tsx`：粒子 hero 与"现货行情"之间插入一个 `独家服务` 分区，居中放 `PixelMorphEntry`，配一行小字（如"独立碳信用评级 · 悬停唤醒 · 点击进入"）。
- `src/components/Nav.tsx`：导航增加一个低调的"评级"链接指向 `/rating`，便于落地页直接访问（不抢主页像素入口的戏）。

## 4. 错误处理 / 边界
- canvas 上下文取不到、尺寸为 0：入口安全降级为普通链接。
- 转场过程中重复点击：`enter` 在非 `idle` 态直接忽略。
- 路由已在 `/rating` 时点入口：仍触发转场再 push（Next 对同路由 push 幂等，reveal 正常播放）——可接受。
- SSR/水合：两个组件均 `"use client"`；canvas 仅在 effect 内初始化，无水合不匹配。

## 5. 测试与验证
- 无新增纯逻辑（采样/动画是视觉的，不单测）；保持现有 `npm test` 14/14、`tsc`、`build` 绿。
- 浏览器实测（preview）：静止中文 → 悬停形变+光标涟漪 → 点击扑面遮屏 → 跳转 `/rating` 且丝滑揭开；`/rating` 内容渲染；reduced-motion 降级为普通链接直达；移动端窄屏不溢出；标签页切走 rAF 暂停。

## 6. 非目标
- 不做真实评级数据/算法、不接数据库、不做评级详情子页、不做评级 API。示例评级为静态演示。
