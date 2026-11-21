import { InventoryItem, InventoryReservation } from '../domain/inventory-aggregate.js';

export class InventoryService {
  constructor({ repository }) {
    this.repository = repository;
  }

  async handleReservationRequest(payload) {
    const { correlation_id, tenant_id, session_id, idempotency_key, sku, quantity, ttl_seconds } = payload;

    // 1. Check Idempotency Store
    const cached = await this.repository.findIdempotency(tenant_id, idempotency_key);
    if (cached) {
      return cached.response_payload;
    }

    // 2. Check Emergency Pause
    const isPaused = await this.repository.isEmergencyPaused(tenant_id);
    if (isPaused) {
      return {
        correlation_id,
        success: false,
        tenant_id,
        sku,
        status: 'paused',
        error_code: 'LP13005',
        error_message: 'Emergency pause is active; inventory mutations are locked fail-closed.'
      };
    }

    // 3. Execute Transaction with Row Lock
    return await this.repository.runInTransaction(async (tx) => {
      const itemRecord = await tx.findItemForUpdate(tenant_id, sku);
      if (!itemRecord) {
        return {
          correlation_id,
          success: false,
          tenant_id,
          sku,
          status: 'refused',
          error_code: 'LP13003',
          error_message: 'Inventory item SKU not found'
        };
      }

      const item = new InventoryItem(itemRecord);
      if (!item.canReserve(quantity)) {
        return {
          correlation_id,
          success: false,
          tenant_id,
          sku,
          status: 'conflict',
          error_code: 'LP13001',
          error_message: 'Insufficient inventory stock'
        };
      }

      // Mutate Aggregate
      item.reserve(quantity);
      await tx.updateItem(item);

      // Create Reservation
      const reservation_id = crypto.randomUUID();
      const expires_at = new Date(Date.now() + ttl_seconds * 1000).toISOString();
      const reservation = new InventoryReservation({
        reservation_id,
        tenant_id,
        session_id,
        sku,
        quantity,
        expires_at,
        status: 'reserved'
      });
      await tx.createReservation(reservation);

      // Write Outbox Event within same TX
      const outboxEvent = {
        event_id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        tenant_id,
        sku,
        total_stock: item.total_stock,
        reserved_stock: item.reserved_stock,
        available_stock: item.available_stock,
        version: item.version,
        reason: 'reserved'
      };
      await tx.writeOutbox({
        tenant_id,
        aggregate_id: reservation_id,
        event_type: 'livepilot.v1.inventory.stock.updated',
        payload: outboxEvent
      });

      const response = {
        correlation_id,
        success: true,
        tenant_id,
        sku,
        reservation_id,
        status: 'reserved',
        quantity_reserved: quantity,
        available_stock: item.available_stock,
        expires_at
      };

      // Record Idempotency Result
      await tx.saveIdempotency({
        tenant_id,
        idempotency_key,
        request_hash: 'hash_' + idempotency_key,
        response_payload: response
      });

      return response;
    });
  }
}
