import { redirect } from "next/navigation";
import { LogoutButton } from "@/components/logout-button";
import { NavBar } from "@/components/nav-bar";
import { RewardPopup } from "@/components/reward-popup";
import { SectionTitle } from "@/components/section-title";
import { SectionWash } from "@/components/section-wash";
import { frameClass, themeKey } from "@/lib/catalog";
import { POINTS } from "@/lib/game";
import { findUserById } from "@/lib/db";
import { touchOpen } from "@/lib/progress";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const sessionUser = await getCurrentUser();
  if (!sessionUser) redirect("/entrar");
  const openLines = touchOpen(sessionUser.id);
  const user = findUserById(sessionUser.id) ?? sessionUser;
  const openedStreak = openLines.some((line) => line.startsWith("Taskie · racha"));
  const rewardKey = user.lastOpenDate ? `${user.id}:${user.lastOpenDate}:streak` : undefined;

  return (
    <div
      data-theme={themeKey(user.equippedTheme)}
      data-retro-check={user.equippedTheme === "check-retro" ? "true" : undefined}
      className="min-h-dvh bg-background text-foreground"
    >
      <SectionWash />
      <div className="relative z-10 mx-auto flex min-h-dvh w-full max-w-2xl flex-col px-5 pt-16 pb-44">
        <LogoutButton />
        <header className="mb-8 pt-12 text-center">
          <SectionTitle />
          <p className="gradient-text mt-2 font-display text-4xl leading-none">Hola {user.username}</p>
          <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
            <div
              className={`grid size-10 place-items-center rounded-full bg-secondary text-base font-display shadow-sm ring-4 transition hover:scale-105 ${frameClass(user.equippedFrame)}`}
              title={`Perfil de ${user.name}`}
            >
              <span className="translate-y-[-0.5px]">{user.name.slice(0, 1).toUpperCase()}</span>
            </div>
          </div>
        </header>
        {children}
      </div>
      <NavBar />
      <RewardPopup
        open={openedStreak}
        title="¡Racha iniciada!"
        description="Entraste hoy y sumaste una recompensa."
        streak={user.streak}
        points={POINTS.streakOpen}
        storageKey={rewardKey}
      />
    </div>
  );
}
