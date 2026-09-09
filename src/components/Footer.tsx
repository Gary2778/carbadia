"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ContactEmail } from "@/components/ContactEmail";
import { useLang, useT } from "@/lib/i18n";

export function Footer() {
  const t = useT("footer");
  const { lang } = useLang();
  const isStudio = usePathname() === "/studio";
  const studioLocale = lang === "zh-TW" ? "zh-TW" : "en";
  const studioStage = studioLocale === "zh-TW"
    ? "Studio 正處於發展方向規劃階段。技術研發與未來項目將取決於資金、研究及驗證進展。"
    : "Studio is at the direction-setting stage. Technology development and future projects depend on funding, research and validation.";
  return (
    <footer className="border-t border-border text-muted text-xs py-6 px-5">
      <div className="max-w-3xl mx-auto text-center space-y-2">
        <p>{isStudio ? "Carbadia Studio · carbadia.io" : t.brand}</p>
        <p className="space-x-3">
          <Link href="/terms" className="hover:text-foreground transition-colors">{t.termsLink}</Link>
          <span aria-hidden>·</span>
          <Link href="/privacy" className="hover:text-foreground transition-colors">{t.privacyLink}</Link>
          <span aria-hidden>·</span>
          <Link href="/feedback" className="hover:text-foreground transition-colors">{t.feedbackLink}</Link>
        </p>
        <p>
          {t.contact}
          <ContactEmail className="text-accent hover:underline" />
        </p>
        <p className="leading-relaxed" lang={isStudio ? studioLocale : undefined} dir={isStudio ? "ltr" : undefined}>{isStudio ? studioStage : t.disclaimer}</p>
      </div>
    </footer>
  );
}
