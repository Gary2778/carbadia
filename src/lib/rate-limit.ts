// 进程内滑动窗口限流。本应用是结构性单实例(SQLite 卷 + 进程内机器人),
// 进程内状态即全局状态;若未来多实例化,需换外部存储。
const buckets = new Map<string, number[]>();
const MAX_KEYS = 10_000; // 防内存无限增长:超限时全量清一次(限流是尽力而为,不是账本)

export function rateLimit(key: string, limit: number, windowMs: number, now = Date.now()): boolean {
  if (buckets.size > MAX_KEYS) buckets.clear();
  const cutoff = now - windowMs;
  const hits = (buckets.get(key) ?? []).filter((t) => t > cutoff);
  if (hits.length >= limit) {
    buckets.set(key, hits);
    return false;
  }
  hits.push(now);
  buckets.set(key, hits);
  return true;
}

// 信任链: Cloudflare Worker → Railway,两跳都会向 x-forwarded-for 追加一段,
// 因此 XFF 的第一段是客户端自报、可伪造的。取值优先级:
// 1) cf-connecting-ip —— Cloudflare 边缘写入,客户端在 CF 边缘之外无法覆盖;
// 2) x-forwarded-for 的最后一段 —— 由离服务器最近的代理(Railway)追加,非攻击者可控;
// 3) 都没有则回退 "local"。
export function clientIp(req: Request): string {
  const cf = req.headers.get("cf-connecting-ip")?.trim();
  if (cf) return cf;
  const fwd = req.headers.get("x-forwarded-for");
  const parts = fwd?.split(",").map((p) => p.trim()).filter(Boolean) ?? [];
  return parts[parts.length - 1] || "local";
}
