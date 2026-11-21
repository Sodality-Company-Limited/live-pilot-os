import { resolvePortalSession } from "@/lib/session-context";

export const dynamic = "force-dynamic";

const LOCAL_DEV_SESSION_SECRET = "livepilot-local-dev-session-secret-01";

function resolveSecret(): string {
  return process.env.LIVEPILOT_SESSION_SECRET || process.env.SESSION_SECRET || LOCAL_DEV_SESSION_SECRET;
}

export async function GET(
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

  const promotion = {
    promotionId: promotion_id,
    tenantId: resolution.session.tenantId,
    status: "ISSUED",
    discountPercent: 15,
    voucherCode: "SAVE15NOW",
    issuedAt: Date.now() - 300000,
    expiresAt: Date.now() + 600000,
  };

  return new Response(JSON.stringify({ ok: true, promotion }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
