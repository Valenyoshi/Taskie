import { redirect } from "next/navigation";
import { LogoutButton } from "@/components/logout-button";
import { NavBar } from "@/components/nav-bar";
import { SectionTitle } from "@/components/section-title";
import { frameClass, scoreRewards, themeKey } from "@/lib/catalog";
import { listRewardIds } from "@/lib/db";
import { touchOpen } from "@/lib/progress";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const sessionUser = await getCurrentUser();
  if (!sessionUser) redirect("/entrar");
  touchOpen(sessionUser.id);
  const prizePoints = scoreRewards(listRewardIds(sessionUser.id));

  return (
    <div data-theme={themeKey(sessionUser.equippedTheme)} className="min-h-dvh bg-background text-foreground">
      <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col px-4 pt-5 pb-36">
        <LogoutButton />
        <header className="mb-5 pt-8 text-center">
          <SectionTitle />
          <p className="mt-2 font-display text-3xl leading-none">Hola {sessionUser.username}</p>
          <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
            <div
              className={`grid size-9 place-items-center rounded-full bg-secondary text-sm font-display ring-4 ${frameClass(sessionUser.equippedFrame)}`}
            >
              {sessionUser.name.slice(0, 1).toUpperCase()}
            </div>
            <div className="prize-corral">
              <span className="points-coin" aria-hidden />
              <span>
                <span className="points-value">{prizePoints}</span>
                <span className="points-label">premio</span>
              </span>
            </div>
            <p className="streak-pill">
              {sessionUser.streak} {sessionUser.streak === 1 ? "día" : "días"}
            </p>
          </div>
        </header>
        {children}
      </div>
      <NavBar />
    </div>
  );
}
