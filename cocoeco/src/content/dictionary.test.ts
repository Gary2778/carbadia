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

  it("口号三联句只存于 common.creed 一处,词典其他值不得重复整句", () => {
    expect(zh.common.creed).toEqual(["被看见", "被定价", "被认领"]);
    const textWithoutCreed = JSON.stringify(
      { ...zh, common: { ...zh.common, creed: [] } },
      (_k, v) => (typeof v === "function" ? "" : v),
    );
    expect(textWithoutCreed).not.toMatch(/被看见[。、,]?被定价[。、,]?被认领/);
    // 前两词为口号专用词,不应散落;"被认领"允许在叙事中单独使用
    expect(textWithoutCreed).not.toContain("被看见");
    expect(textWithoutCreed).not.toContain("被定价");
  });

  it("免责声明单点存储(全文只出现一次)", () => {
    const t = wholeText();
    expect(t.split(zh.common.disclaimer).length).toBe(2);
    expect(t.split(zh.common.ratingDisclaimer).length).toBe(2);
  });

  it("每幕旁白与菜单名非空", () => {
    for (const id of SCENES) {
      expect(zh.scenes[id].menuName.trim()).not.toBe("");
      expect(zh.scenes[id].narration.length).toBeGreaterThan(0);
      for (const line of zh.scenes[id].narration) expect(line.trim()).not.toBe("");
    }
  });

  it("市场幕计数为复数安全函数", () => {
    const f = zh.scenes.market.claimedCount!;
    expect(f(3)).toContain("3");
  });

  it("占位内容带 placeholder 标记", () => {
    expect(zh.scenes.camp.team!.length).toBeGreaterThan(0);
    expect(zh.scenes.camp.team!.every((m) => m.placeholder)).toBe(true);
    expect(zh.scenes.camp.actions!.length).toBeGreaterThan(0);
    expect(zh.scenes.camp.actions!.every((a) => a.placeholder)).toBe(true);
  });

  it("箭头符号不入词典(由组件渲染)", () => {
    expect(wholeText()).not.toContain("→");
  });
});
