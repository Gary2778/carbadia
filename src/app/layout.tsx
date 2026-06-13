import type { Metadata } from "next";
import "./globals.css";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { ToastProvider } from "@/components/anim/Toast";
import { MotionProvider } from "@/components/anim/MotionProvider";
import { PixelTransitionProvider } from "@/components/rating/PixelTransition";
import { LangProvider } from "@/lib/i18n";

export const metadata: Metadata = {
  title: "Carbadia · Carbon Credit Exchange",
  description: "Online carbon credit exchange — order-book matching and OTC listings",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <LangProvider>
          <MotionProvider>
            <ToastProvider>
              <PixelTransitionProvider>
                <Nav />
                <main className="flex-1 w-full max-w-7xl mx-auto px-5 py-8">{children}</main>
                <Footer />
              </PixelTransitionProvider>
            </ToastProvider>
          </MotionProvider>
        </LangProvider>
      </body>
    </html>
  );
}
