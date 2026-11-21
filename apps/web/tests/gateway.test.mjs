import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";

const require = createRequire(import.meta.url);
const ts = require("typescript");

require.extensions[".ts"] = (module, filename) => {
  const source = readFileSync(filename, "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
  }).outputText;
  module._compile(compiled, filename);
};

const {
  DEFAULT_GATEWAY_TIMEOUT_MS,
  REDACTED_VALUE,
  GatewayTimeoutError,
  GatewayConfigurationError,
  GatewayUpstreamError,
  forwardToGateway,
  redactHeaders,
  redactSensitiveData,
  scrubSecretsFromText,
} = require("../src/lib/gateway-transport.ts");

const TEST_SECRET = "krakend-internal-service-secret-xyz-987";
const TEST_TRACEPARENT = "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01";
const TEST_CORRELATION_ID = "corr-livepilot-0001";

async function withLoopbackGateway(handler, fn) {
  const server = http.createServer(handler);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;
  try {
    return await fn(baseUrl, server);
  } finally {
    server.closeAllConnections?.();
    await new Promise((resolve) => server.close(resolve));
  }
}

test("forwards request to gateway preserving correlation, traceparent, and server-derived principal headers", async () => {
  let receivedHeaders = null;
  let receivedPath = null;
  let receivedBody = "";

  await withLoopbackGateway(
    (req, res) => {
      receivedHeaders = req.headers;
      receivedPath = req.url;
      req.on("data", (chunk) => {
        receivedBody += chunk.toString("utf8");
      });
      req.on("end", () => {
        res.writeHead(200, {
          "content-type": "application/json",
          "x-correlation-id": req.headers["x-correlation-id"] ?? "",
          "set-cookie": "internal_debug=sensitive_cookie_value",
        });
        res.end(JSON.stringify({ status: "ok", session: "live_01" }));
      });
    },
    async (gatewayBaseUrl) => {
      const telemetryEvents = [];
      const result = await forwardToGateway({
        config: {
          gatewayBaseUrl,
          timeoutMs: DEFAULT_GATEWAY_TIMEOUT_MS,
          serviceSecret: TEST_SECRET,
        },
        path: "/v1/live-sessions/live_01/overview",
        method: "POST",
        principal: {
          tenantId: "tenant_alpha",
          sessionId: "sess_01",
          role: "LIVE_OPS",
        },
        correlationId: TEST_CORRELATION_ID,
        traceparent: TEST_TRACEPARENT,
        idempotencyKey: "idem-001",
        body: { action: "refresh" },
        onTelemetry: (receipt) => telemetryEvents.push(receipt),
      });

      assert.equal(result.ok, true);
      assert.equal(result.status, 200);
      assert.deepEqual(result.data, { status: "ok", session: "live_01" });
      assert.equal(result.correlationId, TEST_CORRELATION_ID);
      assert.equal(result.traceparent, TEST_TRACEPARENT);

      assert.equal(receivedPath, "/v1/live-sessions/live_01/overview");
      assert.equal(receivedBody, JSON.stringify({ action: "refresh" }));
      assert.equal(receivedHeaders["x-correlation-id"], TEST_CORRELATION_ID);
      assert.equal(receivedHeaders["x-traceparent"], TEST_TRACEPARENT);
      assert.equal(receivedHeaders["x-tenant-id"], "tenant_alpha");
      assert.equal(receivedHeaders["x-session-id"], "sess_01");
      assert.equal(receivedHeaders["x-role"], "LIVE_OPS");
      assert.equal(receivedHeaders["idempotency-key"], "idem-001");
      assert.equal(receivedHeaders["authorization"], `Bearer ${TEST_SECRET}`);

      assert.equal(telemetryEvents.length, 1);
      assert.equal(telemetryEvents[0].outcome, "success");
      assert.equal(telemetryEvents[0].correlationId, TEST_CORRELATION_ID);
      assert.equal(telemetryEvents[0].traceparent, TEST_TRACEPARENT);
    },
  );
});

test("enforces timeout via AbortSignal.timeout and throws typed GatewayTimeoutError fail-closed", async () => {
  let activeTimer = null;

  await withLoopbackGateway(
    (req, res) => {
      activeTimer = setTimeout(() => {
        if (!res.writableEnded) {
          res.writeHead(200, { "content-type": "application/json" });
          res.end(JSON.stringify({ late: true }));
        }
      }, 400);
      req.on("close", () => {
        if (activeTimer) {
          clearTimeout(activeTimer);
          activeTimer = null;
        }
      });
    },
    async (gatewayBaseUrl) => {
      const telemetryEvents = [];
      let caughtError = null;

      try {
        await forwardToGateway({
          config: {
            gatewayBaseUrl,
            timeoutMs: 30,
            serviceSecret: TEST_SECRET,
          },
          path: "/v1/live-sessions/live_01/overview",
          principal: {
            tenantId: "tenant_alpha",
            sessionId: "sess_01",
            role: "HOST",
          },
          correlationId: TEST_CORRELATION_ID,
          traceparent: TEST_TRACEPARENT,
          onTelemetry: (receipt) => telemetryEvents.push(receipt),
        });
      } catch (err) {
        caughtError = err;
      }

      assert.ok(caughtError instanceof GatewayTimeoutError);
      assert.equal(caughtError.code, "GATEWAY_TIMEOUT");
      assert.equal(caughtError.statusCode, 504);
      assert.equal(caughtError.timeoutMs, 30);
      assert.equal(caughtError.correlationId, TEST_CORRELATION_ID);
      assert.equal(caughtError.traceparent, TEST_TRACEPARENT);
      assert.equal(telemetryEvents.length, 1);
      assert.equal(telemetryEvents[0].outcome, "timeout");
      assert.equal(telemetryEvents[0].statusCode, 504);
      assert.equal(telemetryEvents[0].errorCode, "GATEWAY_TIMEOUT");
    },
  );
});

test("redacts serviceSecret, Authorization headers, cookies, and sensitive fields in telemetry and errors", async () => {
  await withLoopbackGateway(
    (_req, res) => {
      res.writeHead(502, {
        "content-type": "application/json",
        "set-cookie": "session=secret-cookie-abc",
      });
      res.end(JSON.stringify({ error: "downstream_failure" }));
    },
    async (gatewayBaseUrl) => {
      const telemetryEvents = [];
      const result = await forwardToGateway({
        config: {
          gatewayBaseUrl,
          timeoutMs: 1_000,
          serviceSecret: TEST_SECRET,
        },
        path: "/v1/promotions/promo_01",
        principal: {
          tenantId: "tenant_alpha",
          sessionId: "sess_01",
          role: "LIVE_OPS",
        },
        incomingHeaders: {
          authorization: "Bearer client-forged-jwt-secret",
          cookie: "lp_session=signed-browser-cookie-value",
          "x-api-key": "client-api-key-leak",
        },
        onTelemetry: (receipt) => telemetryEvents.push(receipt),
      });

      assert.equal(result.ok, false);
      assert.equal(result.status, 502);
      assert.equal(telemetryEvents.length, 1);

      const serializedReceipt = JSON.stringify(telemetryEvents[0]);
      assert.equal(serializedReceipt.includes(TEST_SECRET), false);
      assert.equal(serializedReceipt.includes("client-forged-jwt-secret"), false);
      assert.equal(serializedReceipt.includes("signed-browser-cookie-value"), false);
      assert.equal(serializedReceipt.includes("secret-cookie-abc"), false);
      assert.equal(serializedReceipt.includes("client-api-key-leak"), false);
      assert.equal(telemetryEvents[0].requestHeaders.authorization, REDACTED_VALUE);
      assert.equal(telemetryEvents[0].responseHeaders["set-cookie"], REDACTED_VALUE);
    },
  );

  // Also verify redaction on real TCP connection refusal against a closed ephemeral port
  const probeServer = http.createServer();
  await new Promise((resolve) => probeServer.listen(0, "127.0.0.1", resolve));
  const closedPort = probeServer.address().port;
  await new Promise((resolve) => probeServer.close(resolve));

  let transportError = null;
  try {
    await forwardToGateway({
      config: {
        gatewayBaseUrl: `http://127.0.0.1:${closedPort}`,
        timeoutMs: 500,
        serviceSecret: TEST_SECRET,
      },
      path: "/v1/live-sessions/live_01/overview",
      principal: {
        tenantId: "tenant_alpha",
        sessionId: "sess_01",
        role: "HOST",
      },
    });
  } catch (err) {
    transportError = err;
  }

  assert.ok(transportError instanceof GatewayUpstreamError);
  const serializedErr = JSON.stringify(transportError.toJSON());
  assert.equal(serializedErr.includes(TEST_SECRET), false);
  assert.equal(transportError.message.includes(TEST_SECRET), false);
  assert.equal(transportError.telemetry.requestHeaders.authorization, REDACTED_VALUE);

  const scrubbed = scrubSecretsFromText(
    `upstream rejected Bearer ${TEST_SECRET} and raw ${TEST_SECRET}`,
    [TEST_SECRET],
  );
  assert.equal(scrubbed.includes(TEST_SECRET), false);
  assert.equal(scrubbed, `upstream rejected Bearer ${REDACTED_VALUE} and raw ${REDACTED_VALUE}`);

  const redactedHeaders = redactHeaders(
    {
      Authorization: `Bearer ${TEST_SECRET}`,
      Cookie: "lp_session=abc",
      "X-Correlation-Id": TEST_CORRELATION_ID,
    },
    [TEST_SECRET],
  );
  assert.equal(redactedHeaders.authorization, REDACTED_VALUE);
  assert.equal(redactedHeaders.cookie, REDACTED_VALUE);
  assert.equal(redactedHeaders["x-correlation-id"], TEST_CORRELATION_ID);

  const redactedPayload = redactSensitiveData(
    {
      serviceSecret: TEST_SECRET,
      nested: { accessToken: "tok_live_999", ok: true },
      note: `token Bearer ${TEST_SECRET}`,
    },
    [TEST_SECRET],
  );
  assert.equal(redactedPayload.serviceSecret, REDACTED_VALUE);
  assert.equal(redactedPayload.nested.accessToken, REDACTED_VALUE);
  assert.equal(redactedPayload.nested.ok, true);
  assert.equal(redactedPayload.note.includes(TEST_SECRET), false);
});

test("strips forged/untrusted client headers and enforces server-derived identity and boundary guards", async () => {
  let receivedHeaders = null;

  await withLoopbackGateway(
    (req, res) => {
      receivedHeaders = req.headers;
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ verified: true }));
    },
    async (gatewayBaseUrl) => {
      await forwardToGateway({
        config: {
          gatewayBaseUrl,
          timeoutMs: 1_000,
          serviceSecret: TEST_SECRET,
        },
        path: "/v1/live-sessions/live_01/actions",
        principal: {
          tenantId: "tenant_server_auth",
          sessionId: "sess_server_auth",
          role: "HOST",
        },
        incomingHeaders: {
          "x-tenant-id": "tenant_forged",
          "X-Role": "PLATFORM_ADMIN",
          "x-session-id": "sess_forged",
          "x-user-id": "forged_admin",
          "x-internal-auth": "bypass-token",
          "x-forwarded-user": "evil-actor",
          "x-service-secret": "forged-secret",
          cookie: "lp_session=forged-cookie",
          authorization: "Bearer forged-client-token",
          "accept-language": "th-TH",
        },
      });

      assert.equal(receivedHeaders["x-tenant-id"], "tenant_server_auth");
      assert.equal(receivedHeaders["x-session-id"], "sess_server_auth");
      assert.equal(receivedHeaders["x-role"], "HOST");
      assert.equal(receivedHeaders["authorization"], `Bearer ${TEST_SECRET}`);
      assert.equal(receivedHeaders["accept-language"], "th-TH");
      assert.equal(receivedHeaders["x-user-id"], undefined);
      assert.equal(receivedHeaders["x-internal-auth"], undefined);
      assert.equal(receivedHeaders["x-forwarded-user"], undefined);
      assert.equal(receivedHeaders["x-service-secret"], undefined);
      assert.equal(receivedHeaders["cookie"], undefined);
    },
  );

  await assert.rejects(
    () =>
      forwardToGateway({
        config: {
          gatewayBaseUrl: "http://127.0.0.1:8080",
          timeoutMs: 1_000,
          serviceSecret: TEST_SECRET,
        },
        path: "/internal/v1/core/auth/context",
        principal: {
          tenantId: "tenant_alpha",
          sessionId: "sess_01",
          role: "HOST",
        },
      }),
    GatewayConfigurationError,
  );
});
