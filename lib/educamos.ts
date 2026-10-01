export type RemoteTask = {
  externalId: string;
  subject: string;
  title: string;
  description: string;
  dueAt: string;
  needsFile: boolean;
  url: string | null;
};

export type SyncResult =
  | { ok: true; tasks: RemoteTask[] }
  | { ok: false; error: string };

const UA = "Mozilla/5.0 (compatible; Racha/1.0)";

function normalizeBase(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const url = new URL(withProtocol);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.origin;
  } catch {
    return null;
  }
}

class Jar {
  private cookies = new Map<string, string>();

  store(res: Response) {
    const list = typeof res.headers.getSetCookie === "function" ? res.headers.getSetCookie() : [];
    for (const cookie of list) {
      const [pair] = cookie.split(";");
      const eq = pair.indexOf("=");
      if (eq <= 0) continue;
      this.cookies.set(pair.slice(0, eq).trim(), pair.slice(eq + 1).trim());
    }
  }

  header(): string {
    return [...this.cookies.entries()].map(([key, value]) => `${key}=${value}`).join("; ");
  }
}

async function request(jar: Jar, url: string, method: string, body?: string): Promise<{ status: number; text: string; finalUrl: string }> {
  let current = url;
  let currentMethod = method;
  let currentBody = body;
  for (let hop = 0; hop < 6; hop++) {
    const res = await fetch(current, {
      method: currentMethod,
      body: currentMethod === "GET" ? undefined : currentBody,
      redirect: "manual",
      signal: AbortSignal.timeout(15000),
      headers: {
        "user-agent": UA,
        accept: "text/html,application/xhtml+xml",
        cookie: jar.header(),
        ...(currentBody ? { "content-type": "application/x-www-form-urlencoded" } : {}),
      },
    });
    jar.store(res);
    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get("location");
      if (!location) break;
      current = new URL(location, current).href;
      currentMethod = "GET";
      currentBody = undefined;
      continue;
    }
    const text = await res.text();
    return { status: res.status, text, finalUrl: current };
  }
  throw new Error("redirect");
}

function decode(value: string): string {
  return value
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function findLoginForm(html: string, pageUrl: string): { action: string; fields: URLSearchParams } | null {
  const form = html.match(/<form\b[^>]*>[\s\S]*?<\/form>/i)?.[0];
  if (!form || !/type=["']password["']/i.test(form)) return null;
  const actionAttr = /action=["']([^"']*)["']/i.exec(form)?.[1] ?? pageUrl;
  const action = new URL(actionAttr || pageUrl, pageUrl).href;
  const fields = new URLSearchParams();
  let userField = "";
  let passField = "";
  for (const tag of form.matchAll(/<input\b[^>]*>/gi)) {
    const name = /name=["']([^"']+)["']/i.exec(tag[0])?.[1];
    if (!name) continue;
    const type = (/type=["']([^"']+)["']/i.exec(tag[0])?.[1] ?? "text").toLowerCase();
    const value = /value=["']([^"']*)["']/i.exec(tag[0])?.[1] ?? "";
    if (type === "password") passField = name;
    else if ((type === "text" || type === "email") && !userField) userField = name;
    else if (type === "hidden" || type === "submit") fields.set(name, value);
  }
  if (!userField || !passField) return null;
  return { action, fields: fields, ...({ userField, passField } as { userField: string; passField: string }) };
}

type LoginForm = { action: string; fields: URLSearchParams; userField: string; passField: string };

function readForm(html: string, pageUrl: string): LoginForm | null {
  const parsed = findLoginForm(html, pageUrl) as LoginForm | null;
  return parsed;
}

function extractTasks(html: string, pageUrl: string, fallbackDue: string): RemoteTask[] {
  const tasks: RemoteTask[] = [];
  const seen = new Set<string>();
  const assign = /href=["']([^"']*mod\/assign\/view\.php\?id=\d+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  for (const match of html.matchAll(assign)) {
    const href = new URL(match[1], pageUrl).href;
    const title = decode(match[2]);
    if (!title || seen.has(href)) continue;
    seen.add(href);
    tasks.push({
      externalId: href,
      subject: "Educamos",
      title,
      description: "Tarea encontrada en el aula de Educamos.",
      dueAt: fallbackDue,
      needsFile: true,
      url: href,
    });
  }

  const rows = html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi);
  for (const row of rows) {
    const text = decode(row[1]);
    if (!/tarea|entrega|examen/i.test(text) || text.length > 240) continue;
    const id = `row:${text.slice(0, 120)}`;
    if (seen.has(id)) continue;
    seen.add(id);
    tasks.push({
      externalId: id,
      subject: "Educamos",
      title: text.slice(0, 120),
      description: "La tomé de la tabla de tareas del colegio. Revisá la fecha en Educamos si no coincide.",
      dueAt: fallbackDue,
      needsFile: /archivo|entrega/i.test(text),
      url: pageUrl,
    });
  }
  return tasks.slice(0, 40);
}

export async function fetchEducamosTasks(input: {
  url: string;
  username: string;
  password: string;
  fallbackDue: string;
}): Promise<SyncResult> {
  const base = normalizeBase(input.url);
  if (!base) return { ok: false, error: "La dirección del colegio no es una URL válida." };
  const jar = new Jar();
  try {
    const home = await request(jar, base, "GET");
    const form = readForm(home.text, home.finalUrl) ?? readForm(home.text, base);
    if (!form) {
      return { ok: false, error: "Abrí la página del colegio, pero no encontré el formulario de entrada." };
    }
    form.fields.set(form.userField, input.username);
    form.fields.set(form.passField, input.password);
    const logged = await request(jar, form.action, "POST", form.fields.toString());
    if (readForm(logged.text, logged.finalUrl)) {
      return { ok: false, error: "Educamos no aceptó el usuario o la contraseña." };
    }
    const pages = [logged];
    for (const path of ["/alumno", "/Alumno", "/tareas", "/mis-asignaturas"]) {
      try {
        pages.push(await request(jar, new URL(path, base).href, "GET"));
      } catch {
        // Algunas rutas no existen en ese colegio.
      }
    }
    const tasks = pages.flatMap((page) => extractTasks(page.text, page.finalUrl, input.fallbackDue));
    const unique = new Map<string, RemoteTask>();
    for (const task of tasks) unique.set(task.externalId, task);
    return { ok: true, tasks: [...unique.values()] };
  } catch {
    return { ok: false, error: "No se pudo abrir la página del colegio. Revisá la URL y la conexión." };
  }
}
