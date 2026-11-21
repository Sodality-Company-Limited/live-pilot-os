import { resolvePortalSession } from "../../../../lib/session-context";

export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
  const cookieHeader = request.headers.get("cookie") || "";
  resolvePortalSession(cookieHeader);

  return new Response(JSON.stringify({ ok: true, message: "LOGGED_OUT" }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Set-Cookie": "livepilot_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0",
    },
  });
}
