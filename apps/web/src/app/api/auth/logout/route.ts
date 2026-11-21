import { resolvePortalSession } from "../../../../lib/session-context";

export const dynamic = "force-dynamic";

const LOCAL_DEV_SESSION_SECRET = "livepilot-local-dev-session-secret-01";

function resolveSecret(): string {
  return process.env.LIVEPILOT_SESSION_SECRET || process.env.SESSION_SECRET || LOCAL_DEV_SESSION_SECRET;
}

export async function POST(request: Request): Promise<Response> {
  const cookieHeader = request.headers.get("cookie") || "";
  const secret = resolveSecret();
  resolvePortalSession(cookieHeader, secret);

  return new Response(JSON.stringify({ ok: true, message: "LOGGED_OUT" }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Set-Cookie": "lp_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0",
    },
  });
}
