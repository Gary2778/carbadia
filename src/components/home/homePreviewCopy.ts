// 首版首页视觉预览的英文文案集中在这里，避免临时原型污染 15 语言的 Messages 结构。
// 视觉方向确认后，这些字段应迁入 src/i18n/messages/* 的 home 命名空间。
export const homePreviewCopy = {
  productArea: {
    ariaLabel: "Carbadia products",
    label: "Three core capabilities · Open access",
    summary: "Explore markets, evidence and what Carbadia builds. Pro brings all three into your own workspace.",
    bridge: "Exchange + Observatory + Studio → your decision workspace",
  },
  exchange: {
    eyebrow: "MARKET / CARBADIA EXCHANGE",
    title: "Carbadia Exchange",
    klineLabel: "5m candlestick chart",
    klineEmptyLabel: "no simulated 5-minute trades",
  },
  observatory: {
    eyebrow: "RESEARCH / CARBADIA OBSERVATORY",
    title: "Carbadia Observatory",
  },
  studio: {
    eyebrow: "BUILD / CARBADIA STUDIO",
    title: "Carbadia Studio",
    description: "Explore future carbon dioxide removal technologies, renewable synthetic fuels and chemical process development.",
    status: "Seeking initial investment",
    visual: {
      system: "TECHNOLOGY DEVELOPMENT",
      modules: [
        ["CO₂ REMOVAL", "Research"],
        ["FUELS & CHEMICALS", "Explore"],
        ["PARTNERSHIPS", "Build"],
      ],
    },
  },
  pro: {
    eyebrow: "PROFESSIONAL LAYER",
    title: "Carbadia Pro",
    tagline: "Advanced intelligence for carbon decisions.",
    status: "In development",
    sources: ["Exchange", "Observatory", "Studio"],
    preview: {
      flowLabel: "THREE SOURCES / ONE WORKSPACE",
      conceptLabel: "CONCEPT PREVIEW",
      workspaceMark: "C",
      workspaceTitle: "Custom workspace",
      workspaceState: "CONCEPT / NOT LIVE",
    },
    capabilities: [
      "AI Decision Support",
      "Project & Portfolio Financial Analysis",
      "Custom Workspace",
      "Analyst Services",
    ],
  },
} as const;
