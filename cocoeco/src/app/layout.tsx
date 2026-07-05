import type { Metadata } from "next";
import { I18nProvider } from "@/i18n/I18nProvider";
import { dictionary } from "@/content/dictionary";
import "./globals.css";

const zh = dictionary.zh;

export const metadata: Metadata = {
  title: zh.meta.titleBase,
  description:
    zh.meta.descriptionParts[0] +
    zh.common.creed.join("、") +
    zh.meta.descriptionParts[1],
  // metadataBase:部署时补(占位见 spec §6)
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" dir="ltr">
      <body>
        <I18nProvider>{children}</I18nProvider>
      </body>
    </html>
  );
}
