import { resolvePortalSession } from "@/lib/session-context";

export const dynamic = "force-dynamic";

const LOCAL_DEV_SESSION_SECRET = "livepilot-local-dev-session-secret-01";

function resolveSecret(): string {
  return process.env.LIVEPILOT_SESSION_SECRET || process.env.SESSION_SECRET || LOCAL_DEV_SESSION_SECRET;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ promotion_id: string }> }
): Promise<Response> {
  const { promotion_id } = await params;
  const cookieHeader = request.headers.get("cookie") || "";
  const secret = resolveSecret();
  const resolution = resolvePortalSession(cookieHeader, secret);

  if (!resolution.ok) {
    return new Response(JSON.stringify({ ok: false, error: resolution.error }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (resolution.session.role !== "LIVE_OPS") {
    return new Response(JSON.stringify({ ok: false, error: "ROLE_FORBIDDEN" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  const body = await request.json().catch(() => ({}));
  const { decision } = body;

  if (decision !== "APPROVE" && decision !== "REJECT") {
    return new Response(JSON.stringify({ ok: false, error: "BAD_REQUEST" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const decisionReceipt = {
    promotionId: promotion_id,
    decision,
    status: decision === "APPROVE" ? "APPROVED" : "REJECTED",
    decidedBy: resolution.session.userId,
    decidedAt: Date.now(),
  };

  return new Response(JSON.stringify({ ok: true, decision: decisionReceipt }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
