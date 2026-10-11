import { openEducamosLogin, type User } from "./db";
import { lmsBase } from "./educamos";

export type EducamosLogin = { username: string; password: string };

export function hasEducamosLogin(user: User): user is User & { educamosUrl: string } {
  return Boolean(!user.isDemo && user.educamosUrl && user.educamosUsernameEnc && user.educamosPasswordEnc);
}

/**
 * Único punto donde las credenciales salen del cofre. Se descifran en memoria para
 * entrar a Educamos y nunca se guardan, se devuelven al navegador ni se mandan a la IA.
 */
export function educamosLogin(user: User): EducamosLogin | null {
  if (!hasEducamosLogin(user)) return null;
  try {
    return openEducamosLogin(user);
  } catch {
    return null;
  }
}

export function classroomLogin(user: User): (EducamosLogin & { lmsUrl: string }) | null {
  if (!hasEducamosLogin(user)) return null;
  const lmsUrl = lmsBase(user.educamosUrl, user.lmsUrl);
  if (!lmsUrl) return null;
  const login = educamosLogin(user);
  return login ? { lmsUrl, ...login } : null;
}
