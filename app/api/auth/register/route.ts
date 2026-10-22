import { hashSync } from "bcryptjs";
import { createUser, findUserByUsername } from "@/lib/db";
import { json } from "@/lib/http";
import { startSession } from "@/lib/session";
import { syncUser } from "@/lib/sync";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    name?: string;
    username?: string;
    password?: string;
    educamosUrl?: string;
    educamosUsername?: string;
    educamosPassword?: string;
    lmsUrl?: string;
    timezone?: string;
    platform?: string;
  } | null;
  if (!body) return json({ error: "No entendí los datos." }, 400);

  const name = body.name?.trim() ?? "";
  const username = body.username?.trim() ?? "";
  const password = body.password ?? "";
  const educamosUrl = body.educamosUrl?.trim() ?? "";
  const educamosUsername = body.educamosUsername?.trim() ?? "";
  const educamosPassword = body.educamosPassword ?? "";
  const lmsUrl = body.lmsUrl?.trim() || null;
  const timezone = body.timezone?.trim() || "America/Argentina/Buenos_Aires";
  const platform = body.platform === "teams" ? "teams" : "educamos";

  if (name.length < 2 || name.length > 40) return json({ error: "El nombre tiene que tener entre 2 y 40 letras." }, 400);
  if (!/^[a-zA-Z0-9._-]{3,24}$/.test(username)) {
    return json({ error: "El usuario usa letras, números, punto o guion, de 3 a 24." }, 400);
  }
  if (password.length < 6) return json({ error: "La contraseña de Taskie necesita al menos 6 caracteres." }, 400);
  if (platform === "educamos" && (!educamosUrl || !educamosUsername || !educamosPassword)) {
    return json({ error: "Completá la URL del colegio, el usuario y la contraseña de Educamos." }, 400);
  }

  if (findUserByUsername(username)) return json({ error: "Ese usuario ya existe." }, 400);

  const id = crypto.randomUUID();
  createUser({
    id,
    name,
    username,
    passwordHash: hashSync(password, 12),
    educamosUrl: platform === "teams" ? null : educamosUrl,
    educamosLogin: platform === "teams" ? null : { username: educamosUsername, password: educamosPassword },
    lmsUrl: platform === "teams" ? null : lmsUrl,
    timezone,
    isDemo: false,
    platform,
  });
  await startSession(id);
  if (platform === "teams") return json({ ok: true, connect: "teams" });
  const sync = await syncUser(id);
  return json({ ok: true, syncError: sync.ok ? null : sync.error ?? null });
}
