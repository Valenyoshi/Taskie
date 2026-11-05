import { educamosLogin, hasEducamosLogin } from "@/lib/credentials";
import { cachedNewsImage, fetchEducamosNews } from "@/lib/educamos";
import { isUser, json, requireUser } from "@/lib/http";

export async function GET(_request: Request, context: { params: Promise<{ id: string; n: string }> }) {
  const user = await requireUser();
  if (!isUser(user)) return user;
  const { id, n } = await context.params;
  const index = Number(n);
  if (!/^[0-9a-f-]{36}$/i.test(id) || !Number.isInteger(index) || index < 0 || index > 9) return json({ error: "Imagen desconocida." }, 404);
  let image = cachedNewsImage(user.id, id, index);
  if (!image && hasEducamosLogin(user)) {
    const login = educamosLogin(user);
    if (login) await fetchEducamosNews({ url: user.educamosUrl, ...login, timeZone: user.timezone, cacheKey: user.id });
    image = cachedNewsImage(user.id, id, index);
  }
  if (!image) return json({ error: "Imagen desconocida." }, 404);
  return new Response(new Uint8Array(image.bytes), {
    headers: {
      "content-type": image.type,
      "cache-control": "private, max-age=3600",
      "x-content-type-options": "nosniff",
      "content-security-policy": "default-src 'none'",
    },
  });
}
