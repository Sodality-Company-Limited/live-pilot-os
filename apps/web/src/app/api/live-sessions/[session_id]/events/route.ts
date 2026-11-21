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

  const stream = new ReadableStream({
    start(controller) {
      const initialEvent = `data: ${JSON.stringify({
        eventId: "evt-init",
        sessionId: session_id,
        eventType: "CONNECTED",
        timestamp: Date.now(),
      })}\n\n`;
      controller.enqueue(new TextEncoder().encode(initialEvent));
      controller.close();
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}
