import { redirect } from "next/navigation";
import { KittyShop } from "@/components/kitty-shop";
import { getCurrentUser } from "@/lib/session";

export default async function PremiosPage() {
  const session = await getCurrentUser();
  if (!session) redirect("/entrar");

  return <KittyShop name={session.username} />;
}
