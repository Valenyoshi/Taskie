import { redirect } from "next/navigation";
import { BobbyShop } from "@/components/bobby-shop";
import { getCurrentUser } from "@/lib/session";

export default async function PremiosPage() {
  const session = await getCurrentUser();
  if (!session) redirect("/entrar");

  return <BobbyShop />;
}
