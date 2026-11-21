-- Down Migration: Drop inventory isolated schema

DROP TABLE IF EXISTS inventory_outbox;
DROP TABLE IF EXISTS inventory_idempotency;
DROP TABLE IF EXISTS inventory_reservations;
DROP TABLE IF EXISTS inventory_items;
