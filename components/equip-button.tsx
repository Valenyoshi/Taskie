"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function EquipButton({
  kind,
  id,
  equipped,
}: {
  kind: "theme" | "frame" | "title";
  id: string;
  equipped: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function equip(next: string | null) {
    setBusy(true);
    await fetch("/api/equip", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ kind, id: next }),
    });
    setBusy(false);
    router.refresh();
  }

  if (equipped) {
    return (
      <Button className="h-9" variant="outline" disabled={busy} onClick={() => void equip(null)}>
        Quitar
      </Button>
    );
  }
  return (
    <Button className="h-9" disabled={busy} onClick={() => void equip(id)}>
      Usar
    </Button>
  );
}
