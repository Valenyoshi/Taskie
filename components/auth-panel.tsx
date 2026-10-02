"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function AuthPanel() {
  const router = useRouter();
  const [mode, setMode] = useState<"entrar" | "crear">("crear");
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
            <Field label="Tu nombre" name="name" placeholder="Cómo querés salir en el ranking" />
            <Field label="Usuario de task.ai" name="username" placeholder="vale.curso" autoComplete="username" />
            <Field label="Contraseña de task.ai" name="password" type="password" autoComplete="new-password" />
            <p className="pt-2 text-sm font-medium">Tu colegio en Educamos</p>
            <Field label="Dirección del colegio" name="educamosUrl" placeholder="https://tucolegio.educamos.com" />
            <Field label="Usuario de Educamos" name="educamosUsername" autoComplete="off" />
            <Field label="Contraseña de Educamos" name="educamosPassword" type="password" autoComplete="off" />
          </>
        ) : (
          <>
            <Field label="Usuario" name="username" autoComplete="username" />
            <Field label="Contraseña" name="password" type="password" autoComplete="current-password" />
          </>
        )}
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        {syncNote ? <p className="text-sm">{syncNote}</p> : null}
        <Button className="h-11" type="submit" disabled={busy}>
          {busy ? "Entrando…" : mode === "crear" ? "Crear cuenta y buscar tareas" : "Entrar"}
        </Button>
      </form>
      </div>
    </div>
  );
}

function Field({
  label,
  name,
  type = "text",
  placeholder,
  autoComplete,
}: {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  autoComplete?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} type={type} required placeholder={placeholder} autoComplete={autoComplete} className="h-11" />
    </div>
  );
}
