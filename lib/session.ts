import { cookies } from "next/headers";
import { createSession, deleteSession, findUserById, userIdFromSession, type User } from "./db";

const COOKIE = "racha_session";

export async function setSessionCookie(token: string): Promise<void> {
  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) deleteSession(token);
  jar.delete(COOKIE);
}

export async function getCurrentUser(): Promise<User | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  const userId = userIdFromSession(token);
  if (!userId) return null;
  return findUserById(userId);
}

export async function startSession(userId: string): Promise<void> {
  const token = createSession(userId);
  await setSessionCookie(token);
}
