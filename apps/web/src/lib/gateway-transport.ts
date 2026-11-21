import { randomBytes, randomUUID } from "node:crypto";

export const DEFAULT_GATEWAY_TIMEOUT_MS = 3_000;
export const REDACTED_VALUE = "[REDACTED]";

const TRACEPARENT_PATTERN = /^00-[0-9a-f]{32}-[0-9a-f]{16}-[0-9a-f]{2}$/;
const HEADER_CONTROL_CHARS = /[\r\n\0]/;

const STRIPPED_EXACT_HEADERS = new Set([
  "authorization",
  "proxy-authorization",
  "cookie",
  "set-cookie",
  "host",
  "connection",
  "keep-alive",
  "transfer-encoding",
  "content-length",
  "upgrade",
  "te",
  "trailer",
  "x-api-key",
  "x-real-ip",
  "x-original-url",
  "x-rewrite-url",
  "x-middleware-subrequest",
]);

const STRIPPED_HEADER_PREFIXES = [
  "x-tenant-",
  "x-session-",
  "x-role",
  "x-user-",
  "x-actor-",
  "x-workspace-",
  "x-capability",
  "x-policy-",
  "x-internal-",
  "x-service-",
  "x-auth-",
  "x-forwarded-",
  "x-admin-",
];

const SENSITIVE_HEADER_KEYS = new Set([
  "authorization",
  "proxy-authorization",
  "cookie",
  "set-cookie",
  "x-api-key",
  "x-service-secret",
  "x-service-token",
  "x-internal-auth",
  "x-secret",
]);

const SENSITIVE_FIELD_PATTERN =
  /(secret|password|passwd|token|api[-_]?key|authorization|cookie|credential|private[-_]?key)/i;

export interface GatewayTransportConfig {
  gatewayBaseUrl: string;
  timeoutMs?: number;
  serviceSecret: string;
}

export interface GatewayPrincipalContext {
  tenantId: string;
  sessionId: string;
  role: string;
}

export interface GatewayTelemetryReceipt {
  correlationId: string;
  traceparent: string;
  method: string;
  path: string;
  targetOrigin: string;
  tenantId: string;
  sessionId: string;
  role: string;
  statusCode: number | null;
  durationMs: number;
  outcome: "success" | "upstream_error" | "timeout" | "transport_error" | "config_error";
  requestHeaders: Record<string, string>;
  responseHeaders: Record<string, string>;
  errorCode?: string;
  errorMessage?: string;
}

export interface ForwardToGatewayOptions {
  config: GatewayTransportConfig;
  path: string;
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  principal: GatewayPrincipalContext;
  incomingHeaders?: HeadersInit | Record<string, string | string[] | undefined>;
  correlationId?: string;
  traceparent?: string;
  idempotencyKey?: string;
  locale?: string;
  body?: BodyInit | Record<string, unknown> | null;
  onTelemetry?: (receipt: GatewayTelemetryReceipt) => void;
}

export interface GatewayForwardResult<T = unknown> {
  ok: boolean;
  status: number;
  headers: Record<string, string>;
  data: T;
  rawBody: string;
  correlationId: string;
  traceparent: string;
  telemetry: GatewayTelemetryReceipt;
}

export class GatewayTransportError extends Error {
  readonly code: string;
  readonly statusCode: number;
  readonly correlationId: string;
  readonly traceparent: string;
  readonly telemetry: GatewayTelemetryReceipt;

  constructor(
    message: string,
    options: {
      code: string;
      statusCode: number;
      correlationId: string;
      traceparent: string;
      telemetry: GatewayTelemetryReceipt;
      cause?: unknown;
    },
  ) {
    super(message);
    this.name = "GatewayTransportError";
    this.code = options.code;
    this.statusCode = options.statusCode;
    this.correlationId = options.correlationId;
    this.traceparent = options.traceparent;
    this.telemetry = options.telemetry;
    if (options.cause !== undefined) {
      this.cause = options.cause;
    }
  }

  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      code: this.code,
      statusCode: this.statusCode,
      message: this.message,
      correlationId: this.correlationId,
      traceparent: this.traceparent,
      telemetry: this.telemetry,
    };
  }
}

export class GatewayTimeoutError extends GatewayTransportError {
  readonly timeoutMs: number;

  constructor(
    message: string,
    options: {
      timeoutMs: number;
      correlationId: string;
      traceparent: string;
      telemetry: GatewayTelemetryReceipt;
      cause?: unknown;
    },
  ) {
    super(message, {
      code: "GATEWAY_TIMEOUT",
      statusCode: 504,
      correlationId: options.correlationId,
      traceparent: options.traceparent,
      telemetry: options.telemetry,
      cause: options.cause,
    });
    this.name = "GatewayTimeoutError";
    this.timeoutMs = options.timeoutMs;
  }
}

export class GatewayConfigurationError extends GatewayTransportError {
  constructor(
    message: string,
    options: {
      correlationId: string;
      traceparent: string;
      telemetry: GatewayTelemetryReceipt;
      cause?: unknown;
    },
  ) {
    super(message, {
      code: "GATEWAY_CONFIGURATION_ERROR",
      statusCode: 500,
      correlationId: options.correlationId,
      traceparent: options.traceparent,
      telemetry: options.telemetry,
      cause: options.cause,
    });
    this.name = "GatewayConfigurationError";
  }
}

export class GatewayUpstreamError extends GatewayTransportError {
  constructor(
    message: string,
    options: {
      statusCode?: number;
      correlationId: string;
      traceparent: string;
      telemetry: GatewayTelemetryReceipt;
      cause?: unknown;
    },
  ) {
    super(message, {
      code: "GATEWAY_UPSTREAM_ERROR",
      statusCode: options.statusCode ?? 502,
      correlationId: options.correlationId,
      traceparent: options.traceparent,
      telemetry: options.telemetry,
      cause: options.cause,
    });
    this.name = "GatewayUpstreamError";
  }
}

function isNonEmptySafeHeaderValue(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.trim().length > 0 &&
    value.trim() === value &&
    !HEADER_CONTROL_CHARS.test(value)
  );
}

function generateW3CTraceparent(): string {
  const traceId = randomBytes(16).toString("hex");
  const spanId = randomBytes(8).toString("hex");
  return `00-${traceId}-${spanId}-01`;
}

export function scrubSecretsFromText(text: string, extraSecrets: readonly string[] = []): string {
  let scrubbed = text.replace(/\b(Bearer|Basic)\s+[A-Za-z0-9._~+/=-]+/gi, `$1 ${REDACTED_VALUE}`);
  for (const secret of extraSecrets) {
    if (typeof secret === "string" && secret.length > 0) {
      scrubbed = scrubbed.split(secret).join(REDACTED_VALUE);
    }
  }
  return scrubbed;
}

export function redactSensitiveData(
  value: unknown,
  extraSecrets: readonly string[] = [],
  seen: WeakSet<object> = new WeakSet(),
): unknown {
  if (typeof value === "string") {
    return scrubSecretsFromText(value, extraSecrets);
  }
  if (value === null || typeof value !== "object") {
    return value;
  }
  if (value instanceof Error) {
    return {
      name: value.name,
      message: scrubSecretsFromText(value.message, extraSecrets),
    };
  }
  if (seen.has(value)) {
    return "[CIRCULAR]";
  }
  seen.add(value);

  if (Array.isArray(value)) {
    return value.map((item) => redactSensitiveData(item, extraSecrets, seen));
  }

  const output: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (SENSITIVE_FIELD_PATTERN.test(key) || SENSITIVE_HEADER_KEYS.has(key.toLowerCase())) {
      output[key] = REDACTED_VALUE;
    } else {
      output[key] = redactSensitiveData(entry, extraSecrets, seen);
    }
  }
  return output;
}

export function redactHeaders(
  headers: Headers | Record<string, string | string[] | undefined>,
  extraSecrets: readonly string[] = [],
): Record<string, string> {
  const redacted: Record<string, string> = {};
  const entries: Array<[string, string]> = [];

  if (headers instanceof Headers) {
    headers.forEach((val, key) => {
      entries.push([key, val]);
    });
  } else {
    for (const [key, val] of Object.entries(headers)) {
      if (val === undefined) continue;
      entries.push([key, Array.isArray(val) ? val.join(", ") : val]);
    }
  }

  for (const [key, val] of entries) {
    const lower = key.toLowerCase();
    if (
      SENSITIVE_HEADER_KEYS.has(lower) ||
      lower.includes("secret") ||
      lower.includes("token") ||
      lower.includes("password")
    ) {
      redacted[lower] = REDACTED_VALUE;
    } else {
      redacted[lower] = scrubSecretsFromText(val, extraSecrets);
    }
  }

  return redacted;
}

function isStrippedIncomingHeader(headerName: string): boolean {
  const lower = headerName.toLowerCase();
  if (STRIPPED_EXACT_HEADERS.has(lower)) {
    return true;
  }
  return STRIPPED_HEADER_PREFIXES.some((prefix) => lower.startsWith(prefix));
}

function iterateIncomingHeaders(
  incoming?: HeadersInit | Record<string, string | string[] | undefined>,
): Array<[string, string]> {
  if (!incoming) return [];
  if (incoming instanceof Headers) {
    const out: Array<[string, string]> = [];
    incoming.forEach((value, key) => out.push([key, value]));
    return out;
  }
  if (Array.isArray(incoming)) {
    return incoming.map(([k, v]) => [String(k), String(v)]);
  }
  const out: Array<[string, string]> = [];
  for (const [key, value] of Object.entries(incoming)) {
    if (value === undefined) continue;
    out.push([key, Array.isArray(value) ? value.join(", ") : value]);
  }
  return out;
}

function resolveTraceHeaders(
  options: ForwardToGatewayOptions,
  incomingEntries: Array<[string, string]>,
): { correlationId: string; traceparent: string } {
  const incomingCorrelation = incomingEntries.find(
    ([key]) => key.toLowerCase() === "x-correlation-id",
  )?.[1];
  const incomingTraceparent = incomingEntries.find(
    ([key]) => key.toLowerCase() === "x-traceparent",
  )?.[1];

  const candidateCorrelation = options.correlationId ?? incomingCorrelation;
  const correlationId = isNonEmptySafeHeaderValue(candidateCorrelation)
    ? candidateCorrelation
    : randomUUID();

  const candidateTraceparent = options.traceparent ?? incomingTraceparent;
  const traceparent =
    typeof candidateTraceparent === "string" &&
    TRACEPARENT_PATTERN.test(candidateTraceparent.trim())
      ? candidateTraceparent.trim()
      : generateW3CTraceparent();

  return { correlationId, traceparent };
}

function validateTargetUrl(gatewayBaseUrl: string, path: string): URL {
  let baseUrl: URL;
  try {
    baseUrl = new URL(gatewayBaseUrl);
  } catch {
    throw new Error("Invalid gatewayBaseUrl: must be a valid http or https URL");
  }

  if (baseUrl.protocol !== "http:" && baseUrl.protocol !== "https:") {
    throw new Error("Invalid gatewayBaseUrl protocol: only http or https is permitted");
  }
  if (baseUrl.username || baseUrl.password) {
    throw new Error("Invalid gatewayBaseUrl: embedded credentials are forbidden");
  }
  if (
    typeof path !== "string" ||
    !path.startsWith("/") ||
    path.startsWith("//") ||
    HEADER_CONTROL_CHARS.test(path)
  ) {
    throw new Error("Invalid gateway path: must be a relative path starting with '/'");
  }

  const normalizedPathOnly = path.split("?")[0]?.split("#")[0] ?? "";
  if (normalizedPathOnly.split("/").some((segment) => segment === "..")) {
    throw new Error("Invalid gateway path: path traversal segments are forbidden");
  }
  if (normalizedPathOnly.startsWith("/internal/")) {
    throw new Error("Invalid gateway path: Portal BFF must not target /internal/ routes directly");
  }

  const basePath = baseUrl.pathname.endsWith("/") ? baseUrl.pathname.slice(0, -1) : baseUrl.pathname;
  const resolved = new URL(`${baseUrl.origin}${basePath}${path}`);
  if (resolved.origin !== baseUrl.origin) {
    throw new Error("Invalid gateway path: target origin mismatch");
  }
  return resolved;
}

function emitTelemetry(
  onTelemetry: ForwardToGatewayOptions["onTelemetry"],
  receipt: GatewayTelemetryReceipt,
): void {
  if (typeof onTelemetry === "function") {
    onTelemetry(receipt);
  }
}

function isTimeoutError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  if (error.name === "TimeoutError" || error.name === "AbortError") {
    return true;
  }
  const errWithCode = error as Error & { code?: unknown };
  return errWithCode.code === "ABORT_ERR" || errWithCode.code === "ETIMEDOUT";
}

export async function forwardToGateway<T = unknown>(
  options: ForwardToGatewayOptions,
): Promise<GatewayForwardResult<T>> {
  const startTime = Date.now();
  const method = options.method ?? "GET";
  const incomingEntries = iterateIncomingHeaders(options.incomingHeaders);
  const { correlationId, traceparent } = resolveTraceHeaders(options, incomingEntries);
  const rawSecret = typeof options.config?.serviceSecret === "string" ? options.config.serviceSecret : "";
  const extraSecrets = rawSecret ? [rawSecret] : [];

  const makeReceipt = (
    partial: Partial<GatewayTelemetryReceipt> & Pick<GatewayTelemetryReceipt, "outcome">,
  ): GatewayTelemetryReceipt => ({
    correlationId,
    traceparent,
    method,
    path: typeof options.path === "string" ? options.path : "",
    targetOrigin: partial.targetOrigin ?? "",
    tenantId: isNonEmptySafeHeaderValue(options.principal?.tenantId) ? options.principal.tenantId : "",
    sessionId: isNonEmptySafeHeaderValue(options.principal?.sessionId)
      ? options.principal.sessionId
      : "",
    role: isNonEmptySafeHeaderValue(options.principal?.role) ? options.principal.role : "",
    statusCode: partial.statusCode ?? null,
    durationMs: Math.max(0, Date.now() - startTime),
    outcome: partial.outcome,
    requestHeaders: partial.requestHeaders ?? {},
    responseHeaders: partial.responseHeaders ?? {},
    ...(partial.errorCode ? { errorCode: partial.errorCode } : {}),
    ...(partial.errorMessage
      ? { errorMessage: scrubSecretsFromText(partial.errorMessage, extraSecrets) }
      : {}),
  });

  if (typeof globalThis.window !== "undefined") {
    const receipt = makeReceipt({
      outcome: "config_error",
      errorCode: "GATEWAY_CONFIGURATION_ERROR",
      errorMessage: "gateway-transport is server-only and cannot execute in a browser runtime",
    });
    emitTelemetry(options.onTelemetry, receipt);
    throw new GatewayConfigurationError(receipt.errorMessage ?? "Server-only boundary violation", {
      correlationId,
      traceparent,
      telemetry: receipt,
    });
  }

  const timeoutMs = options.config?.timeoutMs ?? DEFAULT_GATEWAY_TIMEOUT_MS;
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs <= 0) {
    const receipt = makeReceipt({
      outcome: "config_error",
      errorCode: "GATEWAY_CONFIGURATION_ERROR",
      errorMessage: "Invalid gateway timeoutMs: must be a positive safe integer",
    });
    emitTelemetry(options.onTelemetry, receipt);
    throw new GatewayConfigurationError(receipt.errorMessage ?? "Invalid gateway timeoutMs", {
      correlationId,
      traceparent,
      telemetry: receipt,
    });
  }

  if (!isNonEmptySafeHeaderValue(rawSecret)) {
    const receipt = makeReceipt({
      outcome: "config_error",
      errorCode: "GATEWAY_CONFIGURATION_ERROR",
      errorMessage: "Invalid gateway serviceSecret: must be a non-empty safe string",
    });
    emitTelemetry(options.onTelemetry, receipt);
    throw new GatewayConfigurationError(receipt.errorMessage ?? "Invalid gateway serviceSecret", {
      correlationId,
      traceparent,
      telemetry: receipt,
    });
  }

  if (
    !options.principal ||
    !isNonEmptySafeHeaderValue(options.principal.tenantId) ||
    !isNonEmptySafeHeaderValue(options.principal.sessionId) ||
    !isNonEmptySafeHeaderValue(options.principal.role)
  ) {
    const receipt = makeReceipt({
      outcome: "config_error",
      errorCode: "GATEWAY_CONFIGURATION_ERROR",
      errorMessage:
        "Invalid server principal context: tenantId, sessionId, and role are required",
    });
    emitTelemetry(options.onTelemetry, receipt);
    throw new GatewayConfigurationError(receipt.errorMessage ?? "Invalid server principal context", {
      correlationId,
      traceparent,
      telemetry: receipt,
    });
  }

  let targetUrl: URL;
  try {
    targetUrl = validateTargetUrl(options.config.gatewayBaseUrl, options.path);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid gateway target configuration";
    const receipt = makeReceipt({
      outcome: "config_error",
      errorCode: "GATEWAY_CONFIGURATION_ERROR",
      errorMessage: message,
    });
    emitTelemetry(options.onTelemetry, receipt);
    throw new GatewayConfigurationError(scrubSecretsFromText(message, extraSecrets), {
      correlationId,
      traceparent,
      telemetry: receipt,
      cause: err,
    });
  }

  const outboundHeaders = new Headers();
  for (const [key, value] of incomingEntries) {
    if (isStrippedIncomingHeader(key)) {
      continue;
    }
    if (HEADER_CONTROL_CHARS.test(key) || HEADER_CONTROL_CHARS.test(value)) {
      continue;
    }
    outboundHeaders.set(key, value);
  }

  if (isNonEmptySafeHeaderValue(options.idempotencyKey)) {
    outboundHeaders.set("Idempotency-Key", options.idempotencyKey);
  }
  if (isNonEmptySafeHeaderValue(options.locale)) {
    outboundHeaders.set("Accept-Language", options.locale);
  }

  // Server-derived authoritative headers overwrite any client-supplied equivalents.
  outboundHeaders.set("X-Correlation-Id", correlationId);
  outboundHeaders.set("X-Traceparent", traceparent);
  outboundHeaders.set("X-Tenant-Id", options.principal.tenantId);
  outboundHeaders.set("X-Session-Id", options.principal.sessionId);
  outboundHeaders.set("X-Role", options.principal.role);
  outboundHeaders.set("Authorization", `Bearer ${rawSecret}`);

  let requestBody: BodyInit | undefined;
  if (options.body !== undefined && options.body !== null) {
    if (
      typeof options.body === "string" ||
      options.body instanceof ArrayBuffer ||
      ArrayBuffer.isView(options.body) ||
      options.body instanceof URLSearchParams ||
      options.body instanceof Blob ||
      options.body instanceof FormData ||
      options.body instanceof ReadableStream
    ) {
      requestBody = options.body;
    } else {
      requestBody = JSON.stringify(options.body);
      if (!outboundHeaders.has("content-type")) {
        outboundHeaders.set("Content-Type", "application/json");
      }
    }
  }

  const redactedRequestHeaders = redactHeaders(outboundHeaders, extraSecrets);

  let response: Response;
  try {
    response = await globalThis.fetch(targetUrl.toString(), {
      method,
      headers: outboundHeaders,
      body: requestBody,
      cache: "no-store",
      redirect: "manual",
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (err) {
    if (isTimeoutError(err)) {
      const safeMessage = `Gateway request timed out after ${timeoutMs}ms`;
      const receipt = makeReceipt({
        targetOrigin: targetUrl.origin,
        outcome: "timeout",
        statusCode: 504,
        requestHeaders: redactedRequestHeaders,
        errorCode: "GATEWAY_TIMEOUT",
        errorMessage: safeMessage,
      });
      emitTelemetry(options.onTelemetry, receipt);
      throw new GatewayTimeoutError(safeMessage, {
        timeoutMs,
        correlationId,
        traceparent,
        telemetry: receipt,
        cause: err,
      });
    }

    const rawErrMessage = err instanceof Error ? err.message : "Gateway transport request failed";
    const safeMessage = scrubSecretsFromText(rawErrMessage, extraSecrets);
    const receipt = makeReceipt({
      targetOrigin: targetUrl.origin,
      outcome: "transport_error",
      statusCode: 502,
      requestHeaders: redactedRequestHeaders,
      errorCode: "GATEWAY_UPSTREAM_ERROR",
      errorMessage: safeMessage,
    });
    emitTelemetry(options.onTelemetry, receipt);
    throw new GatewayUpstreamError(safeMessage, {
      statusCode: 502,
      correlationId,
      traceparent,
      telemetry: receipt,
      cause: err,
    });
  }

  const rawBody = await response.text();
  let parsedData: unknown = rawBody;
  if (rawBody.length > 0) {
    const contentType = response.headers.get("content-type") ?? "";
    if (contentType.includes("application/json") || contentType.includes("application/problem+json")) {
      try {
        parsedData = JSON.parse(rawBody);
      } catch {
        parsedData = rawBody;
      }
    }
  } else {
    parsedData = null;
  }

  const redactedResponseHeaders = redactHeaders(response.headers, extraSecrets);
  const receipt = makeReceipt({
    targetOrigin: targetUrl.origin,
    statusCode: response.status,
    outcome: response.ok ? "success" : "upstream_error",
    requestHeaders: redactedRequestHeaders,
    responseHeaders: redactedResponseHeaders,
    ...(!response.ok
      ? {
          errorCode: "GATEWAY_UPSTREAM_HTTP_ERROR",
          errorMessage: `Upstream gateway returned status ${response.status}`,
        }
      : {}),
  });
  emitTelemetry(options.onTelemetry, receipt);

  return {
    ok: response.ok,
    status: response.status,
    headers: redactedResponseHeaders,
    data: parsedData as T,
    rawBody,
    correlationId,
    traceparent,
    telemetry: receipt,
  };
}
