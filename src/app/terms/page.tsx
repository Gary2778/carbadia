import type { Metadata } from "next";

export const metadata: Metadata = { title: "Terms of Service · Carbadia" };

const SECTIONS: [string, string][] = [
  ["1. What Carbadia is", "Carbadia is a demonstration and simulation platform for carbon-credit trading. It holds no financial license and conducts no real trading, clearing, or settlement. All instruments, prices, and market data are fictional. No real funds or carbon assets are ever involved."],
  ["2. Demo funds and accounts", "Balances shown on Carbadia (including the $100,000 granted at sign-up) are simulated numbers with no monetary value. They cannot be deposited, withdrawn, redeemed, or transferred outside the simulation. Accounts may be reset or removed as part of operating the demo."],
  ["3. No advice", "Nothing on this site constitutes investment, financial, legal, or tax advice. Ratings shown by the CCRC demo are illustrative samples, not assessments of real projects."],
  ["4. Third-party names", "Verra, Gold Standard, UNFCCC, CCER and other standard or registry names are referenced for demonstration only. Carbadia is not affiliated with, endorsed by, or connected to any of these organizations."],
  ["5. Acceptable use", "Do not abuse the service (automated scraping beyond reasonable use, attacks, attempts to disrupt the simulation). We may suspend accounts that do."],
  ["6. Availability and data", "The service is provided as-is, with no uptime or data-retention guarantees. Simulated trading history may be pruned as part of routine maintenance."],
  ["7. Changes", "These terms may change as the product evolves; the version published at carbadia.io/terms applies."],
  ["8. Contact", "Questions: hello@carbadia.io."],
];

export default function TermsPage() {
  return (
    <article className="max-w-2xl mx-auto py-8 space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Terms of Service</h1>
        <p className="text-muted text-xs mt-2">Last updated: 2026-07 · The English version is canonical.</p>
      </header>
      {SECTIONS.map(([h, body]) => (
        <section key={h}>
          <h2 className="font-semibold text-sm mb-1">{h}</h2>
          <p className="text-muted text-sm leading-relaxed">{body}</p>
        </section>
      ))}
    </article>
  );
}
