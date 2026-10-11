import { compareSync, hashSync } from "bcryptjs";
import { educamosLogin } from "@/lib/credentials";
import { educamosIndex, listUsers, type User } from "@/lib/db";
import { json } from "@/lib/http";
import { clearFailures, clientKey, recordFailure, retryAfter } from "@/lib/rate-limit";
import { normalizeLogin, safeEqual } from "@/lib/secret";
import { startSession } from "@/lib/session";
import { syncUser } from "@/lib/sync";

const LIMIT = 8;
const WINDOW_MS = 15 * 60 * 1000;
let decoyHash: string | null = null;

function spendDecoyTime(password: string): void {
  decoyHash ??= hashSync(crypto.randomUUID(), 10);
  compareSync(password, decoyHash);
}

function matchesLogin(user: User, login: string, index: string): boolean {
  const clean = normalizeLogin(login);
  return (
    safeEqual(normalizeLogin(user.username), clean) ||
    safeEqual(normalizeLogin(user.name), clean) ||
    (user.educamosUserIndex !== null && safeEqual(user.educamosUserIndex, index))
  );
}

function passwordMatches(user: User, password: string): boolean {
  try {
    if (compareSync(password, user.passwordHash)) return true;
  } catch {
    return false;
  }
  const stored = educamosLogin(user);
  return stored ? safeEqual(stored.password, password) : false;
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { username?: string; password?: string } | null;
  const login = body?.username?.trim().slice(0, 120) ?? "";
  const password = (body?.password ?? "").slice(0, 256);
  const ipKey = `login:ip:${clientKey(request)}`;
  const nameKey = `login:name:${normalizeLogin(login)}`;
  const wait = Math.max(retryAfter(ipKey, LIMIT * 3), retryAfter(nameKey, LIMIT));
  if (wait > 0) {
    return json({ error: `Demasiados intentos. Probá de nuevo en ${Math.ceil(wait / 60)} min.` }, 429);
  }

  const index = login ? educamosIndex(login) : "";
  const candidates = login ? listUsers().filter((user) => matchesLogin(user, login, index)) : [];
  const user = candidates.find((candidate) => passwordMatches(candidate, password));
  if (!user) {
    if (candidates.length === 0) spendDecoyTime(password);
    recordFailure(ipKey, WINDOW_MS);
    recordFailure(nameKey, WINDOW_MS);
    return json({ error: "Usuario o contraseña incorrectos." }, 400);
  }
  clearFailures(nameKey);
  await startSession(user.id);
  let syncError: string | null = null;
  if (!user.isDemo) {
    try {
      const sync = await syncUser(user.id);
      syncError = sync.ok ? null : sync.error ?? "No pude traer las tareas.";
    } catch {
      syncError = "No pude traer las tareas. En Inicio podés reintentar con Actualizar.";
    }
  }
  return json({ ok: true, syncError });
}
