import { courseGroup } from "./courses";
import type { RemoteTask } from "./educamos";

const TEAMS_CLIENT = "1fec8e78-bce4-4aaf-ab1b-5451cc387264";
const TEAMS_REDIRECT = "https://teams.microsoft.com/go";
const TEAMS_SCOPE = "openid profile offline_access https://graph.microsoft.com/User.Read https://graph.microsoft.com/EduAssignments.Read https://graph.microsoft.com/EduRoster.ReadBasic";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

type SignInConfig = {
  flowToken: string;
  ctx: string;
  canary: string;
  postUrl: string;
  credentialUrl: string;
  requestId: string;
};

export async function loginTeams(
  username: string,
  password: string,
): Promise<{ ok: true; accessToken: string } | { ok: false; error: string }> {
  try {
    const jar = new CookieJar();
    const opened = await openSignIn(jar);
    if (!opened.ok) return opened;
    const found = await lookupAccount(jar, opened.config, username);
    if (!found.ok) return found;
    const posted = await postPassword(jar, found.config, username, password);
    if (!posted.ok) return posted;
    return exchangeCode(posted.code);
  } catch {
    return { ok: false, error: "No pude entrar a Microsoft Teams." };
  }
}

export async function fetchTeamsTasks(accessToken: string): Promise<
  { ok: true; tasks: RemoteTask[]; courses: { id: string; label: string }[] } | { ok: false; error: string }
> {
  const classes = await graphGet<{ value?: { id?: string; displayName?: string }[] }>(
    accessToken,
    "https://graph.microsoft.com/v1.0/education/me/classes?$select=id,displayName&$top=40",
  );
  if (!classes.ok) return classes;
  const rooms = (classes.data.value ?? []).filter((room) => room.id && room.displayName);
  if (rooms.length === 0) return { ok: false, error: "Esta cuenta de Microsoft no tiene clases de Teams." };

  const tasks: RemoteTask[] = [];
  for (const room of rooms) {
    const listed = await graphGet<{ value?: TeamsAssignment[] }>(
      accessToken,
      `https://graph.microsoft.com/v1.0/education/classes/${room.id}/assignments?$top=30`,
    );
    if (!listed.ok) return listed;
    const published = (listed.data.value ?? []).filter((item) => item.id && item.status !== "draft");
    const submissions = await mapLimit(published, 4, async (item) => {
      const submission = await graphGet<{ value?: { status?: string }[] }>(
        accessToken,
        `https://graph.microsoft.com/v1.0/education/classes/${room.id}/assignments/${item.id}/submissions?$top=1`,
      );
      return submission.ok ? submission.data.value?.[0]?.status ?? "" : "";
    });
    tasks.push(...published.map((item, index) => assignmentTask(room.displayName ?? "Teams", item, submissions[index] ?? "")));
  }
  const courses = rooms
    .map((room) => courseGroup(room.displayName ?? ""))
    .filter((group): group is { key: string; label: string } => Boolean(group))
    .filter((group, index, all) => all.findIndex((item) => item.key === group.key) === index)
    .map((group) => ({ id: group.key, label: group.label }));
  return { ok: true, tasks, courses };
}

type TeamsAssignment = {
  id?: string;
  displayName?: string;
  dueDateTime?: string | null;
  closeDateTime?: string | null;
  instructions?: { content?: string };
  status?: string;
  webUrl?: string;
};

export function assignmentTask(subject: string, item: TeamsAssignment, submissionStatus: string): RemoteTask {
  const due = item.dueDateTime || item.closeDateTime || new Date(Date.now() + 7 * 86400000).toISOString();
  const turnedIn = /submitted|returned/i.test(submissionStatus);
  const instructions = htmlToPlain(item.instructions?.content ?? "");
  return {
    externalId: `teams-${item.id}`,
    subject,
    title: (item.displayName || "Tarea de Teams").trim(),
    description: instructions || "Tarea publicada en Microsoft Teams.",
    dueAt: due,
    status: turnedIn ? "done" : "pending",
    needsFile: false,
    url: item.webUrl || "https://teams.microsoft.com",
    courseKey: courseGroup(subject)?.key ?? null,
  };
}

class CookieJar {
  private cookies = new Map<string, string>();

  store(response: Response) {
    const list = typeof response.headers.getSetCookie === "function" ? response.headers.getSetCookie() : [];
    for (const cookie of list) {
      const [pair] = cookie.split(";");
      const eq = pair.indexOf("=");
      if (eq > 0) this.cookies.set(pair.slice(0, eq).trim(), pair.slice(eq + 1).trim());
    }
  }

  header() {
    return [...this.cookies.entries()].map(([key, value]) => `${key}=${value}`).join("; ");
  }
}

async function openSignIn(jar: CookieJar): Promise<{ ok: true; config: SignInConfig } | { ok: false; error: string }> {
  const params = new URLSearchParams({
    client_id: TEAMS_CLIENT,
    response_type: "code",
    redirect_uri: TEAMS_REDIRECT,
    scope: TEAMS_SCOPE,
    response_mode: "query",
  });
  let url = `https://login.microsoftonline.com/organizations/oauth2/v2.0/authorize?${params}`;
  for (let hop = 0; hop < 4; hop++) {
    const response = await fetch(url, {
      redirect: "manual",
      headers: { "user-agent": UA, accept: "text/html", cookie: jar.header() },
      signal: AbortSignal.timeout(20000),
    });
    jar.store(response);
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location) break;
      url = new URL(location, url).href;
      continue;
    }
    const html = await response.text();
    const config = readSignIn(html, url);
    if (config?.flowToken) return { ok: true, config };
    if (config?.postUrl) {
      url = config.postUrl;
      continue;
    }
    break;
  }
  return { ok: false, error: "No pude abrir la entrada de Microsoft Teams." };
}

async function lookupAccount(
  jar: CookieJar,
  config: SignInConfig,
  username: string,
): Promise<{ ok: true; config: SignInConfig } | { ok: false; error: string }> {
  const response = await fetch(config.credentialUrl, {
    method: "POST",
    headers: {
      "user-agent": UA,
      accept: "application/json",
      "content-type": "application/json",
      cookie: jar.header(),
    },
    body: JSON.stringify({
      username,
      isOtherIdpSupported: true,
      checkPhones: false,
      isRemoteNGCSupported: false,
      isCookieBannerShown: false,
      isFidoSupported: false,
      flowToken: config.flowToken,
      originalRequest: config.ctx,
    }),
    signal: AbortSignal.timeout(20000),
  });
  jar.store(response);
  const data = (await response.json().catch(() => null)) as {
    IfExistsResult?: number;
    FlowToken?: string;
    Credentials?: { PrefCredential?: number; HasPassword?: boolean; FederationRedirectUrl?: string | null };
  } | null;
  if (!response.ok || !data) return { ok: false, error: "No pude consultar la cuenta de Teams." };
  if (data.Credentials?.FederationRedirectUrl) {
    return { ok: false, error: "Esa cuenta entra por otra página del colegio, no con la contraseña de Microsoft." };
  }
  const exists = data.IfExistsResult === 0 || data.IfExistsResult === 5 || data.IfExistsResult === 6;
  const password = data.Credentials?.HasPassword === true || data.Credentials?.PrefCredential === 1;
  if (!exists && !password) return { ok: false, error: "Teams no aceptó el usuario o la contraseña." };
  return {
    ok: true,
    config: { ...config, flowToken: data.FlowToken || config.flowToken },
  };
}

async function postPassword(
  jar: CookieJar,
  config: SignInConfig,
  username: string,
  password: string,
): Promise<{ ok: true; code: string } | { ok: false; error: string }> {
  if (!microsoftLogin(config.postUrl)) return { ok: false, error: "No envié la contraseña: la página de Teams no era de Microsoft." };
  const body = new URLSearchParams({
    i13: "0",
    login: username,
    loginfmt: username,
    type: "11",
    LoginOptions: "3",
    passwd: password,
    ps: "2",
    canary: config.canary,
    ctx: config.ctx,
    hpgrequestid: config.requestId,
    flowToken: config.flowToken,
    PPSX: "PassportR",
    NewUser: "1",
    fspost: "0",
    i21: "0",
    CookieDisclosure: "0",
    IsFidoSupported: "0",
    isSignupPost: "0",
    i19: "1512",
  });
  return followLogin(jar, config.postUrl, body);
}

async function followLogin(
  jar: CookieJar,
  url: string,
  body?: URLSearchParams,
): Promise<{ ok: true; code: string } | { ok: false; error: string }> {
  let current = url;
  let payload = body;
  for (let hop = 0; hop < 8; hop++) {
    if (payload && !microsoftLogin(current)) return { ok: false, error: "No envié la contraseña fuera de Microsoft." };
    const response = await fetch(current, {
      method: payload ? "POST" : "GET",
      redirect: "manual",
      headers: {
        "user-agent": UA,
        accept: "text/html",
        cookie: jar.header(),
        ...(payload ? { "content-type": "application/x-www-form-urlencoded", origin: "https://login.microsoftonline.com" } : {}),
      },
      body: payload?.toString(),
      signal: AbortSignal.timeout(20000),
    });
    jar.store(response);
    const location = response.headers.get("location");
    if (response.status >= 300 && response.status < 400 && location) {
      const next = new URL(location, current);
      const code = next.searchParams.get("code");
      if (code) return { ok: true, code };
      current = next.href;
      payload = undefined;
      continue;
    }
    const html = await response.text();
    const code = new URL(response.url || current).searchParams.get("code");
    if (code) return { ok: true, code };
    const problem = loginProblem(html);
    if (problem) return { ok: false, error: problem };
    const config = readSignIn(html, current);
    if (config && /kmsi|stay signed in|mantener la sesión/i.test(html)) {
      current = config.postUrl;
      payload = new URLSearchParams({
        LoginOptions: "3",
        type: "28",
        ctx: config.ctx,
        flowToken: config.flowToken,
        canary: config.canary,
        hpgrequestid: config.requestId,
      });
      continue;
    }
    // Microsoft responde la contraseña con una página intermedia que solo acepta POST.
    // Si se abre con GET, Teams corta la entrada con AADSTS900561.
    if (config?.postUrl && /sso_reload=true/i.test(config.postUrl) && payload) {
      current = config.postUrl;
      continue;
    }
    if (config?.flowToken && !payload) return { ok: false, error: "Teams no aceptó el usuario o la contraseña." };
    break;
  }
  return { ok: false, error: "No pude terminar la entrada a Teams." };
}

function readSignIn(html: string, pageUrl: string): SignInConfig | null {
  const raw = html.match(/\$Config=(\{[\s\S]*?\});/)?.[1];
  if (!raw) return null;
  const data = JSON.parse(raw) as {
    sFT?: string;
    sCtx?: string;
    canary?: string;
    apiCanary?: string;
    urlPost?: string;
    urlGetCredentialType?: string;
    sessionId?: string;
    correlationId?: string;
  };
  return {
    flowToken: data.sFT ?? "",
    ctx: data.sCtx ?? "",
    canary: data.canary || data.apiCanary || "",
    postUrl: data.urlPost ? new URL(data.urlPost, pageUrl).href : "",
    credentialUrl: data.urlGetCredentialType ? new URL(data.urlGetCredentialType, pageUrl).href : "",
    requestId: data.sessionId || data.correlationId || "",
  };
}

function loginProblem(html: string): string | null {
  const code = html.match(/"sErrorCode"\s*:\s*"(\d+)"/)?.[1] ?? html.match(/AADSTS(\d+)/)?.[1] ?? "";
  if (["50076", "50079", "50158"].includes(code) || /idDiv_SAOTCS_Proofs|ConvergedProofUp/i.test(html)) {
    return "Microsoft pide un código extra. Taskie entra solo con usuario y contraseña.";
  }
  if (code === "50128") return "Teams no reconoció ese usuario. Tiene que ser el correo del colegio.";
  if (["50126", "50034", "50053", "50055", "50057"].includes(code)) {
    return "Teams no aceptó el usuario o la contraseña.";
  }
  const text = html.match(/"sErrTxt":"([^"]+)"/)?.[1];
  if (text && !/^\s*$/.test(text)) return "Teams no aceptó el usuario o la contraseña.";
  return null;
}

function microsoftLogin(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return host === "login.microsoftonline.com" || host === "login.microsoft.com" || host === "login.live.com";
  } catch {
    return false;
  }
}

async function exchangeCode(code: string): Promise<{ ok: true; accessToken: string } | { ok: false; error: string }> {
  const body = new URLSearchParams({
    client_id: TEAMS_CLIENT,
    grant_type: "authorization_code",
    code,
    redirect_uri: TEAMS_REDIRECT,
    scope: TEAMS_SCOPE,
  });
  const response = await fetch("https://login.microsoftonline.com/organizations/oauth2/v2.0/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
    signal: AbortSignal.timeout(20000),
  });
  const data = (await response.json().catch(() => null)) as { access_token?: string; error_description?: string } | null;
  if (!response.ok || !data?.access_token) return { ok: false, error: cleanMicrosoftError(data?.error_description) };
  return { ok: true, accessToken: data.access_token };
}

async function graphGet<T>(accessToken: string, url: string): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  const response = await fetch(url, {
    headers: { authorization: `Bearer ${accessToken}`, accept: "application/json" },
    signal: AbortSignal.timeout(20000),
  });
  if (response.status === 401) return { ok: false, error: "Microsoft no aceptó la sesión. Volvé a conectar Teams." };
  if (response.status === 403) {
    return { ok: false, error: "El colegio todavía no dejó que Taskie lea las tareas de Teams." };
  }
  const data = (await response.json().catch(() => null)) as (T & { error?: { message?: string } }) | null;
  if (!response.ok || !data) return { ok: false, error: cleanMicrosoftError(data?.error?.message) };
  return { ok: true, data };
}

function cleanMicrosoftError(value: string | undefined): string {
  const text = (value ?? "").replace(/\s+/g, " ").trim();
  if (!text) return "No pude entrar a Microsoft Teams.";
  return text.length > 180 ? `${text.slice(0, 176)}…` : text;
}

function htmlToPlain(value: string): string {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/p>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, number: string) => String.fromCharCode(Number(number)))
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 800);
}

async function mapLimit<T, R>(items: T[], limit: number, run: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const index = next;
      next += 1;
      results[index] = await run(items[index]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()));
  return results;
}
