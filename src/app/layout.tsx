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

export const metadata: Metadata = {
  title: "Carbadia · Carbon Credit Exchange",
  description: "Online carbon credit exchange — order-book matching and OTC listings",
};

// 首帧绘制前按 localStorage 纠正主题，避免深/浅闪烁（默认浅色）
const THEME_INIT = `(function(){try{var t=localStorage.getItem("carbadia-theme");if(t!=="light"&&t!=="dark")t="light";document.documentElement.setAttribute("data-theme",t);document.documentElement.style.colorScheme=t;}catch(e){}})()`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
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
                  <Nav />
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
