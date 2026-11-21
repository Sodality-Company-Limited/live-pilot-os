-- G-CATA-002 (reconciling G-CORE-074) down migration. Run only as a controlled, operator-approved rollback.
DROP TRIGGER IF EXISTS product_state_history_append_only ON catalog.product_state_history;
DROP TRIGGER IF EXISTS product_facts_append_only ON catalog.product_facts;
DROP TRIGGER IF EXISTS product_facts_record_state_history ON catalog.product_facts;
DROP TRIGGER IF EXISTS product_facts_monotonic_revision ON catalog.product_facts;
DROP TRIGGER IF EXISTS product_aggregates_optimistic_lock ON catalog.product_aggregates;

DROP TABLE IF EXISTS catalog.catalog_idempotency;
DROP TABLE IF EXISTS catalog.catalog_inbox;
DROP TABLE IF EXISTS catalog.catalog_outbox;
DROP TABLE IF EXISTS catalog.product_state_history;
DROP TABLE IF EXISTS catalog.product_facts;
DROP TABLE IF EXISTS catalog.product_aggregates;

DROP FUNCTION IF EXISTS catalog.reject_product_fact_mutation();
DROP FUNCTION IF EXISTS catalog.record_product_state_history();
DROP FUNCTION IF EXISTS catalog.enforce_monotonic_fact_revision();
DROP FUNCTION IF EXISTS catalog.enforce_aggregate_optimistic_lock();
DROP SCHEMA IF EXISTS catalog;
