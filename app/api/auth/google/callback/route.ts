import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { googleConfig, googleTokens } from "@/lib/classroom";
import { consumeGoogleFlow, saveClassroomConnection, setSyncResult } from "@/lib/db";
import { safeEqual } from "@/lib/secret";
import { getCurrentUser } from "@/lib/session";
import { syncUser } from "@/lib/sync";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.redirect(new URL("/entrar", request.url));
  const target = new URL("/configuracion", request.url);
  const params = new URL(request.url).searchParams;
  const jar = await cookies();
  const expected = jar.get("taskie_google_state")?.value;
  jar.set("taskie_google_state", "", { path: "/api/auth/google", maxAge: 0 });
  try {
    const state = params.get("state");
    if (user.platform !== "classroom" || !state || !expected || !safeEqual(state, expected)) {
      throw new Error("La solicitud de Google no es válida. Volvé a conectar Classroom.");
    }
    const verifier = consumeGoogleFlow(user.id, state);
    if (!verifier) throw new Error("La solicitud de Google venció o ya se usó. Volvé a conectar Classroom.");
    if (params.has("error")) throw new Error("No se autorizó el acceso a Classroom. Podés volver a conectarlo desde aquí.");
    const code = params.get("code");
    if (!code) throw new Error("Google no devolvió la autorización. Volvé a conectar Classroom.");
    const tokens = await googleTokens({
      grant_type: "authorization_code", code, code_verifier: verifier, redirect_uri: googleConfig().redirectUri,
    });
    if (!tokens.refreshToken) throw new Error("Google no devolvió el permiso para sincronizar. Volvé a conectar Classroom y aceptá los permisos.");
    saveClassroomConnection(user.id, tokens.refreshToken);
    const sync = await syncUser(user.id);
    if (!sync.ok) target.searchParams.set("googleError", sync.error ?? "No pude sincronizar Classroom.");
    else target.searchParams.set("googleConnected", "1");
  } catch (cause) {
    const error = cause instanceof Error && cause.name === "Error" ? cause.message : "No pude conectar con Google. Probá de nuevo.";
    setSyncResult(user.id, error);
    target.searchParams.set("googleError", error);
  }
  return NextResponse.redirect(target);
}
