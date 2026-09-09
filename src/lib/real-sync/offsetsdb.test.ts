import { describe, expect, it } from "vitest";
import { aggregateCredits, parseProjectsCsv, UNDISCLOSED } from "./offsetsdb";

// 夹具列头与真实快照一致(实测 2026-06-01 snapshot csv.zip):
// projects.csv 18 列; credits.csv 11 列; 日期形如 "2024-04-05 00:00:00+00:00";
// protocol 是 Python 列表字面量字符串; is_compliance 是 "True"/"False"; 吨数是浮点字符串。
const PROJECTS_CSV = `category,country,first_issuance_at,first_retirement_at,is_compliance,issued,listed_at,name,project_id,project_type,project_type_source,project_url,proponent,protocol,protocol_unassigned,registry,retired,status
ghg-management,Indonesia,2025-05-27 00:00:00+00:00,,False,1090133.7,,"Recovery, and Avoidance of Methane at PT SMART Tbk. (PKS Padang Halaban), Indonesia.",VCS6027,Landfill,carbonplan,https://registry.verra.org/app/projectDetail/VCS/6027,KIS Singapore,['ams-iii-h'],,verra,0.0,completed
ghg-management,Mexico,2025-05-27 00:00:00+00:00,,False,1090133.0,2024-04-05 00:00:00+00:00,Whirlpool HFO Ramos 1000,ACR1000,HFC Replacement,berkeley,https://acr2.apx.com/x,Whirlpool,['acr-foam'],,american-carbon-registry,250.5,completed
,,,,False,0.0,,Unnamed GS project,GS100,,carbonplan,,,,,gold-standard,0.0,listed
forest,DR Congo,,,False,0.0,,"Makanza Peatland Conservation Project, DRC",VCS6008,REDD+,carbonplan,https://registry.verra.org/app/projectDetail/VCS/6008,CNT,"['ams-i-f', 'ams-iii-d']",,verra,0.0,listed
forest,United States,,,True,555.0,2021-01-05 00:00:00+00:00,Compliance Forest,CAR123,Forestry,carbonplan,https://x.example/car123,Someone,['car-forest'],,climate-action-reserve,100.0,active
unknown,India,,,False,0.0,,Solar PV by Juniper,VCS6032,Unknown,carbonplan,https://registry.verra.org/app/projectDetail/VCS/6032,Juniper,,['Methodology Under Development'],verra,0.0,
`;

const CREDITS_CSV = `project_id,quantity,retirement_account,retirement_beneficiary,retirement_beneficiary_harmonized,retirement_note,retirement_reason,transaction_date,transaction_type,transaction_url,vintage
VCS1,12630.0,,,,,,2009-03-26 00:00:00+00:00,issuance,,2007
VCS1,1000.0,,,,,,2009-11-02 00:00:00+00:00,issuance,,2008
VCS1,500.0,,Shell plc (123),Shell,,voluntary,2020-06-15 00:00:00+00:00,retirement,,2015
VCS1,250.5,,,,,,2020-07-01 00:00:00+00:00,retirement,,2016
GS100,100.0,,Shell,Shell,,,2020-01-01 00:00:00+00:00,retirement,,2014
GS100,2000.0,,,,,,2021-05-01 00:00:00+00:00,issuance,,2019
ACR9,999.0,,,,,,2020-03-03 00:00:00+00:00,cancellation,,2018
VCS1,300.0,,"Delta, Inc.","Delta, Inc.",,,2021-02-02 00:00:00+00:00,retirement,,2017
XXX1,50.0,,Ghost Co,Ghost,,,2020-08-08 00:00:00+00:00,retirement,,2015
VCS1,25.0,,Shell,Shell,,,,retirement,,2015
`;

const REGISTRY_MAP = new Map([
  ["VCS1", "verra"],
  ["GS100", "gold-standard"],
  ["ACR9", "american-carbon-registry"],
]);

describe("parseProjectsCsv", () => {
  const rows = parseProjectsCsv(PROJECTS_CSV);

  it("解析全部行", () => {
    expect(rows).toHaveLength(6);
  });

  it("字段一一映射(含引号内逗号的名称)", () => {
    const p = rows.find((r) => r.id === "VCS6027")!;
    expect(p).toMatchObject({
      id: "VCS6027",
      registry: "verra",
      name: "Recovery, and Avoidance of Methane at PT SMART Tbk. (PKS Padang Halaban), Indonesia.",
      country: "Indonesia",
      category: "ghg-management",
      projectType: "Landfill",
      protocol: "ams-iii-h",
      status: "completed",
      isCompliance: false,
      projectUrl: "https://registry.verra.org/app/projectDetail/VCS/6027",
    });
  });

  it("吨数四舍五入为 BigInt", () => {
    const p = rows.find((r) => r.id === "VCS6027")!;
    expect(p.issued).toBe(BigInt(1090134));
    expect(p.retired).toBe(BigInt(0));
    const acr = rows.find((r) => r.id === "ACR1000")!;
    expect(acr.issued).toBe(BigInt(1090133));
    expect(acr.retired).toBe(BigInt(251));
  });

  it("listedAt 取 listed_at 的日期部分, 缺失时回退 first_issuance_at", () => {
    expect(rows.find((r) => r.id === "ACR1000")!.listedAt).toBe("2024-04-05");
    expect(rows.find((r) => r.id === "VCS6027")!.listedAt).toBe("2025-05-27");
    expect(rows.find((r) => r.id === "VCS6008")!.listedAt).toBeNull();
  });

  it("空字符串字段归一为 null", () => {
    const gs = rows.find((r) => r.id === "GS100")!;
    expect(gs.country).toBeNull();
    expect(gs.category).toBeNull();
    expect(gs.projectType).toBeNull();
    expect(gs.protocol).toBeNull();
    expect(gs.projectUrl).toBeNull();
    expect(rows.find((r) => r.id === "VCS6032")!.status).toBeNull();
  });

  it("protocol 列表字面量转逗号连接; is_compliance True 转布尔", () => {
    expect(rows.find((r) => r.id === "VCS6008")!.protocol).toBe("ams-i-f,ams-iii-d");
    expect(rows.find((r) => r.id === "CAR123")!.isCompliance).toBe(true);
  });
});

describe("aggregateCredits", () => {
  const { stats, beneficiaries } = aggregateCredits(CREDITS_CSV, REGISTRY_MAP);
  const stat = (registry: string, year: number, kind: string) =>
    stats.find((s) => s.registry === registry && s.year === year && s.kind === kind);

  it("按 注册处×年份×类型 加总(quantity 四舍五入为 BigInt)", () => {
    expect(stat("verra", 2009, "issuance")!.tonnes).toBe(BigInt(13630));
    expect(stat("verra", 2020, "retirement")!.tonnes).toBe(BigInt(751)); // 500 + round(250.5)
    expect(stat("verra", 2021, "retirement")!.tonnes).toBe(BigInt(300));
    expect(stat("gold-standard", 2020, "retirement")!.tonnes).toBe(BigInt(100));
    expect(stat("gold-standard", 2021, "issuance")!.tonnes).toBe(BigInt(2000));
  });

  it("cancellation 不计入任何聚合", () => {
    expect(stats.some((s) => s.kind === "cancellation")).toBe(false);
    expect(stat("american-carbon-registry", 2020, "retirement")).toBeUndefined();
  });

  it("未知 project_id 或缺失日期的行不进年度统计", () => {
    // XXX1 不在 registry 映射里; 最后一行 Shell 无 transaction_date
    const verraRet2020Plus = stats.filter((s) => s.registry === "verra" && s.kind === "retirement");
    expect(verraRet2020Plus.map((s) => Number(s.tonnes)).reduce((a, b) => a + b, 0)).toBe(1051);
    // 未映射项目必须整行排除: 所有 stat 的 registry 只能来自映射表的值(XXX1 的 50 吨不得以任何形式出现)
    const knownRegistries = new Set(REGISTRY_MAP.values());
    expect(stats.every((s) => knownRegistries.has(s.registry))).toBe(true);
  });

  it("受益人排行: 同名跨注册处合并, 空受益人进 UNDISCLOSED 桶, 无日期行仍计入", () => {
    const by = Object.fromEntries(beneficiaries.map((b) => [b.name, b.tonnes]));
    expect(by["Shell"]).toBe(BigInt(625)); // 500 + 100 + 25(无日期行)
    expect(by[UNDISCLOSED]).toBe(BigInt(251));
    expect(by["Delta, Inc."]).toBe(BigInt(300));
    expect(by["Ghost"]).toBe(BigInt(50)); // 未知 project 不影响受益人聚合
  });

  it("受益人按吨数降序", () => {
    const tonnes = beneficiaries.map((b) => b.tonnes);
    const sorted = [...tonnes].sort((a, b) => (b > a ? 1 : b < a ? -1 : 0));
    expect(tonnes).toEqual(sorted);
  });

  it("只保留 topN 具名受益人 + UNDISCLOSED 桶", () => {
    const { beneficiaries: top } = aggregateCredits(CREDITS_CSV, REGISTRY_MAP, 2);
    const names = top.map((b) => b.name);
    expect(names).toContain("Shell");
    expect(names).toContain("Delta, Inc.");
    expect(names).toContain(UNDISCLOSED); // 桶不占具名名额
    expect(names).not.toContain("Ghost");
  });
});
