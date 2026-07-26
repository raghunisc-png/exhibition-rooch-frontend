import Dexie, { type Table } from "dexie";
import type { InvoiceListItem, PendingInvoice } from "../types";

/**
 * Local (IndexedDB) storage so the app keeps working with no connectivity at
 * the booth. `pendingInvoices` is a write queue of invoices captured
 * offline; `cachedInvoices` is a read-through cache of the server's invoice
 * list so agents can still browse recent history offline.
 */
class OfflineDatabase extends Dexie {
  pendingInvoices!: Table<PendingInvoice, number>;
  cachedInvoices!: Table<InvoiceListItem, number>;

  constructor() {
    super("expo_invoice_db");
    this.version(1).stores({
      pendingInvoices: "++local_id, client_uuid, status",
      cachedInvoices: "id, created_at",
    });
  }
}

export const db = new OfflineDatabase();

export async function queuePendingInvoice(invoice: PendingInvoice): Promise<number> {
  return db.pendingInvoices.add(invoice);
}

export async function getPendingInvoices(): Promise<PendingInvoice[]> {
  return db.pendingInvoices.orderBy("local_id").reverse().toArray();
}

export async function countPendingInvoices(): Promise<number> {
  return db.pendingInvoices.where("status").anyOf(["pending", "failed"]).count();
}

export async function removePendingInvoice(localId: number): Promise<void> {
  await db.pendingInvoices.delete(localId);
}

export async function markPendingStatus(
  localId: number,
  status: PendingInvoice["status"],
  lastError?: string
): Promise<void> {
  await db.pendingInvoices.update(localId, { status, last_error: lastError });
}

export async function cacheInvoiceList(items: InvoiceListItem[]): Promise<void> {
  await db.cachedInvoices.clear();
  await db.cachedInvoices.bulkPut(items);
}

export async function getCachedInvoiceList(): Promise<InvoiceListItem[]> {
  return db.cachedInvoices.orderBy("created_at").reverse().toArray();
}
