const HREFS = {
  exchange: "https://carbadia.io",
  email: "mailto:hello@cocoeco.io",
} as const;

// 箭头由组件渲染(不入词典;M8 RTL 时由 CSS 翻转)
export function CtaLink({ label, kind }: { label: string; kind: keyof typeof HREFS }) {
  return (
    <a
      href={HREFS[kind]}
      className="inline-flex items-center gap-2 rounded-full border border-[var(--accent)] px-5 py-2.5 font-medium text-[var(--accent)] transition-colors hover:bg-[var(--accent)] hover:text-[var(--bg)]"
      {...(kind === "exchange" ? { target: "_blank", rel: "noopener" } : {})}
    >
      {label}
      <span aria-hidden className="cta-arrow">→</span>
    </a>
  );
}
