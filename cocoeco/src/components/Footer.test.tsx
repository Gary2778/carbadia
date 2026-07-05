import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { Footer } from "./Footer";
import { I18nProvider } from "@/i18n/I18nProvider";
import { dictionary } from "@/content/dictionary";

it("页脚渲染版权与唯一来源的免责声明", () => {
  render(
    <I18nProvider>
      <Footer />
    </I18nProvider>,
  );
  expect(screen.getByText(dictionary.zh.footer.rights)).toBeTruthy();
  expect(screen.getByText(dictionary.zh.common.disclaimer)).toBeTruthy();
});
