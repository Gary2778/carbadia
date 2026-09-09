import { describe, expect, it } from "vitest";
import { LEGACY_REDIRECTS } from "./redirects";

// 旧地址一条都不能漏:漏一条 = 已发出去的外链 404。
describe("旧地址重定向表", () => {
  const bySource = new Map(LEGACY_REDIRECTS.map((r) => [r.source, r]));
  it.each([
    ["/otc", "/exchange/otc"],
    ["/portfolio", "/exchange/portfolio"],
    ["/market/:symbol", "/exchange/market/:symbol"],
    ["/real", "/observatory/data"],
    ["/rating", "/observatory/rating"],
  ])("%s → %s", (source, destination) => {
    const r = bySource.get(source);
    expect(r, `缺少 ${source} 的重定向`).toBeDefined();
    expect(r!.destination).toBe(destination);
    expect(r!.permanent).toBe(true); // Next 16: permanent=true 发 308(永久)
  });
  it("没有多余条目(共 5 条)", () => {
    expect(LEGACY_REDIRECTS).toHaveLength(5);
  });
});
