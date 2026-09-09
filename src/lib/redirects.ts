// 双区重构的旧址→新址映射。next.config.ts 与测试共用这张表,
// 保证"配置里生效的"和"测试里断言的"永远是同一份。
// Next 16 无 301:permanent: true → 308(永久,保留请求方法),对 GET 页面等价。
export const LEGACY_REDIRECTS = [
  { source: "/otc", destination: "/exchange/otc", permanent: true },
  { source: "/portfolio", destination: "/exchange/portfolio", permanent: true },
  { source: "/market/:symbol", destination: "/exchange/market/:symbol", permanent: true },
  { source: "/real", destination: "/observatory/data", permanent: true },
  { source: "/rating", destination: "/observatory/rating", permanent: true },
];
