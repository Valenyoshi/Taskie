import { AsyncLocalStorage } from "async_hooks";
import { educamosLogin } from "./credentials";
import type { User } from "./db";

type Shield = { secrets: string[]; names: string[] };

const shieldStore = new AsyncLocalStorage<Shield>();
const HIDDEN = "[dato privado omitido]";

const PATTERNS: [RegExp, string][] = [
  [/((?:contraseña|contrasena|password|passwd|clave|token)\s*(?:de\s+(?:educamos|la plataforma|el aula))?\s*(?:[:=]|\bes\b)\s*)\S+/gi, `$1${HIDDEN}`],
  [/((?:usuario|username|user|login)\s+(?:de\s+(?:educamos|la plataforma|el aula))\s*[:=]?\s*)\S+/gi, `$1${HIDDEN}`],
  [/\bBearer\s+[A-Za-z0-9._~+/=-]+/gi, `Bearer ${HIDDEN}`],
  [/\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/g, HIDDEN],
  [/\b(sesskey|wstoken|token|MoodleSession\w*|SAMLResponse|wresult|access_token|refresh_token|api[_-]?key)=[^\s&"'<>]+/gi, `$1=${HIDDEN}`],
  [/\btk2\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, HIDDEN],
  [/\bAIza[0-9A-Za-z_-]{30,}/g, HIDDEN],
  [/\bsk-[A-Za-z0-9_-]{16,}/g, HIDDEN],
  [/\b[A-Za-z][A-Za-z0-9+.-]*:\/\/[^\s/:@]+:[^\s/@]+@/g, "https://"],
];

function escape(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function scrubForAi(text: string, shield: Shield | undefined = shieldStore.getStore()): string {
  let out = text;
  for (const [pattern, replacement] of PATTERNS) out = out.replace(pattern, replacement);
  if (shield) {
    for (const secret of shield.secrets) out = out.replace(new RegExp(escape(secret), "gi"), HIDDEN);
    for (const name of shield.names) {
      out = out.replace(new RegExp(`(?<![\\p{L}\\p{N}])${escape(name)}(?![\\p{L}\\p{N}])`, "giu"), "el alumno");
    }
  }
  return out;
}

function scrubDeep(value: unknown, shield: Shield | undefined): unknown {
  if (typeof value === "string") return scrubForAi(value, shield);
  if (Array.isArray(value)) return value.map((item) => scrubDeep(item, shield));
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, scrubDeep(item, shield)]));
  }
  return value;
}

function leaks(value: unknown, shield: Shield | undefined): boolean {
  if (!shield) return false;
  if (typeof value === "string") {
    const lower = value.toLocaleLowerCase("es");
    return shield.secrets.some((secret) => lower.includes(secret.toLocaleLowerCase("es")));
  }
  if (Array.isArray(value)) return value.some((item) => leaks(item, shield));
  if (value && typeof value === "object") return Object.values(value).some((item) => leaks(item, shield));
  return false;
}

const LOOPBACK = new Set(["127.0.0.1", "localhost", "::1", "[::1]"]);

export function assertSafeEndpoint(raw: string): URL {
  const url = new URL(raw);
  if (url.username || url.password) throw new Error("El servicio de IA no puede llevar credenciales en la URL.");
  if (url.protocol === "https:") return url;
  if (url.protocol === "http:" && LOOPBACK.has(url.hostname)) return url;
  throw new Error("El servicio de IA tiene que usar HTTPS.");
}

/**
 * Ejecuta una consulta a la IA con las credenciales del alumno cargadas solo en el
 * escudo, para poder buscarlas y tacharlas en todo lo que salga hacia el modelo.
 */
export function withAiShield<T>(user: User, fn: () => Promise<T>): Promise<T> {
  const login = educamosLogin(user);
  const secrets = [login?.password, login?.username]
    .filter((value): value is string => typeof value === "string" && value.trim().length >= 4)
    .sort((a, b) => b.length - a.length);
  const names = [user.name, user.username]
    .map((value) => value.trim())
    .filter((value) => value.length >= 3 && !/^alumno de prueba$/i.test(value))
    .sort((a, b) => b.length - a.length);
  return shieldStore.run({ secrets, names }, fn);
}

export async function aiFetch(
  url: string,
  init: { headers: Record<string, string>; body: unknown; timeoutMs: number },
): Promise<Response> {
  const endpoint = assertSafeEndpoint(url);
  const shield = shieldStore.getStore();
  const body = scrubDeep(init.body, shield);
  if (leaks(body, shield)) throw new Error("Se bloqueó una consulta a la IA que llevaba datos privados.");
  return fetch(endpoint, {
    method: "POST",
    headers: init.headers,
    body: JSON.stringify(body),
    redirect: "error",
    cache: "no-store",
    referrerPolicy: "no-referrer",
    signal: AbortSignal.timeout(init.timeoutMs),
  });
}
