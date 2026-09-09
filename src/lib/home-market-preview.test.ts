import { describe, expect, it } from "vitest";

type PreviewModule = typeof import("./home-market-preview");

async function loadPreviewModule(): Promise<PreviewModule | null> {
  const modulePath = "./home-market-preview";
  try {
    return (await import(modulePath)) as PreviewModule;
  } catch {
    return null;
  }
}

describe("selectHomeMarketPreview", () => {
  it("returns only the three highest-volume assets without mutating the base response order", async () => {
    const previewModule = await loadPreviewModule();
    expect(previewModule?.selectHomeMarketPreview, "home preview selector is missing").toBeTypeOf("function");
    if (!previewModule) return;

    const assets = [
      { symbol: "LOW", volume24h: 2 },
      { symbol: "HIGH", volume24h: 20 },
      { symbol: "MID", volume24h: 10 },
      { symbol: "FOURTH", volume24h: 4 },
    ];

    expect(previewModule.selectHomeMarketPreview(assets).map((asset) => asset.symbol)).toEqual(["HIGH", "MID", "FOURTH"]);
    expect(assets.map((asset) => asset.symbol)).toEqual(["LOW", "HIGH", "MID", "FOURTH"]);
  });
});
