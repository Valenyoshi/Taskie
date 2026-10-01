import { redirect } from "next/navigation";
import { EquipButton } from "@/components/equip-button";
import { PullMachine } from "@/components/pull-machine";
import { Badge } from "@/components/ui/badge";
import { getCurrentUser } from "@/lib/session";
import { rewardsData } from "@/lib/view";

export default async function PremiosPage() {
  const session = await getCurrentUser();
  if (!session) redirect("/entrar");
  const data = rewardsData(session.id);
  if (!data) redirect("/entrar");

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="font-display text-3xl">Premios</h1>
        <p className="text-sm text-muted-foreground">Los puntos compran tiradas. Los logros se ganan cumpliendo la condición.</p>
      </div>
      <PullMachine points={data.user.points} cost={data.pullCost} missing={data.missing} />

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-2xl">Colección</h2>
        {data.items.map((item) => (
          <article key={item.id} className="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">{item.kindLabel}</p>
                <h3 className="font-display text-xl">{item.name}</h3>
                <p className="text-sm text-muted-foreground">{item.blurb}</p>
              </div>
              <Badge variant={item.rarity === "super" ? "default" : "secondary"}>{item.rarityLabel}</Badge>
            </div>
            <div className="mt-3">
              {item.owned && item.kind !== "medal" ? (
                <EquipButton kind={item.kind} id={item.id} equipped={item.equipped} />
              ) : (
                <p className="text-sm">{item.owned ? "En tu colección" : "Todavía no salió"}</p>
              )}
            </div>
          </article>
        ))}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-2xl">Logros</h2>
        {data.achievements.map((achievement) => (
          <article key={achievement.id} className="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
            <div className="flex items-start justify-between gap-3">
              <h3 className="font-display text-xl">{achievement.name}</h3>
              <Badge variant={achievement.unlocked ? "default" : "outline"}>{achievement.unlocked ? "Hecho" : "Pendiente"}</Badge>
            </div>
            <p className="mt-1 text-sm">{achievement.detail}</p>
            <p className="mt-2 text-sm text-muted-foreground">
              {achievement.progress ? `${achievement.progress} · ` : ""}+{achievement.xp} XP y +{achievement.points} puntos
            </p>
          </article>
        ))}
      </section>
    </div>
  );
}
