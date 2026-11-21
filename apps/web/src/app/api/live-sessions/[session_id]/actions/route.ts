import { resolvePortalSession } from "@/lib/session-context";

export const dynamic = "force-dynamic";

const LOCAL_DEV_SESSION_SECRET = "livepilot-local-dev-session-secret-01";

function resolveSecret(): string {
  return process.env.LIVEPILOT_SESSION_SECRET || process.env.SESSION_SECRET || LOCAL_DEV_SESSION_SECRET;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ session_id: string }> }
): Promise<Response> {
  const { session_id } = await params;
  const cookieHeader = request.headers.get("cookie") || "";
  const secret = resolveSecret();
  const resolution = resolvePortalSession(cookieHeader, secret);

  if (!resolution.ok) {
    return new Response(JSON.stringify({ ok: false, error: resolution.error }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const actions = [
    {
      actionId: "act-1",
      sessionId: session_id,
      actor: "LIVE_OPS",
      actionType: "PROMOTION_PROPOSED",
      timestamp: Date.now() - 120000,
    },
    {
      actionId: "act-2",
      sessionId: session_id,
      actor: "HOST",
      actionType: "PRODUCT_PINNED",
      timestamp: Date.now() - 60000,
    },
  ];

  return new Response(JSON.stringify({ ok: true, actions }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
