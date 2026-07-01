"use client";

import { ContactEmail } from "@/components/ContactEmail";
import { useT } from "@/lib/i18n";

export function Footer() {
  const t = useT({
    en: {
      brand: "Carbadia · Carbon Credit Exchange · carbadia.io",
      contact: "Interested in the project or a partnership? Reach us at ",
      disclaimer:
        "Demo / simulation platform. Carbadia holds no financial license and conducts no real trading, clearing, or settlement. All instruments, quotes, and market data shown are fictional and for demonstration only — no real funds or carbon assets are involved. Nothing on this site constitutes investment, financial, or legal advice. Trading involves risk.",
    },
    zh: {
      brand: "Carbadia · 碳信用交易所 · carbadia.io",
      contact: "对项目或合作感兴趣?来信 ",
      disclaimer:
        "模拟演示平台。Carbadia 不持有任何金融牌照,不进行真实交易、清算或结算;站内所有标的、行情与市场数据均为虚构,仅供演示,不涉及任何真实资金或碳资产。本站内容不构成任何投资、财务或法律建议,交易有风险。",
    },
  });
  return (
    <footer className="border-t border-border text-muted text-xs py-6 px-5">
      <div className="max-w-3xl mx-auto text-center space-y-2">
        <p>{t.brand}</p>
        <p>
          {t.contact}
          <ContactEmail className="text-accent hover:underline" />
        </p>
        <p className="leading-relaxed">{t.disclaimer}</p>
      </div>
    </footer>
  );
}
