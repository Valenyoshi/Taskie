import { createHash, randomBytes } from "crypto";
import { courseGroup } from "./courses";
import type { RemoteTask } from "./educamos";

const SCOPES = ["openid", "profile", "offline_access", "User.Read", "EduAssignments.Read", "EduRoster.ReadBasic"];

export function teamsClientId(): string | null {
  const id = process.env.MICROSOFT_CLIENT_ID?.trim();
  return id || null;
}

export function teamsTenant(): string {
  return process.env.MICROSOFT_TENANT?.trim() || "organizations";
}

export function teamsRedirectUri(request: Request): string {
  const url = new URL(request.url);
  const proto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() || url.protocol.replace(":", "");
  const host = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim() || url.host;
  return `${proto}://${host}/api/auth/teams/callback`;
}

export function teamsAuthorizeUrl(input: { redirectUri: string; state: string; challenge: string }): string {
  const params = new URLSearchParams({
    client_id: teamsClientId() ?? "",
    response_type: "code",
    redirect_uri: input.redirectUri,
    response_mode: "query",
    scope: SCOPES.join(" "),
    state: input.state,
    code_challenge: input.challenge,
    code_challenge_method: "S256",
    prompt: "select_account",
  });
  return `https://login.microsoftonline.com/${encodeURIComponent(teamsTenant())}/oauth2/v2.0/authorize?${params}`;
}

export function newOauthProof(): { state: string; verifier: string; challenge: string } {
  const state = randomBytes(24).toString("base64url");
  const verifier = randomBytes(32).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  return { state, verifier, challenge };
}

type TokenBundle = { accessToken: string; refreshToken: string; account: string };

export async function exchangeTeamsCode(input: {
  code: string;
  verifier: string;
  redirectUri: string;
}): Promise<{ ok: true; tokens: TokenBundle } | { ok: false; error: string }> {
  const tokens = await tokenRequest({
    grant_type: "authorization_code",
    code: input.code,
    redirect_uri: input.redirectUri,
    code_verifier: input.verifier,
  });
  if (!tokens.ok) return tokens;
  const account = await accountLabel(tokens.accessToken);
  return { ok: true, tokens: { ...tokens, account } };
}

export async function refreshTeamsAccess(refreshToken: string): Promise<
  { ok: true; accessToken: string; refreshToken: string } | { ok: false; error: string }
> {
  const tokens = await tokenRequest({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });
  if (!tokens.ok) return tokens;
  return { ok: true, accessToken: tokens.accessToken, refreshToken: tokens.refreshToken || refreshToken };
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

async function tokenRequest(
  fields: Record<string, string>,
): Promise<{ ok: true; accessToken: string; refreshToken: string } | { ok: false; error: string }> {
  const clientId = teamsClientId();
  if (!clientId) return { ok: false, error: "Falta el identificador de la aplicación de Microsoft." };
  const body = new URLSearchParams({ client_id: clientId, scope: SCOPES.join(" "), ...fields });
  const secret = process.env.MICROSOFT_CLIENT_SECRET?.trim();
  if (secret) body.set("client_secret", secret);
  const response = await fetch(`https://login.microsoftonline.com/${encodeURIComponent(teamsTenant())}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
    signal: AbortSignal.timeout(20000),
  });
  const data = (await response.json().catch(() => null)) as {
    access_token?: string;
    refresh_token?: string;
    error_description?: string;
  } | null;
  if (!response.ok || !data?.access_token) {
    return { ok: false, error: cleanMicrosoftError(data?.error_description) };
  }
  return { ok: true, accessToken: data.access_token, refreshToken: data.refresh_token ?? "" };
}

async function accountLabel(accessToken: string): Promise<string> {
  const me = await graphGet<{ userPrincipalName?: string; mail?: string; displayName?: string }>(
    accessToken,
    "https://graph.microsoft.com/v1.0/me?$select=displayName,mail,userPrincipalName",
  );
  if (!me.ok) return "Cuenta de Microsoft";
  return me.data.mail || me.data.userPrincipalName || me.data.displayName || "Cuenta de Microsoft";
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
