"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { type MouseEvent, useEffect, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { api } from "@/lib/format";
import { NumberTicker } from "@/components/anim/NumberTicker";
import { LanguageToggle } from "@/components/LanguageToggle";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useRatingTransition } from "@/components/rating/PixelTransition";
import { useLowPower } from "@/lib/useLowPower";
import { useT, useLang } from "@/lib/i18n";
import { tUserName } from "@/lib/data-i18n";

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
    rating: "CCRC",
    ratingFull: "Carbon Credit Rating Connoisseur",
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
    rating: "CCRC",
    ratingFull: "碳信用评级鉴赏家",
    portfolio: "我的资产",
    cash: "可用现金",
    logout: "退出",
    login: "登录",
    register: "注册",
  },
};

export function Nav() {
  const t = useT(DICT);
  const { lang } = useLang();
  const pathname = usePathname();
  const router = useRouter();
  const [me, setMe] = useState<Me>(null);
  const [loaded, setLoaded] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false); // 移动端汉堡菜单
  const [prevPath, setPrevPath] = useState(pathname);

  // 路由变化(浏览器前进/后退等)自动收起菜单 —— 渲染期状态调整,不走 effect
  if (prevPath !== pathname) {
    setPrevPath(pathname);
    setOpen(false);
  }
  const { enter } = useRatingTransition();
  const reduced = useReducedMotion();
  const low = useLowPower();

  // CCRC 导航点击特效:从点击处爆开一圈像素 → 品牌色覆盖 → 进入评级页(复用首页入口卡的转场)
  function ccrcEffect(e: MouseEvent) {
    if (reduced || low) return; // 减弱动效 / 低功耗(移动端):正常跳转,不放特效
    e.preventDefault();
    const cx = e.clientX;
    const cy = e.clientY;
    const points = Array.from({ length: 32 }, (_, i) => {
      const a = (i / 32) * Math.PI * 2;
      const r = 10 + Math.random() * 42;
      return { x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r };
    });
    enter({ points, click: { x: cx, y: cy } });
  }

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
      className={`sticky top-0 z-20 border-b transition-all duration-300 md:backdrop-blur-xl ${
        scrolled
          ? "border-border bg-surface/95 md:bg-surface/80 shadow-soft"
          : "border-border/60 bg-surface/90 md:bg-surface/60"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-5 h-14 md:h-12 flex items-center gap-3 md:gap-6">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight" onClick={() => setOpen(false)}>
          <span className="text-accent text-lg">🌿</span>
          <span>Carbadia</span>
          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-accent/10 text-accent border border-accent/20">
            {t.demo}
          </span>
        </Link>

        {/* 桌面:内联导航;手机隐藏,收进汉堡菜单 */}
        <nav className="hidden md:flex items-center gap-1 text-sm">
          {LINKS.map((l) => {
            const active = l.href === "/" ? pathname === "/" : pathname.startsWith(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                title={l.key === "rating" ? t.ratingFull : undefined}
                onClick={l.key === "rating" ? ccrcEffect : undefined}
                className="relative px-3 py-1.5 rounded-full"
              >
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

        <div className="ml-auto flex items-center gap-2 sm:gap-3 text-sm">
          <ThemeToggle />
          <LanguageToggle />
          {/* 桌面:账户/登录区 */}
          <div className="hidden md:flex items-center gap-3">
            {!loaded ? null : me ? (
              <>
                <div className="text-right hidden lg:block">
                  <div className="text-xs text-muted">{t.cash}</div>
                  <div className="tnum text-accent">
                    ¥<NumberTicker value={me.cashBalance} />
                  </div>
                </div>
                <div className="h-8 w-px bg-border hidden lg:block" />
                <span className="text-muted">{tUserName(me.name, lang)}</span>
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
          {/* 手机:汉堡按钮(≥44px 触控目标) */}
          <button
            type="button"
            className="md:hidden grid h-11 w-11 -mr-1.5 place-items-center rounded-full text-foreground hover:bg-surface-2 transition-colors"
            aria-label="Menu"
            aria-expanded={open}
            onClick={() => setOpen((o) => !o)}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
            </svg>
          </button>
        </div>
      </div>

      {/* 手机:展开式菜单 */}
      {open && (
        <nav className="md:hidden border-t border-border bg-surface px-4 py-2">
          {LINKS.map((l) => {
            const active = l.href === "/" ? pathname === "/" : pathname.startsWith(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                onClick={(e) => {
                  setOpen(false);
                  if (l.key === "rating") ccrcEffect(e);
                }}
                title={l.key === "rating" ? t.ratingFull : undefined}
                className={`flex items-center min-h-[44px] px-3 rounded-xl text-base transition-colors ${
                  active ? "bg-surface-2 text-foreground font-medium" : "text-muted hover:text-foreground"
                }`}
              >
                {t[l.key]}
              </Link>
            );
          })}
          <div className="h-px bg-border my-2" />
          {!loaded ? null : me ? (
            <>
              <div className="flex items-center justify-between min-h-[44px] px-3">
                <span className="text-muted">{tUserName(me.name, lang)}</span>
                <span className="tnum text-accent">
                  ¥<NumberTicker value={me.cashBalance} />
                </span>
              </div>
              <button
                onClick={() => {
                  setOpen(false);
                  logout();
                }}
                className="flex items-center min-h-[44px] w-full px-3 text-left text-down"
              >
                {t.logout}
              </button>
            </>
          ) : (
            <div className="flex gap-2 py-1">
              <Link
                href="/login"
                onClick={() => setOpen(false)}
                className="flex-1 min-h-[44px] flex items-center justify-center rounded-full border border-border text-foreground"
              >
                {t.login}
              </Link>
              <Link
                href="/register"
                onClick={() => setOpen(false)}
                className="flex-1 min-h-[44px] flex items-center justify-center rounded-full bg-accent text-background font-medium"
              >
                {t.register}
              </Link>
            </div>
          )}
        </nav>
      )}
    </header>
  );
}
