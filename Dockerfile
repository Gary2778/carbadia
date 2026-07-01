# Carbadia — 持久化 Node 服务镜像（Railway）
# 保留 SQLite（挂载在卷上）与常驻做市机器人。
FROM node:22-bookworm-slim

ENV NEXT_TELEMETRY_DISABLED=1

# Prisma 运行时需要 openssl
RUN apt-get update -y \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 先装依赖（含 devDependencies：next build 与 tsx 种子需要）
COPY package.json package-lock.json ./
RUN npm ci

# 拷贝源码（.dockerignore 已排除 node_modules/.next/本地 .env/本地 *.db 等）
COPY . .

# 生成 Prisma Client
RUN npx prisma generate

# 构建期可能触及 DB：用一次性临时库满足构建，运行时由 Railway 注入真实 DATABASE_URL
ENV DATABASE_URL="file:/app/prisma/build.db"
RUN npx prisma migrate deploy && npm run build

RUN chmod +x docker-entrypoint.sh

EXPOSE 3000
CMD ["./docker-entrypoint.sh"]
