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

// 灯特写 → 全屋机位的拉镜。reduced=true 时长 0(跳切),但位姿一样落到终点。
export function buildPullback(
  cam: THREE.PerspectiveCamera,
  from: CamPose,
  to: CamPose,
  opts: { reduced: boolean; onDone: () => void },
): gsap.core.Timeline {
  const dur = opts.reduced ? 0 : 2.2;
  const t = { v: 0 };
  const qa = from.quat.clone();
  const qb = to.quat.clone();
  const apply = (v: number) => {
    cam.position.lerpVectors(from.pos, to.pos, v);
    cam.quaternion.slerpQuaternions(qa, qb, v);
    cam.fov = from.fov + (to.fov - from.fov) * v;
    cam.updateProjectionMatrix();
  };
  const tl = gsap.timeline({ onComplete: opts.onDone });
  if (dur === 0) {
    apply(1);
    tl.set(t, { v: 1 });
    return tl;
  }
  tl.to(t, {
    v: 1,
    duration: dur,
    ease: "power2.inOut",
    onUpdate() {
      apply(t.v);
    },
  });
  return tl;
}
