import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    // Alternate build directories used for isolated development and QA.
    ".next-*/**",
    ".wrangler/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Prisma 生成的 client 不参与 lint(构建门禁会跑 lint,生成物必须排除)
    "src/generated/**",
    // Claude Code 会话产物(worktree 内含整个子项目的 .next 构建物,曾一次性带来 5000+ 误报)
    ".claude/**",
    // cocoeco 是同目录下的另一个独立站点项目,不属于本仓库的 lint 范围
    "cocoeco/**",
    // 生产只读运维脚本是 Node CommonJS(.cjs),require() 是正确写法,不适用 Next/TS 规则集
    "scripts/prod/*.cjs",
  ]),
]);

export default eslintConfig;
