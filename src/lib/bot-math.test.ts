import { describe, expect, it } from "vitest";
import { buildQuoteLevels, nextFair, shouldTake, takeQty } from "./bot-math";

const mid = () => 0.5; // 恒定中值随机源

describe("nextFair", () => {
  it("rng=0.5 且 last=anchor 时价格不变(噪声为0、无回归力)", () => {
    expect(nextFair(100, 100, mid)).toBe(100);
  });
  it("last 高于 anchor 时向下回归", () => {
    expect(nextFair(110, 100, mid)).toBeLessThan(110);
  });
  it("last 低于 anchor 时向上回归", () => {
    expect(nextFair(90, 100, mid)).toBeGreaterThan(90);
  });
  it("永远为正且保留两位小数", () => {
    const v = nextFair(0.02, 0.01, () => 0); // 最大向下噪声
    expect(v).toBeGreaterThan(0);
    expect(v).toBe(Math.round(v * 100) / 100);
  });
});

describe("buildQuoteLevels", () => {
  it("买档全部低于 fair, 卖档全部高于 fair, 各5档", () => {
    const { bids, asks } = buildQuoteLevels(100, mid);
    expect(bids).toHaveLength(5);
    expect(asks).toHaveLength(5);
    for (const b of bids) expect(b.price).toBeLessThan(100);
    for (const a of asks) expect(a.price).toBeGreaterThan(100);
  });
  it("数量在 10~200 吨之间, 价格两位小数", () => {
    const { bids, asks } = buildQuoteLevels(57.3, mid);
    for (const l of [...bids, ...asks]) {
      expect(l.quantity).toBeGreaterThanOrEqual(10);
      expect(l.quantity).toBeLessThanOrEqual(200);
      expect(l.price).toBe(Math.round(l.price * 100) / 100);
    }
  });
});

describe("shouldTake / takeQty", () => {
  it("rng<0.3 时吃单", () => {
    expect(shouldTake(() => 0.1)).toBe(true);
    expect(shouldTake(() => 0.5)).toBe(false);
  });
  it("吃单量在 10~80 吨", () => {
    expect(takeQty(() => 0)).toBe(10);
    expect(takeQty(() => 0.9999)).toBeLessThanOrEqual(80);
  });
});
