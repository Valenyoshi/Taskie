import { getCurrentUser } from "./session";
import type { User } from "./db";

export function json(data: unknown, status = 200): Response {
  return Response.json(data, { status });
}

export async function requireUser(): Promise<User | Response> {
  const user = await getCurrentUser();
  if (!user) return json({ error: "Tenés que entrar de nuevo." }, 401);
  return user;
}

export function isUser(value: User | Response): value is User {
  return !(value instanceof Response);
}
