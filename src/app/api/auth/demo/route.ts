import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/db";
import { createSession, hashPassword } from "@/lib/auth";
import { ok, fail, handle } from "@/lib/api";
import { clientIp, rateLimit } from "@/lib/rate-limit";

// 一键演示账号:独立沙箱访客,避免公开密码 + 多访客共享同一账号互相踩仓位
export async function POST(req: Request) {
  try {
    if (!rateLimit(`demo:${clientIp(req)}`, 3, 3_600_000)) {
      return fail("Too many requests, please retry later", 429);
    }
    const tag = randomBytes(4).toString("hex");
    const user = await prisma.user.create({
      data: {
        email: `guest-${tag}@demo.carbadia.io`,
        name: "Guest",
        passwordHash: hashPassword(randomBytes(16).toString("hex")), // 不可猜、不外发:账号只活在本次会话里
        cashBalance: 100000,
      },
    });
    await createSession(user.id);
    void prisma.event.create({ data: { name: "demo_login" } }).catch(() => {});
    return ok({ id: user.id, email: user.email, name: user.name });
  } catch (err) {
    return handle(err);
  }
}
