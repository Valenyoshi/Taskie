import { hashSync } from "bcryptjs";
import { createUser, findUserByUsername } from "@/lib/db";
import { schoolBase } from "@/lib/educamos";
import { json } from "@/lib/http";
import { startSession } from "@/lib/session";
import { syncUser } from "@/lib/sync";
import { googleConfig } from "@/lib/classroom";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    name?: string;
    username?: string;
    password?: string;
    educamosUrl?: string;
    educamosUsername?: string;
    educamosPassword?: string;
    teamsUsername?: string;
    teamsPassword?: string;
    timezone?: string;
    platform?: string;
  } | null;
  if (!body) return json({ error: "No entendí los datos." }, 400);

  const name = body.name?.trim().replace(/\s+/g, " ") ?? "";
  const username = name;
  const password = body.password ?? "";
  const educamosUrl = body.educamosUrl?.trim() ?? "";
  const educamosUsername = body.educamosUsername?.trim() ?? "";
  const educamosPassword = body.educamosPassword ?? "";
  const teamsUsername = body.teamsUsername?.trim() ?? "";
  const teamsPassword = body.teamsPassword ?? "";
  const timezone = body.timezone?.trim() || "America/Argentina/Buenos_Aires";
  const platform =
    body.platform === "teams" ? "teams" : body.platform === "classroom" ? "classroom" : body.platform === "educamos" ? "educamos" : "";

  if (name.length < 2 || name.length > 40) return json({ error: "El nombre tiene que tener entre 2 y 40 letras." }, 400);
  if (password.length < 6) return json({ error: "La contraseña de Taskie necesita al menos 6 caracteres." }, 400);
  if (!platform) return json({ error: "Elegí Educamos, Teams o Classroom." }, 400);
  if (platform === "educamos" && (!educamosUrl || !educamosUsername || !educamosPassword)) {
    return json({ error: "Completá la URL del colegio, el usuario y la contraseña de Educamos." }, 400);
  }
  const schoolUrl = platform === "educamos" ? schoolBase(educamosUrl) : null;
  if (platform === "educamos" && !schoolUrl) {
    return json({ error: "No reconocí ese enlace. Pegá cualquier página de Educamos de tu colegio, por ejemplo https://tucolegio.educamos.com." }, 400);
  }
  if (platform === "teams" && (!teamsUsername || !teamsPassword)) {
    return json({ error: "Completá el usuario y la contraseña de Teams." }, 400);
  }
  if (platform === "classroom") {
    try {
      googleConfig();
    } catch (cause) {
      return json({ error: cause instanceof Error ? cause.message : "Falta configurar Google Classroom." }, 503);
    }
  }

  if (findUserByUsername(username)) return json({ error: "Ese nombre ya tiene una cuenta." }, 400);

  const id = crypto.randomUUID();
  createUser({
    id,
    name,
    username,
    passwordHash: hashSync(password, 12),
    educamosUrl: schoolUrl,
    educamosLogin:
      platform === "teams"
        ? { username: teamsUsername, password: teamsPassword }
        : platform === "classroom"
          ? null
          : { username: educamosUsername, password: educamosPassword },
    lmsUrl: null,
    timezone,
    isDemo: false,
    platform,
    teamsAccount: platform === "teams" ? teamsUsername : null,
  });
  await startSession(id);
  if (platform === "classroom") return json({ ok: true, redirectUrl: "/api/auth/google" });
  const sync = await syncUser(id);
  return json({ ok: true, syncError: sync.ok ? null : sync.error ?? null });
}
