# cocoeco M2:序幕+卧室沉浸舞台 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把已过审的 v8 卧室场景(Blender)烘焙导出为 glTF,在 cocoeco 站内建成可玩的"序幕+卧室"沉浸舞台:开场灯特写→点击微光→拉镜全屋→四个知识卡热点→点窗推进,含手势兜底与三级降级。

**Architecture:** Blender 侧把静态几何按区域合并、Cycles 烘焙 DIFFUSE 光照到 UV2 图集后导出 draco glTF(相机与锚点空物体一并导出);前端用 vanilla three.js(单 canvas 客户端组件)+ GSAP 编排相机,**所有交互与文字都在 DOM 覆盖层**(热点=3D 锚点投影成 DOM 按钮,零 raycast),状态机为纯 TS 可单测。M1 长页保留为阅读模式/SEO 层,舞台是盖在其上的 fixed 层。

**Tech Stack:** Blender 5(MCP)、gltf-transform CLI、three.js(GLTFLoader+DRACOLoader)、GSAP core、Next.js 16.2.7 / React 19、vitest+jsdom。

## Global Constraints

- 文案全部来自 `src/content/dictionary.ts`,**3D 资产内一律无文字**(spec §5);新 UI 文案键必须同步 `Dict` 类型。
- 交互:**点击主导 + 手势兜底**(滚轮/触摸滑动/方向键等效推进);`prefers-reduced-motion` → 全部跳切(spec §2)。
- 降级三档:正常 3D → 静态定妆图+DOM 热点 → 阅读模式(M1 长页,始终在 DOM 里,SEO 不受影响)。
- 写 Next.js 相关代码前先读 `cocoeco/node_modules/next/dist/docs/01-app/` 对应指南(AGENTS.md 铁律,本仓库 Next 与训练数据可能不同)。
- `next.config.ts` 的 `turbopack.root` 锚定与 vitest jsdom 配置不得动。
- 资产预算:`public/stage/bedroom/` 总计 ≤ 8 MB;canvas 常驻 draw calls ≤ 40。
- Blender 操作规矩:每个 execute 块开头重新取场景并 `bpy.context.window.scene = scn`;**只在场景副本 `bedroom_export` 上动刀,不许改 `cocoeco_bedroom_v2`**;完成后 `save_mainfile`。
- 每个任务结尾 commit;测试没绿不许 commit。

## 实测常量(来自 v8 场景,Blender Z-up;glTF 导出后自动转 Y-up,前端一律用导出节点取位,不手抄坐标)

| 用途 | Blender 对象/坐标 |
|---|---|
| 全屋机位 | `cam_film` loc(9.956, −5.706, 8.503) euler(57°,0°,45°) 75mm/36mm,DOF f4.5(网页版不用 DOF) |
| 台灯特写机位 | 新建 `cam_lamp`(本计划 T1 创建) |
| 微光痕迹起点 | `anchor_trace`(0.30, 2.12, 1.25)台灯正上方 |
| 热点·台灯 | `anchor_hs_lamp`(0.30, 2.12, 0.95)→ cards[0] |
| 热点·空调 | `anchor_hs_ac`(0.20, 2.52, 2.42)→ cards[1] |
| 热点·外卖盒 | `anchor_hs_takeout`(0.78, 3.30, 0.18)→ cards[2] |
| 热点·手机充电器 | `anchor_hs_charger`(0.20, 2.00, 0.60)→ cards[3] |
| 推进物件·窗 | `anchor_window`(0.00, 2.53, 1.65) |
| 吊扇旋转轴 | 空物体 `fan_pivot`(1.62, 3.15, 2.73),叶片作为其子级 |

---

### Task 1: Blender 导出场景准备(副本、清理、锚点、分组)

**Files:**
- 无代码文件;产物是 .blend 里的新场景 `bedroom_export`(通过 blender MCP `execute_blender_code` 执行下述脚本)

**Interfaces:**
- Produces: 场景 `bedroom_export`,内含:合并组 `g_shell`/`g_bed`/`g_desk`/`g_props`/`g_fan_static`(各带 UV2 "lm")、动态件 `fan_blades`(父级 `fan_pivot`)/`win_glass`/`lava_blob`、保留原贴图的 `keep_tex_*` 组(挂墙照片/徽章/夜景背板)、相机 `cam_film`+`cam_lamp`、9 个 `anchor_*` 空物体

- [ ] **Step 1: 复制场景并清理不导出的东西**

```python
import bpy
src = bpy.data.scenes["cocoeco_bedroom_v2"]
old = bpy.data.scenes.get("bedroom_export")
if old: bpy.data.scenes.remove(old)
bpy.context.window.scene = src
bpy.ops.scene.new(type='FULL_COPY')
scn = bpy.context.window.scene
scn.name = "bedroom_export"
import re
kill = []
for ob in scn.objects:
    n = ob.name
    if (re.match(r"(mote|trail|coco_)", n) or n.startswith("room_fog")
        or n.startswith("cam_qc") or ob.type == 'LIGHT'):
        kill.append(ob)
for ob in kill: bpy.data.objects.remove(ob, do_unlink=True)
print("removed", len(kill), "| left:", len(scn.objects))
```
预期:removed ≈ 20+,微光/雾/灯全没(灯光已烘焙,无需导出)。

- [ ] **Step 2: 建 cam_lamp(灯特写)与 9 个锚点空物体**

```python
import bpy, math
from mathutils import Vector
scn = bpy.data.scenes["bedroom_export"]; bpy.context.window.scene = scn
cd = bpy.data.cameras.new("cam_lamp"); cd.lens = 50; cd.sensor_width = 36
cam = bpy.data.objects.new("cam_lamp", cd); scn.collection.objects.link(cam)
cam.location = (1.45, 1.05, 1.30)
tgt = Vector((0.30, 2.12, 0.95))
d = (tgt - cam.location).normalized()
cam.rotation_mode = 'XYZ'
cam.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
ANCHORS = {
  "anchor_trace": (0.30, 2.12, 1.25), "anchor_hs_lamp": (0.30, 2.12, 0.95),
  "anchor_hs_ac": (0.20, 2.52, 2.42), "anchor_hs_takeout": (0.78, 3.30, 0.18),
  "anchor_hs_charger": (0.20, 2.00, 0.60), "anchor_window": (0.00, 2.53, 1.65),
  "fan_pivot": (1.62, 3.15, 2.73),
}
for name, loc in ANCHORS.items():
    e = bpy.data.objects.new(name, None); e.location = loc
    scn.collection.objects.link(e)
print("cam_lamp + anchors ok")
```

- [ ] **Step 3: 吊扇叶片挂到 fan_pivot、划定动态/保留贴图集合**

```python
import bpy
scn = bpy.data.scenes["bedroom_export"]; bpy.context.window.scene = scn
pivot = bpy.data.objects["fan_pivot"]
blades = [o for o in scn.objects if o.name.startswith("fan_blade")]
for b in blades:
    mw = b.matrix_world.copy(); b.parent = pivot
    b.matrix_parent_inverse = pivot.matrix_world.inverted()
# 保留原贴图组(不参与烘焙合并):挂墙照片/两枚徽章海报/夜景背板/滑板印花
KEEP = [o.name for o in scn.objects if o.name.startswith(("ph_", "po_", "backdrop", "skateboard"))]
DYN = [b.name for b in blades] + ["win_glass", "lava_blob"]
print("KEEP:", KEEP); print("DYN:", DYN)
```
预期:KEEP 列出 ph_can/ph_night/ph_dawn、po_desk2/po_green、夜景背板、skateboard_gr;DYN 列出 4 叶片+玻璃+熔岩泡。

- [ ] **Step 4: 其余静态网格按区域装桶合并成 5 组**

```python
import bpy
scn = bpy.data.scenes["bedroom_export"]; bpy.context.window.scene = scn
import re
def bucket(ob):
    x, y, z = ob.location
    n = ob.name
    if re.match(r"(w[LB]_|floor|ceiling|door|wf_|bb_|hall_|blind|shade_roll|win_frame)", n): return "g_shell"
    if n.startswith("fan_"): return "g_fan_static"
    if x < 1.7 and y < 2.9: return "g_bed"      # 床/床头柜/台灯区(序幕特写)
    if y > 2.9 and x < 2.7: return "g_desk"     # 书桌/书架区
    return "g_props"
KEEP_PREFIX = ("ph_", "po_", "backdrop", "skateboard", "fan_blade", "win_glass", "lava_blob", "anchor", "cam", "fan_pivot")
groups = {}
for ob in list(scn.objects):
    if ob.type != 'MESH' or ob.name.startswith(KEEP_PREFIX): continue
    groups.setdefault(bucket(ob), []).append(ob)
for gname, obs in groups.items():
    bpy.ops.object.select_all(action='DESELECT')
    for o in obs: o.select_set(True)
    bpy.context.view_layer.objects.active = obs[0]
    bpy.ops.object.join()
    scn = bpy.data.scenes["bedroom_export"]; bpy.context.window.scene = scn
    joined = bpy.context.view_layer.objects.active
    joined.name = gname
    print(gname, "<-", len(obs), "objects, verts", len(joined.data.vertices))
```
预期:5 组各打印顶点数,总量 ≈ 5 万出头。fan_blade 因 KEEP_PREFIX 前缀匹配保持独立——**注意 `fan_` 桶规则只对未被 KEEP_PREFIX 排除的静态件生效**。

- [ ] **Step 5: 每组建 UV2 "lm" 并 lightmap 展开**

```python
import bpy
scn = bpy.data.scenes["bedroom_export"]; bpy.context.window.scene = scn
for gname in ("g_shell", "g_bed", "g_desk", "g_props", "g_fan_static"):
    ob = bpy.data.objects[gname]
    if "lm" not in ob.data.uv_layers:
        ob.data.uv_layers.new(name="lm")
    ob.data.uv_layers.active = ob.data.uv_layers["lm"]
    bpy.ops.object.select_all(action='DESELECT')
    ob.select_set(True); bpy.context.view_layer.objects.active = ob
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.uv.lightmap_pack(PREF_CONTEXT='ALL_FACES', PREF_MARGIN_DIV=0.2)
    bpy.ops.object.mode_set(mode='OBJECT')
    scn = bpy.data.scenes["bedroom_export"]; bpy.context.window.scene = scn
    print(gname, "uv2 ok")
```

- [ ] **Step 6: 保存 .blend 并 commit**

```python
import bpy; bpy.ops.wm.save_mainfile(); print("saved")
```
```bash
cd /Users/gaptop/碳交易所/.claude/worktrees/adoring-panini-2b25f8
git add cocoeco/blender/cocoeco-scenes.blend
git commit -m "feat(m2): bedroom_export 导出场景——分组合并/UV2/锚点/cam_lamp"
```

---

### Task 2: 烘焙光照 + glTF 导出 + 优化 + 预算验证

**Files:**
- Create: `cocoeco/public/stage/bedroom/bedroom.glb`(gltf-transform 产物)
- Create: `cocoeco/scripts/check-stage-budget.mjs`(预算检查)

**Interfaces:**
- Produces: `bedroom.glb` 内含节点 `g_shell/g_bed/g_desk/g_props/g_fan_static/fan_pivot(子:fan_blade0-3)/win_glass/lava_blob/keep_tex 各件/anchor_*×7/cam_film/cam_lamp`;烘焙组材质=单张 emissive 贴图(前端统一换 MeshBasicMaterial)

- [ ] **Step 1: 逐组烘焙 DIFFUSE(direct+indirect+color)到 2048 图集**

对 5 个组循环执行(`g_fan_static` 用 512):

```python
import bpy
scn = bpy.data.scenes["bedroom_export"]; bpy.context.window.scene = scn
scn.render.engine = 'CYCLES'; scn.cycles.device = 'GPU'
scn.cycles.samples = 256; scn.render.bake.use_pass_direct = True
scn.render.bake.use_pass_indirect = True; scn.render.bake.use_pass_color = True
scn.render.bake.margin = 8; scn.render.bake.use_selected_to_active = False
def bake_group(gname, size):
    scn2 = bpy.data.scenes["bedroom_export"]; bpy.context.window.scene = scn2
    ob = bpy.data.objects[gname]
    img = bpy.data.images.get(f"lm_{gname}") or bpy.data.images.new(f"lm_{gname}", size, size, float_buffer=False)
    for slot in ob.material_slots:
        m = slot.material; nt = m.node_tree
        node = nt.nodes.get("BAKE_TARGET") or nt.nodes.new('ShaderNodeTexImage')
        node.name = "BAKE_TARGET"; node.image = img
        uv = nt.nodes.get("BAKE_UV") or nt.nodes.new('ShaderNodeUVMap')
        uv.name = "BAKE_UV"; uv.uv_map = "lm"
        nt.links.new(uv.outputs[0], node.inputs['Vector'])
        nt.nodes.active = node
        for n in nt.nodes: n.select = (n == node)
    ob.data.uv_layers["lm"].active = True
    bpy.ops.object.select_all(action='DESELECT')
    ob.select_set(True); bpy.context.view_layer.objects.active = ob
    bpy.ops.object.bake(type='DIFFUSE')
    img.pack()
    print("baked", gname)
bake_group("g_shell", 2048)
```
每组一个 execute 块(烘焙耗时,分块防超时)。`g_bed` 是序幕特写区,同为 2048 但单独占一图。
**烘焙用的是场景里的灯——灯在 Task 1 副本里已删,所以本步开始前先临时把 `cocoeco_bedroom_v2` 的 7 盏灯 `L_*` 复制链接进 `bedroom_export`,全部烘完后再删掉**:

```python
import bpy
scn = bpy.data.scenes["bedroom_export"]; bpy.context.window.scene = scn
src = bpy.data.scenes["cocoeco_bedroom_v2"]
for ob in src.objects:
    if ob.type == 'LIGHT':
        scn.collection.objects.link(ob)   # 共享链接,烘完 unlink
```
(烘完:`scn.collection.objects.unlink(ob)` 同名循环。)

- [ ] **Step 2: 烘焙组换成"单张贴图自发光"材质并删 UV1**

```python
import bpy
scn = bpy.data.scenes["bedroom_export"]; bpy.context.window.scene = scn
for gname in ("g_shell", "g_bed", "g_desk", "g_props", "g_fan_static"):
    ob = bpy.data.objects[gname]
    img = bpy.data.images[f"lm_{gname}"]
    m = bpy.data.materials.new(f"baked_{gname}"); m.use_nodes = True
    nt = m.node_tree; nt.nodes.clear()
    out = nt.nodes.new('ShaderNodeOutputMaterial')
    em = nt.nodes.new('ShaderNodeEmission'); em.inputs['Strength'].default_value = 1.0
    tex = nt.nodes.new('ShaderNodeTexImage'); tex.image = img
    nt.links.new(tex.outputs['Color'], em.inputs['Color'])
    nt.links.new(em.outputs[0], out.inputs['Surface'])
    ob.data.materials.clear(); ob.data.materials.append(m)
    while len(ob.data.uv_layers) > 1:            # 删 UV1,让 lm 变成唯一 UV(glTF 的 TEXCOORD_0)
        for uv in ob.data.uv_layers:
            if uv.name != "lm":
                ob.data.uv_layers.remove(uv); break
    print(gname, "material swapped, uvs:", [u.name for u in ob.data.uv_layers])
```

- [ ] **Step 3: 导出 glTF(含相机与空物体)**

```python
import bpy
scn = bpy.data.scenes["bedroom_export"]; bpy.context.window.scene = scn
bpy.ops.object.select_all(action='SELECT')
bpy.ops.export_scene.gltf(
    filepath="/Users/gaptop/碳交易所/.claude/worktrees/adoring-panini-2b25f8/cocoeco/public/stage/bedroom/bedroom_raw.glb",
    use_selection=True, export_cameras=True, export_extras=True,
    export_apply=True, export_yup=True, export_image_format='AUTO')
print("exported")
```

- [ ] **Step 4: gltf-transform 压缩(draco + webp + prune)**

```bash
cd /Users/gaptop/碳交易所/.claude/worktrees/adoring-panini-2b25f8/cocoeco
npm i -D @gltf-transform/cli
npx gltf-transform optimize public/stage/bedroom/bedroom_raw.glb public/stage/bedroom/bedroom.glb \
  --compress draco --texture-compress webp --texture-size 2048
rm public/stage/bedroom/bedroom_raw.glb
ls -la public/stage/bedroom/
```
预期:bedroom.glb ≤ 8 MB。

- [ ] **Step 5: 写预算检查脚本并跑**

```js
// cocoeco/scripts/check-stage-budget.mjs
import { statSync } from "node:fs";
const LIMIT = 8 * 1024 * 1024;
const size = statSync(new URL("../public/stage/bedroom/bedroom.glb", import.meta.url)).size;
console.log(`bedroom.glb = ${(size / 1048576).toFixed(2)} MB (limit 8 MB)`);
if (size > LIMIT) { console.error("BUDGET EXCEEDED"); process.exit(1); }
```
Run: `node scripts/check-stage-budget.mjs` → 预期 PASS 并打印体积。

- [ ] **Step 6: 烘焙结果肉眼质检 + commit**

在 Blender 里给 `bedroom_export` 设 `cam_film`、Workbench/材质预览渲一帧对照 v8 定妆图(灯光气氛应基本一致,无大块黑斑/接缝);发相册确认。然后:

```bash
git add cocoeco/public/stage/bedroom/bedroom.glb cocoeco/scripts/check-stage-budget.mjs cocoeco/package.json cocoeco/package-lock.json cocoeco/blender/cocoeco-scenes.blend
git commit -m "feat(m2): 烘焙光照并导出 bedroom.glb(draco+webp,≤8MB)"
```

---

### Task 3: 前端依赖 + 舞台状态机(TDD)

**Files:**
- Create: `cocoeco/src/stage/stageMachine.ts`
- Test: `cocoeco/src/stage/stageMachine.test.ts`
- Modify: `cocoeco/package.json`(新增 three/gsap)

**Interfaces:**
- Produces: `type StageState = "loading"|"lampIntro"|"awaitTrace"|"pullback"|"explore"|"advance"`;`type StageEvent = "ASSETS_READY"|"INTRO_DONE"|"TRACE_CLICKED"|"PULLBACK_DONE"|"WINDOW_CLICKED"|"GESTURE_ADVANCE"`;`next(s: StageState, e: StageEvent): StageState | null`(null=非法转移,调用方忽略)

- [ ] **Step 1: 装依赖**

```bash
cd /Users/gaptop/碳交易所/.claude/worktrees/adoring-panini-2b25f8/cocoeco
npm i three gsap && npm i -D @types/three
```

- [ ] **Step 2: 写失败测试**

```ts
// src/stage/stageMachine.test.ts
import { describe, expect, it } from "vitest";
import { next } from "./stageMachine";

describe("stageMachine", () => {
  it("走完幸福路径:loading→lampIntro→awaitTrace→pullback→explore→advance", () => {
    expect(next("loading", "ASSETS_READY")).toBe("lampIntro");
    expect(next("lampIntro", "INTRO_DONE")).toBe("awaitTrace");
    expect(next("awaitTrace", "TRACE_CLICKED")).toBe("pullback");
    expect(next("pullback", "PULLBACK_DONE")).toBe("explore");
    expect(next("explore", "WINDOW_CLICKED")).toBe("advance");
  });
  it("手势兜底:awaitTrace 和 explore 里滑动/滚轮等效推进", () => {
    expect(next("awaitTrace", "GESTURE_ADVANCE")).toBe("pullback");
    expect(next("explore", "GESTURE_ADVANCE")).toBe("advance");
  });
  it("非法转移返回 null(如加载中点击、探索态重复启程)", () => {
    expect(next("loading", "TRACE_CLICKED")).toBeNull();
    expect(next("explore", "TRACE_CLICKED")).toBeNull();
    expect(next("advance", "GESTURE_ADVANCE")).toBeNull();
  });
});
```

- [ ] **Step 3: 跑测试确认失败**

Run: `npm test -- stageMachine` → 预期 FAIL:模块不存在。

- [ ] **Step 4: 实现**

```ts
// src/stage/stageMachine.ts
// 序幕+卧室舞台状态机:纯函数,一切副作用(动画/音频/DOM)由调用方在转移后执行。
export type StageState = "loading" | "lampIntro" | "awaitTrace" | "pullback" | "explore" | "advance";
export type StageEvent =
  | "ASSETS_READY" | "INTRO_DONE" | "TRACE_CLICKED"
  | "PULLBACK_DONE" | "WINDOW_CLICKED" | "GESTURE_ADVANCE";

const TRANSITIONS: Record<StageState, Partial<Record<StageEvent, StageState>>> = {
  loading: { ASSETS_READY: "lampIntro" },
  lampIntro: { INTRO_DONE: "awaitTrace" },
  awaitTrace: { TRACE_CLICKED: "pullback", GESTURE_ADVANCE: "pullback" },
  pullback: { PULLBACK_DONE: "explore" },
  explore: { WINDOW_CLICKED: "advance", GESTURE_ADVANCE: "advance" },
  advance: {},
};

export function next(state: StageState, event: StageEvent): StageState | null {
  return TRANSITIONS[state][event] ?? null;
}
```

- [ ] **Step 5: 测试通过 + 全量回归 + commit**

Run: `npm test` → 预期全绿(原 20 个 + 新 3 个)。

```bash
git add cocoeco/src/stage/ cocoeco/package.json cocoeco/package-lock.json
git commit -m "feat(m2): 舞台状态机 + three/gsap 依赖"
```

---

### Task 4: 资产加载器 + Stage 渲染壳

**Files:**
- Create: `cocoeco/src/stage/loadBedroom.ts`
- Create: `cocoeco/src/stage/Stage.tsx`
- Test: `cocoeco/src/stage/loadBedroom.test.ts`(纯逻辑部分)
- Create: `cocoeco/.claude/launch.json`(若不存在;dev 服务器验证用)

**Interfaces:**
- Consumes: `bedroom.glb`(Task 2 的节点命名)
- Produces:
  - `loadBedroom(url: string): Promise<BedroomAssets>`,`type BedroomAssets = { scene: THREE.Group; camFilm: THREE.PerspectiveCamera; camLamp: THREE.PerspectiveCamera; anchors: Map<string, THREE.Vector3> }`(anchors 键=anchor_* 节点名,值=世界坐标)
  - `applyBakedMaterials(root: THREE.Object3D): void`(导出材质→MeshBasicMaterial;win_glass→透明;lava_blob→橙色发光)
  - `<Stage dict={Dict} onAdvance={() => void} />` 客户端组件:挂 canvas、驱动状态机、渲染循环(吊扇 fan_pivot 每帧 +0.15rad/s)

- [ ] **Step 1: 读 Next.js 16 文档确认动态导入/客户端组件写法**

Run: `ls cocoeco/node_modules/next/dist/docs/01-app/02-guides/ | grep -i -E "lazy|client"` 并阅读对应文件;确认 `next/dynamic` 的 `ssr:false` 在本版本的正确用法后再写 Step 4。

- [ ] **Step 2: 写 applyBakedMaterials 的失败测试**

```ts
// src/stage/loadBedroom.test.ts
import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { applyBakedMaterials, collectAnchors } from "./loadBedroom";

function fakeGroup(): THREE.Group {
  const g = new THREE.Group();
  const baked = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial({
    emissiveMap: new THREE.Texture(), emissive: new THREE.Color(1, 1, 1),
  }));
  baked.name = "g_bed";
  const glass = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial());
  glass.name = "win_glass";
  const anchor = new THREE.Object3D(); anchor.name = "anchor_hs_lamp";
  anchor.position.set(0.3, 0.95, -2.12);
  g.add(baked, glass, anchor);
  return g;
}

describe("loadBedroom helpers", () => {
  it("烘焙组换成 MeshBasicMaterial 并沿用贴图", () => {
    const g = fakeGroup();
    applyBakedMaterials(g);
    const m = (g.getObjectByName("g_bed") as THREE.Mesh).material as THREE.MeshBasicMaterial;
    expect(m.type).toBe("MeshBasicMaterial");
    expect(m.map).not.toBeNull();
  });
  it("窗玻璃变半透明", () => {
    const g = fakeGroup();
    applyBakedMaterials(g);
    const m = (g.getObjectByName("win_glass") as THREE.Mesh).material as THREE.MeshBasicMaterial;
    expect(m.transparent).toBe(true);
    expect(m.opacity).toBeLessThan(0.4);
  });
  it("collectAnchors 抓出全部 anchor_* 的世界坐标", () => {
    const anchors = collectAnchors(fakeGroup());
    expect(anchors.get("anchor_hs_lamp")).toBeInstanceOf(THREE.Vector3);
    expect(anchors.get("anchor_hs_lamp")!.x).toBeCloseTo(0.3);
  });
});
```

- [ ] **Step 3: 跑测试确认失败**

Run: `npm test -- loadBedroom` → FAIL:模块不存在。

- [ ] **Step 4: 实现 loadBedroom.ts**

```ts
// src/stage/loadBedroom.ts
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";

export type BedroomAssets = {
  scene: THREE.Group;
  camFilm: THREE.PerspectiveCamera;
  camLamp: THREE.PerspectiveCamera;
  anchors: Map<string, THREE.Vector3>;
};

const BAKED = new Set(["g_shell", "g_bed", "g_desk", "g_props", "g_fan_static"]);

export function applyBakedMaterials(root: THREE.Object3D): void {
  root.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh)) return;
    const src = obj.material as THREE.MeshStandardMaterial;
    if (BAKED.has(obj.name) || obj.parent && BAKED.has(obj.parent.name)) {
      obj.material = new THREE.MeshBasicMaterial({ map: src.emissiveMap ?? src.map });
    } else if (obj.name === "win_glass") {
      obj.material = new THREE.MeshBasicMaterial({ color: 0x8ab0ff, transparent: true, opacity: 0.15 });
    } else if (obj.name === "lava_blob") {
      obj.material = new THREE.MeshBasicMaterial({ color: 0xff5a1f });
    } else if (src?.map) {
      obj.material = new THREE.MeshBasicMaterial({
        map: src.map, transparent: src.transparent, alphaTest: src.transparent ? 0.05 : 0,
      });
    }
  });
}

export function collectAnchors(root: THREE.Object3D): Map<string, THREE.Vector3> {
  const anchors = new Map<string, THREE.Vector3>();
  root.updateWorldMatrix(true, true);
  root.traverse((obj) => {
    if (obj.name.startsWith("anchor_")) {
      anchors.set(obj.name, obj.getWorldPosition(new THREE.Vector3()));
    }
  });
  return anchors;
}

export async function loadBedroom(url: string): Promise<BedroomAssets> {
  const draco = new DRACOLoader().setDecoderPath("https://www.gstatic.com/draco/versioned/decoders/1.5.7/");
  const loader = new GLTFLoader().setDRACOLoader(draco);
  const gltf = await loader.loadAsync(url);
  applyBakedMaterials(gltf.scene);
  const camFilm = gltf.cameras.find((c) => c.name.includes("cam_film")) as THREE.PerspectiveCamera;
  const camLamp = gltf.cameras.find((c) => c.name.includes("cam_lamp")) as THREE.PerspectiveCamera;
  return { scene: gltf.scene, camFilm, camLamp, anchors: collectAnchors(gltf.scene) };
}
```
(draco 解码器:若离线要求,改为把 `node_modules/three/examples/jsm/libs/draco/` 拷到 `public/draco/` 并 `setDecoderPath("/draco/")`——**采用本地方案,不依赖 gstatic**。)

- [ ] **Step 5: 跑测试通过**

Run: `npm test -- loadBedroom` → PASS×3。

- [ ] **Step 6: 实现 Stage.tsx(渲染壳)**

```tsx
// src/stage/Stage.tsx
"use client";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { loadBedroom, type BedroomAssets } from "./loadBedroom";
import { next, type StageEvent, type StageState } from "./stageMachine";

export type StageHandle = {
  dispatch: (e: StageEvent) => void;
  onState: (fn: (s: StageState) => void) => void;
  assets: () => BedroomAssets | null;
  camera: () => THREE.PerspectiveCamera | null;
};

export function Stage({ onReady, onAdvance }: {
  onReady: (h: StageHandle) => void;
  onAdvance: () => void;
}) {
  const holder = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = holder.current!;
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    el.appendChild(renderer.domElement);
    let assets: BedroomAssets | null = null;
    let cam: THREE.PerspectiveCamera | null = null;
    let state: StageState = "loading";
    const listeners: Array<(s: StageState) => void> = [];
    const clock = new THREE.Clock();
    const dispatch = (e: StageEvent) => {
      const to = next(state, e);
      if (!to) return;
      state = to;
      listeners.forEach((fn) => fn(to));
      if (to === "advance") onAdvance();
    };
    const resize = () => {
      renderer.setSize(el.clientWidth, el.clientHeight);
      if (cam) { cam.aspect = el.clientWidth / el.clientHeight; cam.updateProjectionMatrix(); }
    };
    window.addEventListener("resize", resize);
    let raf = 0;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      const dt = clock.getDelta();
      const pivot = assets?.scene.getObjectByName("fan_pivot");
      if (pivot) pivot.rotation.y += 0.15 * dt;   // 吊扇缓转(glTF Y-up)
      if (assets && cam) renderer.render(assets.scene, cam);
    };
    loadBedroom("/stage/bedroom/bedroom.glb").then((a) => {
      assets = a;
      cam = a.camLamp;   // 开场停在灯特写
      resize();
      dispatch("ASSETS_READY");
    });
    onReady({
      dispatch,
      onState: (fn) => listeners.push(fn),
      assets: () => assets,
      camera: () => cam,
    });
    loop();
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      renderer.dispose();
      el.replaceChildren();
    };
  }, [onReady, onAdvance]);
  return <div ref={holder} className="fixed inset-0 z-40" aria-hidden="true" />;
}
```
(相机切换/编排在 Task 5 通过 `StageHandle.camera` 与 GSAP 完成;`aria-hidden`:canvas 纯装饰,交互全在 DOM 层。)

- [ ] **Step 7: 拷 draco 解码器 + dev 预览验证**

```bash
mkdir -p cocoeco/public/draco && cp cocoeco/node_modules/three/examples/jsm/libs/draco/gltf/* cocoeco/public/draco/
```
`loadBedroom.ts` 用 `setDecoderPath("/draco/")`。建 `.claude/launch.json`(name "cocoeco", `npm run dev`, port 3100),用 preview 工具起服务:临时在 page.tsx 顶部塞 `<Stage …>` 冒烟(或直接做完 Task 7 的门禁再验),`preview_console_logs` 无错、`preview_screenshot` 能看到灯特写画面。

- [ ] **Step 8: 全量测试 + commit**

Run: `npm test && npm run build` → 全绿、构建过。

```bash
git add cocoeco/src/stage/ cocoeco/public/draco/ cocoeco/.claude/launch.json
git commit -m "feat(m2): glTF 加载器 + Stage 渲染壳(烘焙材质/吊扇缓转)"
```

---

### Task 5: 序幕编排(旁白浮现 → 微光痕迹 → 点击拉镜)

**Files:**
- Create: `cocoeco/src/stage/choreography.ts`(纯:构建 GSAP 时间线)
- Create: `cocoeco/src/stage/motes.ts`(微光痕迹 Points + S 曲线路径)
- Test: `cocoeco/src/stage/choreography.test.ts`、`cocoeco/src/stage/motes.test.ts`

**Interfaces:**
- Consumes: `StageHandle`(T4)、`anchors`(anchor_trace / anchor_window)
- Produces:
  - `tracePath(a: Vector3, b: Vector3, t: number): Vector3`(0..1 三次贝塞尔,控制点向上/向窗偏移——灯→窗 S 曲线)
  - `createMotes(a: Vector3, b: Vector3): THREE.Points`(13 粒,可可绿→暖白渐变,name="motes")
  - `updateMotes(points: THREE.Points, elapsed: number): void`(呼吸漂移;reduced 时静止)
  - `buildPullback(cam: PerspectiveCamera, from: {pos,quat,fov}, to: {pos,quat,fov}, opts: {reduced: boolean; onDone(): void}): gsap.core.Timeline`(reduced=true → duration 0 跳切)
  - `extractPose(cam: THREE.Object3D & {fov?: number}): {pos: Vector3; quat: Quaternion; fov: number}`

- [ ] **Step 1: 写失败测试**

```ts
// src/stage/motes.test.ts
import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { tracePath, createMotes } from "./motes";

const A = new THREE.Vector3(2.12, 1.25, -0.3);   // 灯上方(glTF Y-up 示意)
const B = new THREE.Vector3(2.53, 1.65, 0);       // 窗

describe("motes", () => {
  it("路径两端命中起终点", () => {
    expect(tracePath(A, B, 0).distanceTo(A)).toBeLessThan(1e-6);
    expect(tracePath(A, B, 1).distanceTo(B)).toBeLessThan(1e-6);
  });
  it("路径中段高于两端(向上弧)", () => {
    const mid = tracePath(A, B, 0.5);
    expect(mid.y).toBeGreaterThan(Math.max(A.y, B.y) - 0.01);
  });
  it("生成 13 粒微光", () => {
    const pts = createMotes(A, B);
    expect(pts.geometry.getAttribute("position").count).toBe(13);
    expect(pts.name).toBe("motes");
  });
});
```

```ts
// src/stage/choreography.test.ts
import { describe, expect, it, vi } from "vitest";
import * as THREE from "three";
import { buildPullback, extractPose } from "./choreography";

function cam(x: number): THREE.PerspectiveCamera {
  const c = new THREE.PerspectiveCamera(40); c.position.set(x, 0, 0); return c;
}

describe("choreography", () => {
  it("reduced-motion:时间线总时长为 0(跳切)且完成回调触发", async () => {
    const onDone = vi.fn();
    const c = cam(0);
    const tl = buildPullback(c, extractPose(cam(0)), extractPose(cam(5)), { reduced: true, onDone });
    tl.progress(1);
    expect(tl.duration()).toBe(0);
    expect(onDone).toHaveBeenCalled();
    expect(c.position.x).toBeCloseTo(5);
  });
  it("正常模式:时长 2.2s±,结束位姿=目标", () => {
    const onDone = vi.fn();
    const c = cam(0);
    const tl = buildPullback(c, extractPose(cam(0)), extractPose(cam(5)), { reduced: false, onDone });
    tl.progress(1);
    expect(tl.duration()).toBeGreaterThan(1.5);
    expect(c.position.x).toBeCloseTo(5);
    expect(onDone).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `npm test -- motes choreography` → FAIL:模块不存在。

- [ ] **Step 3: 实现 motes.ts**

```ts
// src/stage/motes.ts
import * as THREE from "three";

export function tracePath(a: THREE.Vector3, b: THREE.Vector3, t: number): THREE.Vector3 {
  const c1 = a.clone().lerp(b, 0.3); c1.y += 0.35;
  const c2 = a.clone().lerp(b, 0.75); c2.y += 0.15;
  return new THREE.CubicBezierCurve3(a, c1, c2, b).getPoint(t);
}

const COUNT = 13;

export function createMotes(a: THREE.Vector3, b: THREE.Vector3): THREE.Points {
  const pos = new Float32Array(COUNT * 3);
  const col = new Float32Array(COUNT * 3);
  const warm = new THREE.Color("#f5c97b"), green = new THREE.Color("#7ad0a6");
  for (let i = 0; i < COUNT; i++) {
    const p = tracePath(a, b, i / (COUNT - 1));
    pos.set([p.x, p.y, p.z], i * 3);
    const c = warm.clone().lerp(green, i / (COUNT - 1));
    col.set([c.r, c.g, c.b], i * 3);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
  geo.userData.base = pos.slice();
  const mat = new THREE.PointsMaterial({
    size: 0.035, vertexColors: true, transparent: true, opacity: 0.9,
    blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true,
  });
  const pts = new THREE.Points(geo, mat);
  pts.name = "motes";
  return pts;
}

export function updateMotes(points: THREE.Points, elapsed: number): void {
  const attr = points.geometry.getAttribute("position") as THREE.BufferAttribute;
  const base = points.geometry.userData.base as Float32Array;
  for (let i = 0; i < attr.count; i++) {
    attr.setY(i, base[i * 3 + 1] + Math.sin(elapsed * 1.2 + i * 1.7) * 0.012);
  }
  attr.needsUpdate = true;
  (points.material as THREE.PointsMaterial).opacity = 0.75 + Math.sin(elapsed * 2.1) * 0.15;
}
```

- [ ] **Step 4: 实现 choreography.ts**

```ts
// src/stage/choreography.ts
import * as THREE from "three";
import gsap from "gsap";

export type CamPose = { pos: THREE.Vector3; quat: THREE.Quaternion; fov: number };

export function extractPose(cam: THREE.Object3D): CamPose {
  return {
    pos: cam.position.clone(),
    quat: cam.quaternion.clone(),
    fov: (cam as THREE.PerspectiveCamera).fov ?? 40,
  };
}

export function buildPullback(
  cam: THREE.PerspectiveCamera,
  from: CamPose, to: CamPose,
  opts: { reduced: boolean; onDone: () => void },
): gsap.core.Timeline {
  const dur = opts.reduced ? 0 : 2.2;
  const t = { v: 0 };
  const qa = from.quat.clone(), qb = to.quat.clone();
  const tl = gsap.timeline({ paused: false, onComplete: opts.onDone });
  tl.to(t, {
    v: 1, duration: dur, ease: "power2.inOut",
    onUpdate() {
      cam.position.lerpVectors(from.pos, to.pos, t.v);
      cam.quaternion.slerpQuaternions(qa, qb, t.v);
      cam.fov = from.fov + (to.fov - from.fov) * t.v;
      cam.updateProjectionMatrix();
    },
  });
  if (dur === 0) {   // 跳切也要落到终点
    cam.position.copy(to.pos); cam.quaternion.copy(qb);
    cam.fov = to.fov; cam.updateProjectionMatrix();
  }
  return tl;
}
```

- [ ] **Step 5: 测试通过**

Run: `npm test -- motes choreography` → PASS×5。

- [ ] **Step 6: 接入 Stage(motes 挂载、痕迹点击时序)**

Stage.tsx 的 `loadBedroom(...).then` 内补:

```ts
import { createMotes, updateMotes } from "./motes";
// then 回调里:
const trace = a.anchors.get("anchor_trace")!;
const win = a.anchors.get("anchor_window")!;
const motes = createMotes(trace, trace.clone().lerp(win, 0.12));  // 开场蜷在灯上方
a.scene.add(motes);
```
loop 里 `if (assets) updateMotes(assets.scene.getObjectByName("motes") as THREE.Points, clock.elapsedTime)`。
状态转移到 `pullback` 时(onState 监听):用 GSAP 把 motes 各粒沿 `tracePath(trace, win, t)` 推到窗前(2.2s,与拉镜同步;reduced 直接 setPosition),同时 `buildPullback(cam, extractPose(camLamp), extractPose(camFilm), { reduced, onDone: () => dispatch("PULLBACK_DONE") })`。

- [ ] **Step 7: 全量测试 + commit**

Run: `npm test` → 全绿。

```bash
git add cocoeco/src/stage/
git commit -m "feat(m2): 序幕编排——微光痕迹粒子 + 灯特写拉镜时间线(reduced 跳切)"
```

---

### Task 6: DOM 覆盖层(旁白/热点/知识卡/推进/手势)

**Files:**
- Create: `cocoeco/src/stage/hotspots.ts`(纯:投影与热点表)
- Create: `cocoeco/src/components/StageOverlay.tsx`
- Test: `cocoeco/src/stage/hotspots.test.ts`、`cocoeco/src/components/StageOverlay.test.tsx`

**Interfaces:**
- Consumes: `StageHandle`(T4)、`stageMachine` 状态、`dict.scenes.bedroom.cards`(M1 词典,顺序=台灯0/空调1/外卖盒2/手机3)、`dict.ui.hintTrace/hintScroll/loading`、`KnowledgeCard`(M1 组件原样复用)
- Produces:
  - `BEDROOM_HOTSPOTS: ReadonlyArray<{ id: "lamp"|"ac"|"takeout"|"charger"; anchor: string; cardIndex: 0|1|2|3 }>`
  - `projectToScreen(world: Vector3, cam: PerspectiveCamera, w: number, h: number): { x: number; y: number; inFront: boolean }`
  - `<StageOverlay state={StageState} …/>`:序幕旁白逐行浮现(6 行 narration)、痕迹按钮(hintTrace)、探索态 4 热点按钮+弹卡(details 复用 KnowledgeCard)、窗口推进按钮、手势监听(wheel/touchmove/ArrowDown → GESTURE_ADVANCE)

- [ ] **Step 1: 写失败测试**

```ts
// src/stage/hotspots.test.ts
import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { BEDROOM_HOTSPOTS, projectToScreen } from "./hotspots";

describe("hotspots", () => {
  it("热点表:4 项、cardIndex 覆盖 0-3、锚点名规范", () => {
    expect(BEDROOM_HOTSPOTS).toHaveLength(4);
    expect(new Set(BEDROOM_HOTSPOTS.map((h) => h.cardIndex))).toEqual(new Set([0, 1, 2, 3]));
    for (const h of BEDROOM_HOTSPOTS) expect(h.anchor).toMatch(/^anchor_hs_/);
  });
  it("镜头正前方的点投影到画面中心附近且 inFront", () => {
    const cam = new THREE.PerspectiveCamera(40, 1);
    cam.position.set(0, 0, 5); cam.lookAt(0, 0, 0); cam.updateMatrixWorld();
    const p = projectToScreen(new THREE.Vector3(0, 0, 0), cam, 800, 600);
    expect(p.inFront).toBe(true);
    expect(p.x).toBeCloseTo(400); expect(p.y).toBeCloseTo(300);
  });
  it("镜头背后的点 inFront=false", () => {
    const cam = new THREE.PerspectiveCamera(40, 1);
    cam.position.set(0, 0, 5); cam.lookAt(0, 0, 0); cam.updateMatrixWorld();
    expect(projectToScreen(new THREE.Vector3(0, 0, 10), cam, 800, 600).inFront).toBe(false);
  });
});
```

```tsx
// src/components/StageOverlay.test.tsx
import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { StageOverlay } from "./StageOverlay";
import { zhForTest } from "@/content/dictionary";

const noop = () => null;

describe("StageOverlay", () => {
  it("awaitTrace:显示痕迹按钮(hintTrace 文案),点击派发 TRACE_CLICKED", () => {
    const dispatch = vi.fn();
    render(<StageOverlay state="awaitTrace" dict={zhForTest} dispatch={dispatch} project={noop} />);
    const btn = screen.getByRole("button", { name: zhForTest.ui.hintTrace });
    fireEvent.click(btn);
    expect(dispatch).toHaveBeenCalledWith("TRACE_CLICKED");
  });
  it("explore:渲染 4 个热点按钮与窗口推进按钮", () => {
    render(<StageOverlay state="explore" dict={zhForTest} dispatch={vi.fn()} project={noop} />);
    expect(screen.getAllByTestId("hotspot")).toHaveLength(4);
    expect(screen.getByTestId("advance-window")).toBeTruthy();
  });
  it("explore:滚轮触发 GESTURE_ADVANCE", () => {
    const dispatch = vi.fn();
    render(<StageOverlay state="explore" dict={zhForTest} dispatch={dispatch} project={noop} />);
    fireEvent.wheel(window, { deltaY: 120 });
    expect(dispatch).toHaveBeenCalledWith("GESTURE_ADVANCE");
  });
  it("loading:显示加载文案", () => {
    render(<StageOverlay state="loading" dict={zhForTest} dispatch={vi.fn()} project={noop} />);
    expect(screen.getByText(zhForTest.ui.loading)).toBeTruthy();
  });
});
```
(`zhForTest`:在 dictionary.ts 导出 `export const zhForTest = zh;` 供测试;若已有等效导出则复用。`project` prop 类型 `(anchor: string) => {x,y,inFront}|null`,null=尚无相机,热点隐藏。)

- [ ] **Step 2: 跑测试确认失败**

Run: `npm test -- hotspots StageOverlay` → FAIL。

- [ ] **Step 3: 实现 hotspots.ts**

```ts
// src/stage/hotspots.ts
import * as THREE from "three";

export const BEDROOM_HOTSPOTS = [
  { id: "lamp", anchor: "anchor_hs_lamp", cardIndex: 0 },
  { id: "ac", anchor: "anchor_hs_ac", cardIndex: 1 },
  { id: "takeout", anchor: "anchor_hs_takeout", cardIndex: 2 },
  { id: "charger", anchor: "anchor_hs_charger", cardIndex: 3 },
] as const;

export function projectToScreen(
  world: THREE.Vector3, cam: THREE.PerspectiveCamera, w: number, h: number,
): { x: number; y: number; inFront: boolean } {
  const v = world.clone().project(cam);
  return { x: (v.x * 0.5 + 0.5) * w, y: (-v.y * 0.5 + 0.5) * h, inFront: v.z < 1 };
}
```

- [ ] **Step 4: 实现 StageOverlay.tsx**

组件签名(必须一字不差,测试按它写):

```tsx
// src/components/StageOverlay.tsx
"use client";
import { useEffect, useRef, useState } from "react";
import type { Dict } from "@/content/dictionary";
import type { StageEvent, StageState } from "@/stage/stageMachine";
import { BEDROOM_HOTSPOTS } from "@/stage/hotspots";
import { KnowledgeCard } from "./KnowledgeCard";

export type ProjectFn = (anchor: string) => { x: number; y: number; inFront: boolean } | null;

export function StageOverlay({ state, dict, dispatch, project }: {
  state: StageState;
  dict: Dict;
  dispatch: (e: StageEvent) => void;
  project: ProjectFn;   // null = 相机未就绪,该锚点的按钮不渲染
}) { /* 分支渲染见下述行为清单 */ }
```

行为清单:固定层 `fixed inset-0 z-50 pointer-events-none`,可点元素单独 `pointer-events-auto`;
- `loading`:居中 `dict.ui.loading` + 微光呼吸 CSS(`animate-pulse` 即可);
- `lampIntro`:`dict.scenes.prologue.narration` 6 行逐行淡入(CSS `animation-delay: i*900ms`;reduced 时全部立即可见),末行结束后调用 `dispatch("INTRO_DONE")`(`onAnimationEnd` 于最后一行;reduced 时 `useEffect` 直接派发);
- `awaitTrace`:痕迹按钮绝对定位在 `project("anchor_trace")` 坐标,样式为发光圆点+`hintTrace` 文案标签,`aria-label=hintTrace`;同屏角落给 `hintScroll` 小字(手势兜底提示);
- `pullback`:无交互,旁白区淡出;
- `explore`:`dict.scenes.bedroom.interactionHint` 顶部浮现;4 热点按钮(`data-testid="hotspot"`)定位于各 anchor 投影点,点击 → 打开浮层卡(复用 `<KnowledgeCard {...cards[cardIndex]} />` 包在 `pointer-events-auto` 容器,带 `dict.ui.cardClose` 关闭钮);窗口按钮(`data-testid="advance-window"`)在 `anchor_window` 投影点,发光环样式,`aria-label` 用 `dict.scenes.bedroom.transition`;
- 手势:`useEffect` 挂 `wheel`/`keydown(ArrowDown/PageDown/Space)`/`touchmove`,`state==="awaitTrace"||state==="explore"` 时派发 `GESTURE_ADVANCE`(节流 800ms);
- 投影刷新:`requestAnimationFrame` 循环里 `setTick` 或由父组件每帧传 `project`;实现取 rAF 内部 setState 节流至 ~30fps。

- [ ] **Step 5: 测试通过 + 全量回归**

Run: `npm test` → 全绿。

- [ ] **Step 6: commit**

```bash
git add cocoeco/src/stage/hotspots.ts cocoeco/src/components/StageOverlay.tsx cocoeco/src/stage/hotspots.test.ts cocoeco/src/components/StageOverlay.test.tsx cocoeco/src/content/dictionary.ts
git commit -m "feat(m2): DOM 覆盖层——旁白浮现/热点投影按钮/知识卡/窗口推进/手势兜底"
```

---

### Task 7: 门禁与降级 + 页面集成 + 终检

**Files:**
- Create: `cocoeco/src/stage/capability.ts`(纯:分档判定)
- Create: `cocoeco/src/components/ImmersiveApp.tsx`
- Modify: `cocoeco/src/app/page.tsx`(顶部挂 `<ImmersiveApp />`)
- Test: `cocoeco/src/stage/capability.test.ts`
- Create: `cocoeco/public/stage/bedroom/fallback.jpg`(v8 定妆图 1600px JPEG,静态降级底图)

**Interfaces:**
- Consumes: Task 3-6 全部;`dict.ui.readingMode/backToImmersive/enterReading/liteMode/reducedMotion`
- Produces: `decideTier(env: { webgl2: boolean; deviceMemory?: number; reducedMotion: boolean; saveData?: boolean }): "full" | "static" | "reading"`

- [ ] **Step 1: 写 capability 失败测试**

```ts
// src/stage/capability.test.ts
import { describe, expect, it } from "vitest";
import { decideTier } from "./capability";

describe("decideTier", () => {
  it("全能设备 → full(reducedMotion 只影响动画不降档)", () => {
    expect(decideTier({ webgl2: true, deviceMemory: 8, reducedMotion: false })).toBe("full");
    expect(decideTier({ webgl2: true, deviceMemory: 8, reducedMotion: true })).toBe("full");
  });
  it("无 WebGL2 → static;省流模式 → static", () => {
    expect(decideTier({ webgl2: false, reducedMotion: false })).toBe("static");
    expect(decideTier({ webgl2: true, saveData: true, reducedMotion: false })).toBe("static");
  });
  it("内存 <2GB → reading", () => {
    expect(decideTier({ webgl2: true, deviceMemory: 1, reducedMotion: false })).toBe("reading");
  });
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `npm test -- capability` → FAIL。

- [ ] **Step 3: 实现 capability.ts**

```ts
// src/stage/capability.ts
export type Tier = "full" | "static" | "reading";

export function decideTier(env: {
  webgl2: boolean; deviceMemory?: number; reducedMotion: boolean; saveData?: boolean;
}): Tier {
  if (env.deviceMemory !== undefined && env.deviceMemory < 2) return "reading";
  if (!env.webgl2 || env.saveData) return "static";
  return "full";   // reduced-motion 走 full 但全程跳切(spec:reduced ≠ 降级)
}

export function detectEnv(): Parameters<typeof decideTier>[0] {
  const canvas = document.createElement("canvas");
  const nav = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };
  return {
    webgl2: !!canvas.getContext("webgl2"),
    deviceMemory: nav.deviceMemory,
    saveData: nav.connection?.saveData,
    reducedMotion: matchMedia("(prefers-reduced-motion: reduce)").matches,
  };
}
```

- [ ] **Step 4: 测试通过**

Run: `npm test -- capability` → PASS×3。

- [ ] **Step 5: 实现 ImmersiveApp.tsx 并接入 page.tsx**

组件骨架(状态与分支结构必须一致):

```tsx
// src/components/ImmersiveApp.tsx
"use client";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { useDict } from "@/i18n/I18nProvider";
import { decideTier, detectEnv, type Tier } from "@/stage/capability";

const Stage = dynamic(() => import("@/stage/Stage").then((m) => m.Stage), { ssr: false });

export function ImmersiveApp() {
  const dict = useDict();
  const [tier, setTier] = useState<Tier | null>(null);        // null = SSR/未定档 → 只渲染阅读层
  const [dismissed, setDismissed] = useState(false);           // 用户点了"阅读模式"或已 advance
  useEffect(() => {
    if (sessionStorage.getItem("cocoecoMode") === "reading") { setDismissed(true); return; }
    const q = new URLSearchParams(location.search).get("tier"); // 调试口:?tier=static
    setTier(q === "static" ? "static" : decideTier(detectEnv()));
  }, []);
  if (dismissed || tier === null || tier === "reading") return null; /* 阅读层在下方长页 */
  /* tier==="full" → <Stage…/>+<StageOverlay…/>;tier==="static" → fallback.jpg+固定热点 */
}
```

要点:
- `"use client"`;`useEffect` 里 `detectEnv()+decideTier()` 定档(SSR 首帧渲染 null,阅读层天然兜底=SEO 安全);
- `full`:`next/dynamic(() => import("@/stage/Stage"), { ssr: false })` 挂 Stage+StageOverlay;挂载期间 `document.body.style.overflow = "hidden"`(卸载恢复);`onAdvance` → 关舞台、恢复滚动、`document.getElementById("city")?.scrollIntoView({ behavior: reduced ? "auto" : "smooth" })`(M3 换帧序列过场);
- `static`:全屏 `fallback.jpg`(`<img>`,alt 用 `dict.meta.ogImageAlt`)+ 固定百分比定位的 4 热点按钮(复用 StageOverlay 的卡浮层;position 用常量表 `{lamp:{x:"28%",y:"52%"},…}` 按定妆图手标)+ 顶部 `dict.ui.liteMode` 提示;
- 右上角常驻按钮:`dict.ui.readingMode` → 关闭舞台层记 `sessionStorage.cocoecoMode="reading"`;阅读态页顶给 `dict.ui.backToImmersive` 按钮;
- page.tsx 在 `<TopNav />` 后插 `<ImmersiveApp />`,其余不动(长页=阅读层始终在 DOM)。

fallback.jpg 生成:
```bash
sips -s format jpeg -s formatOptions 80 --resampleWidth 1600 cocoeco/lookdev/bedroom-v8.png --out cocoeco/public/stage/bedroom/fallback.jpg
```

- [ ] **Step 6: preview 全流程验证(必须逐条过)**

用 preview 工具起 dev(port 3100),依次核:
1. `preview_console_logs` 无报错;glb 网络请求 200 且 ≤8MB;
2. 开场:灯特写 + 旁白逐行 + 痕迹发光点(`preview_snapshot` 验 hintTrace 文案在 DOM);
3. `preview_click` 痕迹按钮 → 拉镜(截图对比:终帧构图=v8 定妆图机位)→ explore 态 4 热点可见;
4. 点热点 → 知识卡文案=词典 cards[i];点窗 → 平滑滚到 #city;
5. `preview_resize` mobile 375×812:热点不重叠、文字可读;
6. DevTools 模拟 `prefers-reduced-motion` (preview_resize colorScheme 无关,用 `preview_eval` 覆写 matchMedia 后 reload)→ 全部跳切;
7. `preview_eval` 强制 `decideTier→"static"` 路径(临时 query 参数 `?tier=static` 实现,代码里支持)→ 静态图+热点可用。
截图发相册给用户。

- [ ] **Step 7: 全量终检 + commit**

Run: `cd cocoeco && npm test && npm run lint && npm run build` → 全绿无警告。

```bash
git add cocoeco/src/ cocoeco/public/stage/
git commit -m "feat(m2): 沉浸门禁与三级降级 + 页面集成——序幕卧室舞台可玩"
```

---

## 非目标(M2 不做,防蔓延)

- 城市幕 3D、Blender 帧序列过场(M3;点窗暂用平滑滚动到 #city 阅读段);
- 音效(M7;痕迹点击处只留 TODO 注释标记音频解锁点);
- 微光进度条与舞台联动改造、章节菜单跳幕接舞台(M3);
- 16 语翻译(M8);
- lava_blob 气泡动画与窗口呼吸光(M3 微动效补强;M2 只有吊扇缓转+微粒漂移)。

## 验收清单(对 spec)

- [x] 序幕点击"台灯上方的微光痕迹"启程(spec §3 幕表)→ Task 5/6
- [x] 过场=镜头移动、点击推进定时播放一次、非滚动擦除 → Task 5
- [x] 卧室物件点击 → 知识卡×4 → Task 6
- [x] 半开的窗=推进物件,悬停发光 → Task 6
- [x] 滚轮/滑动/方向键兜底 → Task 6
- [x] reduced-motion 跳切、低端静态降级、阅读模式 → Task 7
- [x] 文字全 DOM、SEO 层不受损 → Task 6/7 架构
- [x] 3D 资产无文字 → Task 1/2(烘焙贴图来自无文字场景)
