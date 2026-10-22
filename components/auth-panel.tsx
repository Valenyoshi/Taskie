"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function AuthPanel() {
  const router = useRouter();
  const [mode, setMode] = useState<"entrar" | "crear">("crear");
  const [school, setSchool] = useState<"educamos" | "teams" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [syncNote, setSyncNote] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const payload = Object.fromEntries(form.entries());
    const res = await fetch(mode === "crear" ? "/api/auth/register" : "/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...payload, timezone }),
    });
    const data = (await res.json()) as { error?: string; syncError?: string | null };
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "No pude entrar.");
      return;
    }
    if (data.syncError) setSyncNote(data.syncError);
    router.push("/inicio");
    router.refresh();
  }

  async function demo() {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/auth/demo", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ timezone: Intl.DateTimeFormat().resolvedOptions().timeZone }),
    });
    setBusy(false);
    if (!res.ok) {
      setError("No pude armar la cuenta de prueba.");
      return;
    }
    router.push("/inicio");
    router.refresh();
  }

  return (
    <div className="overflow-hidden rounded-3xl bg-card shadow-xl ring-1 ring-gold/40">
      <div className="flow-gradient h-2" />
      <div className="p-5">
      <div className="grid grid-cols-2 gap-2 rounded-lg bg-muted p-1">
        <button
          type="button"
          className={`rounded-md py-2 text-sm font-medium ${mode === "crear" ? "bg-card shadow-sm" : ""}`}
          onClick={() => setMode("crear")}
        >
          Crear cuenta
        </button>
        <button
          type="button"
          className={`rounded-md py-2 text-sm font-medium ${mode === "entrar" ? "bg-card shadow-sm" : ""}`}
          onClick={() => setMode("entrar")}
        >
          Ya tengo cuenta
        </button>
      </div>
      <form className="mt-5 flex flex-col gap-3" onSubmit={onSubmit}>
        {mode === "crear" ? (
          <>
            <Field label="Tu nombre" name="name" placeholder="Cómo querés que te llamemos" />
            <Field label="Usuario de Taskie" name="username" placeholder="vale.curso" autoComplete="username" />
            <Field label="Contraseña de Taskie" name="password" type="password" autoComplete="new-password" />
            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                aria-label="Educamos y Moodle"
                aria-pressed={school === "educamos"}
                className={`flex h-20 items-center justify-center rounded-xl px-3 ${school === "educamos" ? "bg-muted ring-2 ring-primary" : "bg-muted/50"}`}
                onClick={() => setSchool("educamos")}
              >
                <EducamosLogo />
              </button>
              <button
                type="button"
                aria-label="Microsoft Teams"
                aria-pressed={school === "teams"}
                className={`flex h-20 items-center justify-center rounded-xl px-3 ${school === "teams" ? "bg-muted ring-2 ring-primary" : "bg-muted/50"}`}
                onClick={() => setSchool("teams")}
              >
                <TeamsLogo />
              </button>
            </div>
            {school ? <input type="hidden" name="platform" value={school} /> : null}
            {school === "educamos" ? (
              <>
                <Field label="Dirección del colegio" name="educamosUrl" placeholder="https://tucolegio.educamos.com" />
                <Field label="Usuario de Educamos" name="educamosUsername" autoComplete="off" />
                <Field label="Contraseña de Educamos" name="educamosPassword" type="password" autoComplete="off" />
                <Field label="Enlace del aula" name="lmsUrl" placeholder="https://lms.educamos.com/edison_mza/my/" required={false} />
                <p className="text-xs text-muted-foreground">
                  Opcional. Si lo dejás vacío, lo armamos con la dirección del colegio. Ahí están las entregas para subir archivos.
                </p>
              </>
            ) : school === "teams" ? (
              <>
                <Field label="Usuario de Teams" name="teamsUsername" placeholder="alumno@colegio.edu" autoComplete="off" />
                <Field label="Contraseña de Teams" name="teamsPassword" type="password" autoComplete="off" />
                <p className="text-xs text-muted-foreground">
                  Es el usuario y la contraseña de Microsoft del colegio. Taskie los usa solo para entrar a Teams y traer las tareas.
                </p>
              </>
            ) : null}
          </>
        ) : (
          <>
            <Field label="Usuario" name="username" autoComplete="username" />
            <Field label="Contraseña" name="password" type="password" autoComplete="current-password" />
          </>
        )}
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        {syncNote ? <p className="text-sm">{syncNote}</p> : null}
        <Button className="h-11" type="submit" disabled={busy || (mode === "crear" && !school)}>
          {busy ? "Buscando tus tareas…" : mode === "crear" ? "Crear cuenta y buscar tareas" : "Entrar"}
        </Button>
      </form>
      <Button className="mt-3 h-11 w-full" variant="outline" disabled={busy} onClick={() => void demo()}>
        Probar con tareas de ejemplo
      </Button>
      </div>
    </div>
  );
}

function EducamosLogo() {
  return <img src="/educamos.png" alt="" className="size-12" />;
}

function TeamsLogo() {
  return (
    <svg viewBox="0 0 48 48" className="size-12" aria-hidden>
      <rect width="48" height="48" rx="10" fill="#5b5fc7" />
      <circle cx="33.5" cy="13" r="4" fill="#7b83eb" />
      <path d="M27 19.5h13a2 2 0 0 1 2 2V32a6 6 0 0 1-6 6h-5.2A8 8 0 0 1 27 30.2V19.5Z" fill="#7b83eb" />
      <circle cx="19" cy="16" r="5.2" fill="#fff" />
      <path d="M7 37.5c.4-6.4 5.2-10 12-10s11.6 3.6 12 10v1.5H7v-1.5Z" fill="#fff" />
    </svg>
  );
}

function Field({
  label,
  name,
  type = "text",
  placeholder,
  autoComplete,
  required = true,
}: {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  autoComplete?: string;
  required?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} type={type} required={required} placeholder={placeholder} autoComplete={autoComplete} className="h-11" />
    </div>
  );
}
