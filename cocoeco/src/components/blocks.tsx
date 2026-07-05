import { parseEmphasis } from "./emphasis";

// 数据大字/核心转折/宣言前导:居中衬线大字组
export function BigLines({ lines, ledger = false }: { lines: string[]; ledger?: boolean }) {
  return (
    <div className="flex flex-col gap-5 py-6">
      {lines.map((line) => (
        <p
          key={line}
          className={`voice text-xl leading-relaxed sm:text-2xl ${ledger ? "ledger-num" : ""}`}
        >
          {parseEmphasis(line)}
        </p>
      ))}
    </div>
  );
}

// 交互提示小标签(骨架期为静态提示,3D 期变为真实交互引导)
export function HintTag({ text }: { text: string }) {
  return (
    <p className="inline-flex items-center gap-2 self-start rounded-full border border-[var(--card-border)] px-4 py-1.5 text-sm text-[var(--accent)]">
      <span aria-hidden>✦</span>
      {text}
    </p>
  );
}

// 普通段落块(可带小标题)
export function CopyBlock({ heading, lines }: { heading?: string; lines: string[] }) {
  return (
    <div className="flex flex-col gap-3">
      {heading ? <p className="voice text-lg font-medium">{heading}</p> : null}
      {lines.map((line) => (
        <p key={line} className="leading-relaxed">
          {parseEmphasis(line)}
        </p>
      ))}
    </div>
  );
}

// 愿景宣言:三联句大字(全站唯一 creed 渲染点之一;句号由此处拼装)
export function CreedLines({ creed }: { creed: [string, string, string] }) {
  return (
    <p className="voice py-4 text-3xl font-semibold leading-snug tracking-wide sm:text-4xl">
      {creed.map((word) => (
        <span key={word} className="inline-block pe-2">
          {word}。
        </span>
      ))}
    </p>
  );
}

// 理念三条:标题取自 creed,正文来自 principles
export function Principles({
  creed,
  bodies,
}: {
  creed: [string, string, string];
  bodies: string[];
}) {
  return (
    <ul className="flex flex-col gap-4">
      {bodies.map((body, i) => (
        <li
          key={creed[i]}
          className="rounded-lg border border-[var(--card-border)] bg-[var(--card)]/60 px-5 py-4"
        >
          <p className="voice mb-1 font-semibold text-[var(--accent)]">{creed[i]}</p>
          <p className="text-[0.95rem] leading-relaxed">{body}</p>
        </li>
      ))}
    </ul>
  );
}
