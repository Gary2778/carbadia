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

type LinkKey = "markets" | "otc" | "portfolio" | "obsOverview" | "obsData" | "rating" | "obsArticles";
type Zone = "exchange" | "observatory" | "studio";
const ZONE_LINKS: Record<Zone, { href: string; key: LinkKey }[]> = {
  exchange: [
    { href: "/exchange", key: "markets" },
    { href: "/exchange/otc", key: "otc" },
    { href: "/exchange/portfolio", key: "portfolio" },
  ],
  observatory: [
    { href: "/observatory", key: "obsOverview" },
    { href: "/observatory/data", key: "obsData" },
    { href: "/observatory/rating", key: "rating" },
    { href: "/observatory/articles", key: "obsArticles" },
  ],
  studio: [],
};
// 区落地页要求精确匹配,否则 /exchange 会在所有子页常亮;
// 但行情详情页(/exchange/market/*)语义上仍属"行情",所以 /exchange 额外接受该前缀
const isActive = (href: string, pathname: string) =>
  href === "/exchange"
    ? pathname === "/exchange" || ["market", "projects", "watchlist", "research", "learn"].some((page) => pathname.startsWith(`/exchange/${page}`))
    : href === "/exchange/portfolio"
      ? ["portfolio", "dashboard", "orders", "retirement", "transactions", "account"].some((page) => pathname.startsWith(`/exchange/${page}`))
    : href === "/observatory"
      ? pathname === href
      : pathname.startsWith(href);
const zoneOf = (pathname: string): Zone | null =>
  pathname.startsWith("/exchange") ? "exchange" : pathname.startsWith("/observatory") ? "observatory" : pathname === "/studio" || pathname.startsWith("/studio/") ? "studio" : null;

export function Nav({ hasArticles }: { hasArticles: boolean }) {
  const t = useT("nav");
  const { lang } = useLang();
  const pathname = usePathname();
  const zone = zoneOf(pathname);
  // 一篇文章都没有时不挂文章入口 —— 空栏目不进导航。有了第一篇就自动出现。
  const linksFor = (z: Zone) => ZONE_LINKS[z].filter((l) => l.key !== "obsArticles" || hasArticles);
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
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return; // 新标签页等默认行为放行
    e.preventDefault();
    let cx = e.clientX;
    let cy = e.clientY;
    // 键盘回车触发的 click 无坐标:退化为从链接中心爆开
    if (!cx && !cy) {
      const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
      cx = r.x + r.width / 2;
      cy = r.y + r.height / 2;
    }
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
          <span className="hidden min-[360px]:inline-flex text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-accent/10 text-accent border border-accent/20">
            {t.demo}
          </span>
        </Link>

        {/* 桌面:切换器 + 分区导航;手机隐藏,收进汉堡菜单 */}
        <div className="hidden md:flex items-center gap-3 text-sm min-w-0">
          {/* 常驻产品入口 */}
          <div className="flex items-center rounded-full border border-border p-0.5 text-xs shrink-0">
            {(["exchange", "observatory", "studio"] as const).map((z) => (
              <Link
                key={z}
                href={`/${z}`}
                aria-current={zone === z ? "page" : undefined}
                className={`px-3 py-1 rounded-full transition-colors ${
                  zone === z ? "bg-accent text-background font-medium" : "text-muted hover:text-foreground"
                }`}
              >
                {z === "exchange" ? t.zoneExchange : z === "observatory" ? t.zoneObservatory : "Studio"}
              </Link>
            ))}
          </div>
          <nav className="hidden xl:flex items-center gap-1">
            {(zone ? linksFor(zone) : []).map((l) => {
              const active = isActive(l.href, pathname);
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  title={l.key === "rating" ? t.ratingFull : undefined}
                  onClick={l.key === "rating" ? ccrcEffect : undefined}
                  aria-current={active ? "page" : undefined}
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
        </div>

        <div className="ms-auto flex items-center gap-2 sm:gap-3 text-sm">
          <ThemeToggle />
          <LanguageToggle />
          {/* 桌面:账户/登录区 */}
          <div className="hidden xl:flex items-center gap-3">
            {!loaded ? null : me ? (
              <>
                <div className="text-end hidden lg:block">
                  <div className="text-xs text-muted">{t.cash}</div>
                  <div className="tnum text-accent">
                    $<NumberTicker value={me.cashBalance} />
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
                <Link href={`/login?returnTo=${encodeURIComponent(pathname)}`} className="text-muted hover:text-foreground">
                  {t.login}
                </Link>
                <Link
                  href={`/register?returnTo=${encodeURIComponent(pathname)}`}
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
            className="xl:hidden grid h-11 w-11 place-items-center rounded-full text-foreground hover:bg-surface-2 transition-colors"
            aria-label={t.menu}
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
        <nav className="xl:hidden border-t border-border bg-surface px-4 py-2">
          {(["exchange", "observatory"] as const).map((z) => (
            <div key={z}>
              <div className="px-3 pt-2 pb-1 text-xs text-muted">{z === "exchange" ? t.zoneExchange : t.zoneObservatory}</div>
              {linksFor(z).map((l) => {
                const active = isActive(l.href, pathname);
                return (
                  <Link
                    key={l.href}
                    href={l.href}
                    onClick={(e) => {
                      setOpen(false);
                      if (l.key === "rating") ccrcEffect(e);
                    }}
                    title={l.key === "rating" ? t.ratingFull : undefined}
                    aria-current={active ? "page" : undefined}
                    className={`flex items-center min-h-[44px] px-3 rounded-xl text-base transition-colors ${
                      active ? "bg-surface-2 text-foreground font-medium" : "text-muted hover:text-foreground"
                    }`}
                  >
                    {t[l.key]}
                  </Link>
                );
              })}
            </div>
          ))}
          <Link href="/studio" onClick={() => setOpen(false)} aria-current={zone === "studio" ? "page" : undefined} className={`flex min-h-[44px] items-center px-3 rounded-xl text-base ${zone === "studio" ? "bg-surface-2 text-foreground font-medium" : "text-muted hover:text-foreground"}`}>
            Carbadia Studio
          </Link>
          <div className="h-px bg-border my-2" />
          {!loaded ? null : me ? (
            <>
              <div className="flex items-center justify-between min-h-[44px] px-3">
                <span className="text-muted">{tUserName(me.name, lang)}</span>
                <span className="tnum text-accent">
                  $<NumberTicker value={me.cashBalance} />
                </span>
              </div>
              <button
                onClick={() => {
                  setOpen(false);
                  logout();
                }}
                className="flex items-center min-h-[44px] w-full px-3 text-start text-down"
              >
                {t.logout}
              </button>
            </>
          ) : (
            <div className="flex gap-2 py-1">
              <Link
                href={`/login?returnTo=${encodeURIComponent(pathname)}`}
                onClick={() => setOpen(false)}
                className="flex-1 min-h-[44px] flex items-center justify-center rounded-full border border-border text-foreground"
              >
                {t.login}
              </Link>
              <Link
                href={`/register?returnTo=${encodeURIComponent(pathname)}`}
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
