"use client";

import { useEffect, useState } from "react";

// 邮箱拆成两段、运行时(挂载后)才拼装并渲染:
// 服务端渲染的 HTML 里不出现 "hello@carbadia.io" 这个完整字符串,
// 常见的正则爬虫抓不到,真人浏览器(执行 JS)正常看到可点击的 mailto。
const PARTS = ["hello", "carbadia.io"];

export function ContactEmail({ className = "" }: { className?: string }) {
  const [addr, setAddr] = useState("");
  useEffect(() => {
    setAddr(`${PARTS[0]}@${PARTS[1]}`);
  }, []);

  if (!addr) return <span className={className} aria-hidden>……</span>;
  return (
    <a href={`mailto:${addr}`} className={className}>
      {addr}
    </a>
  );
}
