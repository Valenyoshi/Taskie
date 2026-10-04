import { compareSync } from "bcryptjs";
import { listUsers, type User } from "@/lib/db";
import { json } from "@/lib/http";
import { decryptSecret } from "@/lib/secret";
import { startSession } from "@/lib/session";

function same(left: string, right: string): boolean {
  return left.trim().toLocaleLowerCase("es") === right.trim().toLocaleLowerCase("es");
}

function matchesLogin(user: User, login: string): boolean {
  return (
    same(user.username, login) ||
    same(user.name, login) ||
    same(user.educamosUsername ?? "", login)
  );
}

function passwordMatches(user: User, password: string): boolean {
  try {
    if (compareSync(password, user.passwordHash)) return true;
  } catch {
    return false;
  }
  if (!user.educamosPasswordEnc) return false;
  try {
    return decryptSecret(user.educamosPasswordEnc) === password;
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { username?: string; password?: string } | null;
  const login = body?.username?.trim() ?? "";
  const password = body?.password ?? "";
  const candidates = login ? listUsers().filter((user) => matchesLogin(user, login)) : [];
  const user = candidates.find((candidate) => passwordMatches(candidate, password));
  if (!user) {
    const known = candidates[0];
    const error = known
      ? `La contraseña no es la de task.ai. Tu usuario es ${known.username}.`
      : "No hay una cuenta con ese usuario. Probá con el usuario de task.ai, tu nombre o el de Educamos.";
    return json({ error }, 400);
  }
  await startSession(user.id);
  return json({ ok: true });
}
