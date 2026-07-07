import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";

export type BedroomAssets = {
  scene: THREE.Group;
  camFilm: THREE.PerspectiveCamera;
  camLamp: THREE.PerspectiveCamera;
  anchors: Map<string, THREE.Vector3>;
};

// 场景里没有实时灯:烘焙目标(按节点名前缀识别)用烘焙贴图当底图;
// 保留原贴图的道具按夜景压暗。注意 GLTFLoader 会清洗节点名(去掉 ".001" 的点号)。
const BAKED_PREFIX = ["g_", "wL_", "wB_", "floor", "rug"];
const KEEP_DIM: Array<[prefix: string, factor: number]> = [
  ["ph_", 0.45],
  ["po_", 0.5],
  ["skateboard", 0.55],
  ["board", 0.55],
];

function dimFor(name: string): number {
  for (const [prefix, factor] of KEEP_DIM) {
    if (name.startsWith(prefix)) return factor;
  }
  return 1;
}

export function applyBakedMaterials(root: THREE.Object3D): void {
  root.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh)) return;
    const name = obj.name;
    const src = (Array.isArray(obj.material) ? obj.material[0] : obj.material) as THREE.MeshStandardMaterial;
    if (name.startsWith("win_glass")) {
      obj.material = new THREE.MeshBasicMaterial({ color: 0x8ab0ff, transparent: true, opacity: 0.15 });
      return;
    }
    if (name.startsWith("lava_blob")) {
      obj.material = new THREE.MeshBasicMaterial({ color: 0xff5a1f });
      return;
    }
    if (BAKED_PREFIX.some((p) => name.startsWith(p))) {
      // 烘焙目标(分组与单烘对象):AgX 已烙进贴图,直接无光照显示
      obj.material = new THREE.MeshBasicMaterial({ map: src.emissiveMap ?? src.map });
      return;
    }
    const emissive = src.emissive && !src.emissive.equals(new THREE.Color(0, 0, 0));
    const color = (emissive ? src.emissive : src.color ?? new THREE.Color(0xffffff)).clone();
    color.multiplyScalar(emissive ? (src.emissiveIntensity ?? 1) : dimFor(name));
    obj.material = new THREE.MeshBasicMaterial({
      map: src.map ?? null,
      color,
      transparent: src.transparent ?? false,
      alphaTest: src.transparent ? 0.05 : 0,
    });
    if (src.map && dimFor(name) < 1) {
      (obj.material as THREE.MeshBasicMaterial).color.setScalar(dimFor(name));
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
  const draco = new DRACOLoader().setDecoderPath("/draco/");
  const loader = new GLTFLoader().setDRACOLoader(draco);
  const gltf = await loader.loadAsync(url);
  applyBakedMaterials(gltf.scene);
  const camFilm = gltf.cameras.find((c) => c.name.includes("cam_film")) as THREE.PerspectiveCamera;
  const camLamp = gltf.cameras.find((c) => c.name.includes("cam_lamp")) as THREE.PerspectiveCamera;
  return { scene: gltf.scene, camFilm, camLamp, anchors: collectAnchors(gltf.scene) };
}
