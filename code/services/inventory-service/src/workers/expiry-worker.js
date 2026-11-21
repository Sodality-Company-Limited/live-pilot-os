import { InventoryItem } from '../domain/inventory-aggregate.js';

export class InventoryExpiryWorker {
  constructor({ repository }) {
    this.repository = repository;
  }

  async sweepExpiredReservations(asOf = new Date()) {
    return await this.repository.runInTransaction(async (tx) => {
      const expiredList = await tx.findExpiredActiveReservations(asOf);
      const swept = [];

      for (const res of expiredList) {
        const itemRecord = await tx.findItemForUpdate(res.tenant_id, res.sku);
        if (itemRecord) {
          const item = new InventoryItem(itemRecord);
          item.release(res.quantity);
          await tx.updateItem(item);

          res.markExpired();
          await tx.updateReservation(res);

          // Write outbox event
          await tx.writeOutbox({
            tenant_id: res.tenant_id,
            aggregate_id: res.reservation_id,
            event_type: 'livepilot.v1.inventory.stock.updated',
            payload: {
              event_id: crypto.randomUUID(),
              timestamp: asOf.toISOString(),
              tenant_id: res.tenant_id,
              sku: res.sku,
              total_stock: item.total_stock,
              reserved_stock: item.reserved_stock,
              available_stock: item.available_stock,
              version: item.version,
              reason: 'expired'
            }
          });
          swept.push(res.reservation_id);
        }
      }
      return swept;
    });
  }
}
