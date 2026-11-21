# Subagent Briefing: G-MARG-002

## Objective
Author the PostgreSQL schema and migration scripts for `margin-policy-service` under `code/services/margin-policy-service/migrations/`.

## Tables to Create (Per SOT in docs/03-architecture/api/services/margin-policy-service.md)
1. **`margin_policies`:**
   - `policy_id` UUID PRIMARY KEY
   - `tenant_id` VARCHAR(64) NOT NULL
   - `policy_name` VARCHAR(128) NOT NULL
   - `version` INTEGER NOT NULL DEFAULT 1
   - `floor_bps` INTEGER NOT NULL CHECK (floor_bps >= 0 AND floor_bps <= 10000) (e.g. 1000 = 10%)
   - `auto_approve_threshold_minor` BIGINT NOT NULL CHECK (auto_approve_threshold_minor >= 0)
   - `currency` VARCHAR(3) NOT NULL (ISO 4217 e.g. THB, USD)
   - `scale` SMALLINT NOT NULL DEFAULT 2
   - `is_active` BOOLEAN NOT NULL DEFAULT TRUE
   - `created_at` TIMESTAMPTZ NOT NULL DEFAULT NOW()
   - `updated_at` TIMESTAMPTZ NOT NULL DEFAULT NOW()
   - UNIQUE (tenant_id, policy_name, version)

2. **`margin_verdicts`:**
   - `verdict_id` UUID PRIMARY KEY
   - `tenant_id` VARCHAR(64) NOT NULL
   - `live_session_id` VARCHAR(64) NOT NULL
   - `product_id` VARCHAR(64) NOT NULL
   - `sku` VARCHAR(64) NOT NULL
   - `policy_id` UUID NOT NULL REFERENCES margin_policies(policy_id)
   - `policy_version` INTEGER NOT NULL
   - `status` VARCHAR(32) NOT NULL (APPROVED, NEEDS_APPROVAL, REJECTED, UNKNOWN)
   - `price_minor` BIGINT NOT NULL CHECK (price_minor >= 0)
   - `candidate_discount_minor` BIGINT NOT NULL CHECK (candidate_discount_minor >= 0)
   - `cogs_minor` BIGINT NOT NULL CHECK (cogs_minor >= 0)
   - `platform_fee_minor` BIGINT NOT NULL CHECK (platform_fee_minor >= 0)
   - `shipping_fee_minor` BIGINT NOT NULL CHECK (shipping_fee_minor >= 0)
   - `net_margin_minor` BIGINT NOT NULL
   - `margin_bps` INTEGER NOT NULL
   - `floor_bps` INTEGER NOT NULL
   - `safer_alternative_discount_minor` BIGINT
   - `safer_alternative_margin_bps` INTEGER
   - `currency` VARCHAR(3) NOT NULL
   - `scale` SMALLINT NOT NULL DEFAULT 2
   - `idempotency_key` VARCHAR(128) NOT NULL
   - `correlation_id` VARCHAR(128) NOT NULL
   - `causation_id` VARCHAR(128)
   - `created_at` TIMESTAMPTZ NOT NULL DEFAULT NOW()
   - UNIQUE (tenant_id, idempotency_key)

3. **`margin_outbox`:**
   - `id` BIGSERIAL PRIMARY KEY
   - `event_id` UUID NOT NULL UNIQUE
   - `tenant_id` VARCHAR(64) NOT NULL
   - `subject` VARCHAR(128) NOT NULL
   - `payload` JSONB NOT NULL
   - `headers` JSONB NOT NULL
   - `status` VARCHAR(32) NOT NULL DEFAULT 'PENDING'
   - `retry_count` INTEGER NOT NULL DEFAULT 0
   - `created_at` TIMESTAMPTZ NOT NULL DEFAULT NOW()
   - `published_at` TIMESTAMPTZ

4. **`margin_inbox`:**
   - `id` BIGSERIAL PRIMARY KEY
   - `message_id` VARCHAR(128) NOT NULL UNIQUE
   - `tenant_id` VARCHAR(64) NOT NULL
   - `subject` VARCHAR(128) NOT NULL
   - `payload` JSONB NOT NULL
   - `status` VARCHAR(32) NOT NULL DEFAULT 'RECEIVED'
   - `created_at` TIMESTAMPTZ NOT NULL DEFAULT NOW()
   - `processed_at` TIMESTAMPTZ

5. **`margin_idempotency_records`:**
   - `idempotency_key` VARCHAR(128) NOT NULL
   - `tenant_id` VARCHAR(64) NOT NULL
   - `request_hash` VARCHAR(64) NOT NULL
   - `response_payload` JSONB NOT NULL
   - `status_code` INTEGER NOT NULL DEFAULT 200
   - `created_at` TIMESTAMPTZ NOT NULL DEFAULT NOW()
   - PRIMARY KEY (tenant_id, idempotency_key)

Also provide up migration `001_create_margin_tables.up.sql` and down migration `001_create_margin_tables.down.sql` with RLS policies (`ENABLE ROW LEVEL SECURITY`) and index coverage.
