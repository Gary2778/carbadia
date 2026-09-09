import { describe, expect, it } from "vitest";
import {
  CCER_DATA_TYPES,
  isLastCcerPage,
  mapCcerApply,
  type CcerDetail,
  type CcerListItem,
} from "./ccer";

// 夹具取自 2026-07-19 对 ccer.cets.org.cn 开放端点的实测响应(getOpeningApply / getOpeningApplyDetail)。
// 实测关键事实(与侦察底稿的假设不同, 以实测为准):
// - 列表端点忽略请求体里的 applyStatus, 页签由 dataType 区分:
//   1=公示中项目 2=已登记项目 3=公示中减排量 4=已登记减排量 5=已签发减排量 (6/7 有效但当前为空)
// - 已登记/已签发页签的条目 applyStatus 为 null, 状态文案在 statusName。
// - methodology/province/expectYearNum/certifiedNum/publicStartDate 等只在详情端点返回。
// - 详情日期是无分隔的 "20260717"。
const LIST_ITEM_DT1: CcerListItem = {
  applyId: "1526163848812433408",
  projectInfoId: null,
  certificationId: null,
  ccerId: null,
  projectName: "湖北五峰壶瓶山等三个国有林场及七个乡镇用材林造林碳汇项目",
  orgCustomerName: "五峰长森林业投资开发有限责任公司",
  projectType: "N0101",
  projectTypeName: "造林碳汇",
  applyStatus: "03",
  statusName: "公示中",
  dataType: "1",
};

const DETAIL_DT1: CcerDetail = {
  methodologyNum: "CCER-14-001-V01",
  methodologyName: "造林碳汇",
  provinceName: "湖北省",
  expectYearNum: 6170,
  certifiedNum: null,
  publicStartDate: "20260717",
  publicEndDate: "20260813",
};

// 已登记减排量(dt4): applyStatus 为 null, certifiedNum 有值, 公示期字段为 null
const LIST_ITEM_DT4: CcerListItem = {
  applyId: "1467848714323365888",
  projectInfoId: null,
  certificationId: "1525191972690726912",
  ccerId: null,
  projectName: "中广核汕尾甲子一期500兆瓦海上风电场项目",
  orgCustomerName: "中广核汕尾新能源有限公司",
  projectType: "A0102",
  projectTypeName: "并网海上风力发电",
  applyStatus: null,
  statusName: "已登记",
  dataType: "4",
};

const DETAIL_DT4: CcerDetail = {
  methodologyNum: "CCER-01-002-V01",
  methodologyName: "并网海上风力发电",
  provinceName: "广东省",
  expectYearNum: 804345,
  certifiedNum: 225714,
  publicStartDate: null,
  publicEndDate: null,
};

describe("mapCcerApply", () => {
  it("列表+详情字段合并映射(公示中项目)", () => {
    const row = mapCcerApply(LIST_ITEM_DT1, "1", DETAIL_DT1);
    expect(row).toEqual({
      id: "1526163848812433408",
      dataType: "1",
      applyStatus: "03",
      statusName: "公示中",
      name: "湖北五峰壶瓶山等三个国有林场及七个乡镇用材林造林碳汇项目",
      owner: "五峰长森林业投资开发有限责任公司",
      projectType: "造林碳汇",
      methodology: "CCER-14-001-V01 造林碳汇",
      province: "湖北省",
      expectYearNum: 6170,
      certifiedNum: null,
      publicStart: "2026-07-17",
      publicEnd: "2026-08-13",
    });
  });

  it("已登记页签: 条目 applyStatus 为 null 时归一为空串, 状态取 statusName", () => {
    const row = mapCcerApply(LIST_ITEM_DT4, "4", DETAIL_DT4);
    expect(row.applyStatus).toBe("");
    expect(row.statusName).toBe("已登记");
    expect(row.certifiedNum).toBe(225714);
    expect(row.publicStart).toBeNull();
    expect(row.publicEnd).toBeNull();
  });

  it("详情缺失(拉取失败)时仍产出列表级字段, 详情级字段为 null", () => {
    const row = mapCcerApply(LIST_ITEM_DT1, "1", null);
    expect(row.id).toBe("1526163848812433408");
    expect(row.name).toBe(LIST_ITEM_DT1.projectName);
    expect(row.methodology).toBeNull();
    expect(row.province).toBeNull();
    expect(row.expectYearNum).toBeNull();
    expect(row.certifiedNum).toBeNull();
    expect(row.publicStart).toBeNull();
  });

  it("缺失字段容错: 空条目不炸, 文案字段回退默认值", () => {
    const row = mapCcerApply({ applyId: "x1" }, "2", {});
    expect(row).toEqual({
      id: "x1",
      dataType: "2",
      applyStatus: "",
      statusName: "",
      name: "",
      owner: null,
      projectType: null,
      methodology: null,
      province: null,
      expectYearNum: null,
      certifiedNum: null,
      publicStart: null,
      publicEnd: null,
    });
  });

  it("dataType 以条目自带值优先(条目回显页签), 缺失时用请求页签", () => {
    expect(mapCcerApply(LIST_ITEM_DT4, "9", DETAIL_DT4).dataType).toBe("4");
    expect(mapCcerApply({ applyId: "x2" }, "3", null).dataType).toBe("3");
  });

  it("methodology 只有编号或只有名称时不留悬空空格", () => {
    expect(mapCcerApply({ applyId: "a" }, "1", { methodologyNum: "CCER-01-002-V01" }).methodology).toBe(
      "CCER-01-002-V01"
    );
    expect(mapCcerApply({ applyId: "b" }, "1", { methodologyName: "并网海上风力发电" }).methodology).toBe(
      "并网海上风力发电"
    );
  });

  it("projectType 优先取 projectTypeName 文案, 缺失回退编码", () => {
    expect(mapCcerApply({ applyId: "c", projectType: "A0101" }, "1", null).projectType).toBe("A0101");
  });

  it("吨数字段容错: 数字字符串可用, 非法值归 null", () => {
    const row = mapCcerApply({ applyId: "d" }, "1", {
      expectYearNum: "293990" as unknown as number,
      certifiedNum: "abc" as unknown as number,
    });
    expect(row.expectYearNum).toBe(293990);
    expect(row.certifiedNum).toBeNull();
  });

  it("日期归一: 8 位数字加横杠, 已带横杠或异常长度原样保留", () => {
    expect(mapCcerApply({ applyId: "e" }, "1", { publicStartDate: "2026-07-17" }).publicStart).toBe(
      "2026-07-17"
    );
    expect(mapCcerApply({ applyId: "f" }, "1", { publicStartDate: "" }).publicStart).toBeNull();
  });
});

describe("isLastCcerPage", () => {
  it("整页未满即最后一页", () => {
    expect(isLastCcerPage(7, 7, 7)).toBe(true);
    expect(isLastCcerPage(0, 0, 0)).toBe(true); // 空页签(实测 dt6/dt7)
  });

  it("拿满 total 才终止(实测 dt5 共 114 条需 3 页)", () => {
    expect(isLastCcerPage(50, 50, 114)).toBe(false);
    expect(isLastCcerPage(50, 100, 114)).toBe(false);
    expect(isLastCcerPage(14, 114, 114)).toBe(true);
  });

  it("total 缺失时回退 Infinity: 整页满必须继续翻页, 不得静默截断", () => {
    expect(isLastCcerPage(50, 50, undefined)).toBe(false);
    expect(isLastCcerPage(50, 100, null)).toBe(false);
    expect(isLastCcerPage(14, 114, undefined)).toBe(true); // 仍靠"整页未满"终止
  });
});

describe("CCER_DATA_TYPES", () => {
  it("覆盖实测确认的五个非空页签(1-5)并按序轮询", () => {
    for (const dt of ["1", "2", "3", "4", "5"]) expect(CCER_DATA_TYPES).toContain(dt);
  });
});
