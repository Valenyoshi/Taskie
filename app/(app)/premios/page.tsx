import { redirect } from "next/navigation";
import { Medal } from "@/components/medal";
import { PencilCase } from "@/components/pencil-case";
import { PrizeReveal } from "@/components/prize-reveal";
import { PullMachine } from "@/components/pull-machine";
import { getCurrentUser } from "@/lib/session";
import { rewardsData } from "@/lib/view";

export default async function PremiosPage() {
  const session = await getCurrentUser();
  if (!session) redirect("/entrar");
  const data = rewardsData(session.id);
  if (!data) redirect("/entrar");

  return (
    <PrizeReveal machine={<PullMachine points={data.user.points} cost={data.pullCost} missing={data.missing} />}>
      <PencilCase items={data.items.filter((item) => item.owned).map((item) => ({ id: item.id, name: item.name }))} />

      <section>
        <h2 className="mb-3 font-display text-2xl">Logros</h2>
        <div className="flex flex-wrap justify-center gap-3">
          {data.achievements.map((achievement) => (
            <Medal key={achievement.id} unlocked={achievement.unlocked} label={achievement.name} mark={achievement.unlocked ? achievement.name.slice(0, 1) : "?"} />
          ))}
        </div>
      </section>

      <div className="flex flex-wrap justify-center gap-3">
        {data.items.filter((item) => !item.owned).map((item) => (
          <Medal key={item.id} unlocked={false} secret label={item.name} />
        ))}
      </div>
    </PrizeReveal>
  );
}
