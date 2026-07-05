import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SceneSection } from "./SceneSection";
import { parseEmphasis } from "./emphasis";

describe("SceneSection", () => {
  it("渲染锚点、标题与旁白,并解析 ** 强调", () => {
    render(
      <SceneSection id="city" seoTitle="测试标题" narration={["第一行", "有**重点**的行"]} />,
    );
    const section = document.getElementById("city")!;
    expect(section).toBeTruthy();
    expect(section.getAttribute("aria-labelledby")).toBe("city-title");
    expect(screen.getByText("测试标题").id).toBe("city-title");
    expect(screen.getByText("第一行")).toBeTruthy();
    expect(screen.getByText("重点").tagName).toBe("STRONG");
  });
});

describe("parseEmphasis", () => {
  it("成对 ** 转为 strong,无标记原样返回", () => {
    expect(parseEmphasis("普通文本")).toEqual(["普通文本"]);
    const parts = parseEmphasis("前**中**后");
    expect(parts).toHaveLength(3);
  });

  it("不成对的 ** 原样保留", () => {
    expect(parseEmphasis("孤立**符号")).toEqual(["孤立**符号"]);
  });
});
