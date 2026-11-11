"use client";

export function openTeamsReading(url: string, taskId: string, onReady: () => void): string | null {
  let popup: Window | null;
  try {
    popup = window.open(url, "taskie-lectura", "popup,width=480,height=860");
  } catch {
    popup = null;
  }
  if (!popup) return "El navegador bloqueó la ventana de Teams. Permití las ventanas y volvé a intentar.";

  let stopped = false;
  let timer = 0;
  const finish = () => {
    if (stopped) return;
    stopped = true;
    window.clearInterval(timer);
    popup?.close();
    onReady();
  };
  const look = async () => {
    try {
      const res = await fetch(`/api/tasks/${taskId}/reading`, { method: "POST" });
      const data = (await res.json()) as { ready?: boolean };
      if (data.ready) finish();
    } catch {
      // Teams puede tardar. El próximo intento vuelve a mirar.
    }
  };
  timer = window.setInterval(() => {
    if (popup?.closed) {
      window.clearInterval(timer);
      void look();
      return;
    }
    void look();
  }, 5000);
  window.setTimeout(() => {
    stopped = true;
    window.clearInterval(timer);
  }, 20 * 60 * 1000);
  void look();
  return null;
}
