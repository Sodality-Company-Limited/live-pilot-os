CREATE SCHEMA IF NOT EXISTS intent_risk;

-- 1. Intent facts
CREATE TABLE IF NOT EXISTS intent_risk.intent_facts (
    fact_id text NOT NULL CHECK (length(fact_id) BETWEEN 1 AND 128),
    tenant_id text NOT NULL CHECK (length(tenant_id) BETWEEN 1 AND 128),
    session_id text NOT NULL CHECK (length(session_id) BETWEEN 1 AND 128),
    category text NOT NULL,
    confidence numeric NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
    outcome text NOT NULL CHECK (outcome IN ('DETECTED', 'DEFERRED')),
    created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (tenant_id, fact_id)
);

ALTER TABLE intent_risk.intent_facts ENABLE ROW LEVEL SECURITY;
ALTER TABLE intent_risk.intent_facts FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS intent_facts_tenant_isolation ON intent_risk.intent_facts;
CREATE POLICY intent_facts_tenant_isolation ON intent_risk.intent_facts
    USING (tenant_id = current_setting('app.tenant_id', true))
    WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

-- 2. Risk facts
CREATE TABLE IF NOT EXISTS intent_risk.risk_facts (
    risk_id text NOT NULL CHECK (length(risk_id) BETWEEN 1 AND 128),
    tenant_id text NOT NULL CHECK (length(tenant_id) BETWEEN 1 AND 128),
    session_id text NOT NULL CHECK (length(session_id) BETWEEN 1 AND 128),
    category text NOT NULL CHECK (category IN ('SPAM', 'TOXIC', 'SCAM', 'OFF_PLATFORM', 'COORDINATED_BOT')),
    severity text NOT NULL CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    score numeric NOT NULL CHECK (score >= 0 AND score <= 1),
    handling text NOT NULL CHECK (handling IN ('ignore', 'filter', 'alert', 'escalate')),
    created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (tenant_id, risk_id)
);

ALTER TABLE intent_risk.risk_facts ENABLE ROW LEVEL SECURITY;
ALTER TABLE intent_risk.risk_facts FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS risk_facts_tenant_isolation ON intent_risk.risk_facts;
CREATE POLICY risk_facts_tenant_isolation ON intent_risk.risk_facts
    USING (tenant_id = current_setting('app.tenant_id', true))
    WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

-- 3. Transactional Outbox
CREATE TABLE IF NOT EXISTS intent_risk.outbox (
    outbox_id text NOT NULL CHECK (length(outbox_id) BETWEEN 1 AND 128),
    tenant_id text NOT NULL CHECK (length(tenant_id) BETWEEN 1 AND 128),
    subject text NOT NULL,
    payload text NOT NULL,
    status text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PUBLISHED', 'FAILED')),
    created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (tenant_id, outbox_id)
);

ALTER TABLE intent_risk.outbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE intent_risk.outbox FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS outbox_tenant_isolation ON intent_risk.outbox;
CREATE POLICY outbox_tenant_isolation ON intent_risk.outbox
    USING (tenant_id = current_setting('app.tenant_id', true))
    WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

-- 4. Idempotency keys
CREATE TABLE IF NOT EXISTS intent_risk.idempotency_keys (
    tenant_id text NOT NULL CHECK (length(tenant_id) BETWEEN 1 AND 128),
    idempotency_key text NOT NULL CHECK (length(idempotency_key) BETWEEN 8 AND 256),
    occurred_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (tenant_id, idempotency_key)
);

ALTER TABLE intent_risk.idempotency_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE intent_risk.idempotency_keys FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS idempotency_keys_tenant_isolation ON intent_risk.idempotency_keys;
CREATE POLICY idempotency_keys_tenant_isolation ON intent_risk.idempotency_keys
    USING (tenant_id = current_setting('app.tenant_id', true))
    WITH CHECK (tenant_id = current_setting('app.tenant_id', true));
