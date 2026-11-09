"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, Copy, ExternalLink, Inbox, LogOut, Paperclip, RefreshCw, Send } from "lucide-react";
import { LinkedText } from "@/components/news-board";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { MailMessage, MailSetup, MailSummary } from "@/lib/mail";
import { cn } from "cn";

type Status =
  | { state: "loading" }
  | { state: "unlinked" }
  | { state: "linked"; address: string; items: MailSummary[]; error?: string };

async function call<T>(url: string, init?: RequestInit): Promise<{ ok: boolean; data: T & { error?: string } }> {
  const res = await fetch(url, { ...init, headers: { "content-type": "application/json", ...(init?.headers ?? {}) } }).catch(() => null);
  if (!res) return { ok: false, data: { error: "Sin conexión. Probá de nuevo." } as T & { error?: string } };
  const data = (await res.json().catch(() => ({ error: "Respuesta inválida del servidor." }))) as T & { error?: string };
  return { ok: res.ok && !data.error, data };
}

function when(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const today = new Date();
  const same = date.toDateString() === today.toDateString();
  return same
    ? date.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })
    : date.toLocaleDateString("es-AR", { day: "numeric", month: "short" });
}

function ConnectForm({ onLinked, isDemo }: { onLinked: () => void; isDemo: boolean }) {
  const [address, setAddress] = useState("");
  const [setup, setSetup] = useState<MailSetup | null>(null);
  const [password, setPassword] = useState("");
  const [servers, setServers] = useState({ imapHost: "", imapPort: "993", smtpHost: "", smtpPort: "465" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [device, setDevice] = useState<{ code: string; url: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const polling = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => {
    if (polling.current) clearInterval(polling.current);
  }, []);

  const detect = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setBusy(true);
    const res = await call<{ setup: MailSetup }>("/api/mail/detect", { method: "POST", body: JSON.stringify({ address }) });
    setBusy(false);
    if (!res.ok) return setError(res.data.error ?? "No pude revisar ese correo.");
    setSetup(res.data.setup);
    if (res.data.setup.kind === "custom") {
      const domain = address.split("@")[1] ?? "";
      setServers((value) => ({ ...value, imapHost: value.imapHost || `imap.${domain}`, smtpHost: value.smtpHost || `smtp.${domain}` }));
    }
  };

  const connect = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setBusy(true);
    const res = await call<{ ok: boolean }>("/api/mail/connect", {
      method: "POST",
      body: JSON.stringify({
        address,
        password,
        servers: setup?.kind === "custom" ? { ...servers, imapPort: Number(servers.imapPort), smtpPort: Number(servers.smtpPort) } : null,
      }),
    });
    setBusy(false);
    if (!res.ok) return setError(res.data.error ?? "No pude conectar el correo.");
    setPassword("");
    onLinked();
  };

  const microsoft = async () => {
    setError("");
    setBusy(true);
    const res = await call<{ code: string; url: string }>("/api/mail/microsoft", { method: "POST" });
    setBusy(false);
    if (!res.ok) return setError(res.data.error ?? "Microsoft no respondió.");
    setDevice({ code: res.data.code, url: res.data.url });
    if (polling.current) clearInterval(polling.current);
    polling.current = setInterval(async () => {
      const poll = await call<{ state: string }>("/api/mail/microsoft");
      if (!poll.ok) {
        if (polling.current) clearInterval(polling.current);
        setDevice(null);
        setError(poll.data.error ?? "No se pudo conectar con Microsoft.");
      } else if (poll.data.state === "done") {
        if (polling.current) clearInterval(polling.current);
        onLinked();
      }
    }, 5000);
  };

  if (isDemo) {
    return (
      <div className="rounded-2xl bg-card px-4 py-6 text-center text-sm ring-1 ring-foreground/10">
        En la cuenta de prueba no se puede vincular un correo. Creá tu cuenta con Educamos para usarlo.
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-card px-4 py-5 ring-1 ring-foreground/10">
      <div>
        <h3 className="font-display text-xl leading-tight">Vinculá tu correo</h3>
        <p className="text-sm text-muted-foreground">Leé y respondé tus mails sin salir de Taskie.</p>
      </div>

      <form onSubmit={setup ? connect : detect} className="mt-4 flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="mail-address">Correo</Label>
          <Input
            id="mail-address"
            type="email"
            autoComplete="email"
            inputMode="email"
            placeholder="tunombre@gmail.com"
            value={address}
            onChange={(event) => {
              setAddress(event.target.value);
              setSetup(null);
              setDevice(null);
            }}
            required
          />
        </div>

        {setup?.kind === "microsoft" ? (
          <div className="flex flex-col gap-3 rounded-xl bg-muted/60 p-3 text-sm">
            <p>
              Es una cuenta de <b>{setup.provider}</b>. Microsoft no deja entrar con la contraseña: hay que dar permiso desde su página.
            </p>
            {!setup.ready ? (
              <p className="text-muted-foreground">
                Para eso Taskie tiene que estar registrado como app en Microsoft, y todavía no lo está. Mientras tanto podés vincular otro correo, como un Gmail.
              </p>
            ) : device ? (
              <div className="flex flex-col gap-2">
                <p>
                  1. Abrí{" "}
                  <a href={device.url} target="_blank" rel="noopener noreferrer" className="font-semibold text-primary underline">
                    {device.url.replace(/^https:\/\//, "")}
                  </a>
                </p>
                <p>2. Escribí este código y entrá con tu cuenta:</p>
                <div className="flex items-center gap-2">
                  <code className="rounded-lg bg-card px-3 py-2 font-mono text-lg font-bold tracking-widest ring-1 ring-foreground/10">{device.code}</code>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      void navigator.clipboard?.writeText(device.code);
                      setCopied(true);
                    }}
                  >
                    <Copy /> {copied ? "Copiado" : "Copiar"}
                  </Button>
                </div>
                <p className="text-muted-foreground">Esperando que aceptes el permiso…</p>
              </div>
            ) : (
              <Button type="button" onClick={microsoft} disabled={busy}>
                <ExternalLink /> Entrar con Microsoft
              </Button>
            )}
          </div>
        ) : null}

        {setup?.kind === "password" ? (
          <>
            <p className="rounded-xl bg-muted/60 p-3 text-sm">
              <b>{setup.provider}.</b> {setup.help}
            </p>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="mail-password">Contraseña de aplicación</Label>
              <Input id="mail-password" type="password" autoComplete="off" value={password} onChange={(event) => setPassword(event.target.value)} required />
            </div>
          </>
        ) : null}

        {setup?.kind === "custom" ? (
          <>
            <p className="rounded-xl bg-muted/60 p-3 text-sm">
              No reconozco ese proveedor. Completá los servidores (los encontrás en la ayuda de tu correo, en «IMAP» y «SMTP»).
            </p>
            <div className="grid grid-cols-[1fr_5.5rem] gap-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="imap-host">Servidor IMAP</Label>
                <Input id="imap-host" value={servers.imapHost} onChange={(event) => setServers({ ...servers, imapHost: event.target.value })} required />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="imap-port">Puerto</Label>
                <Input id="imap-port" inputMode="numeric" value={servers.imapPort} onChange={(event) => setServers({ ...servers, imapPort: event.target.value })} required />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="smtp-host">Servidor SMTP</Label>
                <Input id="smtp-host" value={servers.smtpHost} onChange={(event) => setServers({ ...servers, smtpHost: event.target.value })} required />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="smtp-port">Puerto</Label>
                <Input id="smtp-port" inputMode="numeric" value={servers.smtpPort} onChange={(event) => setServers({ ...servers, smtpPort: event.target.value })} required />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="mail-password-custom">Contraseña</Label>
              <Input id="mail-password-custom" type="password" autoComplete="off" value={password} onChange={(event) => setPassword(event.target.value)} required />
            </div>
          </>
        ) : null}

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        {setup?.kind !== "microsoft" ? (
          <Button type="submit" disabled={busy} size="lg">
            {busy ? "Revisando…" : setup ? "Conectar correo" : "Seguir"}
          </Button>
        ) : null}
        <p className="text-xs text-muted-foreground">
          La contraseña se guarda cifrada y solo se usa en el servidor de Taskie para hablar con tu correo. Podés desvincularlo cuando quieras.
        </p>
      </form>
    </div>
  );
}

function MessageView({ id, onBack, onSent }: { id: string; onBack: () => void; onSent: (to: string) => void }) {
  const [message, setMessage] = useState<MailMessage | null>(null);
  const [error, setError] = useState("");
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");

  useEffect(() => {
    let alive = true;
    void call<{ message: MailMessage }>(`/api/mail/${encodeURIComponent(id)}`).then((res) => {
      if (!alive) return;
      if (res.ok) setMessage(res.data.message);
      else setError(res.data.error ?? "No pude abrir ese correo.");
    });
    return () => {
      alive = false;
    };
  }, [id]);

  const send = async (event: React.FormEvent) => {
    event.preventDefault();
    setSendError("");
    setSending(true);
    const res = await call<{ to: string }>(`/api/mail/${encodeURIComponent(id)}/reply`, { method: "POST", body: JSON.stringify({ text: reply }) });
    setSending(false);
    if (!res.ok) return setSendError(res.data.error ?? "No se envió la respuesta.");
    setReply("");
    onSent(res.data.to || message?.fromAddress || "");
  };

  return (
    <div className="flex flex-col gap-3">
      <Button variant="ghost" size="sm" className="self-start" onClick={onBack}>
        <ArrowLeft /> Bandeja
      </Button>
      {error ? <p className="rounded-2xl bg-card px-4 py-6 text-center text-sm text-destructive ring-1 ring-foreground/10">{error}</p> : null}
      {!message && !error ? <div className="h-48 animate-pulse rounded-2xl bg-card/70 ring-1 ring-foreground/10" aria-busy /> : null}
      {message ? (
        <>
          <article className="rounded-2xl bg-card px-4 py-4 ring-1 ring-foreground/10">
            <h3 className="font-display text-xl leading-tight">{message.subject}</h3>
            <p className="mt-2 text-sm">
              <b>{message.from}</b> {message.fromAddress && message.fromAddress !== message.from ? <span className="text-muted-foreground">‹{message.fromAddress}›</span> : null}
            </p>
            <p className="text-xs text-muted-foreground">
              {new Date(message.date).toLocaleString("es-AR", { dateStyle: "long", timeStyle: "short" })}
              {message.to ? ` · Para: ${message.to}` : ""}
              {message.cc ? ` · CC: ${message.cc}` : ""}
            </p>
            <div className="mail-body mt-4 text-sm leading-relaxed break-words whitespace-pre-wrap">
              {message.text ? <LinkedText text={message.text} /> : <span className="text-muted-foreground">Este correo no tiene texto.</span>}
            </div>
            {message.attachments.length > 0 ? (
              <ul className="mt-3 flex flex-col gap-1 text-xs text-muted-foreground">
                {message.attachments.map((name, index) => (
                  <li key={index} className="flex items-center gap-1">
                    <Paperclip className="size-3.5" /> {name}
                  </li>
                ))}
              </ul>
            ) : null}
          </article>
          <form onSubmit={send} className="flex flex-col gap-2 rounded-2xl bg-card px-4 py-4 ring-1 ring-foreground/10">
            <Label htmlFor="mail-reply">Responder a {message.from}</Label>
            <Textarea id="mail-reply" rows={5} value={reply} onChange={(event) => setReply(event.target.value)} placeholder="Escribí tu respuesta…" maxLength={10000} required />
            {sendError ? <p className="text-sm text-destructive">{sendError}</p> : null}
            <Button type="submit" disabled={sending || !reply.trim()} className="self-end">
              <Send /> {sending ? "Enviando…" : "Enviar respuesta"}
            </Button>
          </form>
        </>
      ) : null}
    </div>
  );
}

export function MailPanel({ isDemo }: { isDemo: boolean }) {
  const [status, setStatus] = useState<Status>({ state: "loading" });
  const [open, setOpen] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [notice, setNotice] = useState("");

  const load = useCallback(async (fresh = false) => {
    setRefreshing(true);
    const res = await call<{ linked: boolean; address?: string; items?: MailSummary[] }>(`/api/mail${fresh ? "?fresh=1" : ""}`);
    setRefreshing(false);
    if (!res.data.linked) return setStatus({ state: "unlinked" });
    setStatus({ state: "linked", address: res.data.address ?? "", items: res.data.items ?? [], error: res.data.error });
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const unlink = async () => {
    if (!window.confirm("¿Desvincular este correo de Taskie? Se borra la contraseña guardada.")) return;
    await call("/api/mail", { method: "DELETE" });
    setOpen(null);
    setStatus({ state: "unlinked" });
  };

  if (status.state === "loading") {
    return (
      <div className="flex flex-col gap-2" aria-busy>
        {[0, 1, 2, 3].map((key) => (
          <div key={key} className="h-16 animate-pulse rounded-2xl bg-card/70 ring-1 ring-foreground/10" />
        ))}
      </div>
    );
  }
  if (status.state === "unlinked") return <ConnectForm isDemo={isDemo} onLinked={() => void load(true)} />;
  if (open) {
    return (
      <MessageView
        id={open}
        onBack={() => {
          setOpen(null);
          void load();
        }}
        onSent={(to) => {
          setOpen(null);
          setNotice(to ? `Respuesta enviada a ${to}.` : "Respuesta enviada.");
          void load(true);
        }}
      />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2 rounded-2xl bg-card px-4 py-3 ring-1 ring-foreground/10">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">Correo vinculado</p>
          <p className="truncate text-sm font-semibold">{status.address}</p>
        </div>
        <div className="flex shrink-0 gap-1">
          <Button variant="outline" size="icon" onClick={() => void load(true)} disabled={refreshing} aria-label="Actualizar bandeja">
            <RefreshCw className={cn(refreshing && "animate-spin")} />
          </Button>
          <Button variant="ghost" size="icon" onClick={unlink} aria-label="Desvincular correo">
            <LogOut />
          </Button>
        </div>
      </div>
      {notice ? <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-800 ring-1 ring-emerald-200">{notice}</p> : null}
      {status.error ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl bg-card px-4 py-6 text-center ring-1 ring-foreground/10">
          <p className="text-sm text-destructive">{status.error}</p>
          <Button variant="outline" size="sm" onClick={() => void load(true)}>
            <RefreshCw /> Probar de nuevo
          </Button>
        </div>
      ) : status.items.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl bg-card px-4 py-8 text-center ring-1 ring-foreground/10">
          <Inbox className="size-6 text-muted-foreground" />
          <p className="text-sm">Tu bandeja de entrada está vacía.</p>
        </div>
      ) : (
        <ul className="overflow-hidden rounded-2xl bg-card ring-1 ring-foreground/10">
          {status.items.map((item) => (
            <li key={item.id} className="border-b border-border last:border-b-0">
              <button
                type="button"
                onClick={() => {
                  setNotice("");
                  setStatus({ ...status, items: status.items.map((row) => (row.id === item.id ? { ...row, unread: false } : row)) });
                  setOpen(item.id);
                }}
                className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-muted"
              >
                <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", item.unread ? "bg-primary" : "bg-transparent")} aria-label={item.unread ? "Sin leer" : undefined} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline justify-between gap-2">
                    <span className={cn("truncate text-sm", item.unread ? "font-bold" : "font-medium")}>{item.from}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">{when(item.date)}</span>
                  </span>
                  <span className={cn("block truncate text-sm", item.unread ? "font-semibold" : "text-muted-foreground")}>{item.subject}</span>
                  {item.preview ? <span className="block truncate text-xs text-muted-foreground">{item.preview}</span> : null}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
