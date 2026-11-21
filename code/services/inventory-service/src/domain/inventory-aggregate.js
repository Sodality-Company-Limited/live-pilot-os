/**
 * Domain Inventory Item Aggregate
 * Enforces Zero-Float arithmetic, Row Concurrency Locking state, and Conservation Law.
 */
export class InventoryItem {
  constructor({ tenant_id, sku, total_stock, reserved_stock = 0, version = 1 }) {
    if (!tenant_id || typeof tenant_id !== 'string') throw new Error('tenant_id must be non-empty string');
    if (!sku || typeof sku !== 'string') throw new Error('sku must be non-empty string');
    if (!Number.isInteger(total_stock) || total_stock < 0) throw new Error('total_stock must be integer >= 0');
    if (!Number.isInteger(reserved_stock) || reserved_stock < 0) throw new Error('reserved_stock must be integer >= 0');
    if (reserved_stock > total_stock) throw new Error('Conservation Law violation: reserved_stock cannot exceed total_stock');

    this.tenant_id = tenant_id;
    this.sku = sku;
    this.total_stock = total_stock;
    this.reserved_stock = reserved_stock;
    this.version = version;
  }

  get available_stock() {
    return this.total_stock - this.reserved_stock;
  }

  canReserve(quantity) {
    if (!Number.isInteger(quantity) || quantity <= 0) return false;
    return this.available_stock >= quantity;
  }

  reserve(quantity) {
    if (!this.canReserve(quantity)) {
      const err = new Error('Insufficient available stock');
      err.code = 'LP13001';
      throw err;
    }
    this.reserved_stock += quantity;
    this.version += 1;
    return this;
  }

  release(quantity) {
    if (!Number.isInteger(quantity) || quantity <= 0) throw new Error('quantity must be integer > 0');
    if (quantity > this.reserved_stock) throw new Error('Cannot release more than reserved stock');
    this.reserved_stock -= quantity;
    this.version += 1;
    return this;
  }

  commit(quantity) {
    if (!Number.isInteger(quantity) || quantity <= 0) throw new Error('quantity must be integer > 0');
    if (quantity > this.reserved_stock) throw new Error('Cannot commit more than reserved stock');
    this.reserved_stock -= quantity;
    this.total_stock -= quantity;
    this.version += 1;
    return this;
  }
}

/**
 * Domain Inventory Reservation Entity
 * Enforces Finite State Machine transitions:
 * requested -> reserved -> committed / released / expired
 */
export class InventoryReservation {
  constructor({ reservation_id, tenant_id, session_id, sku, quantity, expires_at, status = 'requested', version = 1 }) {
    this.reservation_id = reservation_id;
    this.tenant_id = tenant_id;
    this.session_id = session_id;
    this.sku = sku;
    this.quantity = quantity;
    this.expires_at = new Date(expires_at);
    this.status = status;
    this.version = version;
  }

  markReserved() {
    if (this.status !== 'requested') throw new Error(`Invalid transition from ${this.status} to reserved`);
    this.status = 'reserved';
    this.version += 1;
  }

  markCommitted() {
    if (this.status !== 'reserved') throw new Error(`Invalid transition from ${this.status} to committed`);
    this.status = 'committed';
    this.version += 1;
  }

  markReleased() {
    if (this.status !== 'reserved') throw new Error(`Invalid transition from ${this.status} to released`);
    this.status = 'released';
    this.version += 1;
  }

  markExpired() {
    if (this.status !== 'reserved') throw new Error(`Invalid transition from ${this.status} to expired`);
    this.status = 'expired';
    this.version += 1;
  }
}
