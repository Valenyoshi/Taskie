import { createHash, randomBytes } from "node:crypto";
import { courseGroup } from "./courses";
import type { RemoteTask } from "./educamos";

const TEAMS_CLIENT = "5e3ce6c0-2b1f-4285-8d4b-75ee78787346";
const TEAMS_REDIRECT = "https://teams.microsoft.com";
const TEAMS_SCOPE = "openid profile offline_access https://api.spaces.skype.com/user_impersonation";
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
    const proof = pkce();
    const opened = await openSignIn(jar, proof.challenge);
    if (!opened.ok) return opened;
    const found = await lookupAccount(jar, opened.config, username);
    if (!found.ok) return found;
    const posted = await postPassword(jar, found.config, username, password);
    if (!posted.ok) return posted;
    return exchangeCode(posted.code, proof.verifier);
  } catch {
    return { ok: false, error: "No pude entrar a Microsoft Teams." };
  }
}

const ASSIGNMENTS_APP = "66aeee93-507d-479a-a3ef-8f494af43945";
const MONTHS: Record<string, number> = {
  ene: 1, enero: 1, feb: 2, febrero: 2, mar: 3, marzo: 3, abr: 4, abril: 4, may: 5, mayo: 5,
  jun: 6, junio: 6, jul: 7, julio: 7, ago: 8, agosto: 8, sep: 9, sept: 9, septiembre: 9,
  oct: 10, octubre: 10, nov: 11, noviembre: 11, dic: 12, diciembre: 12,
};

export async function fetchTeamsTasks(accessToken: string): Promise<
  { ok: true; tasks: RemoteTask[]; courses: { id: string; label: string }[] } | { ok: false; error: string }
> {
  const session = await openTeamsSession(accessToken);
  if (!session.ok) return session;
  const classes = await listClassTeams(session.chat, session.headers);
  if (!classes.ok) return classes;
  if (classes.teams.length === 0) return { ok: false, error: "Esta cuenta de Microsoft no tiene clases de Teams." };

  const found = new Map<string, { task: RemoteTask; posted: number }>();
  for (const room of classes.teams) {
    const messages = await listMessages(session.chat, session.headers, room.threadId);
    if (!messages.ok) return messages;
    for (const message of messages.messages) {
      const task = taskFromAssignmentCard(room.subject, message);
      if (!task) continue;
      const posted = Date.parse(message.originalarrivaltime ?? "") || 0;
      const current = found.get(task.externalId);
      if (!current || posted >= current.posted) found.set(task.externalId, { task, posted });
    }
  }
  const cutoff = Date.now() - 120 * 86400000;
  const tasks = [...found.values()].map((item) => item.task).filter((task) => Date.parse(task.dueAt) >= cutoff);
  const courses = tasks
    .map((task) => courseGroup(task.subject))
    .filter((group): group is { key: string; label: string } => Boolean(group))
    .filter((group, index, all) => all.findIndex((item) => item.key === group.key) === index)
    .map((group) => ({ id: group.key, label: group.label }));
  return { ok: true, tasks, courses };
}

type ClassTeam = { threadId: string; subject: string };
type TeamsMessage = { content?: string; imdisplayname?: string; originalarrivaltime?: string };

async function openTeamsSession(accessToken: string): Promise<
  { ok: true; chat: string; headers: Record<string, string> } | { ok: false; error: string }
> {
  const response = await fetch("https://teams.microsoft.com/api/authsvc/v1.0/authz", {
    method: "POST",
    headers: { authorization: `Bearer ${accessToken}`, accept: "application/json" },
    signal: AbortSignal.timeout(20000),
  });
  const data = (await response.json().catch(() => null)) as {
    tokens?: { skypeToken?: string };
    regionGtms?: { chatService?: string };
  } | null;
  const skype = data?.tokens?.skypeToken;
  const chat = data?.regionGtms?.chatService;
  if (!response.ok || !skype || !chat || !microsoftHost(chat)) {
    return { ok: false, error: "No pude abrir la sesión de Teams." };
  }
  return {
    ok: true,
    chat,
    headers: {
      authorization: `Bearer ${accessToken}`,
      authentication: `skypetoken=${skype}`,
      "x-skypetoken": skype,
      accept: "application/json",
    },
  };
}

async function listClassTeams(
  chat: string,
  headers: Record<string, string>,
): Promise<{ ok: true; teams: ClassTeam[] } | { ok: false; error: string }> {
  const response = await fetch(`${chat}/v1/users/ME/conversations?view=msnp24Equivalent&pageSize=100`, {
    headers,
    signal: AbortSignal.timeout(20000),
  });
  const data = (await response.json().catch(() => null)) as {
    conversations?: { id?: string; threadProperties?: { spaceType?: string; spaceThreadTopic?: string } }[];
  } | null;
  if (!response.ok || !data) return { ok: false, error: "No pude leer las clases de Teams." };
  const teams = (data.conversations ?? [])
    .filter((item) => item.id && /^(class|edu)$/i.test(item.threadProperties?.spaceType ?? ""))
    .map((item) => ({
      threadId: item.id ?? "",
      subject: (item.threadProperties?.spaceThreadTopic || "Teams").trim(),
    }));
  return { ok: true, teams };
}

async function listMessages(
  chat: string,
  headers: Record<string, string>,
  threadId: string,
): Promise<{ ok: true; messages: TeamsMessage[] } | { ok: false; error: string }> {
  const messages: TeamsMessage[] = [];
  let url = `${chat}/v1/users/ME/conversations/${encodeURIComponent(threadId)}/messages?view=msnp24Equivalent&pageSize=100`;
  for (let page = 0; page < 4 && url; page++) {
    const response = await fetch(url, { headers, signal: AbortSignal.timeout(20000) });
    const data = (await response.json().catch(() => null)) as {
      messages?: TeamsMessage[];
      _metadata?: { backwardLink?: string };
    } | null;
    if (response.status === 404) break;
    if (!response.ok || !data) return { ok: false, error: "No pude leer las tareas de una clase de Teams." };
    messages.push(...(data.messages ?? []));
    const next = data._metadata?.backwardLink;
    url = next && microsoftHost(next) ? next : "";
  }
  return { ok: true, messages };
}

function taskFromAssignmentCard(subject: string, message: TeamsMessage): RemoteTask | null {
  const encoded = message.content?.match(/<Swift\b[^>]*\sb64="([^"]+)"/)?.[1];
  if (!encoded) return null;
  let card: unknown;
  try {
    card = JSON.parse(Buffer.from(encoded, "base64").toString("utf8"));
  } catch {
    return null;
  }
  const texts: string[] = [];
  const urls: string[] = [];
  collectCard(card, texts, urls);
  const url = urls.find((item) => item.includes(ASSIGNMENTS_APP));
  if (!url) return null;
  const assignmentId = assignmentIdFromUrl(url);
  if (!assignmentId) return null;
  const title = texts.find((text) => !/vencimiento|\bdue\b/i.test(text));
  if (!title) return null;
  const dueText = texts.find((text) => /vencimiento|\bdue\b/i.test(text)) ?? "";
  const postedAt = message.originalarrivaltime || new Date().toISOString();
  return {
    externalId: `teams-${assignmentId}`,
    subject,
    title: title.slice(0, 180),
    description: "Tarea publicada en Microsoft Teams.",
    dueAt: dueAtFromText(dueText, postedAt),
    status: "pending",
    needsFile: false,
    url,
    courseKey: courseGroup(subject)?.key ?? null,
  };
}

function collectCard(node: unknown, texts: string[], urls: string[]) {
  if (!node || typeof node !== "object") return;
  if (Array.isArray(node)) {
    for (const item of node) collectCard(item, texts, urls);
    return;
  }
  const record = node as Record<string, unknown>;
  if (typeof record.text === "string" && record.text.trim()) texts.push(record.text.trim());
  if (typeof record.url === "string" && record.url.startsWith("https://")) urls.push(record.url);
  for (const value of Object.values(record)) {
    if (value && typeof value === "object") collectCard(value, texts, urls);
  }
}

function assignmentIdFromUrl(url: string): string | null {
  let current = url;
  for (let hop = 0; hop < 3; hop++) {
    try {
      const next = decodeURIComponent(current);
      if (next === current) break;
      current = next;
    } catch {
      break;
    }
  }
  return current.replace(/\\"/g, '"').match(/"assignmentIds"\s*:\s*\[\s*"([0-9a-f-]{36})"/i)?.[1] ?? null;
}

function dueAtFromText(dueText: string, postedAt: string): string {
  const posted = new Date(postedAt);
  const plain = dueText.normalize("NFD").replace(/\p{M}/gu, "");
  const written = plain.match(/(\d{1,2})\s+de\s+([a-z]+)/i);
  const numeric = plain.match(/(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?/);
  if (Number.isNaN(posted.getTime()) || (!written && !numeric)) return posted.toISOString();
  const day = Number((written ?? numeric)?.[1]);
  const month = written ? MONTHS[(written[2] ?? "").toLowerCase()] ?? 0 : Number(numeric?.[2]);
  let year = numeric?.[3] ? Number(numeric[3]) : posted.getUTCFullYear();
  if (year < 100) year += 2000;
  if (!month || day < 1 || day > 31) return posted.toISOString();
  let due = new Date(Date.UTC(year, month - 1, day, 15, 0, 0));
  if (due.getTime() < posted.getTime() - 30 * 86400000) due = new Date(Date.UTC(year + 1, month - 1, day, 15, 0, 0));
  return due.toISOString();
}

function microsoftHost(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return host === "teams.microsoft.com" || host.endsWith(".teams.microsoft.com") || host.endsWith(".skype.com");
  } catch {
    return false;
  }
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

function pkce(): { verifier: string; challenge: string } {
  const verifier = randomBytes(32).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  return { verifier, challenge };
}

async function openSignIn(
  jar: CookieJar,
  challenge: string,
): Promise<{ ok: true; config: SignInConfig } | { ok: false; error: string }> {
  const params = new URLSearchParams({
    client_id: TEAMS_CLIENT,
    response_type: "code",
    redirect_uri: TEAMS_REDIRECT,
    scope: TEAMS_SCOPE,
    response_mode: "query",
    code_challenge: challenge,
    code_challenge_method: "S256",
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
      const code = next.searchParams.get("code") || new URLSearchParams(next.hash.replace(/^#/, "")).get("code");
      if (code) return { ok: true, code };
      if (next.searchParams.get("error")) return { ok: false, error: "No pude terminar la entrada a Teams." };
      current = next.href;
      payload = undefined;
      continue;
    }
    const html = await response.text();
    const code = new URL(response.url || current).searchParams.get("code");
    if (code) return { ok: true, code };
    const problem = loginProblem(html);
    if (problem) return { ok: false, error: problem };
    const posted = readPostParams(html, current);
    if (posted && microsoftLogin(posted.url)) {
      current = posted.url;
      payload = posted.body;
      continue;
    }
    const config = readSignIn(html, current);
    if (config && /kmsi|stay signed in|mantener la sesión/i.test(html)) {
      current = config.postUrl;
      payload = new URLSearchParams({
        LoginOptions: "1",
        type: "28",
        ctx: config.ctx,
        flowToken: config.flowToken,
        canary: config.canary,
        hpgrequestid: config.requestId,
        i19: "2403",
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

function readPostParams(html: string, pageUrl: string): { url: string; body: URLSearchParams } | null {
  const raw = html.match(/\$Config=(\{[\s\S]*?\});/)?.[1];
  if (!raw) return null;
  const data = JSON.parse(raw) as { urlPost?: string; oPostParams?: Record<string, string | number> };
  if (!data.urlPost || !data.oPostParams) return null;
  const body = new URLSearchParams();
  for (const [key, value] of Object.entries(data.oPostParams)) {
    if (value !== undefined && value !== null) body.set(key, String(value));
  }
  if ([...body.keys()].length === 0) return null;
  return { url: new URL(data.urlPost, pageUrl).href, body };
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

async function exchangeCode(
  code: string,
  verifier: string,
): Promise<{ ok: true; accessToken: string } | { ok: false; error: string }> {
  const body = new URLSearchParams({
    client_id: TEAMS_CLIENT,
    grant_type: "authorization_code",
    code,
    redirect_uri: TEAMS_REDIRECT,
    scope: TEAMS_SCOPE,
    code_verifier: verifier,
  });
  const response = await fetch("https://login.microsoftonline.com/organizations/oauth2/v2.0/token", {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      origin: TEAMS_REDIRECT,
    },
    body,
    signal: AbortSignal.timeout(20000),
  });
  const data = (await response.json().catch(() => null)) as { access_token?: string; error_description?: string } | null;
  if (!response.ok || !data?.access_token) return { ok: false, error: cleanMicrosoftError(data?.error_description) };
  return { ok: true, accessToken: data.access_token };
}

function cleanMicrosoftError(value: string | undefined): string {
  const text = (value ?? "").replace(/\s+/g, " ").trim();
  if (!text) return "No pude entrar a Microsoft Teams.";
  return text.length > 180 ? `${text.slice(0, 176)}…` : text;
}
