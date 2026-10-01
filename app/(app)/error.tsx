"use client";

import { Button } from "@/components/ui/button";

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
      <h1 className="font-display text-2xl">Esta sección no cargó</h1>
      <p className="mt-2 text-sm text-muted-foreground">Probá de nuevo. Si sigue igual, volvé al inicio.</p>
      <Button className="mt-3 h-10" onClick={() => reset()}>
        Reintentar
      </Button>
    </div>
  );
}
