"use client";

import { useState } from "react";
import { SCENES } from "@/scenes/registry";
import { useDict } from "@/i18n/I18nProvider";

export function TopNav() {
  const dict = useDict();
  const [menuOpen, setMenuOpen] = useState(false);

  const links = SCENES.map((id) => (
    <a
      key={id}
      href={`#${id}`}
      onClick={() => setMenuOpen(false)}
      className="rounded px-2 py-1 text-sm opacity-80 transition-opacity hover:opacity-100"
    >
      {dict.scenes[id].menuName}
    </a>
  ));

  return (
    <header className="fixed inset-x-0 top-0 z-40 border-b border-white/10 bg-[#0a0e1c]/80 text-[#ece8dd] backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-2.5">
        <a href="#prologue" className="voice text-lg font-semibold tracking-wide">
          {dict.ui.brand}
        </a>

        <nav aria-label={dict.ui.journeyMenu} className="ms-4 hidden items-center gap-1 lg:flex">
          {links}
        </nav>

        <div className="ms-auto flex items-center gap-2">
          <a
            href="https://carbadia.io"
            target="_blank"
            rel="noopener"
            className="rounded-full border border-[var(--accent)] px-4 py-1.5 text-sm font-medium text-[var(--accent)] transition-colors hover:bg-[var(--accent)] hover:text-[#0a0e1c]"
          >
            {dict.ui.topCta}
            <span aria-hidden className="ms-1">→</span>
          </a>
          <button
            type="button"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
            className="rounded border border-white/20 px-3 py-1.5 text-sm lg:hidden"
          >
            {dict.ui.journeyMenu}
          </button>
        </div>
      </div>

      {menuOpen ? (
        <nav
          aria-label={dict.ui.journeyMenu}
          className="flex flex-wrap gap-1 border-t border-white/10 px-4 py-3 lg:hidden"
        >
          {links}
        </nav>
      ) : null}
    </header>
  );
}
