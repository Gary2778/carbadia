import type { Metadata } from "next";
import "./globals.css";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { ToastProvider } from "@/components/anim/Toast";
import { MotionProvider } from "@/components/anim/MotionProvider";
import { PixelTransitionProvider } from "@/components/rating/PixelTransition";
import { LangProvider } from "@/lib/i18n";
import { ThemeProvider } from "@/lib/theme";
import { StarrySky } from "@/components/StarrySky";
import { TrackPageviews } from "@/components/TrackPageviews";
import { listArticles } from "@/lib/articles";

export const metadata: Metadata = {
  metadataBase: new URL("https://carbadia.io"),
  title: { default: "Carbadia · Carbon Market Simulator & Observatory", template: "%s · Carbadia" },
  description:
    "A carbon-market simulator with a real order-book engine, plus an observatory of real market data, retirement tracking, and the Carbadia Observatory journal.",
  openGraph: {
    siteName: "Carbadia",
    type: "website",
    url: "https://carbadia.io",
  },
  twitter: { card: "summary_large_image" },
};

// 首帧绘制前按 localStorage 纠正主题，避免深/浅闪烁（默认浅色）
const THEME_INIT = `(function(){try{var t=localStorage.getItem("carbadia-theme");if(t!=="light"&&t!=="dark")t="light";document.documentElement.setAttribute("data-theme",t);document.documentElement.style.colorScheme=t;}catch(e){}})()`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  // 一篇文章都没有时,文章栏目的所有入口自动隐藏(见 Nav / ObservatoryHome / ObservatoryEntryCard)。
  // 放第一篇进 content/articles/ 并重新构建,入口自己回来——不需要手动开关。
  const hasArticles = listArticles().length > 0;
  return (
    <html lang="en" data-theme="light" className="h-full antialiased" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT }} />
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <ThemeProvider>
          <LangProvider>
            <MotionProvider>
              <ToastProvider>
                <PixelTransitionProvider>
                  <StarrySky />
                  <TrackPageviews />
                  <Nav hasArticles={hasArticles} />
                  <main className="flex-1 w-full max-w-7xl mx-auto px-5 py-8">{children}</main>
                  <Footer />
                </PixelTransitionProvider>
              </ToastProvider>
            </MotionProvider>
          </LangProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
