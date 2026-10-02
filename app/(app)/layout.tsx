import { redirect } from "next/navigation";
import { GainBanner } from "@/components/gain-banner";
import { LogoutButton } from "@/components/logout-button";
import { NavBar } from "@/components/nav-bar";
import { SectionTitle } from "@/components/section-title";
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
        <LogoutButton />
        <header className="mb-5 pt-8 text-center">
          <SectionTitle />
          <p className="mt-2 font-display text-3xl leading-none">Hola {sessionUser.username}</p>
          <div className="mt-3 flex items-center justify-center gap-3">
            <div
              className={`grid size-9 place-items-center rounded-full bg-secondary text-sm font-display ring-4 ${frameClass(sessionUser.equippedFrame)}`}
            >
              {sessionUser.name.slice(0, 1).toUpperCase()}
            </div>
            <p className="text-sm text-muted-foreground">
              {sessionUser.streak} {sessionUser.streak === 1 ? "día" : "días"}
            </p>
          </div>
        </header>
        {lines.length > 0 ? <div className="mb-4"><GainBanner initial={lines} /></div> : <GainBanner />}
        {children}
      </div>
      <NavBar />
    </div>
  );
}
