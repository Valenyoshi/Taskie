import { createHash, randomBytes } from "crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { googleAuthorizationUrl, googleConfig } from "@/lib/classroom";
import { createGoogleFlow } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.redirect(new URL("/entrar", request.url));
  if (user.platform !== "classroom" || user.isDemo) return NextResponse.redirect(new URL("/configuracion", request.url));
  try {
    const config = googleConfig();
    const state = randomBytes(32).toString("base64url");
    const verifier = randomBytes(32).toString("base64url");
    const challenge = createHash("sha256").update(verifier).digest("base64url");
    const url = googleAuthorizationUrl(state, challenge);
    createGoogleFlow(user.id, state, verifier);
    const jar = await cookies();
    jar.set("taskie_google_state", state, {
      httpOnly: true, secure: config.redirectUri.startsWith("https:") || process.env.TASKIE_SECURE_COOKIES === "1",
      sameSite: "lax", path: "/api/auth/google", maxAge: 600,
    });
    return NextResponse.redirect(url);
  } catch (cause) {
    const url = new URL("/configuracion", request.url);
    url.searchParams.set("googleError", cause instanceof Error ? cause.message : "No pude abrir Google.");
    return NextResponse.redirect(url);
  }
}
