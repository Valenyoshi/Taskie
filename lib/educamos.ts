import { addDays, endOfLocalDay, localDateString, zonedTimeToUtc } from "./time";

export type RemoteTask = {
  externalId: string;
  subject: string;
  title: string;
  description: string;
  dueAt: string;
  needsFile: boolean;
  url: string | null;
};

export type SyncResult = { ok: true; tasks: RemoteTask[] } | { ok: false; error: string };

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

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

function decodeHtml(value: string): string {
  return value
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n: string) => String.fromCharCode(parseInt(n, 16)))
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .trim();
}

function attrValue(html: string, name: string): string {
  const at = html.indexOf(`name="${name}"`);
  if (at < 0) return "";
  const marker = html.indexOf('value="', at);
  if (marker < 0 || marker > at + 80) return "";
  const start = marker + 7;
  const end = html.indexOf('"', start);
  return end < 0 ? "" : decodeHtml(html.slice(start, end));
}

class Jar {
  private cookies = new Map<string, string>();

  store(res: Response) {
    const list = typeof res.headers.getSetCookie === "function" ? res.headers.getSetCookie() : [];
    for (const cookie of list) {
      const [pair] = cookie.split(";");
      const eq = pair.indexOf("=");
      if (eq > 0) this.cookies.set(pair.slice(0, eq).trim(), pair.slice(eq + 1).trim());
    }
  }

  header(): string {
    return [...this.cookies.entries()].map(([key, value]) => `${key}=${value}`).join("; ");
  }
}

async function request(jar: Jar, url: string, method = "GET", body?: string): Promise<{ status: number; text: string; finalUrl: string }> {
  let current = url;
  let currentMethod = method;
  let currentBody = body;
  for (let hop = 0; hop < 12; hop++) {
    const res = await fetch(current, {
      method: currentMethod,
      body: currentMethod === "GET" ? undefined : currentBody,
      redirect: "manual",
      signal: AbortSignal.timeout(20000),
      headers: {
        "user-agent": UA,
        accept: "text/html,application/xhtml+xml",
        cookie: jar.header(),
        ...(currentBody
          ? { "content-type": "application/x-www-form-urlencoded", origin: new URL(current).origin }
          : {}),
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
    return { status: res.status, text: await res.text(), finalUrl: current };
  }
  throw new Error("redirect");
}

function dmyToIso(value: string): string | null {
  const match = value.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return null;
  return `${match[3]}-${match[2].padStart(2, "0")}-${match[1].padStart(2, "0")}`;
}

function cell(row: string, className: string): string {
  const titled = new RegExp(`class="${className}"[^>]*>\\s*<span[^>]*title='([^']*)'`, "i").exec(row);
  if (titled) return decodeHtml(titled[1]);
  const plain = new RegExp(`class="${className}"[^>]*>\\s*<span[^>]*>([^<]*)`, "i").exec(row);
  return decodeHtml(plain?.[1] ?? "");
}

function parseTasks(html: string, origin: string, timeZone: string): RemoteTask[] {
  const tasks: RemoteTask[] = [];
  const seen = new Set<string>();
  for (const chunk of html.split(/<tr\b/i).slice(1)) {
    if (!/class="asignatura"/i.test(chunk) || !/class="descripcion"/i.test(chunk)) continue;
    const subject = cell(chunk, "asignatura");
    const title = cell(chunk, "descripcion");
    const date = cell(chunk, "fecha");
    const estado = /chkMarcarTarea[^>]*title='([^']*)'/i.exec(chunk)?.[1] ?? "";
    const id = /data-id='([^']+)'/i.exec(chunk)?.[1];
    if (!subject || !title || !id || seen.has(id)) continue;
    if (!/pendiente/i.test(estado)) continue;
    seen.add(id);
    const day = dmyToIso(date);
    tasks.push({
      externalId: id,
      subject,
      title,
      description: "",
      dueAt: day ? endOfLocalDay(day, timeZone) : endOfLocalDay(localDateString(new Date(), timeZone), timeZone),
      needsFile: /entrega|archivo|video/i.test(title),
      url: origin,
    });
  }
  return tasks;
}

function loginFields(html: string, username: string, password: string): URLSearchParams | null {
  if (!/name="Clave"|name="password"/i.test(html)) return null;
  const fields = new URLSearchParams();
  const userName = /name="(NombreUsuario|username|Usuario|Email)"/i.exec(html)?.[1] ?? "NombreUsuario";
  const passName = /name="(Clave|password|Password)"/i.exec(html)?.[1] ?? "Clave";
  fields.set(userName, username);
  fields.set(passName, password);
  return fields;
}

function formAction(html: string, pageUrl: string): string | null {
  const action = html.match(/<form\b[^>]*action="([^"]*)"/i)?.[1];
  if (!action) return null;
  return new URL(action, pageUrl).href;
}

export async function fetchEducamosTasks(input: {
  url: string;
  username: string;
  password: string;
  timeZone: string;
}): Promise<SyncResult> {
  const base = normalizeBase(input.url);
  if (!base) return { ok: false, error: "La dirección del colegio no es válida." };

  const jar = new Jar();
  try {
    let page = await request(jar, base);
    const fields = loginFields(page.text, input.username, input.password);
    const action = formAction(page.text, page.finalUrl);
    if (!fields || !action) {
      return { ok: false, error: "No encontré la entrada de Educamos en esa dirección." };
    }
    page = await request(jar, action, "POST", fields.toString());
    if (loginFields(page.text, input.username, input.password)) {
      return { ok: false, error: "Educamos no aceptó el usuario o la contraseña." };
    }

    for (let hop = 0; hop < 3 && page.text.includes('name="wresult"'); hop++) {
      const form = page.text.match(/<form\b[\s\S]*?<\/form>/i)?.[0] ?? page.text;
      const fedAction = form.match(/action="([^"]+)"/i)?.[1];
      if (!fedAction) break;
      const body = new URLSearchParams();
      for (const name of ["wa", "wresult", "wctx"]) {
        const value = attrValue(form, name);
        if (value) body.set(name, value);
      }
      if (!body.get("wresult")) break;
      page = await request(jar, new URL(fedAction, page.finalUrl).href, "POST", body.toString());
    }

    if (!page.finalUrl.startsWith(base)) {
      page = await request(jar, `${base}/`);
    }
    if (!/cerrar sesi|perfil:\s*alumno|mis deberes/i.test(page.text) && !page.text.includes("AlumnoId")) {
      return { ok: false, error: "Entré a Educamos, pero no llegué a tu agenda." };
    }

    const tasks = parseTasks(page.text, base, input.timeZone);
    const alumno = page.text.match(/name="AlumnoId"[^>]*value="([^"]+)"/i)?.[1];
    if (alumno) {
      const today = localDateString(new Date(), input.timeZone);
      const [y1, m1, d1] = today.split("-");
      const [y2, m2, d2] = addDays(today, 90).split("-");
      const body = new URLSearchParams({
        alertaValidacion: "ValidationSummary",
        contexto: "divListadoTareas",
        AlumnoId: alumno,
        FechaInicio: `${Number(d1)}/${Number(m1)}/${y1}`,
        FechaFin: `${Number(d2)}/${Number(m2)}/${y2}`,
        Pagina: "0",
      });
      const list = await request(jar, `${base}/Home/ListadoTareas`, "POST", body.toString());
      for (const task of parseTasks(list.text, base, input.timeZone)) {
        if (!tasks.some((item) => item.externalId === task.externalId)) tasks.push(task);
      }
    }

    const today = localDateString(new Date(), input.timeZone);
    const start = zonedTimeToUtc(today, "00:00:00", input.timeZone).toISOString();
    return { ok: true, tasks: tasks.filter((task) => task.dueAt >= start) };
  } catch {
    return { ok: false, error: "No se pudo abrir Educamos. Revisá la dirección del colegio." };
  }
}
