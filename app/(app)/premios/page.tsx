import { redirect } from "next/navigation";
import { Medal } from "@/components/medal";
import { PullMachine } from "@/components/pull-machine";
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

      <section>
        <h2 className="mb-3 font-display text-2xl">Logros</h2>
        <div className="flex flex-wrap justify-center gap-3">
          {data.achievements.map((achievement) => (
            <Medal key={achievement.id} unlocked={achievement.unlocked} label={achievement.name} mark={achievement.unlocked ? achievement.name.slice(0, 1) : "?"} />
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-display text-2xl">Tu estuche</h2>
        {data.items.some((item) => item.owned) ? (
          <div className="flex flex-wrap gap-2">
            {data.items.filter((item) => item.owned).map((item) => (
              <div key={item.id} className="grid min-w-16 place-items-center rounded-2xl bg-card px-3 py-2 ring-1 ring-foreground/10">
                <span className="text-3xl">{item.emoji}</span>
                <span className="text-[11px] font-semibold">{item.name}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Todavía vacío</p>
        )}
        <div className="mt-3 flex flex-wrap justify-center gap-3">
          {data.items.filter((item) => !item.owned).map((item) => (
            <Medal key={item.id} unlocked={false} secret label={item.name} />
          ))}
        </div>
      </section>
    </div>
  );
}
