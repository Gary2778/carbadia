// OffsetsDB 落库: 下载 S3 zip 快照 → 解析/聚合 → 分批 upsert 项目 → 单事务重建聚合表 → SyncRun
// 写库纪律(2026-07-17 生产事故教训): 分批 ≤500 行 + 批间 300ms 让出写锁; 大导入后 ANALYZE 重建统计。
import AdmZip from "adm-zip";
import { prisma } from "../db";
import { aggregateCredits, parseProjectsCsv, type ProjectRow } from "./offsetsdb";

const SNAPSHOT_URL =
  "https://carbonplan-offsets-db.s3.us-west-2.amazonaws.com/production/latest/offsets-db.csv.zip";
const BATCH = 500;
const BATCH_PAUSE_MS = 300;

export interface SyncResult {
  rows: number;
  dataAsOf: string | null;
}

function projectData(p: ProjectRow, syncedAt: Date) {
  return {
    registry: p.registry,
    name: p.name,
    country: p.country,
    category: p.category,
    projectType: p.projectType,
    protocol: p.protocol,
    status: p.status,
    isCompliance: p.isCompliance,
    issued: p.issued,
    retired: p.retired,
    listedAt: p.listedAt,
    projectUrl: p.projectUrl,
    syncedAt,
  };
}

export async function syncOffsetsDb(): Promise<SyncResult> {
  const run = await prisma.syncRun.create({ data: { source: "offsetsdb" } });
  try {
    console.log("[sync] OffsetsDB: 下载快照", SNAPSHOT_URL);
    const res = await fetch(SNAPSHOT_URL, {
      cache: "no-store",
      signal: AbortSignal.timeout(120_000),
    });
    if (!res.ok) throw new Error(`快照下载失败: HTTP ${res.status}`);
    const zip = new AdmZip(Buffer.from(await res.arrayBuffer()));
    const entry = (name: string) => {
      const e = zip.getEntry(name);
      if (!e) throw new Error(`快照缺少 ${name}`);
      return e.getData().toString("utf-8");
    };

    const meta = JSON.parse(entry("metadata.json")) as { generated_at?: string };
    const dataAsOf = meta.generated_at ?? null;

    // 跳过判据: 快照未更新(实测管线自 2026-06-01 停更)则不空转重写
    const lastOk = await prisma.syncRun.findFirst({
      where: { source: "offsetsdb", status: "OK", id: { not: run.id } },
      orderBy: { startedAt: "desc" },
    });
    if (dataAsOf && lastOk?.dataAsOf === dataAsOf) {
      console.log(`[sync] OffsetsDB: 快照未更新(${dataAsOf}), 跳过`);
      await prisma.syncRun.update({
        where: { id: run.id },
        data: { status: "OK", finishedAt: new Date(), rowsUpserted: 0, dataAsOf },
      });
      return { rows: 0, dataAsOf };
    }

    const projects = parseProjectsCsv(entry("projects.csv"));
    const registryByProject = new Map(projects.map((p) => [p.id, p.registry]));
    const { stats, beneficiaries } = aggregateCredits(entry("credits.csv"), registryByProject);
    console.log(
      `[sync] OffsetsDB: 解析完成, 项目 ${projects.length} 行, 聚合 ${stats.length} 统计行 + ${beneficiaries.length} 受益人`
    );

    // 项目分批 upsert(每批一个事务, 批间让锁, 用户请求可插队)
    const syncedAt = new Date();
    let rows = 0;
    for (let i = 0; i < projects.length; i += BATCH) {
      const batch = projects.slice(i, i + BATCH);
      await prisma.$transaction(
        batch.map((p) =>
          prisma.registryProject.upsert({
            where: { id: p.id },
            create: { id: p.id, ...projectData(p, syncedAt) },
            update: projectData(p, syncedAt),
          })
        )
      );
      rows += batch.length;
      if (i + BATCH < projects.length) await new Promise((r) => setTimeout(r, BATCH_PAUSE_MS));
    }

    // 聚合表整表重建(行数仅数百, 单事务保证读侧不见半成品)
    await prisma.$transaction([
      prisma.registryStat.deleteMany(),
      prisma.registryStat.createMany({ data: stats }),
      prisma.registryBeneficiary.deleteMany(),
      prisma.registryBeneficiary.createMany({ data: beneficiaries }),
    ]);
    rows += stats.length + beneficiaries.length;

    // 大导入后重建查询统计(sqlite_stat1 缺失曾致 2026-07-17 生产事故)
    await prisma.$executeRawUnsafe("ANALYZE");

    await prisma.syncRun.update({
      where: { id: run.id },
      data: { status: "OK", finishedAt: new Date(), rowsUpserted: rows, dataAsOf },
    });
    console.log(`[sync] OffsetsDB: 完成, 共 ${rows} 行, 数据截至 ${dataAsOf}`);
    return { rows, dataAsOf };
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    console.error("[sync] OffsetsDB: 失败", error);
    await prisma.syncRun
      .update({
        where: { id: run.id },
        data: { status: "FAILED", finishedAt: new Date(), error },
      })
      .catch(() => {});
    throw e;
  }
}
