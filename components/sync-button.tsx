"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";

export function SyncButton({ autoSync = true }: { autoSync?: boolean }) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const sync = useCallback(async (silent = false) => {
    setBusy(true);
    if (!silent) setMessage(null);
    let res: Response;
    let data: { error?: string; count?: number };
    try {
      res = await fetch("/api/sync", { method: "POST" });
      data = (await res.json()) as { error?: string; count?: number };
    } catch {
      setBusy(false);
      if (!silent) setMessage("No pude actualizar.");
      return;
    }
    setBusy(false);
    if (!res.ok) {
      if (!silent) setMessage(data.error ?? "No pude actualizar.");
      return;
    }
    setMessage(null);
    router.refresh();
  }, [router]);

  useEffect(() => {
    if (autoSync) void sync(true);
  }, [autoSync, sync]);

  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        disabled={busy}
        onClick={() => void sync()}
        className="sync-button"
        aria-label="Actualizar tareas"
        title="Actualizar tareas"
      >
        <RefreshCw className={`sync-icon ${busy ? "is-spinning" : ""}`} />
      </button>
      {message ? <span className="text-xs font-semibold text-destructive">{message}</span> : null}
    </span>
  );
}
