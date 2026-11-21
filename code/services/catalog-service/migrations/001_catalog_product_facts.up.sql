-- G-CATA-002 (reconciling G-CORE-074): authoritative, tenant-scoped catalog persistence.
-- Single authoritative writer: catalog-service.
-- Every application transaction must set app.tenant_id via set_config('app.tenant_id', $1, true).

CREATE SCHEMA IF NOT EXISTS catalog;
REVOKE ALL ON SCHEMA catalog FROM PUBLIC;

-- 1. Aggregate root / head state for optimistic locking and current lifecycle state.
CREATE TABLE IF NOT EXISTS catalog.product_aggregates (
    tenant_id text NOT NULL CHECK (length(tenant_id) BETWEEN 1 AND 128),
    product_id text NOT NULL CHECK (length(product_id) BETWEEN 1 AND 128),
    sku text NOT NULL CHECK (length(sku) BETWEEN 1 AND 128),
    catalog_version text NOT NULL CHECK (length(catalog_version) BETWEEN 1 AND 128),
    current_revision bigint NOT NULL CHECK (current_revision >= 1),
    version bigint NOT NULL CHECK (version >= 1),
    status text NOT NULL CHECK (status IN ('draft', 'approved', 'stale', 'withdrawn')),
    freshness_state text NOT NULL CHECK (freshness_state IN ('fresh', 'stale', 'unknown')),
    freshness_expires_at timestamptz NOT NULL,
    correlation_id text NOT NULL CHECK (length(correlation_id) BETWEEN 1 AND 128),
    causation_id text CHECK (causation_id IS NULL OR length(causation_id) BETWEEN 1 AND 128),
    traceparent text NOT NULL CHECK (length(traceparent) BETWEEN 1 AND 128),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (tenant_id, product_id, sku, catalog_version),
    CHECK (version = current_revision),
    CHECK (status <> 'approved' OR freshness_state IN ('fresh', 'stale')),
    CHECK (status <> 'stale' OR freshness_state = 'stale'),
    CHECK (status <> 'withdrawn' OR freshness_state IN ('stale', 'unknown'))
);

CREATE INDEX IF NOT EXISTS product_aggregates_tenant_status_freshness_idx
    ON catalog.product_aggregates (tenant_id, status, freshness_state, freshness_expires_at);
CREATE INDEX IF NOT EXISTS product_aggregates_tenant_version_updated_idx
    ON catalog.product_aggregates (tenant_id, catalog_version, updated_at DESC);

-- 2. Append-only, versioned product fact revisions.
CREATE TABLE IF NOT EXISTS catalog.product_facts (
    tenant_id text NOT NULL CHECK (length(tenant_id) BETWEEN 1 AND 128),
    product_id text NOT NULL CHECK (length(product_id) BETWEEN 1 AND 128),
    sku text NOT NULL CHECK (length(sku) BETWEEN 1 AND 128),
    catalog_version text NOT NULL CHECK (length(catalog_version) BETWEEN 1 AND 128),
    fact_revision bigint NOT NULL CHECK (fact_revision >= 1),
    version bigint NOT NULL CHECK (version >= 1 AND version = fact_revision),
    status text NOT NULL CHECK (status IN ('draft', 'approved', 'stale', 'withdrawn')),
    freshness_state text NOT NULL CHECK (freshness_state IN ('fresh', 'stale', 'unknown')),
    freshness_expires_at timestamptz NOT NULL,
    name text NOT NULL CHECK (length(name) BETWEEN 1 AND 256),
    size text NOT NULL CHECK (length(size) BETWEEN 1 AND 128),
    selling_points jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(selling_points) = 'array'),
    usage text NOT NULL CHECK (length(usage) BETWEEN 1 AND 2000),
    price_minor bigint NOT NULL CHECK (price_minor >= 0),
    currency char(3) NOT NULL CHECK (currency ~ '^[A-Z]{3}$'),
    currency_scale smallint NOT NULL DEFAULT 2 CHECK (currency_scale BETWEEN 0 AND 4),
    stock_display bigint NOT NULL CHECK (stock_display >= 0),
    approved_claims jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(approved_claims) = 'array'),
    evidence_ids jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(evidence_ids) = 'array'),
    mode text NOT NULL DEFAULT 'CONFIRMED' CHECK (mode IN ('SIMULATED', 'SANDBOX', 'CONFIRMED')),
    actor_id text NOT NULL CHECK (length(actor_id) BETWEEN 1 AND 128),
    correlation_id text NOT NULL CHECK (length(correlation_id) BETWEEN 1 AND 128),
    causation_id text CHECK (causation_id IS NULL OR length(causation_id) BETWEEN 1 AND 128),
    traceparent text NOT NULL CHECK (length(traceparent) BETWEEN 1 AND 128),
    idempotency_key text NOT NULL CHECK (length(idempotency_key) BETWEEN 1 AND 256),
    transition_reason text CHECK (transition_reason IS NULL OR length(transition_reason) BETWEEN 1 AND 500),
    correction_of_revision bigint,
    occurred_at timestamptz NOT NULL DEFAULT now(),
    created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (tenant_id, product_id, sku, catalog_version, fact_revision),
    UNIQUE (tenant_id, idempotency_key),
    FOREIGN KEY (tenant_id, product_id, sku, catalog_version)
        REFERENCES catalog.product_aggregates (tenant_id, product_id, sku, catalog_version),
    CHECK (correction_of_revision IS NULL OR correction_of_revision < fact_revision),
    CHECK (status <> 'approved' OR freshness_state IN ('fresh', 'stale')),
    CHECK (status <> 'stale' OR freshness_state = 'stale'),
    CHECK (status <> 'withdrawn' OR freshness_state IN ('stale', 'unknown'))
);

CREATE INDEX IF NOT EXISTS product_facts_tenant_product_idx
    ON catalog.product_facts (tenant_id, product_id, sku, catalog_version, fact_revision DESC);
CREATE INDEX IF NOT EXISTS product_facts_tenant_status_freshness_idx
    ON catalog.product_facts (tenant_id, status, freshness_state, freshness_expires_at);
CREATE INDEX IF NOT EXISTS product_facts_tenant_revision_idx
    ON catalog.product_facts (tenant_id, catalog_version, fact_revision DESC);

-- 3. Append-only lifecycle state transition history.
CREATE TABLE IF NOT EXISTS catalog.product_state_history (
    history_id uuid NOT NULL DEFAULT gen_random_uuid(),
    tenant_id text NOT NULL CHECK (length(tenant_id) BETWEEN 1 AND 128),
    product_id text NOT NULL CHECK (length(product_id) BETWEEN 1 AND 128),
    sku text NOT NULL CHECK (length(sku) BETWEEN 1 AND 128),
    catalog_version text NOT NULL CHECK (length(catalog_version) BETWEEN 1 AND 128),
    fact_revision bigint NOT NULL CHECK (fact_revision >= 1),
    from_status text CHECK (from_status IS NULL OR from_status IN ('draft', 'approved', 'stale', 'withdrawn')),
    to_status text NOT NULL CHECK (to_status IN ('draft', 'approved', 'stale', 'withdrawn')),
    transition_reason text CHECK (transition_reason IS NULL OR length(transition_reason) BETWEEN 1 AND 500),
    actor_id text NOT NULL CHECK (length(actor_id) BETWEEN 1 AND 128),
    correlation_id text NOT NULL CHECK (length(correlation_id) BETWEEN 1 AND 128),
    causation_id text CHECK (causation_id IS NULL OR length(causation_id) BETWEEN 1 AND 128),
    traceparent text NOT NULL CHECK (length(traceparent) BETWEEN 1 AND 128),
    idempotency_key text NOT NULL CHECK (length(idempotency_key) BETWEEN 1 AND 256),
    occurred_at timestamptz NOT NULL DEFAULT now(),
    created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (tenant_id, product_id, sku, catalog_version, fact_revision),
    UNIQUE (history_id),
    FOREIGN KEY (tenant_id, product_id, sku, catalog_version, fact_revision)
        REFERENCES catalog.product_facts (tenant_id, product_id, sku, catalog_version, fact_revision),
    CHECK (
        (from_status IS NULL AND fact_revision = 1 AND to_status = 'draft')
        OR (from_status = 'draft' AND to_status IN ('draft', 'approved'))
        OR (from_status = 'approved' AND to_status IN ('approved', 'stale', 'withdrawn'))
        OR (from_status = 'stale' AND to_status IN ('approved', 'withdrawn'))
    )
);

CREATE INDEX IF NOT EXISTS product_state_history_tenant_occurred_idx
    ON catalog.product_state_history (tenant_id, product_id, sku, occurred_at DESC);

-- 4. Transactional Outbox for post-commit JetStream publication.
CREATE TABLE IF NOT EXISTS catalog.catalog_outbox (
    outbox_id uuid PRIMARY KEY,
    tenant_id text NOT NULL CHECK (length(tenant_id) BETWEEN 1 AND 128),
    aggregate_type text NOT NULL CHECK (length(aggregate_type) BETWEEN 1 AND 64),
    aggregate_id text NOT NULL CHECK (length(aggregate_id) BETWEEN 1 AND 256),
    ordering_key text NOT NULL CHECK (length(ordering_key) BETWEEN 1 AND 256),
    subject text NOT NULL CHECK (length(subject) BETWEEN 1 AND 256),
    event_type text NOT NULL CHECK (length(event_type) BETWEEN 1 AND 128),
    schema_version text NOT NULL DEFAULT '1.0.0' CHECK (length(schema_version) BETWEEN 1 AND 32),
    payload jsonb NOT NULL CHECK (jsonb_typeof(payload) = 'object'),
    headers jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(headers) = 'object'),
    correlation_id text NOT NULL CHECK (length(correlation_id) BETWEEN 1 AND 128),
    causation_id text CHECK (causation_id IS NULL OR length(causation_id) BETWEEN 1 AND 128),
    traceparent text NOT NULL CHECK (length(traceparent) BETWEEN 1 AND 128),
    idempotency_key text NOT NULL CHECK (length(idempotency_key) BETWEEN 1 AND 256),
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'published', 'dlq')),
    attempt_count integer NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
    next_attempt_at timestamptz NOT NULL DEFAULT now(),
    last_error text,
    occurred_at timestamptz NOT NULL DEFAULT now(),
    created_at timestamptz NOT NULL DEFAULT now(),
    published_at timestamptz,
    UNIQUE (tenant_id, idempotency_key, event_type),
    CHECK ((status = 'published') = (published_at IS NOT NULL))
);

CREATE INDEX IF NOT EXISTS catalog_outbox_pending_dispatch_idx
    ON catalog.catalog_outbox (status, next_attempt_at, created_at)
    WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS catalog_outbox_tenant_created_idx
    ON catalog.catalog_outbox (tenant_id, created_at DESC);

-- 5. Transactional Inbox for duplicate-safe inbound message deduplication.
CREATE TABLE IF NOT EXISTS catalog.catalog_inbox (
    tenant_id text NOT NULL CHECK (length(tenant_id) BETWEEN 1 AND 128),
    message_id text NOT NULL CHECK (length(message_id) BETWEEN 1 AND 256),
    subject text NOT NULL CHECK (length(subject) BETWEEN 1 AND 256),
    producer text NOT NULL CHECK (length(producer) BETWEEN 1 AND 128),
    correlation_id text NOT NULL CHECK (length(correlation_id) BETWEEN 1 AND 128),
    causation_id text CHECK (causation_id IS NULL OR length(causation_id) BETWEEN 1 AND 128),
    traceparent text NOT NULL CHECK (length(traceparent) BETWEEN 1 AND 128),
    payload_hash bytea NOT NULL CHECK (octet_length(payload_hash) = 32),
    status text NOT NULL DEFAULT 'received' CHECK (status IN ('received', 'processed', 'dlq')),
    processed_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (tenant_id, message_id),
    CHECK ((status = 'processed') = (processed_at IS NOT NULL))
);

CREATE INDEX IF NOT EXISTS catalog_inbox_tenant_status_idx
    ON catalog.catalog_inbox (tenant_id, status, created_at DESC);

-- 6. Command Idempotency Ledger (tenant + actor + operation + Idempotency-Key).
CREATE TABLE IF NOT EXISTS catalog.catalog_idempotency (
    tenant_id text NOT NULL CHECK (length(tenant_id) BETWEEN 1 AND 128),
    actor_id text NOT NULL CHECK (length(actor_id) BETWEEN 1 AND 128),
    operation text NOT NULL CHECK (length(operation) BETWEEN 1 AND 128),
    idempotency_key text NOT NULL CHECK (length(idempotency_key) BETWEEN 1 AND 256),
    request_fingerprint bytea NOT NULL CHECK (octet_length(request_fingerprint) = 32),
    state text NOT NULL CHECK (state IN ('accepted', 'pending', 'succeeded', 'rejected', 'failed', 'unknown')),
    response_status integer CHECK (response_status IS NULL OR response_status BETWEEN 100 AND 599),
    response_payload jsonb CHECK (response_payload IS NULL OR jsonb_typeof(response_payload) = 'object'),
    resource_id text CHECK (resource_id IS NULL OR length(resource_id) BETWEEN 1 AND 256),
    resource_version bigint CHECK (resource_version IS NULL OR resource_version >= 1),
    correlation_id text NOT NULL CHECK (length(correlation_id) BETWEEN 1 AND 128),
    causation_id text CHECK (causation_id IS NULL OR length(causation_id) BETWEEN 1 AND 128),
    expires_at timestamptz NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (tenant_id, actor_id, operation, idempotency_key),
    CHECK (expires_at > created_at)
);

CREATE INDEX IF NOT EXISTS catalog_idempotency_expires_idx
    ON catalog.catalog_idempotency (tenant_id, expires_at);

-- Aggregate optimistic locking and lifecycle transition guard.
CREATE OR REPLACE FUNCTION catalog.enforce_aggregate_optimistic_lock()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        RAISE EXCEPTION 'catalog product aggregates cannot be deleted; transition status to withdrawn';
    END IF;

    IF NEW.tenant_id <> OLD.tenant_id
       OR NEW.product_id <> OLD.product_id
       OR NEW.sku <> OLD.sku
       OR NEW.catalog_version <> OLD.catalog_version THEN
        RAISE EXCEPTION 'catalog aggregate identity cannot be modified';
    END IF;

    IF NEW.version <> OLD.version + 1 OR NEW.current_revision <> OLD.current_revision + 1 THEN
        RAISE EXCEPTION 'optimistic lock conflict: expected version %, got %', OLD.version, NEW.version;
    END IF;

    IF OLD.status = 'withdrawn' THEN
        RAISE EXCEPTION 'catalog fact status withdrawn is terminal; cannot transition to %', NEW.status;
    ELSIF OLD.status = 'draft' AND NEW.status NOT IN ('draft', 'approved') THEN
        RAISE EXCEPTION 'invalid catalog status transition from % to %', OLD.status, NEW.status;
    ELSIF OLD.status = 'approved' AND NEW.status NOT IN ('approved', 'stale', 'withdrawn') THEN
        RAISE EXCEPTION 'invalid catalog status transition from % to %', OLD.status, NEW.status;
    ELSIF OLD.status = 'stale' AND NEW.status NOT IN ('approved', 'withdrawn') THEN
        RAISE EXCEPTION 'invalid catalog status transition from % to %', OLD.status, NEW.status;
    END IF;

    NEW.updated_at := now();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS product_aggregates_optimistic_lock ON catalog.product_aggregates;
CREATE TRIGGER product_aggregates_optimistic_lock
    BEFORE UPDATE OR DELETE ON catalog.product_aggregates
    FOR EACH ROW EXECUTE FUNCTION catalog.enforce_aggregate_optimistic_lock();

-- Monotonic revision & status transition guard on append-only product_facts.
CREATE OR REPLACE FUNCTION catalog.enforce_monotonic_fact_revision()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    latest_revision bigint;
    latest_status text;
BEGIN
    PERFORM pg_advisory_xact_lock(
        hashtextextended(
            concat_ws(':', NEW.tenant_id, NEW.product_id, NEW.sku, NEW.catalog_version),
            0
        )
    );
    SELECT fact_revision, status
      INTO latest_revision, latest_status
      FROM catalog.product_facts
     WHERE tenant_id = NEW.tenant_id
       AND product_id = NEW.product_id
       AND sku = NEW.sku
       AND catalog_version = NEW.catalog_version
     ORDER BY fact_revision DESC
     LIMIT 1;

    IF latest_revision IS NULL THEN
        IF NEW.fact_revision <> 1 THEN
            RAISE EXCEPTION 'first catalog fact revision must be 1';
        END IF;
        IF NEW.status <> 'draft' THEN
            RAISE EXCEPTION 'initial catalog fact status must be draft, got %', NEW.status;
        END IF;
    ELSE
        IF NEW.fact_revision <> latest_revision + 1 THEN
            RAISE EXCEPTION 'catalog fact revision must advance monotonically from %', latest_revision;
        END IF;
        IF latest_status = 'withdrawn' THEN
            RAISE EXCEPTION 'catalog fact status withdrawn is terminal; cannot transition to %', NEW.status;
        ELSIF latest_status = 'draft' AND NEW.status NOT IN ('draft', 'approved') THEN
            RAISE EXCEPTION 'invalid catalog status transition from % to %', latest_status, NEW.status;
        ELSIF latest_status = 'approved' AND NEW.status NOT IN ('approved', 'stale', 'withdrawn') THEN
            RAISE EXCEPTION 'invalid catalog status transition from % to %', latest_status, NEW.status;
        ELSIF latest_status = 'stale' AND NEW.status NOT IN ('approved', 'withdrawn') THEN
            RAISE EXCEPTION 'invalid catalog status transition from % to %', latest_status, NEW.status;
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS product_facts_monotonic_revision ON catalog.product_facts;
CREATE TRIGGER product_facts_monotonic_revision
    BEFORE INSERT ON catalog.product_facts
    FOR EACH ROW EXECUTE FUNCTION catalog.enforce_monotonic_fact_revision();

-- Automatic state history recording after each fact revision insert.
CREATE OR REPLACE FUNCTION catalog.record_product_state_history()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    previous_status text;
BEGIN
    IF NEW.fact_revision > 1 THEN
        SELECT status
          INTO previous_status
          FROM catalog.product_facts
         WHERE tenant_id = NEW.tenant_id
           AND product_id = NEW.product_id
           AND sku = NEW.sku
           AND catalog_version = NEW.catalog_version
           AND fact_revision = NEW.fact_revision - 1;
    ELSE
        previous_status := NULL;
    END IF;

    INSERT INTO catalog.product_state_history (
        tenant_id,
        product_id,
        sku,
        catalog_version,
        fact_revision,
        from_status,
        to_status,
        transition_reason,
        actor_id,
        correlation_id,
        causation_id,
        traceparent,
        idempotency_key,
        occurred_at
    ) VALUES (
        NEW.tenant_id,
        NEW.product_id,
        NEW.sku,
        NEW.catalog_version,
        NEW.fact_revision,
        previous_status,
        NEW.status,
        NEW.transition_reason,
        NEW.actor_id,
        NEW.correlation_id,
        NEW.causation_id,
        NEW.traceparent,
        NEW.idempotency_key,
        NEW.occurred_at
    );

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS product_facts_record_state_history ON catalog.product_facts;
CREATE TRIGGER product_facts_record_state_history
    AFTER INSERT ON catalog.product_facts
    FOR EACH ROW EXECUTE FUNCTION catalog.record_product_state_history();

-- Append-only guard for product_facts and product_state_history.
CREATE OR REPLACE FUNCTION catalog.reject_product_fact_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    RAISE EXCEPTION 'catalog product facts are append-only; corrections require a new revision';
END;
$$;

DROP TRIGGER IF EXISTS product_facts_append_only ON catalog.product_facts;
CREATE TRIGGER product_facts_append_only
    BEFORE UPDATE OR DELETE ON catalog.product_facts
    FOR EACH ROW EXECUTE FUNCTION catalog.reject_product_fact_mutation();

DROP TRIGGER IF EXISTS product_state_history_append_only ON catalog.product_state_history;
CREATE TRIGGER product_state_history_append_only
    BEFORE UPDATE OR DELETE ON catalog.product_state_history
    FOR EACH ROW EXECUTE FUNCTION catalog.reject_product_fact_mutation();

-- Tenant isolation via forced Row-Level Security on every Catalog table.
ALTER TABLE catalog.product_aggregates ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalog.product_aggregates FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS product_aggregates_tenant_isolation ON catalog.product_aggregates;
CREATE POLICY product_aggregates_tenant_isolation ON catalog.product_aggregates
    USING (tenant_id = current_setting('app.tenant_id', true))
    WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

ALTER TABLE catalog.product_facts ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalog.product_facts FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS product_facts_tenant_isolation ON catalog.product_facts;
CREATE POLICY product_facts_tenant_isolation ON catalog.product_facts
    USING (tenant_id = current_setting('app.tenant_id', true))
    WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

ALTER TABLE catalog.product_state_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalog.product_state_history FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS product_state_history_tenant_isolation ON catalog.product_state_history;
CREATE POLICY product_state_history_tenant_isolation ON catalog.product_state_history
    USING (tenant_id = current_setting('app.tenant_id', true))
    WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

ALTER TABLE catalog.catalog_outbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalog.catalog_outbox FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS catalog_outbox_tenant_isolation ON catalog.catalog_outbox;
CREATE POLICY catalog_outbox_tenant_isolation ON catalog.catalog_outbox
    USING (tenant_id = current_setting('app.tenant_id', true))
    WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

ALTER TABLE catalog.catalog_inbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalog.catalog_inbox FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS catalog_inbox_tenant_isolation ON catalog.catalog_inbox;
CREATE POLICY catalog_inbox_tenant_isolation ON catalog.catalog_inbox
    USING (tenant_id = current_setting('app.tenant_id', true))
    WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

ALTER TABLE catalog.catalog_idempotency ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalog.catalog_idempotency FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS catalog_idempotency_tenant_isolation ON catalog.catalog_idempotency;
CREATE POLICY catalog_idempotency_tenant_isolation ON catalog.catalog_idempotency
    USING (tenant_id = current_setting('app.tenant_id', true))
    WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

-- Enforce one-service authoritative writer boundary by revoking PUBLIC privileges.
REVOKE ALL ON catalog.product_aggregates FROM PUBLIC;
REVOKE ALL ON catalog.product_facts FROM PUBLIC;
REVOKE ALL ON catalog.product_state_history FROM PUBLIC;
REVOKE ALL ON catalog.catalog_outbox FROM PUBLIC;
REVOKE ALL ON catalog.catalog_inbox FROM PUBLIC;
REVOKE ALL ON catalog.catalog_idempotency FROM PUBLIC;
REVOKE ALL ON FUNCTION catalog.enforce_aggregate_optimistic_lock() FROM PUBLIC;
REVOKE ALL ON FUNCTION catalog.enforce_monotonic_fact_revision() FROM PUBLIC;
REVOKE ALL ON FUNCTION catalog.record_product_state_history() FROM PUBLIC;
REVOKE ALL ON FUNCTION catalog.reject_product_fact_mutation() FROM PUBLIC;
