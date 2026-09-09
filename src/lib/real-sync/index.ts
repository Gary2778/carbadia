// 真实市场数据常驻同步循环(instrumentation 挂载, SYNC_DISABLED=1 可关)。
// 模式复制自 bot 的 lastCleanupAt: 不用 24h 长定时器(容器随时重启, 活不过部署),
// 而是短周期醒来查"各 source 最近一次 OK SyncRun 是否已超 24h"(判据落库, 重启后仍有效)。
import { prisma } from "../db";
import { syncCcer } from "./ccer";
import { syncShadow } from "./shadow";
import { syncOffsetsDb } from "./store";

const CHECK_INTERVAL_MS = 30 * 60_000; // 30 分钟醒一次
const SYNC_EVERY_MS = 24 * 3_600_000; // 每 source 日更一次
// 超过该阈值仍 RUNNING 的 SyncRun 判定为进程死亡遗留的孤儿行(单轮同步最长 ~10 分钟,
// 远小于 1h; CCER 一轮长达约 10 分钟, 部署/重启撞上同步窗口是常态而非意外)
const ORPHAN_AFTER_MS = 3_600_000;

declare global {
  // dev HMR 下防止重复启动
  var __carbadiaRealSync: boolean | undefined;
}

export function startRealSync() {
  if (globalThis.__carbadiaRealSync) return;
  globalThis.__carbadiaRealSync = true;
  console.log("[sync] 真实市场同步循环启动");
  void loop();
}

const SOURCES = [
  { source: "offsetsdb", run: syncOffsetsDb },
  { source: "ccer", run: syncCcer },
  { source: "shadowprice", run: syncShadow }, // 影子价格快照 + 内部真实收盘对照(shadow.ts)
] as const;

async function loop() {
  for (;;) {
    // 进程在同步中被杀会把 SyncRun 永久遗留在 RUNNING(2026-07-19 冒烟实证)。
    // isDue 只看 OK 不受影响, 但孤儿行会持续污染可观测性 → 每次醒来先标 FAILED。
    await reapOrphanRuns().catch((e) => console.error("[sync] 孤儿 SyncRun 清理失败", e));
    // 两个 source 各自 try/catch 互不牵连; 任何失败都不让循环崩
    for (const { source, run } of SOURCES) {
      try {
        if (await isDue(source)) await run();
      } catch (e) {
        console.error(`[sync] ${source} 本轮同步失败, 下轮再试`, e);
      }
    }
    await new Promise((r) => setTimeout(r, CHECK_INTERVAL_MS));
  }
}

async function reapOrphanRuns() {
  const { count } = await prisma.syncRun.updateMany({
    where: { status: "RUNNING", startedAt: { lt: new Date(Date.now() - ORPHAN_AFTER_MS) } },
    data: { status: "FAILED", finishedAt: new Date(), error: "orphaned" },
  });
  if (count > 0) console.warn(`[sync] 清理 ${count} 条进程死亡遗留的 RUNNING SyncRun → FAILED(orphaned)`);
}

async function isDue(source: string): Promise<boolean> {
  const lastOk = await prisma.syncRun.findFirst({
    where: { source, status: "OK" },
    orderBy: { startedAt: "desc" },
  });
  return !lastOk || Date.now() - lastOk.startedAt.getTime() >= SYNC_EVERY_MS;
}
