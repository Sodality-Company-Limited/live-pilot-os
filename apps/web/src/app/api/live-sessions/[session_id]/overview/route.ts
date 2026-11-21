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

  const { tenantId, mode } = resolution.session;

  const overview = {
    sessionId: session_id,
    tenantId,
    mode,
    title: "Weekend Flash Sale Live Session",
    status: "ACTIVE",
    activeProductsCount: 12,
    viewerCount: 1450,
    gmvMinor: 4890000,
    currency: "THB",
    startedAt: Date.now() - 3600000,
    updatedAt: Date.now(),
  };

  return new Response(JSON.stringify({ ok: true, overview }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
