import { redirect } from "next/navigation";
import { KittyShop } from "@/components/kitty-shop";
import { listRewardIds } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

export default async function PremiosPage() {
  const session = await getCurrentUser();
  if (!session) redirect("/entrar");
  const owned = listRewardIds(session.id);

  return (
    <KittyShop
      name={session.username}
      points={session.points}
      ownedRetroCheck={owned.includes("check-retro")}
      equippedRetroCheck={session.equippedTheme === "check-retro"}
    />
  );
}
