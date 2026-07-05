"use client";

import { useDict } from "@/i18n/I18nProvider";

export function Footer() {
  const dict = useDict();
  return (
    <footer className="scene-ink-dark border-t border-[var(--card-border)] bg-[#efe4c8] px-6 py-10">
      <div className="mx-auto flex max-w-2xl flex-col gap-2 text-sm">
        <p>{dict.footer.rights}</p>
        <p className="opacity-70">{dict.common.disclaimer}</p>
      </div>
    </footer>
  );
}
