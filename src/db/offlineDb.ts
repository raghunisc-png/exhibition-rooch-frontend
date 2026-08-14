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

    // ==========================================================
    // VERSION 1
    // ==========================================================

    this.version(1).stores({
      pendingInvoices:
        "++local_id, client_uuid, status",

      cachedInvoices:
        "id, created_at",
    });

    // ==========================================================
    // VERSION 2
    // ==========================================================
    //
    // Supports:
    //
    // - individually priced items
    // - payment mode
    // - GST data
    //
    // ==========================================================

    this.version(2).stores({
      pendingInvoices:
        "++local_id, client_uuid, status",

      cachedInvoices:
        "id, created_at",
    });

    // ==========================================================
    // VERSION 3
    // ==========================================================
    //
    // Supports offline photo storage:
    //
    // - photo_base64
    // - photo_content_type
    //
    // ==========================================================

    this.version(3).stores({
      pendingInvoices:
        "++local_id, client_uuid, status",

      cachedInvoices:
        "id, created_at",
    });

    // ==========================================================
    // VERSION 4
    // ==========================================================
    //
    // Supports:
    //
    // - backend grand_total
    //
    // ==========================================================

    this.version(4).stores({
      pendingInvoices:
        "++local_id, client_uuid, status",

      cachedInvoices:
        "id, created_at",
    });

    // ==========================================================
    // VERSION 5
    // ==========================================================
    //
    // PHOTO-SAFE OFFLINE INVOICE STRUCTURE
    //
    // IndexedDB does not require an index for photo_base64.
    // It is stored as normal object data.
    //
    // The migration intentionally does NOT invent a photo for
    // old invoices.
    //
    // Old invoices without photo_base64 will remain available
    // as failed records and will NOT be sent to the backend.
    //
    // ==========================================================

    this.version(5)
      .stores({
        pendingInvoices:
          "++local_id, client_uuid, status",

        cachedInvoices:
          "id, created_at",
      })
      .upgrade(
        async (transaction) => {
          const table =
            transaction.table(
              "pendingInvoices",
            );

          const invoices =
            await table.toArray();

          for (
            const invoice of invoices
          ) {
            const updates: Partial<PendingInvoice> =
              {};

            // --------------------------------------------------
            // PAYMENT MODE
            // --------------------------------------------------

            updates.payment_mode =
              normalizePaymentMode(
                invoice.payment_mode,
              );

            // --------------------------------------------------
            // GST
            // --------------------------------------------------

            const gstEnabled =
              normalizeGstEnabled(
                invoice.gst_enabled,
              );

            updates.gst_enabled =
              gstEnabled;

            updates.tax_percent =
              normalizeGstRate(
                invoice.tax_percent,
                gstEnabled,
              );

            // --------------------------------------------------
            // DISCOUNT
            // --------------------------------------------------

            updates.discount_amount =
              normalizeDiscount(
                invoice.discount_amount,
              );

            // --------------------------------------------------
            // GRAND TOTAL
            // --------------------------------------------------

            updates.grand_total =
              normalizeGrandTotal(
                invoice.grand_total,
              );

            // --------------------------------------------------
            // PHOTO CONTENT TYPE
            // --------------------------------------------------

            if (
              invoice.photo_base64 &&
              !invoice.photo_content_type
            ) {
              updates.photo_content_type =
                "image/jpeg";
            }

            // --------------------------------------------------
            // STATUS
            // --------------------------------------------------

            if (
              !invoice.status
            ) {
              updates.status =
                "pending";
            }

            // --------------------------------------------------
            // UPDATE
            // --------------------------------------------------

            await table.update(
              invoice.local_id,
              updates,
            );
          }
        },
      );
  }
}

// ============================================================
// DATABASE INSTANCE
// ============================================================

export const db =
  new OfflineDatabase();

// ============================================================
// PAYMENT MODE
// ============================================================

function normalizePaymentMode(
  value: unknown,
): "online" | "cash" {
  return value === "cash"
    ? "cash"
    : "online";
}

// ============================================================
// GST ENABLED
// ============================================================

function normalizeGstEnabled(
  value: unknown,
): boolean {
  if (
    value === true ||
    value === "true" ||
    value === 1 ||
    value === "1"
  ) {
    return true;
  }

  return false;
}

// ============================================================
// GST RATE
// ============================================================

function normalizeGstRate(
  value: unknown,
  gstEnabled: boolean,
): number {
  if (!gstEnabled) {
    return 0;
  }

  const numericValue =
    Number(value);

  if (
    !Number.isFinite(
      numericValue,
    )
  ) {
    return 0;
  }

  return Math.min(
    100,
    Math.max(
      0,
      numericValue,
    ),
  );
}

// ============================================================
// DISCOUNT
// ============================================================

function normalizeDiscount(
  value: unknown,
): number {
  const numericValue =
    Number(value);

  if (
    !Number.isFinite(
      numericValue,
    )
  ) {
    return 0;
  }

  return Math.max(
    0,
    numericValue,
  );
}

// ============================================================
// GRAND TOTAL
// ============================================================

function normalizeGrandTotal(
  value: unknown,
): number {
  const numericValue =
    Number(value);

  if (
    !Number.isFinite(
      numericValue,
    )
  ) {
    return 0;
  }

  return Math.max(
    0,
    numericValue,
  );
}

// ============================================================
// PHOTO BASE64
// ============================================================

function normalizePhotoBase64(
  value: unknown,
): string | undefined {
  if (
    typeof value !==
    "string"
  ) {
    return undefined;
  }

  const cleaned =
    value.trim();

  if (!cleaned) {
    return undefined;
  }

  return cleaned;
}

// ============================================================
// PHOTO CONTENT TYPE
// ============================================================

function normalizePhotoContentType(
  value: unknown,
): string {
  if (
    typeof value !==
      "string" ||
    !value.trim()
  ) {
    return "image/jpeg";
  }

  return value.trim();
}

// ============================================================
// PENDING INVOICES
// ============================================================

/**
 * Add an invoice to the offline queue.
 *
 * The complete invoice is persisted, including:
 *
 * - customer details
 * - individually priced products
 * - GST
 * - discount
 * - payment mode
 * - exhibition
 * - notes
 * - captured timestamp
 * - photo_base64
 * - photo_content_type
 * - grand_total
 *
 * IMPORTANT:
 *
 * The photo is required for a valid offline invoice.
 */

export async function queuePendingInvoice(
  invoice: PendingInvoice,
): Promise<number> {
  // ==========================================================
  // PHOTO
  // ==========================================================

  const photoBase64 =
    normalizePhotoBase64(
      invoice.photo_base64,
    );

  const photoContentType =
    normalizePhotoContentType(
      invoice.photo_content_type,
    );

  // ==========================================================
  // GST
  // ==========================================================

  const gstEnabled =
    normalizeGstEnabled(
      invoice.gst_enabled,
    );

  // ==========================================================
  // NORMALIZED INVOICE
  // ==========================================================

  const normalizedInvoice:
    PendingInvoice = {
    ...invoice,

    // --------------------------------------------------------
    // CLIENT UUID
    // --------------------------------------------------------

    client_uuid:
      invoice.client_uuid,

    // --------------------------------------------------------
    // PAYMENT
    // --------------------------------------------------------

    payment_mode:
      normalizePaymentMode(
        invoice.payment_mode,
      ),

    // --------------------------------------------------------
    // GST
    // --------------------------------------------------------

    gst_enabled:
      gstEnabled,

    tax_percent:
      normalizeGstRate(
        invoice.tax_percent,
        gstEnabled,
      ),

    // --------------------------------------------------------
    // DISCOUNT
    // --------------------------------------------------------

    discount_amount:
      normalizeDiscount(
        invoice.discount_amount,
      ),

    // --------------------------------------------------------
    // GRAND TOTAL
    // --------------------------------------------------------

    grand_total:
      normalizeGrandTotal(
        invoice.grand_total,
      ),

    // --------------------------------------------------------
    // PHOTO
    // --------------------------------------------------------

    photo_base64:
      photoBase64,

    photo_content_type:
      photoContentType,

    // --------------------------------------------------------
    // STATUS
    // --------------------------------------------------------

    status:
      invoice.status ||
      "pending",

    // --------------------------------------------------------
    // ERROR
    // --------------------------------------------------------

    last_error:
      invoice.last_error,
  };

  // ==========================================================
  // DEBUG
  // ==========================================================

  console.log(
    "[OFFLINE DB] Queueing invoice:",
    {
      client_uuid:
        normalizedInvoice.client_uuid,

      customer_name:
        normalizedInvoice.customer_name,

      item_count:
        normalizedInvoice.items?.length ??
        0,

      photo_available:
        Boolean(
          normalizedInvoice.photo_base64,
        ),

      photo_length:
        normalizedInvoice.photo_base64
          ?.length ??
        0,

      photo_content_type:
        normalizedInvoice.photo_content_type,

      status:
        normalizedInvoice.status,
    },
  );

  // ==========================================================
  // SAVE
  // ==========================================================

  return db.pendingInvoices.add(
    normalizedInvoice,
  );
}

// ============================================================
// GET PENDING INVOICES
// ============================================================

/**
 * Return all locally queued invoices.
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

// ============================================================
// COUNT PENDING INVOICES
// ============================================================

/**
 * Count invoices that still exist locally.
 *
 * Includes:
 *
 * - pending
 * - failed
 * - syncing
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

// ============================================================
// REMOVE PENDING INVOICE
// ============================================================

/**
 * Delete a local invoice after the backend confirms:
 *
 * - created
 * - duplicate
 */

export async function removePendingInvoice(
  localId: number,
): Promise<void> {
  await db.pendingInvoices.delete(
    localId,
  );

  console.log(
    "[OFFLINE DB] Removed invoice:",
    localId,
  );
}

// ============================================================
// UPDATE PENDING STATUS
// ============================================================

/**
 * Update local synchronization state.
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

      last_error:
        lastError,
    },
  );

  console.log(
    "[OFFLINE DB] Status updated:",
    {
      localId,
      status,
      lastError,
    },
  );
}

// ============================================================
// RETRY PENDING INVOICE
// ============================================================

/**
 * Mark an invoice as ready for retry.
 */

export async function retryPendingInvoice(
  localId: number,
): Promise<void> {
  await markPendingStatus(
    localId,
    "pending",
    undefined,
  );
}

// ============================================================
// GET PENDING INVOICE
// ============================================================

export async function getPendingInvoice(
  localId: number,
): Promise<
  PendingInvoice | undefined
> {
  return db.pendingInvoices.get(
    localId,
  );
}

// ============================================================
// GET PENDING INVOICE BY UUID
// ============================================================

export async function getPendingInvoiceByUuid(
  clientUuid: string,
): Promise<
  PendingInvoice | undefined
> {
  return db.pendingInvoices
    .where("client_uuid")
    .equals(clientUuid)
    .first();
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

  if (
    items.length > 0
  ) {
    await db.cachedInvoices.bulkPut(
      items,
    );
  }
}

// ============================================================
// GET CACHED INVOICES
// ============================================================

/**
 * Return cached invoices.
 *
 * Newest invoice first.
 */

export async function getCachedInvoiceList(): Promise<
  InvoiceListItem[]
> {
  return db.cachedInvoices
    .orderBy("created_at")
    .reverse()
    .toArray();
}

// ============================================================
// CACHE SINGLE INVOICE
// ============================================================

/**
 * Cache or update a single invoice list item.
 */

export async function cacheInvoice(
  invoice: InvoiceListItem,
): Promise<void> {
  await db.cachedInvoices.put(
    invoice,
  );
}

// ============================================================
// REMOVE CACHED INVOICE
// ============================================================

export async function removeCachedInvoice(
  invoiceId: number,
): Promise<void> {
  await db.cachedInvoices.delete(
    invoiceId,
  );
}

// ============================================================
// CLEAR CACHED INVOICES
// ============================================================

export async function clearCachedInvoices(): Promise<void> {
  await db.cachedInvoices.clear();
}

// ============================================================
// CLEAR INVOICE CACHE
// ============================================================

export async function clearInvoiceCache(): Promise<void> {
  await db.cachedInvoices.clear();
}

// ============================================================
// CLEAR OFFLINE DATABASE
// ============================================================

/**
 * Clear the entire local database.
 *
 * WARNING:
 *
 * This removes pending offline invoices as well.
 */

export async function clearOfflineDatabase(): Promise<void> {
  await db.transaction(
    "rw",
    db.pendingInvoices,
    db.cachedInvoices,
    async () => {
      await db.pendingInvoices.clear();

      await db.cachedInvoices.clear();
    },
  );

  console.log(
    "[OFFLINE DB] Database cleared.",
  );
}

// ============================================================
// REMOVE INVALID LEGACY INVOICES
// ============================================================

/**
 * Remove old local invoices that have no photo.
 *
 * These invoices cannot successfully synchronize because
 * the backend requires product photo data.
 *
 * We intentionally keep this function separate from normal
 * synchronization so it is only called explicitly.
 */

export async function removeInvoicesWithoutPhoto(): Promise<number> {
  const invoices =
    await db.pendingInvoices.toArray();

  let removed = 0;

  for (
    const invoice of invoices
  ) {
    const photo =
      normalizePhotoBase64(
        invoice.photo_base64,
      );

    if (!photo && invoice.local_id !== undefined) {
      await db.pendingInvoices.delete(
        invoice.local_id,
      );

    removed++;
  }

      console.warn(
        "[OFFLINE DB] Removed legacy invoice without photo:",
        {
          localId:
            invoice.local_id,

          client_uuid:
            invoice.client_uuid,
        },
      );
    }
  }

  return removed;
}