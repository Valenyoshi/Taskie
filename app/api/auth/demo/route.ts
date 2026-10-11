import { hashSync } from "bcryptjs";
import { createUser } from "@/lib/db";
import { json } from "@/lib/http";
import { seedDemoTasks } from "@/lib/seed";
import { startSession } from "@/lib/session";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { timezone?: string };
  const timezone = body.timezone?.trim() || "America/Argentina/Buenos_Aires";
  const id = crypto.randomUUID();
  const suffix = id.slice(0, 4);
  createUser({
    id,
    name: "Alumno de prueba",
    username: `prueba-${suffix}`,
    passwordHash: hashSync(crypto.randomUUID(), 10),
    educamosUrl: null,
    educamosLogin: null,
    timezone,
    isDemo: true,
  });
  seedDemoTasks(id, timezone);
  await startSession(id);
  return json({ ok: true, username: `prueba-${suffix}` });
}
