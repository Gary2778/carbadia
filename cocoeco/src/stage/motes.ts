import * as THREE from "three";

// 可可的痕迹:灯上方→窗前的 S 曲线(三次贝塞尔,控制点向上偏移成弧)。
export function tracePath(a: THREE.Vector3, b: THREE.Vector3, t: number): THREE.Vector3 {
  const c1 = a.clone().lerp(b, 0.3);
  c1.y += 0.35;
  const c2 = a.clone().lerp(b, 0.75);
  c2.y += 0.15;
  return new THREE.CubicBezierCurve3(a, c1, c2, b).getPoint(t);
}

const COUNT = 13;

export function createMotes(a: THREE.Vector3, b: THREE.Vector3): THREE.Points {
  const pos = new Float32Array(COUNT * 3);
  const col = new Float32Array(COUNT * 3);
  const warm = new THREE.Color("#f5c97b");
  const green = new THREE.Color("#7ad0a6");
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
    size: 0.035,
    vertexColors: true,
    transparent: true,
    opacity: 0.9,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    sizeAttenuation: true,
  });
  const pts = new THREE.Points(geo, mat);
  pts.name = "motes";
  return pts;
}

// 呼吸漂移;reduced-motion 时调用方不调它即可(粒子静止)。
export function updateMotes(points: THREE.Points, elapsed: number): void {
  const attr = points.geometry.getAttribute("position") as THREE.BufferAttribute;
  const base = points.geometry.userData.base as Float32Array;
  for (let i = 0; i < attr.count; i++) {
    attr.setY(i, base[i * 3 + 1] + Math.sin(elapsed * 1.2 + i * 1.7) * 0.012);
  }
  attr.needsUpdate = true;
  (points.material as THREE.PointsMaterial).opacity = 0.75 + Math.sin(elapsed * 2.1) * 0.15;
}

// 拉镜时把痕迹推向窗前:重设各粒沿完整路径的分布(GSAP 对 t 补间时逐帧调用)。
export function scatterMotesAlong(points: THREE.Points, a: THREE.Vector3, b: THREE.Vector3, t: number): void {
  const attr = points.geometry.getAttribute("position") as THREE.BufferAttribute;
  const base = points.geometry.userData.base as Float32Array;
  for (let i = 0; i < attr.count; i++) {
    const ti = (i / (attr.count - 1)) * t;
    const p = tracePath(a, b, ti);
    base[i * 3] = p.x;
    base[i * 3 + 1] = p.y;
    base[i * 3 + 2] = p.z;
    attr.setXYZ(i, p.x, p.y, p.z);
  }
  attr.needsUpdate = true;
}
