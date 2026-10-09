import { spawn } from "child_process";
import { readFile, unlink, writeFile } from "fs/promises";
import { tmpdir } from "os";
import path from "path";
import { addDays, endOfLocalDay, localDateString, pendingIsCurrent, zonedTimeToUtc } from "./time";

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

async function request(
  jar: Jar,
  url: string,
  method = "GET",
  body?: string,
  contentType?: string,
): Promise<{ status: number; text: string; finalUrl: string }> {
  let current = url;
  let currentMethod = method;
  let currentBody = body;
  let currentType = contentType;
  for (let hop = 0; hop < 12; hop++) {
    const res = await fetch(current, {
      method: currentMethod,
      body: currentMethod === "GET" ? undefined : currentBody,
      redirect: "manual",
      signal: AbortSignal.timeout(20000),
      headers: {
        "user-agent": UA,
        accept: "text/html,application/xhtml+xml,application/json",
        cookie: jar.header(),
        ...(currentBody
          ? { "content-type": currentType || "application/x-www-form-urlencoded", origin: new URL(current).origin }
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
      currentType = undefined;
      continue;
    }
    return { status: res.status, text: await res.text(), finalUrl: current };
  }
  throw new Error("redirect");
}

async function requestBytes(jar: Jar, url: string): Promise<Buffer | null> {
  const res = await fetch(url, {
    redirect: "follow",
    signal: AbortSignal.timeout(20000),
    headers: { "user-agent": UA, accept: "*/*", cookie: jar.header() },
  });
  jar.store(res);
  if (!res.ok) return null;
  const bytes = Buffer.from(await res.arrayBuffer());
  if (bytes.length < 20 || bytes.length > 4_000_000) return null;
  return bytes;
}

async function requestMultipart(
  jar: Jar,
  url: string,
  form: FormData,
): Promise<{ status: number; text: string; finalUrl: string }> {
  let current = url;
  for (let hop = 0; hop < 12; hop++) {
    const res = await fetch(current, {
      method: "POST",
      body: form,
      redirect: "manual",
      signal: AbortSignal.timeout(20000),
      headers: {
        "user-agent": UA,
        accept: "application/json,text/html",
        cookie: jar.header(),
        origin: new URL(current).origin,
      },
    });
    jar.store(res);
    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get("location");
      if (!location) break;
      current = new URL(location, current).href;
      continue;
    }
    return { status: res.status, text: await res.text(), finalUrl: current };
  }
  throw new Error("redirect");
}

async function pdfToText(bytes: Buffer): Promise<string> {
  const file = path.join(tmpdir(), `taskie-${crypto.randomUUID()}.pdf`);
  await writeFile(file, bytes);
  try {
    return await new Promise((resolve, reject) => {
      const child = spawn("pdftotext", ["-q", "-enc", "UTF-8", "-nopgbrk", file, "-"]);
      const chunks: Buffer[] = [];
      child.stdout.on("data", (chunk: Buffer) => chunks.push(chunk));
      child.on("error", reject);
      child.on("close", (code) => (code === 0 ? resolve(Buffer.concat(chunks).toString("utf8")) : reject(new Error("pdf"))));
    });
  } finally {
    await unlink(file).catch(() => undefined);
  }
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

export function lmsBase(educamosUrl: string, explicit?: string | null): string | null {
  const given = explicit?.trim();
  if (given) {
    try {
      const url = new URL(/^https?:\/\//i.test(given) ? given : `https://${given}`);
      const slug = url.pathname.split("/").filter(Boolean)[0];
      if (slug && slug !== "my" && slug !== "login") return `${url.origin}/${slug}`;
      return null;
    } catch {
      return null;
    }
  }
  try {
    const host = new URL(normalizeBase(educamosUrl) ?? "").hostname;
    const sub = host.split(".")[0] ?? "";
    if (!host.endsWith(".educamos.com") || !sub || sub === "lms" || sub === "www" || sub === "sso1") return null;
    return `https://lms.educamos.com/${sub.replace(/-/g, "_")}`;
  } catch {
    return null;
  }
}

function namedValue(html: string, name: string): string {
  const byName = new RegExp(`name="${name}"[^>]*value="([^"]*)"`, "i").exec(html);
  const byValue = new RegExp(`value="([^"]*)"[^>]*name="${name}"`, "i").exec(html);
  return decodeHtml((byName ?? byValue)?.[1] ?? "");
}

async function loginLms(
  lmsUrl: string,
  username: string,
  password: string,
): Promise<{ ok: true; jar: Jar; root: string; sesskey: string } | { ok: false; error: string }> {
  const root = lmsBase("https://colegio.educamos.com", lmsUrl);
  if (!root) return { ok: false, error: "El enlace del aula no es válido." };
  const jar = new Jar();
  let page = await request(jar, `${root}/login/index.php`);
  const fields = loginFields(page.text, username, password);
  const action = formAction(page.text, page.finalUrl);
  if (!fields || !action) return { ok: false, error: "No encontré la entrada del aula." };
  page = await request(jar, action, "POST", fields.toString());
  if (loginFields(page.text, username, password)) {
    return { ok: false, error: "El aula no aceptó el usuario o la contraseña." };
  }
  if (page.text.includes('name="SAMLResponse"')) {
    const form = page.text.match(/<form\b[\s\S]*?<\/form>/i)?.[0] ?? "";
    const acs = form.match(/action="([^"]+)"/i)?.[1];
    const response = namedValue(page.text, "SAMLResponse");
    if (!acs || !response) return { ok: false, error: "El aula no completó el acceso." };
    const body = new URLSearchParams();
    body.set("SAMLResponse", response);
    const relay = namedValue(page.text, "RelayState");
    if (relay) body.set("RelayState", relay);
    await request(jar, new URL(acs, page.finalUrl).href, "POST", body.toString());
  }
  page = await request(jar, `${root}/my/`);
  const sesskey = page.text.match(/"sesskey":"([^"]+)"/)?.[1];
  if (!sesskey) return { ok: false, error: "Entré, pero no llegué a las clases del aula." };
  return { ok: true, jar, root, sesskey };
}

function tagAttribute(tag: string, name: string): string {
  const match = new RegExp(`\\b${name}=["']([^"']*)["']`, "i").exec(tag);
  return match ? decodeHtml(match[1]) : "";
}

function hiddenFormFields(html: string): URLSearchParams {
  const fields = new URLSearchParams();
  for (const match of html.matchAll(/<input\b[^>]*>/gi)) {
    const tag = match[0];
    if (tagAttribute(tag, "type").toLowerCase() !== "hidden") continue;
    const name = tagAttribute(tag, "name");
    if (name) fields.set(name, tagAttribute(tag, "value"));
  }
  return fields;
}

function fileManagerConfig(html: string): { itemId: string; clientId: string; contextId: string } | null {
  const itemId = hiddenFormFields(html).get("files_filemanager") ?? "";
  const initAt = html.indexOf("M.form_filemanager.init");
  const config = initAt >= 0 ? html.slice(initAt, initAt + 12000) : html;
  const clientId = /"client_id":"([^"]+)"/.exec(config)?.[1] ?? "";
  const contextId = /"context":\{"id":(\d+)/.exec(config)?.[1] ?? "";
  return itemId && clientId && contextId ? { itemId, clientId, contextId } : null;
}

function acceptedTypesFromPage(html: string): string[] {
  const initAt = html.indexOf("M.form_filemanager.init");
  const config = initAt >= 0 ? html.slice(initAt, initAt + 12000) : html;
  const raw = /"accepted_types":\[([^\]]*)\]/.exec(config)?.[1];
  if (!raw) return [];
  try {
    const types = JSON.parse(`[${raw}]`) as unknown;
    return Array.isArray(types) ? types.filter((type): type is string => typeof type === "string" && type.trim().length > 0) : [];
  } catch {
    return [];
  }
}

const acceptedTypesCache = new Map<string, { at: number; types: string[] }>();

export async function fetchTaskAcceptedTypes(input: {
  lmsUrl: string;
  username: string;
  password: string;
  taskUrl: string | null;
}): Promise<string[]> {
  if (!input.taskUrl || !/\/mod\/assign\/view\.php(?:\?|$)/i.test(input.taskUrl)) return [];
  const cacheKey = `${input.lmsUrl}|${input.username}|${input.taskUrl}`;
  const cached = acceptedTypesCache.get(cacheKey);
  if (cached && Date.now() - cached.at < 10 * 60 * 1000) return cached.types;
  try {
    const session = await loginLms(input.lmsUrl, input.username, input.password);
    if (!session.ok) return [];
    const editUrl = `${input.taskUrl}${input.taskUrl.includes("?") ? "&" : "?"}action=editsubmission`;
    const page = await request(session.jar, editUrl);
    const types = page.status >= 200 && page.status < 300 ? acceptedTypesFromPage(page.text) : [];
    acceptedTypesCache.set(cacheKey, { at: Date.now(), types });
    return types;
  } catch {
    return [];
  }
}

export async function submitLmsAssignment(input: {
  lmsUrl: string;
  username: string;
  password: string;
  taskUrl: string | null;
  filePath: string;
  fileName: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!input.taskUrl || !/\/mod\/assign\/view\.php(?:\?|$)/i.test(input.taskUrl)) {
    return { ok: false, error: "La tarea no tiene un enlace válido del aula." };
  }
  try {
    const bytes = await readFile(input.filePath);
    const session = await loginLms(input.lmsUrl, input.username, input.password);
    if (!session.ok) return session;
    const editUrl = `${input.taskUrl}${input.taskUrl.includes("?") ? "&" : "?"}action=editsubmission`;
    const edit = await request(session.jar, editUrl);
    if (edit.status < 200 || edit.status >= 300) return { ok: false, error: "No pude abrir la entrega del aula." };
    const manager = fileManagerConfig(edit.text);
    if (!manager) return { ok: false, error: "No encontré el espacio para subir el archivo." };

    const extension = input.fileName.split(".").pop()?.toLowerCase() ?? "";
    const upload = new FormData();
    upload.set("repo_id", "3");
    upload.set("p", "");
    upload.set("page", "");
    upload.set("env", "filemanager");
    upload.set("sesskey", session.sesskey);
    upload.set("client_id", manager.clientId);
    upload.set("itemid", manager.itemId);
    upload.set("maxbytes", "10485760");
    upload.set("areamaxbytes", "-1");
    upload.set("ctx_id", manager.contextId);
    upload.set("savepath", "/");
    upload.set("title", input.fileName);
    upload.set("author", "");
    upload.set("license", "unknown");
    upload.set("accepted_types[]", `.${extension}`);
    upload.append("repo_upload_file", new Blob([bytes]), input.fileName);
    const uploaded = await requestMultipart(session.jar, `${session.root}/repository/repository_ajax.php?action=upload`, upload);
    if (uploaded.status < 200 || uploaded.status >= 300) return { ok: false, error: "El aula rechazó la subida del archivo." };
    let uploadData: { error?: unknown; msg?: string };
    try {
      uploadData = JSON.parse(uploaded.text) as { error?: unknown; msg?: string };
    } catch {
      return { ok: false, error: "El aula no confirmó la subida del archivo." };
    }
    if (uploadData.error) return { ok: false, error: uploadData.msg || "El aula rechazó la subida del archivo." };

    const form = hiddenFormFields(edit.text);
    form.set("files_filemanager", manager.itemId);
    form.set("submitbutton", "Guardar cambios");
    const saved = await request(session.jar, edit.finalUrl, "POST", form.toString());
    if (saved.status < 200 || saved.status >= 300) return { ok: false, error: "El aula no guardó la entrega." };
    const validation = /id=["']id_error_files_filemanager["'][^>]*>([\s\S]*?)<\/div>/i.exec(saved.text)?.[1] ?? "";
    const validationText = htmlToText(validation);
    if (validationText) return { ok: false, error: validationText };
    if (/Todavía no se han realizado envíos/i.test(saved.text) || /name=["']action["'][^>]*value=["']savesubmission["']/i.test(saved.text)) {
      return { ok: false, error: "El aula no confirmó la entrega." };
    }
    return { ok: true };
  } catch {
    return { ok: false, error: "No se pudo enviar el archivo al aula." };
  }
}

async function moodleCall(jar: Jar, root: string, sesskey: string, calls: { methodname: string; args: Record<string, unknown> }[]) {
  const payload = JSON.stringify(calls.map((call, index) => ({ index, methodname: call.methodname, args: call.args })));
  const info = calls.map((call) => call.methodname).join(",");
  const ajax = await request(
    jar,
    `${root}/lib/ajax/service.php?sesskey=${encodeURIComponent(sesskey)}&info=${encodeURIComponent(info)}`,
    "POST",
    payload,
    "application/json",
  );
  return JSON.parse(ajax.text) as { data?: unknown; exception?: string; message?: string; error?: string }[];
}

export async function fetchLmsUploads(input: {
  lmsUrl: string;
  username: string;
  password: string;
  timeZone: string;
}): Promise<SyncResult> {
  try {
    const session = await loginLms(input.lmsUrl, input.username, input.password);
    if (!session.ok) return session;
    const { jar, root, sesskey } = session;
    const now = Math.floor(Date.now() / 1000);
    const parsed = await moodleCall(jar, root, sesskey, [
      {
        methodname: "core_calendar_get_action_events_by_timesort",
        args: {
          limitnum: 50,
          timesortfrom: now - 4 * 86400,
          timesortto: now + 180 * 86400,
          limittononsuspendedevents: true,
        },
      },
    ]);
    const events = (parsed[0]?.data as { events?: LmsEvent[] } | undefined)?.events ?? [];
    const tasks: RemoteTask[] = [];
    const seen = new Set<string>();
    for (const event of events) {
      if (event.modulename !== "assign" || event.eventtype !== "due") continue;
      if (!/entrega/i.test(event.action?.name ?? "")) continue;
      const id = String(event.instance || event.id);
      if (seen.has(id)) continue;
      seen.add(id);
      const subject = event.course?.fullname?.trim();
      const title = (event.activityname || event.name || "").replace(/^vencimiento de\s+/i, "").trim();
      if (!subject || !title) continue;
      tasks.push({
        externalId: `lms-${id}`,
        subject,
        title,
        description: "Punto de entrega del aula. Hay que subir un archivo.",
        dueAt: new Date((event.timesort || event.timestart || now) * 1000).toISOString(),
        needsFile: true,
        url: event.url || event.action?.url || `${root}/mod/assign/view.php?id=${id}`,
      });
    }
    return { ok: true, tasks: tasks.filter((task) => pendingIsCurrent(task.dueAt, input.timeZone)) };
  } catch {
    return { ok: false, error: "No se pudo abrir el aula. Revisá el enlace." };
  }
}

function htmlToText(value: string): string {
  return decodeHtml(value)
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|h[1-6]|tr)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function elementInnerHtml(html: string, marker: RegExp): string {
  const match = marker.exec(html);
  if (!match || match.index === undefined) return "";
  const openEnd = html.indexOf(">", match.index);
  if (openEnd < 0) return "";
  let depth = 1;
  const tags = /<\/?div\b[^>]*>/gi;
  tags.lastIndex = openEnd + 1;
  let tag: RegExpExecArray | null;
  while ((tag = tags.exec(html))) {
    if (tag[0].startsWith("</")) depth -= 1;
    else if (!tag[0].endsWith("/>")) depth += 1;
    if (depth === 0) return html.slice(openEnd + 1, tag.index);
  }
  return "";
}

function assignmentInstructions(html: string): string {
  const raw =
    elementInnerHtml(html, /<div\b[^>]*\bid=["']intro["'][^>]*>/i) ||
    elementInnerHtml(html, /<div\b[^>]*class=["'][^"']*activity-description[^"']*["'][^>]*>/i) ||
    "";
  return clip(htmlToText(raw), 5000);
}

function activityWords(value: string): string[] {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length > 2 && !/^(para|como|esta|este|las|los|una|del|que|con|por|entrega|espacio|tarea|trabajo)$/.test(word));
}

function relatedActivityLinks(html: string, taskTitle: string): { url: string; title: string; score: number }[] {
  const wanted = new Set(activityWords(taskTitle));
  const rows: { url: string; title: string; score: number }[] = [];
  const seen = new Set<string>();
  const option = /<option\b[^>]*value=["']([^"']+)["'][^>]*>([\s\S]*?)<\/option>/gi;
  let match: RegExpExecArray | null;
  while ((match = option.exec(html))) {
    const title = htmlToText(match[2]);
    const url = match[1];
    if (!title || !url || !/\/mod\/(?:page|resource|folder)\//i.test(url)) continue;
    if (/instalador|descargar|download/i.test(title) || seen.has(url)) continue;
    const score = activityWords(title).filter((word) => wanted.has(word)).length;
    if (score > 0) {
      seen.add(url);
      rows.push({ url, title, score });
    }
  }
  return rows.sort((a, b) => b.score - a.score || a.title.localeCompare(b.title)).slice(0, 3);
}

function relatedActivityText(html: string): string {
  const raw =
    elementInnerHtml(html, /<div\b[^>]*class=["'][^"']*\bgeneralbox\b[^"']*["'][^>]*>/i) ||
    elementInnerHtml(html, /<div\b[^>]*id=["']region-main["'][^>]*>/i) ||
    "";
  return clip(htmlToText(raw), 4500);
}

export async function fetchTaskInstructions(input: {
  lmsUrl: string;
  username: string;
  password: string;
  taskUrl: string | null;
  taskTitle?: string;
}): Promise<string> {
  if (!input.taskUrl || !/\/mod\/assign\/view\.php(?:\?|$)/i.test(input.taskUrl)) return "";
  try {
    const session = await loginLms(input.lmsUrl, input.username, input.password);
    if (!session.ok) return "";
    const page = await request(session.jar, input.taskUrl);
    if (page.status < 200 || page.status >= 300) return "";
    const parts = [assignmentInstructions(page.text)].filter(Boolean);
    if (input.taskTitle) {
      for (const link of relatedActivityLinks(page.text, input.taskTitle)) {
        const relatedUrl = /^https?:\/\//i.test(link.url)
          ? link.url
          : `${session.root}/${link.url.replace(/^\/+/, "")}`;
        const related = await request(session.jar, relatedUrl);
        if (related.status < 200 || related.status >= 300) continue;
        const text = relatedActivityText(related.text);
        if (text) parts.push(`Material relacionado — ${link.title}: ${text}`);
      }
    }
    return clip(parts.join("\n\n"), 8500);
  } catch {
    return "";
  }
}

function clip(value: string, max: number): string {
  const clean = value.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max).trim()}…`;
}

const LESSON_STOP = new Set(
  "para como esta este esto esa eso son las los una uno del que con por sus les nos estan cuando donde porque sobre entre hacia desde hasta tambien tiene tienen hacer hace puede pueden quiere quiero explicame explica ensename ensena tema clase profesor profe materia algo alguien".split(
    " ",
  ),
);

function lessonWords(value: string): string[] {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length > 2 && !LESSON_STOP.has(word));
}

export function asksForLesson(message: string): boolean {
  const q = message.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
  return /explic|ensen|que es |que son |como se |como hacer|como la hago|como lo hago|que tengo que hacer|que hay que hacer|no entiendo|repas|resum|diferencia|por que |profesor|profe|aprend|tema|entrega|trabajo/.test(q);
}

type LessonPiece = { title: string; text: string };
type LessonResource = { title: string; section: string; url: string; text?: string };
type LessonCourse = { id: number; name: string; pieces: LessonPiece[]; resources: LessonResource[] };

const lessonCache = new Map<string, { at: number; courses: LessonCourse[] }>();

type CourseState = {
  section?: { number?: number; title?: string; rawtitle?: string; visible?: boolean }[];
  cm?: { name?: string; modname?: string; url?: string; uservisible?: boolean; visible?: boolean; sectionnumber?: number }[];
};

function parseState(data: unknown): CourseState {
  let raw = data;
  if (typeof raw === "string") {
    try {
      raw = JSON.parse(raw);
    } catch {
      return {};
    }
  }
  return raw && typeof raw === "object" ? (raw as CourseState) : {};
}

export async function fetchTeachingNotes(input: {
  lmsUrl: string;
  username: string;
  password: string;
  question: string;
}): Promise<{ ok: true; brief: string; courses: number; matched: number } | { ok: false; error: string }> {
  const cacheKey = `${input.lmsUrl}|${input.username.toLowerCase()}`;
  const cached = lessonCache.get(cacheKey);
  let courses = cached && Date.now() - cached.at < 10 * 60 * 1000 ? cached.courses : null;
  if (!courses) {
    const loaded = await loadLessons(input.lmsUrl, input.username, input.password);
    if (!loaded.ok) return loaded;
    courses = loaded.courses;
    lessonCache.set(cacheKey, { at: Date.now(), courses });
  }
  const words = new Set(lessonWords(input.question));
  const ranked = courses
    .map((course) => {
      const hay = lessonWords([course.name, ...course.pieces.map((piece) => piece.title), ...course.resources.map((item) => item.title)].join(" "));
      const nameWords = new Set(lessonWords(course.name));
      let score = 0;
      for (const word of words) if (hay.includes(word)) score += nameWords.has(word) ? 4 : 1;
      return { course, score };
    })
    .sort((a, b) => b.score - a.score);
  const matched = ranked.filter((item) => item.score > 0).slice(0, 2);
  if (matched.length > 0) {
    const pending = matched.some((item) => item.course.resources.some((item) => item.text === undefined));
    if (pending) {
      const read = await readResourceText(input.lmsUrl, input.username, input.password, matched.map((item) => item.course), words);
      if (!read.ok) return read;
    }
  }
  return { ok: true, ...briefFromLessons(courses, matched.map((item) => item.course), words) };
}

export async function topicsForSubject(input: {
  lmsUrl: string;
  username: string;
  password: string;
  subject: string;
}): Promise<string[]> {
  const cacheKey = `${input.lmsUrl}|${input.username.toLowerCase()}`;
  let courses = lessonCache.get(cacheKey);
  if (!courses || Date.now() - courses.at >= 10 * 60 * 1000) {
    const loaded = await loadLessons(input.lmsUrl, input.username, input.password);
    if (!loaded.ok) return [];
    courses = { at: Date.now(), courses: loaded.courses };
    lessonCache.set(cacheKey, courses);
  }
  const wanted = input.subject
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const ranked = courses.courses
    .map((course) => {
      const name = course.name
        .normalize("NFD")
        .replace(/\p{M}/gu, "")
        .toLowerCase();
      const score = wanted && (name.includes(wanted) || wanted.includes(name)) ? 5 : name.split(/\s+/).filter((word) => word.length > 3 && wanted.includes(word)).length;
      return { course, score };
    })
    .sort((a, b) => b.score - a.score);
  const course = ranked[0]?.score ? ranked[0].course : null;
  if (!course) return [];
  const titles = course.pieces
    .map((piece) => piece.title.trim())
    .filter((title) => title.length > 2 && !/foro|avisos|^general$|^tema$/i.test(title));
  return [...new Set(titles)].slice(0, 12);
}

export async function recentClassTopics(input: {
  lmsUrl: string;
  username: string;
  password: string;
  subject: string;
}): Promise<string[]> {
  const cacheKey = `${input.lmsUrl}|${input.username.toLowerCase()}`;
  let cached = lessonCache.get(cacheKey);
  if (!cached || Date.now() - cached.at >= 10 * 60 * 1000) {
    const loaded = await loadLessons(input.lmsUrl, input.username, input.password);
    if (!loaded.ok) return [];
    cached = { at: Date.now(), courses: loaded.courses };
    lessonCache.set(cacheKey, cached);
  }
  const wanted = input.subject.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
  const course = cached.courses.find((item) => {
    const name = item.name.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
    return name.includes(wanted) || wanted.includes(name);
  });
  if (!course) return [];
  const source = course.resources.length > 0 ? course.resources.map((item) => item.title) : course.pieces.map((item) => item.title);
  return [...new Set(source.map((title) => title.trim()).filter(Boolean))].slice(-12);
}

function resourceScore(item: LessonResource, words: Set<string>): number {
  if (words.size === 0) return 0;
  const hay = new Set(lessonWords(`${item.title} ${item.section}`));
  let score = 0;
  for (const word of words) if (hay.has(word)) score += 1;
  return score;
}

export async function notesForSubject(input: {
  lmsUrl: string;
  username: string;
  password: string;
  subject: string;
  query?: string;
}): Promise<string> {
  const titles = await topicsForSubject(input);
  const cacheKey = `${input.lmsUrl}|${input.username.toLowerCase()}`;
  const cached = lessonCache.get(cacheKey);
  if (!cached) return titles.join(". ");
  const wanted = input.subject
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase();
  const course = cached.courses.find((item) => {
    const name = item.name.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
    return name.includes(wanted) || wanted.includes(name);
  });
  if (!course || course.resources.length === 0) return titles.join(". ");
  const words = new Set(lessonWords(input.query ?? ""));
  const ranked = course.resources
    .map((item, index) => ({ item, index, score: resourceScore(item, words) }))
    .sort((a, b) => b.score - a.score || a.index - b.index);
  const hits = words.size > 0 ? ranked.filter((row) => row.score > 0) : [];
  const chosen = (hits.length > 0 ? hits : ranked).slice(0, 2).map((row) => row.item);
  await readResourceText(input.lmsUrl, input.username, input.password, [{ ...course, resources: chosen }], words);
  const written = chosen.map((item) => item.text?.trim()).filter((text): text is string => Boolean(text));
  const body = written.join("\n").slice(0, 3500);
  return body || titles.join(". ");
}

export async function listEnrolledSubjectNames(input: {
  lmsUrl: string;
  username: string;
  password: string;
}): Promise<string[]> {
  const cacheKey = `${input.lmsUrl}|${input.username.toLowerCase()}`;
  const cached = lessonCache.get(cacheKey);
  if (cached && Date.now() - cached.at < 10 * 60 * 1000) return cached.courses.map((course) => course.name);
  try {
    const session = await loginLms(input.lmsUrl, input.username, input.password);
    if (!session.ok) return [];
    const listed = await moodleCall(session.jar, session.root, session.sesskey, [
      {
        methodname: "core_course_get_enrolled_courses_by_timeline_classification",
        args: { offset: 0, limit: 24, classification: "inprogress", sort: "fullname" },
      },
    ]);
    return ((listed[0]?.data as { courses?: { fullname?: string }[] } | undefined)?.courses ?? [])
      .map((course) => htmlToText(course.fullname ?? ""))
      .filter(Boolean);
  } catch {
    return [];
  }
}

async function loadLessons(
  lmsUrl: string,
  username: string,
  password: string,
): Promise<{ ok: true; courses: LessonCourse[] } | { ok: false; error: string }> {
  try {
    const session = await loginLms(lmsUrl, username, password);
    if (!session.ok) return session;
    const { jar, root, sesskey } = session;
    const listed = await moodleCall(jar, root, sesskey, [
      {
        methodname: "core_course_get_enrolled_courses_by_timeline_classification",
        args: { offset: 0, limit: 16, classification: "inprogress", sort: "fullname" },
      },
    ]);
    const enrolled = ((listed[0]?.data as { courses?: { id?: number; fullname?: string }[] } | undefined)?.courses ?? [])
      .map((course) => ({ id: Number(course.id), name: htmlToText(course.fullname ?? "") }))
      .filter((course) => course.id && course.name)
      .slice(0, 12);
    if (enrolled.length === 0) return { ok: true, courses: [] };
    const states = await moodleCall(
      jar,
      root,
      sesskey,
      enrolled.map((course) => ({ methodname: "core_courseformat_get_state", args: { courseid: course.id } })),
    );
    const courses = enrolled.map((course, index) => courseFromState(course.id, course.name, states[index]?.data));
    return { ok: true, courses };
  } catch {
    return { ok: false, error: "No se pudo leer el material de las clases." };
  }
}

function courseFromState(id: number, name: string, data: unknown): LessonCourse {
  const state = parseState(data);
  const sections = [...(state.section ?? [])].sort((a, b) => (a.number ?? 0) - (b.number ?? 0));
  const pieces: LessonPiece[] = [];
  const resources: LessonResource[] = [];
  for (const section of sections) {
    if (section.visible === false) continue;
    const title = htmlToText(section.rawtitle || section.title || "");
    if (title && !/general|tema$/i.test(title)) pieces.push({ title, text: "" });
    const sectionName = title || "Clase";
    for (const mod of state.cm ?? []) {
      if (mod.sectionnumber !== section.number || mod.uservisible === false || mod.visible === false) continue;
      const modName = htmlToText(mod.name ?? "");
      const kind = mod.modname ?? "";
      if (/foro/i.test(kind)) continue;
      if (modName) pieces.push({ title: modName, text: "" });
      if (/recurso|resource|archivo/i.test(kind) && mod.url) resources.push({ title: modName || "Apunte", section: sectionName, url: mod.url });
    }
  }
  return { id, name, pieces, resources };
}

async function readResourceText(
  lmsUrl: string,
  username: string,
  password: string,
  courses: LessonCourse[],
  words: Set<string>,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const session = await loginLms(lmsUrl, username, password);
    if (!session.ok) return session;
    for (const course of courses) {
      const named = course.resources.filter((item) => lessonWords(`${item.title} ${item.section}`).some((word) => words.has(word)));
      const chosen = (named.length > 0 ? named : course.resources).filter((item) => item.text === undefined).slice(0, 4);
      for (const item of chosen) {
        const bytes = await requestBytes(session.jar, item.url);
        const head = bytes?.subarray(0, 5).toString("utf8") ?? "";
        if (!bytes) {
          item.text = "";
          continue;
        }
        if (!head.startsWith("%PDF")) {
          const html = bytes.toString("utf8");
          item.text = /<html|<p|<div/i.test(html) ? clip(htmlToText(html), 1500) : "";
          continue;
        }
        try {
          item.text = clip(htmlToText(await pdfToText(bytes)), 1800);
        } catch {
          item.text = "";
        }
      }
    }
    return { ok: true };
  } catch {
    return { ok: false, error: "No se pudo leer los apuntes de la clase." };
  }
}

function briefFromLessons(courses: LessonCourse[], matched: LessonCourse[], words: Set<string>): { brief: string; courses: number; matched: number } {
  const chosen = matched.length > 0 ? matched : courses.slice(0, 8);
  const lines = [
    matched.length > 0
      ? "Material de las clases que coinciden con el tema. Enseñá solo esto, en este orden, y no adelantes lo que no aparece."
      : "Ninguna clase coincide con el tema. Esto es el índice de lo que sí enseñan. No lo presentes como si hubieran dado otra cosa.",
  ];
  let used = 0;
  for (const course of chosen) {
    const bits = matched.length === 0 ? course.pieces.slice(0, 12) : course.pieces;
    const notes = course.resources.filter((item) => item.text);
    const block = [
      `Materia: ${course.name}`,
      ...bits.map((piece) => `- ${piece.title}`),
      ...notes.map((item) => `Apunte (${item.section} / ${item.title}): ${item.text}`),
    ].join("\n");
    if (used + block.length > 10000) break;
    lines.push(block);
    used += block.length;
  }
  if (words.size === 0 && matched.length === 0) {
    lines[0] = "No hay un tema concreto. Este es el índice de las clases.";
  }
  return { brief: lines.join("\n\n"), courses: courses.length, matched: matched.length };
}

type LmsEvent = {
  id?: number;
  instance?: number;
  name?: string;
  activityname?: string;
  modulename?: string;
  eventtype?: string;
  timesort?: number;
  timestart?: number;
  url?: string;
  course?: { fullname?: string };
  action?: { name?: string; url?: string };
};

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
