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
  cbs.current = { onReady, onAdvance, reduced };

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
    const clock = new THREE.Clock();

    const dispatch = (e: StageEvent) => {
      const to = next(state, e);
      if (!to) return;
      state = to;
      stateListeners.forEach((fn) => fn(to));
      if (to === "advance") cbs.current.onAdvance();
    };

    const resize = () => {
      renderer.setSize(el.clientWidth, el.clientHeight);
      if (cam) {
        cam.aspect = el.clientWidth / el.clientHeight;
        cam.updateProjectionMatrix();
      }
    };
    window.addEventListener("resize", resize);

    let raf = 0;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      const dt = clock.getDelta();
      const elapsed = clock.elapsedTime;
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
        onDone: () => dispatch("PULLBACK_DONE"),
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
      cam = a.camLamp; // 开场停在灯特写
      const trace = a.anchors.get("anchor_trace")!;
      const win = a.anchors.get("anchor_window")!;
      // 开场:痕迹蜷在灯上方(路径前 12%)
      const motes = createMotes(trace, trace.clone().lerp(win, 0.12));
      a.scene.add(motes);
      resize();
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div ref={holder} className="fixed inset-0 z-40" aria-hidden="true" />;
}
