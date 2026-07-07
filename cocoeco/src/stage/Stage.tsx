"use client";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { loadBedroom, type BedroomAssets } from "./loadBedroom";
import { next, type StageEvent, type StageState } from "./stageMachine";
import gsap from "gsap";
import { createMotes, updateMotes, scatterMotesAlong } from "./motes";
import { buildPullback, extractPose } from "./choreography";

export type StageHandle = {
  dispatch: (e: StageEvent) => void;
  onState: (fn: (s: StageState) => void) => void;
  assets: () => BedroomAssets | null;
  camera: () => THREE.PerspectiveCamera | null;
  onFrame: (fn: (elapsed: number) => void) => void;
};

export function Stage({ reduced, onReady, onAdvance }: {
  reduced: boolean;
  onReady: (h: StageHandle) => void;
  onAdvance: () => void;
}) {
  const holder = useRef<HTMLDivElement>(null);
  const cbs = useRef({ onReady, onAdvance, reduced });
  useEffect(() => {
    cbs.current = { onReady, onAdvance, reduced };
  });

  useEffect(() => {
    const el = holder.current!;
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.NoToneMapping; // AgX 已烙进烘焙贴图
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    el.appendChild(renderer.domElement);

    let assets: BedroomAssets | null = null;
    let cam: THREE.PerspectiveCamera | null = null;
    let state: StageState = "loading";
    let disposed = false;
    const stateListeners: Array<(s: StageState) => void> = [];
    const frameListeners: Array<(elapsed: number) => void> = [];
    const t0 = performance.now();
    let lastT = t0;

    // 队列化派发:监听器里再派发(如跳切同步完成)只入队,
    // 保证所有监听器按状态先后顺序收到通知,不会被重入的旧状态覆盖。
    let dispatching = false;
    const queue: StageEvent[] = [];
    const dispatch = (e: StageEvent) => {
      queue.push(e);
      if (dispatching) return;
      dispatching = true;
      while (queue.length) {
        const ev = queue.shift()!;
        const to = next(state, ev);
        if (!to) continue;
        state = to;
        stateListeners.forEach((fn) => fn(to));
        if (to === "advance") cbs.current.onAdvance();
      }
      dispatching = false;
    };

    // 窄屏(竖屏)时保持水平视野不变:纵向 fov 按基准纵横比反推,构图不被裁掉左右
    const fitFov = (c: THREE.PerspectiveCamera) => {
      const baseFov = c.userData.baseFov as number | undefined;
      const baseAspect = c.userData.baseAspect as number | undefined;
      if (!baseFov || !baseAspect) return;
      if (c.aspect >= baseAspect) {
        c.fov = baseFov;
        return;
      }
      const t = (Math.tan((baseFov * Math.PI) / 360) * baseAspect) / c.aspect;
      c.fov = Math.min((Math.atan(t) * 360) / Math.PI, 85);
    };
    const resize = () => {
      renderer.setSize(el.clientWidth, el.clientHeight);
      if (cam) {
        cam.aspect = el.clientWidth / el.clientHeight;
        fitFov(cam);
        cam.updateProjectionMatrix();
      }
    };
    window.addEventListener("resize", resize);

    let raf = 0;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      const now = performance.now();
      const dt = Math.min((now - lastT) / 1000, 0.1);
      lastT = now;
      const elapsed = (now - t0) / 1000;
      if (assets) {
        const pivot = assets.scene.getObjectByName("fan_pivot");
        if (pivot && !cbs.current.reduced) pivot.rotation.y += 0.15 * dt; // 吊扇缓转
        const motes = assets.scene.getObjectByName("motes") as THREE.Points | undefined;
        if (motes && !cbs.current.reduced) updateMotes(motes, elapsed);
      }
      frameListeners.forEach((fn) => fn(elapsed));
      if (assets && cam) renderer.render(assets.scene, cam);
    };

    // 序幕编排:TRACE 点击(或手势)→ 拉镜 + 微光沿 S 曲线飘向窗前
    stateListeners.push((s) => {
      if (s !== "pullback" || !assets || !cam) return;
      const trace = assets.anchors.get("anchor_trace")!;
      const win = assets.anchors.get("anchor_window")!;
      const motes = assets.scene.getObjectByName("motes") as THREE.Points;
      const reduced = cbs.current.reduced;
      buildPullback(cam, extractPose(assets.camLamp), extractPose(assets.camFilm), {
        reduced,
        onDone: () => {
          // 落位到全屋机位后,基准视野切换为 cam_film 的,再按当前视口适配
          cam!.userData.baseFov = assets!.camFilm.userData.baseFov;
          cam!.userData.baseAspect = assets!.camFilm.userData.baseAspect;
          resize();
          dispatch("PULLBACK_DONE");
        },
      });
      if (reduced) {
        scatterMotesAlong(motes, trace, win, 1);
      } else {
        const t = { v: 0.12 };
        gsap.to(t, {
          v: 1,
          duration: 2.2,
          ease: "power2.inOut",
          onUpdate: () => scatterMotesAlong(motes, trace, win, t.v),
        });
      }
    });

    loadBedroom("/stage/bedroom/bedroom.glb").then((a) => {
      if (disposed) return;
      assets = a;
      for (const c of [a.camLamp, a.camFilm]) {
        c.userData.baseFov = c.fov;
        c.userData.baseAspect = c.aspect || 1.2308; // 导出基准 1600×1300
      }
      cam = a.camLamp; // 开场停在灯特写
      const trace = a.anchors.get("anchor_trace")!;
      const win = a.anchors.get("anchor_window")!;
      // 开场:痕迹蜷在灯上方(路径前 12%)
      const motes = createMotes(trace, trace.clone().lerp(win, 0.12));
      a.scene.add(motes);
      resize();
      if (process.env.NODE_ENV === "development") {
        (window as unknown as Record<string, unknown>).__stage = Object.assign(
          Object.create(Object.getPrototypeOf(a)),
          a,
          { state: () => state, reduced: () => cbs.current.reduced, dispatch },
        );
      }
      dispatch("ASSETS_READY");
      // TODO(M7): 首次 TRACE_CLICKED 是浏览器音频解锁点,环境音在此淡入
    });

    cbs.current.onReady({
      dispatch,
      onState: (fn) => stateListeners.push(fn),
      assets: () => assets,
      camera: () => cam,
      onFrame: (fn) => frameListeners.push(fn),
    });
    loop();

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      renderer.dispose();
      el.replaceChildren();
    };
    // 回调经 cbs ref 转发,挂载一次即可
  }, []);

  return <div ref={holder} className="fixed inset-0 z-40" aria-hidden="true" />;
}
