import type { Metadata } from "next";
import { ExchangeSectionNav } from "@/components/exchange/ExchangeSectionNav";
import "./exchange.css";

export const metadata: Metadata = {
  title: "Exchange",
  description:
    "Understand, compare, trade and retire simulated carbon credits. Transparent project information, portfolio management and carbon-market learning.",
};

export default function ExchangeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="exchange-content">
      <ExchangeSectionNav />
      {children}
    </div>
  );
}
