import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 嵌套 worktree 下防止 Turbopack 误判仓库根(旧版 cocoeco 验证过的配置)
  turbopack: { root: path.join(__dirname) },
};

export default nextConfig;
