import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TopNav } from "./TopNav";
import { I18nProvider } from "@/i18n/I18nProvider";
import { dictionary } from "@/content/dictionary";
import { SCENES } from "@/scenes/registry";

describe("TopNav", () => {
  it("菜单含全部 10 幕且锚点正确", () => {
    render(
      <I18nProvider>
        <TopNav />
      </I18nProvider>,
    );
    for (const id of SCENES) {
      const item = screen.getByRole("link", {
        name: dictionary.zh.scenes[id].menuName,
      });
      expect(item.getAttribute("href")).toBe(`#${id}`);
    }
  });

  it("包含品牌与去交易所 CTA", () => {
    render(
      <I18nProvider>
        <TopNav />
      </I18nProvider>,
    );
    expect(
      screen.getByRole("link", { name: dictionary.zh.ui.brand }),
    ).toBeTruthy();
    const cta = screen.getByRole("link", { name: new RegExp(dictionary.zh.ui.topCta) });
    expect(cta.getAttribute("href")).toContain("carbadia.io");
  });
});
