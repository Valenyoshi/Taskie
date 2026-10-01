import { json } from "@/lib/http";
import { vapidKeys } from "@/lib/push";

export async function GET() {
  return json({ publicKey: vapidKeys().publicKey });
}
