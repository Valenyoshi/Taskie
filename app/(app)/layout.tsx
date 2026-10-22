import { redirect } from "next/navigation";
import { LogoutButton } from "@/components/logout-button";
import { NavBar } from "@/components/nav-bar";
import { RewardPopup } from "@/components/reward-popup";
import { SectionTitle } from "@/components/section-title";
import { SectionWash } from "@/components/section-wash";
import { themeKey } from "@/lib/catalog";
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
          <SectionTitle username={user.username} />
        </header>
        {children}
      </div>
      <NavBar />
      <RewardPopup
        open={openedStreak}
        title="¡Racha iniciada!"
        description="Entraste hoy. La racha sigue."
        streak={user.streak}
        storageKey={rewardKey}
      />
    </div>
  );
}
