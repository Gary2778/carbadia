"use client";

import { ContactEmail } from "@/components/ContactEmail";
import { useT } from "@/lib/i18n";

export function Footer() {
  const t = useT("footer");
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
