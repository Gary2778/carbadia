import type { ReactNode } from "react";

// 词典内联强调:成对 **…** 渲染为 <strong>;不成对原样保留。
export function parseEmphasis(text: string): ReactNode[] {
  const parts = text.split(/\*\*(.+?)\*\*/g);
  if (parts.length === 1) return [text];
  const nodes: ReactNode[] = [];
  parts.forEach((part, i) => {
    if (i % 2 === 1) {
      nodes.push(<strong key={i}>{part}</strong>);
    } else if (part !== "") {
      nodes.push(part);
    }
  });
  return nodes;
}
