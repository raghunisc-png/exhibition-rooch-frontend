import Dexie, {
  type Table,
} from "dexie";

import type {
  InvoiceListItem,
  PendingInvoice,
} from "../types";

// ============================================================
// DATABASE
// ============================================================

class OfflineDatabase extends Dexie {
  pendingInvoices!: Table<
    PendingInvoice,
    number
  >;

  cachedInvoices!: Table<
    InvoiceListItem,
    number
  >;

  constructor() {
    super("expo_invoice_db");

    // --------------------------------------------------------
    // Version 1
    // --------------------------------------------------------

    this.version(1).stores({
      pendingInvoices:
        "++local_id, client_uuid, status",

      cachedInvoices:
        "id, created_at",
    });

    // --------------------------------------------------------
    // Version 2
    // --------------------------------------------------------
    //
    // The invoice object now contains items[].
    //
    // No IndexedDB index is required for items because the
    // complete object is stored as a normal Dexie value.
    //

    this.version(2).stores({
      pendingInvoices:
        "++local_id, client_uuid, status",

      cachedInvoices:
        "id, created_at",
    });
  }
}

export const db =
  new OfflineDatabase();

// ============================================================
// PENDING INVOICES
// ============================================================

/**
 * Add an invoice to the offline queue.
 */
export async function queuePendingInvoice(
  invoice: PendingInvoice,
): Promise<number> {
  return db.pendingInvoices.add(
    invoice,
  );
}

/**
 * Return all local invoices.
 *
 * Newest local invoice first.
 */
export async function getPendingInvoices(): Promise<
  PendingInvoice[]
> {
  return db.pendingInvoices
    .orderBy("local_id")
    .reverse()
    .toArray();
}

/**
 * Count invoices that still exist locally.
 *
 * Includes syncing so the UI cannot incorrectly display
 * "All synced" while a request is in progress.
 */
export async function countPendingInvoices(): Promise<number> {
  return db.pendingInvoices
    .where("status")
    .anyOf([
      "pending",
      "failed",
      "syncing",
    ])
    .count();
}

/**
 * Delete a local invoice after the backend confirms that
 * it was created or already existed.
 */
export async function removePendingInvoice(
  localId: number,
): Promise<void> {
  await db.pendingInvoices.delete(
    localId,
  );
}

/**
 * Update the local synchronization state.
 */
export async function markPendingStatus(
  localId: number,
  status: PendingInvoice["status"],
  lastError?: string,
): Promise<void> {
  await db.pendingInvoices.update(
    localId,
    {
      status,
      last_error: lastError,
    },
  );
}

// ============================================================
// CACHED INVOICES
// ============================================================

/**
 * Replace the locally cached invoice list.
 */
export async function cacheInvoiceList(
  items: InvoiceListItem[],
): Promise<void> {
  await db.cachedInvoices.clear();

  if (items.length > 0) {
    await db.cachedInvoices.bulkPut(
      items,
    );
  }
}

/**
 * Return cached invoices.
 */
export async function getCachedInvoiceList(): Promise<
  InvoiceListItem[]
> {
  return db.cachedInvoices
    .orderBy("created_at")
    .reverse()
    .toArray();
}