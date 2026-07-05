import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EmailForm } from "./EmailForm";
import { I18nProvider } from "@/i18n/I18nProvider";
import { dictionary } from "@/content/dictionary";

const form = dictionary.zh.scenes.camp.form!;

function renderForm() {
  render(
    <I18nProvider>
      <EmailForm />
    </I18nProvider>,
  );
}

describe("EmailForm", () => {
  it("非法邮箱显示格式错误文案", () => {
    renderForm();
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "不是邮箱" } });
    fireEvent.click(screen.getByRole("button", { name: form.button }));
    expect(screen.getByText(form.invalid)).toBeTruthy();
  });

  it("合法邮箱提交后显示成功文案", async () => {
    renderForm();
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "a@b.co" } });
    fireEvent.click(screen.getByRole("button", { name: form.button }));
    expect(await screen.findByText(form.success)).toBeTruthy();
  });

  it("隐私小字常显", () => {
    renderForm();
    expect(screen.getByText(form.privacy)).toBeTruthy();
  });
});
