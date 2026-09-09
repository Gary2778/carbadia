"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useExchangeText } from "./useExchange";

const accountLinks = [
  ["/exchange/portfolio", "Holdings", "持倉"],
  ["/exchange/orders", "Orders", "訂單"],
  ["/exchange/retirement", "Retirement", "註銷"],
  ["/exchange/transactions", "Transactions", "資產流水"],
  ["/exchange/account", "Account", "帳戶"],
] as const;
const discoveryLinks = [
  ["/exchange/projects", "Projects", "項目"],
  ["/exchange/watchlist", "Watchlist", "關注清單"],
  ["/exchange/research", "Market data", "市場資料"],
  ["/exchange/learn", "Learn", "學習"],
] as const;

/** Secondary pages stay within the original Markets / OTC / Portfolio structure. */
export function ExchangeSectionNav() {
  const path = usePathname();
  const c = useExchangeText();
  const account =
    accountLinks.some(([href]) => href === path) ||
    path === "/exchange/dashboard";
  const discovery = discoveryLinks.some(([href]) => href === path);
  if (path === "/exchange/portfolio" || (!account && !discovery)) return null;
  return (
    <nav className="ex-section-nav" aria-label={c("Related pages", "相關頁面")}>
      <Link
        className="ex-section-back"
        href={account ? "/exchange/portfolio" : "/exchange"}
      >
        ← {account ? c("Portfolio", "資產組合") : c("Markets", "市場")}
      </Link>
      {(account ? accountLinks : discoveryLinks).map(([href, en, zh]) => (
        <Link
          key={href}
          href={href}
          aria-current={href === path ? "page" : undefined}
        >
          {c(en, zh)}
        </Link>
      ))}
    </nav>
  );
}
