import type { Metadata } from "next";
import "./globals.css";
import { Nav } from "@/components/Nav";
import { ToastProvider } from "@/components/anim/Toast";
import { MotionProvider } from "@/components/anim/MotionProvider";

export const metadata: Metadata = {
  title: "Carbadia · 碳信用交易所",
  description: "在线碳信用交易所 — 订单簿撮合与 OTC 挂牌",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <MotionProvider>
          <ToastProvider>
            <Nav />
            <main className="flex-1 w-full max-w-7xl mx-auto px-5 py-8">{children}</main>
            <footer className="border-t border-border text-muted text-xs text-center py-6">
              Carbadia · 碳信用交易所 · carbadia.io — 仅供演示, 非真实交易
            </footer>
          </ToastProvider>
        </MotionProvider>
      </body>
    </html>
  );
}
