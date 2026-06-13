"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { api } from "@/lib/format";
import { NumberTicker } from "@/components/anim/NumberTicker";
import { LanguageToggle } from "@/components/LanguageToggle";
import { useT } from "@/lib/i18n";

type Me = { id: string; name: string; email: string; cashBalance: number; lockedCash: number } | null;

type LinkKey = "markets" | "otc" | "rating" | "portfolio";
const LINKS: { href: string; key: LinkKey }[] = [
  { href: "/", key: "markets" },
  { href: "/otc", key: "otc" },
  { href: "/rating", key: "rating" },
  { href: "/portfolio", key: "portfolio" },
];

const DICT = {
  en: {
    demo: "Demo",
    markets: "Markets",
    otc: "OTC",
    rating: "Ratings",
    portfolio: "Portfolio",
    cash: "Available cash",
    logout: "Log out",
    login: "Log in",
    register: "Sign up",
  },
  zh: {
    demo: "模拟盘",
    markets: "行情",
    otc: "OTC 挂牌",
    rating: "评级",
    portfolio: "我的资产",
    cash: "可用现金",
    logout: "退出",
    login: "登录",
    register: "注册",
  },
};

export function Nav() {
  const t = useT(DICT);
  const pathname = usePathname();
  const router = useRouter();
  const [me, setMe] = useState<Me>(null);
  const [loaded, setLoaded] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    api<Me>("/api/auth/me")
      .then(setMe)
      .catch(() => setMe(null))
      .finally(() => setLoaded(true));
  }, [pathname]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  async function logout() {
    await api("/api/auth/logout", { method: "POST" });
    setMe(null);
    router.push("/login");
    router.refresh();
  }

  return (
    <header
      className={`sticky top-0 z-20 border-b backdrop-blur-xl transition-all duration-300 ${
        scrolled ? "border-border bg-surface/80 shadow-soft" : "border-border/60 bg-surface/60"
      }`}
    >
      <div className="max-w-7xl mx-auto px-5 h-12 flex items-center gap-6">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="text-accent text-lg">🌿</span>
          <span>Carbadia</span>
          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-accent/10 text-accent border border-accent/20">
            {t.demo}
          </span>
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          {LINKS.map((l) => {
            const active = l.href === "/" ? pathname === "/" : pathname.startsWith(l.href);
            return (
              <Link key={l.href} href={l.href} className="relative px-3 py-1.5 rounded-full">
                {active && (
                  <motion.span
                    layoutId="nav-active"
                    className="absolute inset-0 bg-surface-2 rounded-full"
                    transition={{ type: "spring", stiffness: 380, damping: 32 }}
                  />
                )}
                <span className={`relative transition-colors ${active ? "text-foreground" : "text-muted hover:text-foreground"}`}>
                  {t[l.key]}
                </span>
              </Link>
            );
          })}
        </nav>
        <div className="ml-auto flex items-center gap-3 text-sm">
          <LanguageToggle />
          {!loaded ? null : me ? (
            <>
              <div className="text-right hidden sm:block">
                <div className="text-xs text-muted">{t.cash}</div>
                <div className="tnum text-accent">
                  ¥<NumberTicker value={me.cashBalance} />
                </div>
              </div>
              <div className="h-8 w-px bg-border hidden sm:block" />
              <span className="text-muted">{me.name}</span>
              <button onClick={logout} className="text-muted hover:text-down transition-colors">
                {t.logout}
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="text-muted hover:text-foreground">
                {t.login}
              </Link>
              <Link
                href="/register"
                className="px-4 py-1.5 rounded-full bg-accent text-background font-medium hover:bg-accent-strong transition-colors"
              >
                {t.register}
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
