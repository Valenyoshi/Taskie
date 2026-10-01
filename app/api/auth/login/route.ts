import { compareSync } from "bcryptjs";
import { findUserByUsername } from "@/lib/db";
import { json } from "@/lib/http";
import { startSession } from "@/lib/session";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { username?: string; password?: string } | null;
  const username = body?.username?.trim() ?? "";
  const password = body?.password ?? "";
  const user = username ? findUserByUsername(username) : null;
  if (!user || !compareSync(password, user.passwordHash)) {
    return json({ error: "Usuario o contraseña incorrectos." }, 400);
  }
  await startSession(user.id);
  return json({ ok: true });
}
