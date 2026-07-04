import { z } from "zod";
import { prisma } from "@/lib/db";
import { createSession, hashPassword } from "@/lib/auth";
import { ok, fail, handle, parseBody } from "@/lib/api";

const schema = z.object({
  email: z.string().email("Invalid email address"),
  name: z.string().min(1, "Name is required").max(40),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export async function POST(req: Request) {
  try {
    const { email, name, password } = await parseBody(req, schema);
    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) return fail("This email is already registered", 409);

    const user = await prisma.user.create({
      data: {
        email,
        name,
        passwordHash: hashPassword(password),
        cashBalance: 100000, // 新用户赠送 $100,000 演示资金
      },
    });
    await createSession(user.id);
    return ok({ id: user.id, email: user.email, name: user.name });
  } catch (err) {
    return handle(err);
  }
}
