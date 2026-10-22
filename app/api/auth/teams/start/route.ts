import { cookies } from "next/headers";
import { getCurrentUser } from "@/lib/session";
import { newOauthProof, teamsAuthorizeUrl, teamsClientId, teamsRedirectUri } from "@/lib/teams";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.redirect(new URL("/entrar", request.url));
  if (user.platform !== "teams") return Response.redirect(new URL("/inicio", request.url));
  if (!teamsClientId()) {
    return new Response(missingAppHtml(), {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
  const proof = newOauthProof();
  const jar = await cookies();
  jar.set("teams_oauth", JSON.stringify({ state: proof.state, verifier: proof.verifier }), {
    httpOnly: true,
    sameSite: "lax",
    secure: secureCookie(request),
    path: "/",
    maxAge: 10 * 60,
  });
  return Response.redirect(teamsAuthorizeUrl({ redirectUri: teamsRedirectUri(request), state: proof.state, challenge: proof.challenge }));
}

function secureCookie(request: Request) {
  const proto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  return proto === "https" || process.env.TASKIE_SECURE_COOKIES === "1";
}

function missingAppHtml() {
  return `<!doctype html><html lang="es"><meta charset="utf-8"><title>Teams</title>
  <body style="font-family:sans-serif;max-width:36rem;margin:4rem auto;padding:0 1rem">
  <h1>Falta conectar la aplicación de Microsoft</h1>
  <p>Taskie ya puede usar Teams, pero este servidor no tiene el identificador de la aplicación.</p>
  <p>En el registro de Microsoft Entra hay que crear una aplicación, permitir <code>EduAssignments.Read</code> y <code>EduRoster.ReadBasic</code>, y poner como redirección <code>/api/auth/teams/callback</code>.</p>
  <p>Después completá <code>MICROSOFT_CLIENT_ID</code> en el entorno y volvé a crear la cuenta eligiendo Teams.</p>
  <p><a href="/entrar">Volver</a></p>
  </body></html>`;
}
