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
      <h1 className="font-display text-3xl">Premios</h1>
      <PullMachine points={data.user.points} cost={data.pullCost} missing={data.missing} />

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-2xl">Colección</h2>
        {data.items.map((item) => (
          <article
            key={item.id}
            className={`flex items-center justify-between gap-3 rounded-2xl px-3 py-3 ${
              item.rarity === "super" ? "bg-amber-100" : item.rarity === "rare" ? "bg-violet-100" : "bg-card ring-1 ring-foreground/10"
            }`}
          >
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{item.kindLabel}</p>
              <h3 className="font-display text-lg leading-tight">{item.name}</h3>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={item.rarity === "super" ? "default" : "secondary"}>{item.rarityLabel}</Badge>
              {item.owned && item.kind !== "medal" ? (
                <EquipButton kind={item.kind} id={item.id} equipped={item.equipped} />
              ) : (
                <span className="text-lg">{item.owned ? "★" : "·"}</span>
              )}
            </div>
          </article>
        ))}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-2xl">Logros</h2>
        {data.achievements.map((achievement) => (
          <article key={achievement.id} title={achievement.detail} className="flex items-center justify-between gap-3 rounded-2xl bg-card px-3 py-3 ring-1 ring-foreground/10">
            <div>
              <h3 className="font-display text-lg leading-tight">{achievement.name}</h3>
              <p className="text-xs text-muted-foreground">{achievement.progress || `+${achievement.xp} XP`}</p>
            </div>
            <Badge variant={achievement.unlocked ? "default" : "outline"}>{achievement.unlocked ? "Hecho" : "—"}</Badge>
          </article>
        ))}
      </section>
    </div>
  );
}
