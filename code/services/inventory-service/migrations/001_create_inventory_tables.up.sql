-- 001_create_inventory_tables.sql
-- Up Migration: Inventory isolated schema, row-locking indexes, and RLS policies

CREATE TABLE IF NOT EXISTS inventory_items (
    tenant_id VARCHAR(64) NOT NULL,
    sku VARCHAR(64) NOT NULL,
    total_stock INTEGER NOT NULL CHECK (total_stock >= 0),
    reserved_stock INTEGER NOT NULL DEFAULT 0 CHECK (reserved_stock >= 0),
    available_stock INTEGER GENERATED ALWAYS AS (total_stock - reserved_stock) STORED,
    version INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (tenant_id, sku),
    CONSTRAINT chk_stock_conservation CHECK (reserved_stock <= total_stock)
);

CREATE TABLE IF NOT EXISTS inventory_reservations (
    reservation_id UUID PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL,
    session_id VARCHAR(64) NOT NULL,
    sku VARCHAR(64) NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    status VARCHAR(32) NOT NULL DEFAULT 'requested' CHECK (status IN ('requested', 'reserved', 'committed', 'released', 'expired', 'conflict')),
    expires_at TIMESTAMPTZ NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_inventory_item FOREIGN KEY (tenant_id, sku) REFERENCES inventory_items(tenant_id, sku) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_inventory_reservations_tenant_sku ON inventory_reservations(tenant_id, sku);
CREATE INDEX IF NOT EXISTS idx_inventory_reservations_expires_status ON inventory_reservations(expires_at, status);

CREATE TABLE IF NOT EXISTS inventory_idempotency (
    idempotency_key VARCHAR(128) NOT NULL,
    tenant_id VARCHAR(64) NOT NULL,
    request_hash VARCHAR(64) NOT NULL,
    response_payload JSONB NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'completed',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMPTZ NOT NULL,
    PRIMARY KEY (tenant_id, idempotency_key)
);

CREATE TABLE IF NOT EXISTS inventory_outbox (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(64) NOT NULL,
    aggregate_id VARCHAR(128) NOT NULL,
    event_type VARCHAR(64) NOT NULL,
    payload JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    published_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_inventory_outbox_unpublished ON inventory_outbox(created_at) WHERE published_at IS NULL;

-- Enable Row-Level Security
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_idempotency ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_outbox ENABLE ROW LEVEL SECURITY;
