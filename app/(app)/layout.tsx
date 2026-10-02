import { redirect } from "next/navigation";
import { GainBanner } from "@/components/gain-banner";
import { LogoutButton } from "@/components/logout-button";
import { NavBar } from "@/components/nav-bar";
import { frameClass, themeKey } from "@/lib/catalog";
import { touchOpen } from "@/lib/progress";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const sessionUser = await getCurrentUser();
  if (!sessionUser) redirect("/entrar");
  const lines = touchOpen(sessionUser.id);

  return (
    <div data-theme={themeKey(sessionUser.equippedTheme)} className="min-h-dvh bg-background text-foreground">
      <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col px-4 pt-5 pb-36">
        <header className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className={`grid size-11 place-items-center rounded-full bg-secondary text-lg font-display ring-4 ${frameClass(sessionUser.equippedFrame)}`}
            >
              {sessionUser.name.slice(0, 1).toUpperCase()}
            </div>
            <div>
              <p className="font-display text-xl leading-none">{sessionUser.name}</p>
              <p className="text-sm text-muted-foreground">
                Racha de {sessionUser.streak} {sessionUser.streak === 1 ? "día" : "días"}
              </p>
            </div>
          </div>
          <LogoutButton />
        </header>
        {lines.length > 0 ? <div className="mb-4"><GainBanner initial={lines} /></div> : <GainBanner />}
        {children}
      </div>
      <NavBar />
    </div>
  );
}
