import { lookup, resolveMx } from "node:dns/promises";
import { isIP } from "node:net";
import { ImapFlow } from "imapflow";
import { simpleParser, type AddressObject, type ParsedMail } from "mailparser";
import nodemailer from "nodemailer";
import MailComposer from "nodemailer/lib/mail-composer";
import { findMailAccount, openMailSecret, saveMailAccount, type MailAccount, type MailServers, type User } from "./db";

export type MailSummary = {
  id: string;
  from: string;
  fromAddress: string;
  subject: string;
  date: string;
  unread: boolean;
  preview: string;
};

export type MailMessage = MailSummary & {
  to: string;
  cc: string;
  text: string;
  attachments: string[];
};

export type MailSetup =
  | { kind: "password"; provider: string; servers: MailServers; help: string }
  | { kind: "microsoft"; provider: string; ready: boolean }
  | { kind: "custom" };

type Result<T> = ({ ok: true } & T) | { ok: false; error: string };

const GMAIL: MailServers = { imapHost: "imap.gmail.com", imapPort: 993, smtpHost: "smtp.gmail.com", smtpPort: 465 };
const YAHOO: MailServers = { imapHost: "imap.mail.yahoo.com", imapPort: 993, smtpHost: "smtp.mail.yahoo.com", smtpPort: 465 };
const ICLOUD: MailServers = { imapHost: "imap.mail.me.com", imapPort: 993, smtpHost: "smtp.mail.me.com", smtpPort: 587 };

const GMAIL_HELP =
  "Google no deja entrar con tu contraseña normal. Activá la verificación en 2 pasos y creá una contraseña de aplicación en myaccount.google.com/apppasswords. Pegá esa clave de 16 letras.";
const YAHOO_HELP = "Yahoo pide una contraseña de aplicación. Creala en Seguridad de la cuenta → Generar contraseña de aplicación.";
const ICLOUD_HELP = "iCloud pide una contraseña específica para apps. Creala en appleid.apple.com → Inicio de sesión y seguridad.";

const MICROSOFT_SCOPE = "offline_access User.Read Mail.ReadWrite Mail.Send";
const MICROSOFT_LOGIN = "https://login.microsoftonline.com/common/oauth2/v2.0";

export function isEmail(value: string): boolean {
  return /^[^\s@<>()",;:]{1,64}@[a-z0-9.-]{1,190}\.[a-z]{2,}$/i.test(value);
}

function microsoftClient(): string | null {
  const id = process.env.MICROSOFT_CLIENT_ID?.trim();
  return id && /^[0-9a-f-]{36}$/i.test(id) ? id : null;
}

/** Elige los servidores según el dominio. Para dominios propios mira a quién apunta el correo (MX). */
export async function detectMail(address: string): Promise<MailSetup> {
  const domain = address.split("@")[1]?.toLowerCase() ?? "";
  if (/^(gmail|googlemail)\.com$/.test(domain)) return { kind: "password", provider: "Gmail", servers: GMAIL, help: GMAIL_HELP };
  if (/^(outlook|hotmail|live|msn)\.[a-z.]+$/.test(domain)) return { kind: "microsoft", provider: "Outlook", ready: Boolean(microsoftClient()) };
  if (/^(yahoo|ymail)\.[a-z.]+$/.test(domain)) return { kind: "password", provider: "Yahoo", servers: YAHOO, help: YAHOO_HELP };
  if (/^(icloud|me|mac)\.com$/.test(domain)) return { kind: "password", provider: "iCloud", servers: ICLOUD, help: ICLOUD_HELP };
  try {
    const records = await resolveMx(domain);
    const hosts = records.map((record) => record.exchange.toLowerCase()).join(" ");
    if (/outlook\.com|office365|microsoft/.test(hosts)) return { kind: "microsoft", provider: "Microsoft 365", ready: Boolean(microsoftClient()) };
    if (/google\.com|googlemail\.com/.test(hosts)) return { kind: "password", provider: "Google Workspace", servers: GMAIL, help: GMAIL_HELP };
  } catch {
    // Sin registro MX se piden los servidores a mano.
  }
  return { kind: "custom" };
}

function privateAddress(ip: string): boolean {
  const v4 = ip.startsWith("::ffff:") ? ip.slice(7) : ip;
  if (isIP(v4) === 4) {
    const [a, b] = v4.split(".").map(Number);
    return a === 0 || a === 10 || a === 127 || (a === 100 && b >= 64 && b < 128) || (a === 169 && b === 254) || (a === 172 && b >= 16 && b < 32) || (a === 192 && b === 168) || a >= 224;
  }
  const low = ip.toLowerCase();
  return low === "::1" || low === "::" || low.startsWith("fc") || low.startsWith("fd") || low.startsWith("fe80");
}

/** Los servidores los puede escribir el usuario: solo se aceptan nombres públicos y puertos cifrados. */
async function checkServers(servers: MailServers): Promise<string | null> {
  for (const [host, port, allowed] of [
    [servers.imapHost, servers.imapPort, [993]],
    [servers.smtpHost, servers.smtpPort, [465, 587]],
  ] as const) {
    if (!/^(?=.{4,190}$)[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/i.test(host) || isIP(host)) {
      return `«${host}» no es un servidor válido.`;
    }
    if (!(allowed as readonly number[]).includes(port)) {
      return port === servers.imapPort ? "El servidor IMAP tiene que usar el puerto 993 (con cifrado)." : "El servidor SMTP tiene que usar el puerto 465 o 587.";
    }
    try {
      const found = await lookup(host, { all: true });
      if (found.length === 0 || found.some((item) => privateAddress(item.address))) return `«${host}» no es un servidor público.`;
    } catch {
      return `No encontré el servidor «${host}».`;
    }
  }
  return null;
}

function imapClient(address: string, servers: MailServers, pass: string): ImapFlow {
  return new ImapFlow({
    host: servers.imapHost,
    port: servers.imapPort,
    secure: true,
    auth: { user: address, pass },
    logger: false,
    tls: { rejectUnauthorized: true, servername: servers.imapHost },
    connectionTimeout: 15000,
    greetingTimeout: 10000,
    socketTimeout: 30000,
  });
}

function smtpTransport(address: string, servers: MailServers, pass: string) {
  return nodemailer.createTransport({
    host: servers.smtpHost,
    port: servers.smtpPort,
    secure: servers.smtpPort === 465,
    requireTLS: servers.smtpPort !== 465,
    auth: { user: address, pass },
    tls: { rejectUnauthorized: true, servername: servers.smtpHost },
    connectionTimeout: 15000,
    greetingTimeout: 10000,
    socketTimeout: 30000,
  });
}

async function withInbox<T>(address: string, servers: MailServers, pass: string, run: (client: ImapFlow) => Promise<T>): Promise<T> {
  const client = imapClient(address, servers, pass);
  client.on("error", () => undefined);
  await client.connect();
  try {
    const lock = await client.getMailboxLock("INBOX");
    try {
      return await run(client);
    } finally {
      lock.release();
    }
  } finally {
    await client.logout().catch(() => client.close());
  }
}

function friendlyLoginError(error: unknown): string {
  const text = String((error as { responseText?: string; response?: string; message?: string })?.responseText ?? (error as Error)?.message ?? "");
  if (/auth|credential|login|password|invalid/i.test(text)) return "El servidor no aceptó el correo o la contraseña. Si es Gmail, Yahoo o iCloud, usá una contraseña de aplicación.";
  if (/timeout|ETIMEDOUT|ECONNREFUSED|ENOTFOUND/i.test(text)) return "No pude conectarme al servidor de correo. Revisá los servidores.";
  return "No pude entrar al correo.";
}

/** Prueba la contraseña con IMAP y SMTP antes de guardarla. */
export async function connectPasswordMail(
  user: User,
  input: { address: string; password: string; servers?: MailServers | null },
): Promise<Result<{ address: string }>> {
  const address = input.address.trim().toLowerCase();
  if (!isEmail(address)) return { ok: false, error: "Ese correo no es válido." };
  const typed = input.password.trim();
  const password = /^([a-z]{4}\s){3}[a-z]{4}$/i.test(typed) ? typed.replace(/\s/g, "") : typed;
  if (!password || password.length > 200) return { ok: false, error: "Falta la contraseña." };
  const setup = await detectMail(address);
  if (setup.kind === "microsoft") return { ok: false, error: "Esa cuenta es de Microsoft: conectala con el botón «Entrar con Microsoft»." };
  const servers = setup.kind === "password" ? setup.servers : input.servers;
  if (!servers) return { ok: false, error: "No conozco los servidores de ese correo. Completalos en «Servidores»." };
  const bad = await checkServers(servers);
  if (bad) return { ok: false, error: bad };
  try {
    await withInbox(address, servers, password, async () => undefined);
    await smtpTransport(address, servers, password).verify();
  } catch (error) {
    return { ok: false, error: friendlyLoginError(error) };
  }
  saveMailAccount(user.id, { address, kind: "password", servers }, password);
  inboxCache.delete(user.id);
  return { ok: true, address };
}

type DeviceFlow = { deviceCode: string; interval: number; expiresAt: number; nextPoll: number };
const deviceFlows = new Map<string, DeviceFlow>();
const accessTokens = new Map<string, { token: string; until: number }>();
const inboxCache = new Map<string, { at: number; items: MailSummary[] }>();

export async function startMicrosoftMail(user: User): Promise<Result<{ code: string; url: string; expiresIn: number }>> {
  const client = microsoftClient();
  if (!client) {
    return {
      ok: false,
      error: "Para cuentas de Microsoft (como el correo del colegio) Taskie necesita una app registrada en Microsoft (MICROSOFT_CLIENT_ID). Todavía no está configurada.",
    };
  }
  const res = await fetch(`${MICROSOFT_LOGIN}/devicecode`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: client, scope: MICROSOFT_SCOPE }),
    signal: AbortSignal.timeout(15000),
  }).catch(() => null);
  const data = (await res?.json().catch(() => null)) as
    | { device_code?: string; user_code?: string; verification_uri?: string; expires_in?: number; interval?: number }
    | null;
  if (!res?.ok || !data?.device_code || !data.user_code) return { ok: false, error: "Microsoft no respondió. Probá de nuevo en un rato." };
  const interval = Math.max(5, data.interval ?? 5);
  deviceFlows.set(user.id, {
    deviceCode: data.device_code,
    interval,
    expiresAt: Date.now() + (data.expires_in ?? 900) * 1000,
    nextPoll: Date.now() + interval * 1000,
  });
  return { ok: true, code: data.user_code, url: data.verification_uri ?? "https://microsoft.com/devicelogin", expiresIn: data.expires_in ?? 900 };
}

async function graph<T>(token: string, path: string, init?: { method?: string; body?: unknown; text?: boolean }): Promise<{ ok: boolean; status: number; data: T | null }> {
  const res = await fetch(`https://graph.microsoft.com/v1.0${path}`, {
    method: init?.method ?? "GET",
    headers: {
      authorization: `Bearer ${token}`,
      ...(init?.body ? { "content-type": "application/json" } : {}),
      ...(init?.text ? { prefer: 'outlook.body-content-type="text"' } : {}),
    },
    body: init?.body ? JSON.stringify(init.body) : undefined,
    signal: AbortSignal.timeout(20000),
  }).catch(() => null);
  if (!res) return { ok: false, status: 0, data: null };
  const data = res.status === 202 || res.status === 204 ? null : ((await res.json().catch(() => null)) as T | null);
  return { ok: res.ok, status: res.status, data };
}

/** Pregunta a Microsoft si ya se aceptó el código. */
export async function pollMicrosoftMail(user: User): Promise<Result<{ state: "waiting" | "done"; address?: string }>> {
  const client = microsoftClient();
  const flow = deviceFlows.get(user.id);
  if (!client || !flow) return { ok: false, error: "Empezá de nuevo la conexión con Microsoft." };
  if (Date.now() > flow.expiresAt) {
    deviceFlows.delete(user.id);
    return { ok: false, error: "El código venció. Pedí uno nuevo." };
  }
  if (Date.now() < flow.nextPoll) return { ok: true, state: "waiting" };
  flow.nextPoll = Date.now() + flow.interval * 1000;
  const res = await fetch(`${MICROSOFT_LOGIN}/token`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:device_code", client_id: client, device_code: flow.deviceCode }),
    signal: AbortSignal.timeout(15000),
  }).catch(() => null);
  const data = (await res?.json().catch(() => null)) as
    | { access_token?: string; refresh_token?: string; expires_in?: number; error?: string }
    | null;
  if (data?.error === "authorization_pending") return { ok: true, state: "waiting" };
  if (data?.error === "slow_down") {
    flow.interval += 5;
    return { ok: true, state: "waiting" };
  }
  if (!data?.access_token || !data.refresh_token) {
    deviceFlows.delete(user.id);
    if (data?.error === "authorization_declined") return { ok: false, error: "Rechazaste el permiso en Microsoft." };
    if (data?.error === "expired_token") return { ok: false, error: "El código venció. Pedí uno nuevo." };
    return { ok: false, error: "Microsoft no dio permiso. Puede que tu colegio no permita apps externas en el correo." };
  }
  deviceFlows.delete(user.id);
  const me = await graph<{ mail?: string; userPrincipalName?: string }>(data.access_token, "/me?$select=mail,userPrincipalName");
  const address = (me.data?.mail || me.data?.userPrincipalName || "").toLowerCase();
  if (!isEmail(address)) return { ok: false, error: "No pude leer la dirección de esa cuenta." };
  saveMailAccount(user.id, { address, kind: "microsoft", servers: null }, data.refresh_token);
  accessTokens.set(user.id, { token: data.access_token, until: Date.now() + ((data.expires_in ?? 3600) - 120) * 1000 });
  inboxCache.delete(user.id);
  return { ok: true, state: "done", address };
}

async function microsoftToken(user: User, account: MailAccount): Promise<string | null> {
  const cached = accessTokens.get(user.id);
  if (cached && cached.until > Date.now()) return cached.token;
  const client = microsoftClient();
  const refresh = openMailSecret(user);
  if (!client || !refresh) return null;
  const res = await fetch(`${MICROSOFT_LOGIN}/token`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "refresh_token", client_id: client, refresh_token: refresh, scope: MICROSOFT_SCOPE }),
    signal: AbortSignal.timeout(15000),
  }).catch(() => null);
  const data = (await res?.json().catch(() => null)) as { access_token?: string; refresh_token?: string; expires_in?: number } | null;
  if (!data?.access_token) return null;
  if (data.refresh_token && data.refresh_token !== refresh) saveMailAccount(user.id, account, data.refresh_token);
  accessTokens.set(user.id, { token: data.access_token, until: Date.now() + ((data.expires_in ?? 3600) - 120) * 1000 });
  return data.access_token;
}

function addressLine(value: AddressObject | AddressObject[] | undefined): string {
  const list = (Array.isArray(value) ? value : value ? [value] : []).flatMap((item) => item.value);
  return list.map((item) => (item.name ? `${item.name} <${item.address ?? ""}>` : item.address ?? "")).filter(Boolean).join(", ");
}

function plainFromHtml(html: string): string {
  return html
    .replace(/<(script|style|head)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|h[1-6]|tr|table)>/gi, "\n")
    .replace(/<a\b[^>]*href="(https?:[^"]+)"[^>]*>([\s\S]*?)<\/a>/gi, "$2 ($1)")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCharCode(Number(n)))
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function parsedText(parsed: ParsedMail): string {
  const text = parsed.text?.trim() || (typeof parsed.html === "string" ? plainFromHtml(parsed.html) : "");
  return text.length > 20000 ? `${text.slice(0, 20000)}…` : text;
}

function accountFor(user: User): { account: MailAccount; secret: string } | null {
  const account = findMailAccount(user.id);
  if (!account) return null;
  const secret = openMailSecret(user);
  return secret ? { account, secret } : null;
}

export async function mailInbox(user: User, fresh = false): Promise<Result<{ address: string; items: MailSummary[] }>> {
  const linked = accountFor(user);
  if (!linked) return { ok: false, error: "No hay un correo vinculado." };
  const { account, secret } = linked;
  const cached = inboxCache.get(user.id);
  if (!fresh && cached && Date.now() - cached.at < 60000) return { ok: true, address: account.address, items: cached.items };
  try {
    let items: MailSummary[];
    if (account.kind === "microsoft") {
      const token = await microsoftToken(user, account);
      if (!token) return { ok: false, error: "Microsoft pidió volver a entrar. Desconectá el correo y conectalo de nuevo." };
      const listed = await graph<{
        value?: { id: string; subject?: string; from?: { emailAddress?: { name?: string; address?: string } }; receivedDateTime?: string; isRead?: boolean; bodyPreview?: string }[];
      }>(token, "/me/mailFolders/inbox/messages?$top=30&$select=id,subject,from,receivedDateTime,isRead,bodyPreview&$orderby=receivedDateTime%20desc");
      if (!listed.ok) return { ok: false, error: "No pude leer la bandeja de Microsoft." };
      items = (listed.data?.value ?? []).map((item) => ({
        id: item.id,
        from: item.from?.emailAddress?.name || item.from?.emailAddress?.address || "Sin remitente",
        fromAddress: item.from?.emailAddress?.address ?? "",
        subject: item.subject || "(sin asunto)",
        date: item.receivedDateTime ?? "",
        unread: item.isRead === false,
        preview: (item.bodyPreview ?? "").slice(0, 160),
      }));
    } else {
      if (!account.servers) return { ok: false, error: "Faltan los servidores del correo." };
      items = await withInbox(account.address, account.servers, secret, async (client) => {
        const total = typeof client.mailbox === "object" ? client.mailbox.exists : 0;
        if (!total) return [];
        const found: MailSummary[] = [];
        for await (const message of client.fetch(`${Math.max(1, total - 29)}:*`, { uid: true, envelope: true, flags: true, internalDate: true })) {
          const sender = message.envelope?.from?.[0];
          found.push({
            id: String(message.uid),
            from: sender?.name || sender?.address || "Sin remitente",
            fromAddress: sender?.address ?? "",
            subject: message.envelope?.subject || "(sin asunto)",
            date: new Date(message.envelope?.date ?? message.internalDate ?? Date.now()).toISOString(),
            unread: !message.flags?.has("\\Seen"),
            preview: "",
          });
        }
        return found.sort((a, b) => b.date.localeCompare(a.date));
      });
    }
    inboxCache.set(user.id, { at: Date.now(), items });
    return { ok: true, address: account.address, items };
  } catch (error) {
    return { ok: false, error: friendlyLoginError(error) };
  }
}

function validId(account: MailAccount, id: string): boolean {
  return account.kind === "microsoft" ? /^[A-Za-z0-9+/=_-]{10,400}$/.test(id) : /^\d{1,10}$/.test(id);
}

export async function mailRead(user: User, id: string): Promise<Result<{ message: MailMessage }>> {
  const linked = accountFor(user);
  if (!linked) return { ok: false, error: "No hay un correo vinculado." };
  const { account, secret } = linked;
  if (!validId(account, id)) return { ok: false, error: "Ese correo no existe." };
  try {
    if (account.kind === "microsoft") {
      const token = await microsoftToken(user, account);
      if (!token) return { ok: false, error: "Microsoft pidió volver a entrar." };
      type Person = { emailAddress?: { name?: string; address?: string } };
      const got = await graph<{
        id: string; subject?: string; from?: Person; toRecipients?: Person[]; ccRecipients?: Person[]; receivedDateTime?: string; isRead?: boolean; body?: { content?: string }; hasAttachments?: boolean;
      }>(token, `/me/messages/${encodeURIComponent(id)}?$select=id,subject,from,toRecipients,ccRecipients,receivedDateTime,isRead,body,hasAttachments`, { text: true });
      if (!got.ok || !got.data) return { ok: false, error: "No pude abrir ese correo." };
      if (got.data.isRead === false) await graph(token, `/me/messages/${encodeURIComponent(id)}`, { method: "PATCH", body: { isRead: true } });
      const people = (list?: Person[]) => (list ?? []).map((item) => item.emailAddress?.name || item.emailAddress?.address || "").filter(Boolean).join(", ");
      const text = got.data.body?.content ?? "";
      inboxCache.delete(user.id);
      return {
        ok: true,
        message: {
          id,
          from: got.data.from?.emailAddress?.name || got.data.from?.emailAddress?.address || "Sin remitente",
          fromAddress: got.data.from?.emailAddress?.address ?? "",
          subject: got.data.subject || "(sin asunto)",
          date: got.data.receivedDateTime ?? "",
          unread: false,
          preview: "",
          to: people(got.data.toRecipients),
          cc: people(got.data.ccRecipients),
          text: text.length > 20000 ? `${text.slice(0, 20000)}…` : text,
          attachments: got.data.hasAttachments ? ["Tiene adjuntos: abrilos desde Outlook."] : [],
        },
      };
    }
    if (!account.servers) return { ok: false, error: "Faltan los servidores del correo." };
    const message = await withInbox(account.address, account.servers, secret, async (client) => {
      const raw = await client.fetchOne(id, { source: true, flags: true }, { uid: true });
      if (!raw || !raw.source) return null;
      const parsed = await simpleParser(raw.source);
      if (!raw.flags?.has("\\Seen")) await client.messageFlagsAdd(id, ["\\Seen"], { uid: true });
      const sender = parsed.from?.value[0];
      return {
        id,
        from: sender?.name || sender?.address || "Sin remitente",
        fromAddress: sender?.address ?? "",
        subject: parsed.subject || "(sin asunto)",
        date: (parsed.date ?? new Date()).toISOString(),
        unread: false,
        preview: "",
        to: addressLine(parsed.to),
        cc: addressLine(parsed.cc),
        text: parsedText(parsed),
        attachments: parsed.attachments.map((item) => item.filename || "adjunto").slice(0, 10),
      } satisfies MailMessage;
    });
    if (!message) return { ok: false, error: "No pude abrir ese correo." };
    inboxCache.delete(user.id);
    return { ok: true, message };
  } catch (error) {
    return { ok: false, error: friendlyLoginError(error) };
  }
}

function quoted(text: string, from: string, date: Date, timeZone: string): string {
  const when = date.toLocaleString("es-AR", { dateStyle: "long", timeStyle: "short", timeZone });
  const lines = text.split("\n").slice(0, 80).map((line) => `> ${line}`);
  return `El ${when}, ${from} escribió:\n${lines.join("\n")}`;
}

export async function mailReply(user: User, id: string, body: string): Promise<Result<{ to: string }>> {
  const linked = accountFor(user);
  if (!linked) return { ok: false, error: "No hay un correo vinculado." };
  const { account, secret } = linked;
  if (!validId(account, id)) return { ok: false, error: "Ese correo no existe." };
  const text = body.replace(/\r\n/g, "\n").trim();
  if (!text) return { ok: false, error: "Escribí la respuesta." };
  if (text.length > 10000) return { ok: false, error: "La respuesta es muy larga." };
  try {
    if (account.kind === "microsoft") {
      const token = await microsoftToken(user, account);
      if (!token) return { ok: false, error: "Microsoft pidió volver a entrar." };
      const sent = await graph(token, `/me/messages/${encodeURIComponent(id)}/reply`, { method: "POST", body: { comment: text } });
      if (!sent.ok) return { ok: false, error: "Microsoft no envió la respuesta." };
      inboxCache.delete(user.id);
      return { ok: true, to: "" };
    }
    if (!account.servers) return { ok: false, error: "Faltan los servidores del correo." };
    const servers = account.servers;
    const original = await withInbox(account.address, servers, secret, async (client) => {
      const raw = await client.fetchOne(id, { source: true }, { uid: true });
      return raw && raw.source ? simpleParser(raw.source) : null;
    });
    if (!original) return { ok: false, error: "No encontré el correo original." };
    const target = original.replyTo?.value[0] ?? original.from?.value[0];
    if (!target?.address || !isEmail(target.address)) return { ok: false, error: "Ese correo no tiene a quién responder." };
    const subject = /^re:/i.test(original.subject ?? "") ? original.subject! : `Re: ${original.subject ?? ""}`.trim();
    const references = [
      ...(Array.isArray(original.references) ? original.references : original.references ? [original.references] : []),
      ...(original.messageId ? [original.messageId] : []),
    ];
    const options = {
      from: account.address,
      to: target.name ? { name: target.name, address: target.address } : target.address,
      subject,
      text: `${text}\n\n${quoted(parsedText(original), original.from?.value[0]?.name || target.name || target.address, original.date ?? new Date(), user.timezone)}`,
      inReplyTo: original.messageId,
      references,
    };
    const raw = await new MailComposer(options).compile().build();
    await smtpTransport(account.address, servers, secret).sendMail({ envelope: { from: account.address, to: [target.address] }, raw });
    if (servers.imapHost !== GMAIL.imapHost) {
      await withInbox(account.address, servers, secret, async (client) => {
        const folders = await client.list();
        const sentFolder = folders.find((folder) => folder.specialUse === "\\Sent") ?? folders.find((folder) => /^(sent|enviados|sent items|sent messages)$/i.test(folder.name));
        if (sentFolder) await client.append(sentFolder.path, raw, ["\\Seen"]);
      }).catch(() => undefined);
    }
    inboxCache.delete(user.id);
    return { ok: true, to: target.address };
  } catch (error) {
    return { ok: false, error: friendlyLoginError(error) };
  }
}

export function forgetMail(userId: string): void {
  inboxCache.delete(userId);
  accessTokens.delete(userId);
  deviceFlows.delete(userId);
}
