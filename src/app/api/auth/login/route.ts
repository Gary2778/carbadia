import { z } from "zod";
import { prisma } from "@/lib/db";
import { createSession, verifyPassword } from "@/lib/auth";
import { ok, fail, handle, parseBody } from "@/lib/api";

const schema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export async function POST(req: Request) {
  try {
    const { email, password } = await parseBody(req, schema);
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !verifyPassword(password, user.passwordHash)) {
      return fail("Incorrect email or password", 401);
    }
    await createSession(user.id);
    return ok({ id: user.id, email: user.email, name: user.name });
  } catch (err) {
    return handle(err);
  }
}
