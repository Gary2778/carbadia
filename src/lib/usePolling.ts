"use client";

import { useEffect, useRef } from "react";

/**
 * 可见性感知的轮询:页面在前台时每 `ms` 执行一次 `fn`;切到后台(document.hidden)时
 * 完全停掉定时器,回到前台时立即执行一次并恢复 → 后台不空跑省电/省流量,回前台数据即时刷新。
 *
 * `fn` 存进 ref 并每次渲染更新,所以闭包始终新鲜,无需把它放进依赖。
 */
export function usePolling(fn: () => void, ms: number) {
  const saved = useRef(fn);
  saved.current = fn;

  useEffect(() => {
    let id: ReturnType<typeof setInterval> | null = null;
    const stop = () => {
      if (id !== null) {
        clearInterval(id);
        id = null;
      }
    };
    const start = () => {
      stop();
      saved.current();
      id = setInterval(() => saved.current(), ms);
    };
    const onVis = () => {
      if (document.hidden) stop();
      else start();
    };
    if (!document.hidden) start();
    document.addEventListener("visibilitychange", onVis);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [ms]);
}
