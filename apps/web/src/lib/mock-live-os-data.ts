export type Role = "HOST" | "LIVE_OPS";
export type SessionStatus = "scheduled" | "live" | "ended" | "paused";
export type PromotionStatus = "proposed" | "pending" | "approved" | "rejected" | "issued" | "expired" | "cancelled" | "unknown";
export type PromotionType = "FLASH_VOUCHER" | "PRODUCT_PIN";

export type MockOverview = {
  session_id: string;
  status: SessionStatus;
  top_products: { product_id: string; name: string; interest_count: number; stock_status: "available" | "low" | "out_of_stock" | "unknown" }[];
  host_alerts: { alert_id: string; severity: "info" | "warning" | "high" | "critical"; message: string }[];
  copilot: { suggestion_id: string; text: string; status: "pending" | "approved" | "edited" | "dismissed" };
};

export type MockPromotion = {
  promotion_id: string;
  session_id: string;
  product_id: string;
  status: PromotionStatus;
  resource_version: number;
  discount_percent?: number;
  margin_percent?: number | null;
  policy_revision?: string | null;
  action_id?: string | null;
  mode: "SIMULATED" | "SANDBOX" | "CONFIRMED";
  schema_version: "1.0.0";
  correlation_id: string;
  causation_id: string | null;
  actor_ref: string | null;
  capability: "promotion.propose" | "promotion.approve" | "promotion.cancel" | null;
  idempotency_fingerprint: string | null;
  read_model: {
    authoritative_state: PromotionStatus;
    projection_status: "current" | "stale" | "unknown" | "missing";
    projected_resource_version: number | null;
    version_lag: number | null;
    reconciliation: {
      status: "not_required" | "pending" | "in_progress" | "reconciled" | "blocked";
      required: boolean;
      last_reconciled_resource_version: number | null;
      last_reconciled_at: string | null;
    };
  };
};

export type MockEvent = {
  event_id: string;
  event_type: string;
  schema_version: string;
  session_id: string;
  correlation_id: string;
  sequence: number;
  occurred_at: string;
  mode: "SIMULATED" | "SANDBOX" | "CONFIRMED";
  data: Record<string, unknown>;
};

export type MockReceipt = {
  action_id: string;
  aggregate_id: string;
  status: "requested" | "accepted" | "pending" | "succeeded" | "failed" | "unknown" | "reconciled";
  correlation_id: string;
  occurred_at: string;
  actor_ref: string | null;
  policy_revision: string | null;
  mode: "SIMULATED" | "SANDBOX" | "CONFIRMED";
  evidence_id: string | null;
};

export const demoOverview: MockOverview = {
  session_id: "session-demo-001",
  status: "live",
  top_products: [
    { product_id: "cream-001", name: "Cloud Barrier Cream", interest_count: 428, stock_status: "available" },
    { product_id: "serum-002", name: "Dew Reset Serum", interest_count: 216, stock_status: "low" },
    { product_id: "cleanser-003", name: "Soft Melt Cleanser", interest_count: 138, stock_status: "available" },
  ],
  host_alerts: [
    { alert_id: "alert-demo-01", severity: "warning", message: "ผู้ชมกำลังถามหาโปรโมชันครีม" },
  ],
  copilot: {
    suggestion_id: "suggestion-demo-01",
    text: "ชวนผู้ชมรอติดตามโปรโมชันครีมระหว่างสาธิตเนื้อผลิตภัณฑ์",
    status: "pending",
  },
};

export const demoPromotion: MockPromotion = {
  promotion_id: "promo-demo-001",
  session_id: demoOverview.session_id,
  product_id: "cream-001",
  status: "pending",
  resource_version: 2,
  discount_percent: 15,
  margin_percent: null,
  policy_revision: "policy-demo-v1",
  action_id: null,
  mode: "SIMULATED",
  schema_version: "1.0.0",
  correlation_id: "corr-demo-001",
  causation_id: "event-demo-001",
  actor_ref: "actor-demo-ops",
  capability: "promotion.approve",
  idempotency_fingerprint: null,
  read_model: {
    authoritative_state: "pending",
    projection_status: "current",
    projected_resource_version: 2,
    version_lag: 0,
    reconciliation: {
      status: "not_required",
      required: false,
      last_reconciled_resource_version: 2,
      last_reconciled_at: "2026-11-21T09:00:00.000Z",
    },
  },
};

export const demoTopics = [
  { label: "ขอโปรครีม", count: 84, tone: "warm" },
  { label: "มีส่วนลดไหม", count: 61, tone: "neutral" },
  { label: "ซื้อครีมช่วงไลฟ์", count: 43, tone: "neutral" },
] as const;

export const demoChat = [
  { id: "chat-001", name: "Mina", text: "Is this suitable for sensitive skin?" },
  { id: "chat-002", name: "Kai", text: "Can I use it after the Dew Reset Serum?" },
  { id: "chat-003", name: "Fern", text: "Does the cream have any fragrance?" },
] as const;

export const initialEvents: MockEvent[] = [
  {
    event_id: "event-demo-001",
    event_type: "promotion.proposed",
    schema_version: "1.0.0",
    session_id: demoOverview.session_id,
    correlation_id: "corr-demo-001",
    sequence: 18,
    occurred_at: "2026-11-21T09:00:00.000Z",
    mode: "SIMULATED",
    data: { promotion_id: demoPromotion.promotion_id, status: "pending", resource_version: 2 },
  },
  {
    event_id: "event-demo-002",
    event_type: "audience.question_received",
    schema_version: "1.0.0",
    session_id: demoOverview.session_id,
    correlation_id: "corr-demo-002",
    sequence: 17,
    occurred_at: "2026-11-21T08:59:30.000Z",
    mode: "SIMULATED",
    data: { question: "Does the cream have any fragrance?" },
  },
];

export const initialReceipts: MockReceipt[] = [
  {
    action_id: "action-demo-001",
    aggregate_id: demoPromotion.promotion_id,
    status: "pending",
    correlation_id: "corr-demo-001",
    occurred_at: "2026-11-21T09:00:00.000Z",
    actor_ref: "actor-demo-ops",
    policy_revision: "policy-demo-v1",
    mode: "SIMULATED",
    evidence_id: "evidence-demo-001",
  },
];
