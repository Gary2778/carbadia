import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "cocoeco",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" dir="ltr">
      <body>{children}</body>
    </html>
  );
}
