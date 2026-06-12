"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api, fmtMoney } from "@/lib/format";

type Me = { id: string; name: string; email: string; cashBalance: number; lockedCash: number } | null;

const links = [
  { href: "/", label: "行情" },
  { href: "/otc", label: "OTC 挂牌" },
  { href: "/portfolio", label: "我的资产" },
];

export function Nav() {
  const pathname = usePathname();
  const router = useRouter();
  const [me, setMe] = useState<Me>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    api<Me>("/api/auth/me")
      .then(setMe)
      .catch(() => setMe(null))
      .finally(() => setLoaded(true));
  }, [pathname]);

  async function logout() {
    await api("/api/auth/logout", { method: "POST" });
    setMe(null);
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="border-b border-border bg-surface/70 backdrop-blur-xl supports-[backdrop-filter]:bg-surface/60 sticky top-0 z-20">
      <div className="max-w-7xl mx-auto px-5 h-12 flex items-center gap-6">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="text-accent text-lg">🌿</span>
          <span>Carbadia</span>
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          {links.map((l) => {
            const active = l.href === "/" ? pathname === "/" : pathname.startsWith(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`px-3 py-1.5 rounded-full transition-colors ${
                  active ? "bg-surface-2 text-foreground" : "text-muted hover:text-foreground"
                }`}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>
        <div className="ml-auto flex items-center gap-3 text-sm">
          {!loaded ? null : me ? (
            <>
              <div className="text-right hidden sm:block">
                <div className="text-xs text-muted">可用现金</div>
                <div className="tnum text-accent">¥{fmtMoney(me.cashBalance)}</div>
              </div>
              <div className="h-8 w-px bg-border hidden sm:block" />
              <span className="text-muted">{me.name}</span>
              <button onClick={logout} className="text-muted hover:text-down transition-colors">
                退出
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="text-muted hover:text-foreground">
                登录
              </Link>
              <Link
                href="/register"
                className="px-4 py-1.5 rounded-full bg-accent text-background font-medium hover:bg-accent-strong transition-colors"
              >
                注册
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
