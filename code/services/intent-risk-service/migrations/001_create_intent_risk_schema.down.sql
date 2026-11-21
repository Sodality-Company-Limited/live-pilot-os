DROP POLICY IF EXISTS idempotency_keys_tenant_isolation ON intent_risk.idempotency_keys;
DROP TABLE IF EXISTS intent_risk.idempotency_keys;

DROP POLICY IF EXISTS outbox_tenant_isolation ON intent_risk.outbox;
DROP TABLE IF EXISTS intent_risk.outbox;

DROP POLICY IF EXISTS risk_facts_tenant_isolation ON intent_risk.risk_facts;
DROP TABLE IF EXISTS intent_risk.risk_facts;

DROP POLICY IF EXISTS intent_facts_tenant_isolation ON intent_risk.intent_facts;
DROP TABLE IF EXISTS intent_risk.intent_facts;

DROP SCHEMA IF EXISTS intent_risk;
