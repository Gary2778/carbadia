// 舞台资产预算检查:CI/本地都可跑,超预算即失败。
import { statSync } from "node:fs";

const LIMIT = 8 * 1024 * 1024;
const size = statSync(new URL("../public/stage/bedroom/bedroom.glb", import.meta.url)).size;
console.log(`bedroom.glb = ${(size / 1048576).toFixed(2)} MB (limit 8 MB)`);
if (size > LIMIT) {
  console.error("BUDGET EXCEEDED");
  process.exit(1);
}
