import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { StageOverlay } from "./StageOverlay";
import { dictionary } from "@/content/dictionary";

const zh = dictionary.zh;
const noop = () => null;

describe("StageOverlay", () => {
  it("awaitTrace:显示痕迹按钮(hintTrace 文案),点击派发 TRACE_CLICKED", () => {
    const dispatch = vi.fn();
    render(
      <StageOverlay
        state="awaitTrace"
        dict={zh}
        dispatch={dispatch}
        project={() => ({ x: 100, y: 100, inFront: true })}
      />,
    );
    const btn = screen.getByRole("button", { name: zh.ui.hintTrace });
    fireEvent.click(btn);
    expect(dispatch).toHaveBeenCalledWith("TRACE_CLICKED");
  });

  it("explore:渲染 4 个热点按钮与窗口推进按钮", () => {
    render(
      <StageOverlay
        state="explore"
        dict={zh}
        dispatch={vi.fn()}
        project={() => ({ x: 100, y: 100, inFront: true })}
      />,
    );
    expect(screen.getAllByTestId("hotspot")).toHaveLength(4);
    expect(screen.getByTestId("advance-window")).toBeTruthy();
  });

  it("explore:点热点弹出对应知识卡", () => {
    render(
      <StageOverlay
        state="explore"
        dict={zh}
        dispatch={vi.fn()}
        project={() => ({ x: 100, y: 100, inFront: true })}
      />,
    );
    fireEvent.click(screen.getAllByTestId("hotspot")[0]);
    expect(screen.getByText(zh.scenes.bedroom.cards![0].title)).toBeTruthy();
  });

  it("explore:滚轮触发 GESTURE_ADVANCE", () => {
    const dispatch = vi.fn();
    render(
      <StageOverlay
        state="explore"
        dict={zh}
        dispatch={dispatch}
        project={noop}
      />,
    );
    fireEvent.wheel(window, { deltaY: 120 });
    expect(dispatch).toHaveBeenCalledWith("GESTURE_ADVANCE");
  });

  it("loading:显示加载文案", () => {
    render(<StageOverlay state="loading" dict={zh} dispatch={vi.fn()} project={noop} />);
    expect(screen.getByText(zh.ui.loading)).toBeTruthy();
  });

  it("project 返回 null 时热点不渲染", () => {
    render(<StageOverlay state="explore" dict={zh} dispatch={vi.fn()} project={noop} />);
    expect(screen.queryAllByTestId("hotspot")).toHaveLength(0);
  });
});
