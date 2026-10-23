import { spawn, type ChildProcess } from "child_process";
import { existsSync, mkdirSync, readFileSync, rmSync } from "fs";
import { tmpdir } from "os";
import path from "path";
import { courseGroup, type SchoolCourse } from "./courses";
import type { RemoteTask } from "./educamos";
import { addDays, endOfLocalDay, localDateString } from "./time";

const SIGN_IN =
  "https://accounts.google.com/v3/signin/identifier?continue=https%3A%2F%2Fclassroom.google.com%2Fu%2F0%2Fh&hl=es&flowName=GlifWebSignIn&flowEntry=ServiceLogin";

type PageLink = { href: string; label: string; text: string };
type PageSnap = { href: string; body: string; items: PageLink[] };

export async function fetchClassroomTasks(input: {
  username: string;
  password: string;
  timeZone: string;
}): Promise<{ ok: true; tasks: RemoteTask[]; courses: SchoolCourse[] } | { ok: false; error: string }> {
  const username = input.username.trim();
  if (!username || !input.password) return { ok: false, error: "Completá el correo y la contraseña de Google." };
  let close = () => {};
  const timer = setTimeout(() => close(), 75000);
  try {
    return await withBrowser(async (browser) => {
      close = browser.close;
      const signed = await signIn(browser, username, input.password);
      if (!signed.ok) return signed;
      await browser.goto("https://classroom.google.com/u/0/h");
      await chooseStudent(browser);
      const home = await browser.snap();
      if (onSignIn(home.href)) return { ok: false, error: signInError(home.body) };
      const rooms = roomsFrom(home.items);
      const pending = await assignments(browser, "https://classroom.google.com/u/0/a/not-turned-in/all", "pending", input.timeZone);
      const done = await assignments(browser, "https://classroom.google.com/u/0/a/turned-in/all", "done", input.timeZone);
      const tasks = mergeTasks(done, pending);
      if (tasks.length === 0 && rooms.length > 0) tasks.push(...(await courseAssignments(browser, rooms, input.timeZone)));
      if (tasks.length === 0 && rooms.length === 0 && /iniciar sesi[oó]n|sign in/i.test(home.body)) {
        return { ok: false, error: "Classroom no aceptó el usuario o la contraseña." };
      }
      if (tasks.length === 0 && rooms.length === 0) {
        return { ok: false, error: "Esta cuenta no tiene clases en Classroom." };
      }
      return { ok: true, tasks: dedupe(tasks), courses: schoolCourses(rooms) };
    });
  } catch {
    return { ok: false, error: "No pude entrar a Google Classroom." };
  } finally {
    clearTimeout(timer);
    close();
  }
}

export function classroomDue(raw: string, timeZone: string, now = new Date()): string {
  const text = raw.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
  const today = localDateString(now, timeZone);
  if (/\b(hoy|today)\b/.test(text)) return endOfLocalDay(today, timeZone);
  if (/\b(manana|tomorrow)\b/.test(text)) return endOfLocalDay(addDays(today, 1), timeZone);
  const iso = raw.match(/\d{4}-\d{2}-\d{2}(?:T[\d:.]+Z?)?/);
  if (iso) {
    if (iso[0].includes("T")) {
      const parsed = new Date(iso[0]);
      if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
    }
    return endOfLocalDay(iso[0].slice(0, 10), timeZone);
  }
  const months: Record<string, number> = {
    ene: 1, jan: 1, feb: 2, mar: 3, abr: 4, apr: 4, may: 5, jun: 6, jul: 7, ago: 8, aug: 8, sep: 9, oct: 10, nov: 11, dic: 12, dec: 12,
  };
  const match = text.match(/(\d{1,2})\s*(?:de\s+)?(ene|feb|mar|abr|apr|may|jun|jul|ago|aug|sep|oct|nov|dic|dec|jan)\b/);
  if (match) {
    const month = String(months[match[2]]).padStart(2, "0");
    const day = match[1].padStart(2, "0");
    let date = `${today.slice(0, 4)}-${month}-${day}`;
    if (date < addDays(today, -14)) date = `${Number(today.slice(0, 4)) + 1}-${month}-${day}`;
    return endOfLocalDay(date, timeZone);
  }
  return endOfLocalDay(addDays(today, 7), timeZone);
}

function roomsFrom(items: PageLink[]): { id: string; name: string }[] {
  const rooms = new Map<string, string>();
  for (const item of items) {
    if (workOf(item.href)) continue;
    const id = item.href.match(/\/c\/([^/?#]+)/)?.[1];
    if (!id || id.length < 4) continue;
    const name = firstLine(item.label || item.text) || "Classroom";
    if (!rooms.has(id)) rooms.set(id, name);
  }
  return [...rooms.entries()].map(([id, name]) => ({ id, name }));
}

function schoolCourses(rooms: { name: string }[]): SchoolCourse[] {
  const courses = new Map<string, string>();
  for (const room of rooms) {
    const group = courseGroup(room.name);
    if (group && !courses.has(group.key)) courses.set(group.key, group.label);
  }
  return [...courses.entries()].map(([id, label]) => ({ id, label }));
}

function assignmentsFrom(items: PageLink[], status: "pending" | "done", timeZone: string, course = ""): RemoteTask[] {
  const tasks: RemoteTask[] = [];
  for (const item of items) {
    const work = workOf(item.href);
    if (!work) continue;
    const title = cleanTitle(item.label, item.text);
    const subject = course || subjectOf(item.text, title);
    tasks.push({
      externalId: `classroom-${work.courseId}-${work.workId}`,
      subject,
      title,
      description: "",
      dueAt: classroomDue(`${item.text}\n${item.label}`, timeZone),
      status,
      needsFile: false,
      url: item.href,
      courseKey: courseGroup(subject)?.key ?? null,
    });
  }
  return tasks;
}

function workOf(href: string): { courseId: string; workId: string } | null {
  const match = href.match(/\/c\/([^/]+)\/(?:a|t)\/([^/?#]+)/);
  if (!match) return null;
  if (/^(not-turned-in|turned-in|all)$/i.test(match[2])) return null;
  return { courseId: match[1], workId: match[2] };
}

function cleanTitle(label: string, text: string): string {
  const named = label.replace(/\s+/g, " ").trim();
  if (named && named.length > 1 && named.length < 140) return named;
  const line = text
    .split("\n")
    .map((part) => part.trim())
    .find((part) => part.length > 1 && !/vence|due\b|entregad|turned in|no entregad/i.test(part));
  return (line || "Tarea de Classroom").slice(0, 140);
}

function subjectOf(text: string, title: string): string {
  const line = text
    .split("\n")
    .map((part) => part.trim())
    .find((part) => part && part !== title && part.length < 70 && !/vence|due\b|hoy|mañana|manana|entregad|turned in/i.test(part));
  return line || "Classroom";
}

function firstLine(value: string): string {
  return value.split("\n").map((part) => part.trim()).find(Boolean)?.slice(0, 80) ?? "";
}

function mergeTasks(done: RemoteTask[], pending: RemoteTask[]): RemoteTask[] {
  const byId = new Map<string, RemoteTask>();
  for (const task of done) byId.set(task.externalId, task);
  for (const task of pending) byId.set(task.externalId, task);
  return [...byId.values()];
}

function dedupe(tasks: RemoteTask[]): RemoteTask[] {
  const byId = new Map<string, RemoteTask>();
  for (const task of tasks) byId.set(task.externalId, task);
  return [...byId.values()];
}

async function assignments(
  browser: Browser,
  url: string,
  status: "pending" | "done",
  timeZone: string,
): Promise<RemoteTask[]> {
  await browser.goto(url);
  const page = await browser.snap();
  if (onSignIn(page.href)) return [];
  return assignmentsFrom(page.items, status, timeZone);
}

async function courseAssignments(
  browser: Browser,
  rooms: { id: string; name: string }[],
  timeZone: string,
): Promise<RemoteTask[]> {
  const tasks: RemoteTask[] = [];
  for (const room of rooms.slice(0, 8)) {
    await browser.goto(`https://classroom.google.com/c/${room.id}`);
    const page = await browser.snap();
    const found = assignmentsFrom(page.items, "pending", timeZone, room.name);
    if (found.length === 0) {
      await browser.goto(`https://classroom.google.com/w/${room.id}/t/all`);
      const classwork = await browser.snap();
      tasks.push(...assignmentsFrom(classwork.items, "pending", timeZone, room.name));
    } else {
      tasks.push(...found);
    }
  }
  return tasks;
}

async function signIn(browser: Browser, username: string, password: string): Promise<{ ok: true } | { ok: false; error: string }> {
  await browser.goto(SIGN_IN);
  const email = await browser.waitFor("document.querySelector('input[name=identifier]') ? true : false", 12000);
  if (!email) return { ok: false, error: "No pude abrir la entrada de Google." };
  await browser.type('input[name=identifier]', username);
  await browser.click("#identifierNext button, #identifierNext");
  const next = await browser.waitFor(
    `(() => {
      const pass = [...document.querySelectorAll('input[type=password]')].some((input) => input.name !== 'hiddenPassword' && input.getClientRects().length > 0);
      const body = document.body.innerText || '';
      return pass || /no se ha podido encontrar|couldn.t find your google account|no sean seguros|verificaci[oó]n|c[oó]digo/i.test(body);
    })()`,
    15000,
  );
  if (!next) return { ok: false, error: "No pude abrir la entrada de Google." };
  const afterEmail = await browser.snap();
  const blocked = signInError(afterEmail.body);
  if (!/contraseña|password/i.test(afterEmail.body) && blocked !== "Classroom no aceptó el usuario o la contraseña.") {
    if (/no se ha podido encontrar|couldn.t find your google account/i.test(afterEmail.body)) {
      return { ok: false, error: "Classroom no aceptó el usuario o la contraseña." };
    }
    if (blocked !== "No pude terminar la entrada a Google Classroom.") return { ok: false, error: blocked };
  }
  if (/no se ha podido encontrar|couldn.t find your google account/i.test(afterEmail.body)) {
    return { ok: false, error: "Classroom no aceptó el usuario o la contraseña." };
  }
  if (!googlePage(afterEmail.href)) {
    return { ok: false, error: "Esa cuenta entra por otra página del colegio. Taskie entra con el correo y la contraseña de Google." };
  }
  const passwordReady = await browser.eval(
    `[...document.querySelectorAll('input[type=password]')].some((input) => input.name !== 'hiddenPassword' && input.getClientRects().length > 0)`,
  );
  if (passwordReady !== true) return { ok: false, error: signInError(afterEmail.body) };
  await browser.type("input[type=password]:not([name=hiddenPassword])", password);
  await browser.click("#passwordNext button, #passwordNext");
  await browser.waitFor(
    `location.hostname === 'classroom.google.com' || /verificaci[oó]n|c[oó]digo|contraseña incorrecta|wrong password|no sean seguros|challenge/i.test(location.href + document.body.innerText)`,
    18000,
  );
  const landed = await browser.snap();
  if (onSignIn(landed.href) || !landed.href.includes("classroom.google.com")) return { ok: false, error: signInError(landed.body + landed.href) };
  return { ok: true };
}

async function chooseStudent(browser: Browser): Promise<void> {
  await browser.eval(
    `(() => { const button = [...document.querySelectorAll('button, [role=button], a')].find((el) => /^(estudiante|student)$/i.test((el.innerText || '').trim())); button?.click(); return true; })()`,
  );
}

function signInError(text: string): string {
  if (/no sean seguros|couldn.t sign you in|browser or app may not be secure/i.test(text)) {
    return "Google no dejó entrar desde este navegador.";
  }
  if (/verificaci[oó]n en dos pasos|c[oó]digo de verificaci|2-step|challenge\/|confirmar que eres t[uú]/i.test(text)) {
    return "Google pide un código extra. Taskie entra solo con usuario y contraseña.";
  }
  if (/contraseña incorrecta|wrong password|no se ha podido encontrar|couldn.t find your google account/i.test(text)) {
    return "Classroom no aceptó el usuario o la contraseña.";
  }
  return "No pude terminar la entrada a Google Classroom.";
}

function onSignIn(href: string): boolean {
  return /accounts\.google\.com\/.*signin|accounts\.google\.com\/v3\/signin/i.test(href);
}

function googlePage(href: string): boolean {
  try {
    const host = new URL(href).hostname.toLowerCase();
    return host === "google.com" || host.endsWith(".google.com") || host.endsWith(".youtube.com");
  } catch {
    return false;
  }
}

type Browser = {
  goto: (url: string) => Promise<void>;
  eval: (expression: string) => Promise<unknown>;
  snap: () => Promise<PageSnap>;
  type: (selector: string, value: string) => Promise<void>;
  click: (selector: string) => Promise<void>;
  waitFor: (expression: string, timeoutMs: number) => Promise<boolean>;
  close: () => void;
};

async function withBrowser<T>(run: (browser: Browser) => Promise<T>): Promise<T> {
  const opened = await openBrowser();
  try {
    return await run(opened);
  } finally {
    opened.close();
  }
}

async function openBrowser(): Promise<Browser> {
  const chromeBin = [process.env.CHROME_PATH, "/usr/local/bin/google-chrome", "/usr/bin/google-chrome", "/usr/bin/chromium", "/usr/bin/chromium-browser"]
    .find((bin): bin is string => Boolean(bin && existsSync(bin)));
  if (!chromeBin) throw new Error("chrome");
  const profile = path.join(tmpdir(), `taskie-classroom-${crypto.randomUUID()}`);
  mkdirSync(profile, { recursive: true });
  const ownDisplay = !process.env.DISPLAY && existsSync("/usr/bin/Xvfb");
  const display = ownDisplay ? `:${200 + Math.floor(Math.random() * 700)}` : process.env.DISPLAY || "";
  const xvfb = ownDisplay
    ? spawn("/usr/bin/Xvfb", [display, "-screen", "0", "1280x900x24", "-ac"], { stdio: "ignore" })
    : null;
  if (xvfb) await sleep(300);
  const chrome = spawn(chromeBin, [
    "--disable-gpu",
    "--no-sandbox",
    "--disable-dev-shm-usage",
    "--disable-blink-features=AutomationControlled",
    "--remote-debugging-port=0",
    `--user-data-dir=${profile}`,
    "--window-size=1280,900",
    "--lang=es",
    "--no-first-run",
    "--no-default-browser-check",
    "--password-store=basic",
    "about:blank",
  ], { stdio: "ignore", env: { ...process.env, DISPLAY: display || process.env.DISPLAY || "" } });
  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    chrome.kill("SIGKILL");
    xvfb?.kill("SIGKILL");
    rmSync(profile, { recursive: true, force: true });
  };
  try {
    const port = await waitForPort(profile, chrome);
    const version = (await fetch(`http://127.0.0.1:${port}/json/version`).then((res) => res.json())) as { webSocketDebuggerUrl: string };
    const browserWs = await socket(version.webSocketDebuggerUrl);
    const created = await browserWs.send("Target.createTarget", { url: "about:blank" });
    const targets = (await fetch(`http://127.0.0.1:${port}/json/list`).then((res) => res.json())) as { id: string; webSocketDebuggerUrl: string }[];
    const page = targets.find((target) => target.id === (created as { targetId: string }).targetId);
    if (!page?.webSocketDebuggerUrl) throw new Error("page");
    const pageWs = await socket(page.webSocketDebuggerUrl);
    await pageWs.send("Page.enable");
    await pageWs.send("Runtime.enable");
    await pageWs.send("Page.addScriptToEvaluateOnNewDocument", {
      source: "Object.defineProperty(navigator, 'webdriver', { get: () => undefined });",
    });
    const browser: Browser = {
      close,
      async goto(url) {
        await pageWs.send("Page.navigate", { url });
        await this.waitFor("document.readyState === 'complete'", 15000);
        await sleep(800);
      },
      async eval(expression) {
        const result = (await pageWs.send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true })) as {
          result?: { value?: unknown };
        };
        return result.result?.value;
      },
      async snap() {
        const value = (await this.eval(`(() => {
          const seen = new Set();
          const items = [];
          for (const link of document.querySelectorAll('a[href*="/c/"]')) {
            const href = link.href.split('?')[0];
            if (seen.has(href)) continue;
            seen.add(href);
            const card = link.closest('li, [role="listitem"], article') || link;
            items.push({
              href,
              label: (link.getAttribute('aria-label') || '').trim().slice(0, 180),
              text: (card.innerText || link.innerText || '').trim().slice(0, 500),
            });
          }
          return { href: location.href, body: (document.body?.innerText || '').slice(0, 1500), items };
        })()`)) as PageSnap | undefined;
        return value ?? { href: "", body: "", items: [] };
      },
      async type(selector, value) {
        await this.eval(`document.querySelector(${JSON.stringify(selector)})?.focus()`);
        await pageWs.send("Input.insertText", { text: value });
      },
      async click(selector) {
        await this.eval(`document.querySelector(${JSON.stringify(selector)})?.click()`);
      },
      async waitFor(expression, timeoutMs) {
        const started = Date.now();
        while (Date.now() - started < timeoutMs) {
          if ((await this.eval(`Boolean(${expression})`)) === true) return true;
          await sleep(300);
        }
        return false;
      },
    };
    return browser;
  } catch (error) {
    close();
    throw error;
  }
}

async function waitForPort(profile: string, chrome: ChildProcess): Promise<string> {
  const started = Date.now();
  while (Date.now() - started < 8000) {
    if (chrome.exitCode !== null) throw new Error("chrome");
    try {
      const port = readFileSync(path.join(profile, "DevToolsActivePort"), "utf8").split("\n")[0]?.trim();
      if (port) return port;
    } catch {
      // Chrome still writes the port file.
    }
    await sleep(150);
  }
  throw new Error("chrome");
}

function socket(url: string): Promise<{ send: (method: string, params?: object) => Promise<unknown> }> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
    const pending = new Map<number, (message: { error?: unknown; result?: unknown }) => void>();
    let id = 0;
    ws.addEventListener("open", () => {
      resolve({
        send(method, params = {}) {
          return new Promise((done, fail) => {
            const next = ++id;
            const timer = setTimeout(() => fail(new Error(method)), 20000);
            pending.set(next, (message) => {
              clearTimeout(timer);
              if (message.error) fail(new Error(method));
              else done(message.result);
            });
            ws.send(JSON.stringify({ id: next, method, params }));
          });
        },
      });
    });
    ws.addEventListener("message", (event) => {
      const message = JSON.parse(String(event.data)) as { id?: number; error?: unknown; result?: unknown };
      if (message.id && pending.has(message.id)) {
        const done = pending.get(message.id);
        pending.delete(message.id);
        done?.(message);
      }
    });
    ws.addEventListener("error", () => reject(new Error("socket")));
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
