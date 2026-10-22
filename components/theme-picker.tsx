"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PixelCheck } from "@/components/pixel-check";
import { APPEARANCE_THEMES, type AppearanceThemeId } from "@/lib/catalog";

const SWATCHES: Record<AppearanceThemeId, [string, string]> = {
  cuaderno: ["#f3eee4", "#e25b45"],
  bosque: ["#d9f0dc", "#1f7a4a"],
  pizarra: ["#234640", "#d6ef55"],
  noche: ["#2a2144", "#c4a0f5"],
  oro: ["#f8ecc8", "#b8860b"],
  "check-retro": ["#263449", "#7cff6b"],
};

function currentTheme(equipped: string | null): AppearanceThemeId {
  if (equipped && equipped in SWATCHES) return equipped as AppearanceThemeId;
  return "cuaderno";
}

export function ThemePicker({ equipped }: { equipped: string | null }) {
  const router = useRouter();
  const [current, setCurrent] = useState<AppearanceThemeId>(currentTheme(equipped));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setCurrent(currentTheme(equipped));
  }, [equipped]);

  async function choose(id: AppearanceThemeId) {
    if (id === current || busy) return;
    setBusy(true);
    setError(null);
    let response: Response;
    let data: { error?: string };
    try {
      response = await fetch("/api/equip", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ kind: "theme", id }),
      });
      data = (await response.json()) as { error?: string };
    } catch {
      setBusy(false);
      setError("No se pudo guardar el tema.");
      return;
    }
    setBusy(false);
    if (!response.ok) {
      setError(data.error ?? "No se pudo guardar el tema.");
      return;
    }
    setCurrent(id);
    router.refresh();
  }

  return (
    <section className="rounded-3xl bg-card px-4 py-4 ring-1 ring-foreground/10" aria-label="Temas">
      <p className="font-display text-2xl leading-none">Temas</p>
      <p className="mt-1 text-sm text-muted-foreground">Elegí el aspecto de Taskie.</p>
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {APPEARANCE_THEMES.map((theme) => {
          const selected = current === theme.id;
          const [paper, ink] = SWATCHES[theme.id];
          return (
            <button
              key={theme.id}
              type="button"
              aria-pressed={selected}
              disabled={busy}
              onClick={() => void choose(theme.id)}
              className={`flex min-h-16 items-center gap-3 rounded-2xl bg-background px-3 py-2 text-left disabled:opacity-60 ${selected ? "ring-2 ring-primary" : "ring-1 ring-foreground/10"}`}
            >
              <span className="theme-swatch" style={{ background: paper, color: ink }} aria-hidden>
                {theme.id === "check-retro" ? <PixelCheck /> : <span className="theme-swatch-dot" style={{ background: ink }} />}
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold">{theme.name}</span>
                <span className="block text-[11px] font-medium text-muted-foreground">{selected ? "En uso" : "\u00a0"}</span>
              </span>
            </button>
          );
        })}
      </div>
      {error ? <p className="mt-3 text-sm font-semibold text-destructive">{error}</p> : null}
    </section>
  );
}
