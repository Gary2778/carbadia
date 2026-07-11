import { describe, expect, it } from "vitest";
import { clientIp, rateLimit } from "./rate-limit";

describe("rateLimit", () => {
  it("窗口内放行至 limit 次,超出拒绝", () => {
    const t0 = 1_000_000;
    for (let i = 0; i < 5; i++) expect(rateLimit("k1", 5, 60_000, t0 + i)).toBe(true);
    expect(rateLimit("k1", 5, 60_000, t0 + 10)).toBe(false);
  });
  it("窗口滑动后重新放行", () => {
    const t0 = 2_000_000;
    for (let i = 0; i < 3; i++) rateLimit("k2", 3, 1_000, t0);
    expect(rateLimit("k2", 3, 1_000, t0 + 500)).toBe(false);
    expect(rateLimit("k2", 3, 1_000, t0 + 1_001)).toBe(true);
  });
  it("key 之间互不影响", () => {
    const t0 = 3_000_000;
    rateLimit("a", 1, 1_000, t0);
    expect(rateLimit("b", 1, 1_000, t0)).toBe(true);
  });
});

describe("clientIp", () => {
  it("取 x-forwarded-for 最后一个 IP(离服务器最近的代理追加,非客户端可伪造)", () => {
    const req = new Request("http://x", { headers: { "x-forwarded-for": "1.2.3.4, 10.0.0.1" } });
    expect(clientIp(req)).toBe("10.0.0.1");
  });
  it("cf-connecting-ip 优先于 x-forwarded-for", () => {
    const req = new Request("http://x", {
      headers: { "cf-connecting-ip": "5.6.7.8", "x-forwarded-for": "1.2.3.4, 10.0.0.1" },
    });
    expect(clientIp(req)).toBe("5.6.7.8");
  });
  it("无头时回退 local", () => {
    expect(clientIp(new Request("http://x"))).toBe("local");
  });
});
