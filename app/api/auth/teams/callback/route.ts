import { cookies } from "next/headers";
import { saveTeamsConnection, setSyncResult } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { syncUser } from "@/lib/sync";
import { exchangeTeamsCode, teamsRedirectUri } from "@/lib/teams";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const user = await getCurrentUser();
  if (!user) return Response.redirect(new URL("/entrar", request.url));
  const denied = url.searchParams.get("error_description") || url.searchParams.get("error");
  if (denied) return Response.redirect(new URL("/inicio", request.url));

  const jar = await cookies();
  const raw = jar.get("teams_oauth")?.value ?? "";
  jar.delete("teams_oauth");
  const proof = parseProof(raw);
  const code = url.searchParams.get("code") ?? "";
  if (!proof || proof.state !== url.searchParams.get("state") || !code) {
    return Response.redirect(new URL("/inicio", request.url));
  }
  const exchanged = await exchangeTeamsCode({
    code,
    verifier: proof.verifier,
    redirectUri: teamsRedirectUri(request),
  });
  if (!exchanged.ok || !exchanged.tokens.refreshToken) {
    setSyncResult(user.id, exchanged.ok ? "Microsoft no devolvió permiso para volver a entrar." : exchanged.error);
    return Response.redirect(new URL("/inicio", request.url));
  }
  saveTeamsConnection(user.id, { refreshToken: exchanged.tokens.refreshToken, account: exchanged.tokens.account });
  await syncUser(user.id);
  return Response.redirect(new URL("/inicio", request.url));
}

function parseProof(raw: string): { state: string; verifier: string } | null {
  try {
    const data = JSON.parse(raw) as { state?: string; verifier?: string };
    if (!data.state || !data.verifier) return null;
    return { state: data.state, verifier: data.verifier };
  } catch {
    return null;
  }
}
