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
  onFrame: (fn: (elapsed: number) => void) => void;
};

export function Stage({ onReady, onAdvance }: {
  onReady: (h: StageHandle) => void;
  onAdvance: () => void;
}) {
  const holder = useRef<HTMLDivElement>(null);
  const cbs = useRef({ onReady, onAdvance });
  cbs.current = { onReady, onAdvance };

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
      const pivot = assets?.scene.getObjectByName("fan_pivot");
      if (pivot) pivot.rotation.y += 0.15 * dt; // 吊扇缓转(glTF Y-up)
      frameListeners.forEach((fn) => fn(elapsed));
      if (assets && cam) renderer.render(assets.scene, cam);
    };

    loadBedroom("/stage/bedroom/bedroom.glb").then((a) => {
      if (disposed) return;
      assets = a;
      cam = a.camLamp; // 开场停在灯特写
      resize();
      dispatch("ASSETS_READY");
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
