import { syncInvoices } from "../api/invoices";

import {
  db,
  getPendingInvoices,
  markPendingStatus,
  removePendingInvoice,
} from "../db/offlineDb";

import type {
  PendingInvoice,
} from "../types";

// ============================================================
// TYPES
// ============================================================

type Listener = (
  pendingCount: number,
) => void;

// ============================================================
// STATE
// ============================================================

const listeners =
  new Set<Listener>();

let syncing = false;
let started = false;

// ============================================================
// LISTENERS
// ============================================================

export function onSyncStateChange(
  listener: Listener,
): () => void {
  listeners.add(
    listener,
  );

  return () => {
    listeners.delete(
      listener,
    );
  };
}

// ============================================================
// NOTIFY UI
// ============================================================

async function notify(): Promise<void> {
  const count =
    await db.pendingInvoices
      .where("status")
      .anyOf([
        "pending",
        "failed",
        "syncing",
      ])
      .count();

  listeners.forEach(
    (listener) => {
      try {
        listener(count);
      } catch (error) {
        console.error(
          "[SYNC] Listener failed:",
          error,
        );
      }
    },
  );
}

// ============================================================
// VALIDATE LOCAL INVOICE
// ============================================================

/**
 * Validate an invoice before sending it to the backend.
 *
 * IMPORTANT:
 *
 * Older invoices may exist in IndexedDB from before
 * offline photo storage was implemented.
 *
 * Those invoices must NOT be sent to the backend because
 * the backend requires photo_base64.
 */

async function validateLocalInvoice(
  invoice: PendingInvoice,
): Promise<boolean> {
  // ----------------------------------------------------------
  // LOCAL ID
  // ----------------------------------------------------------

  if (
    invoice.local_id ===
    undefined
  ) {
    console.error(
      "[SYNC] Invoice has no local_id:",
      invoice.client_uuid,
    );

    return false;
  }

  // ----------------------------------------------------------
  // CLIENT UUID
  // ----------------------------------------------------------

  if (
    !invoice.client_uuid?.trim()
  ) {
    await markPendingStatus(
      invoice.local_id,
      "failed",
      "Missing client UUID.",
    );

    return false;
  }

  // ----------------------------------------------------------
  // CUSTOMER
  // ----------------------------------------------------------

  if (
    !invoice.customer_name?.trim()
  ) {
    await markPendingStatus(
      invoice.local_id,
      "failed",
      "Customer name is missing.",
    );

    return false;
  }

  // ----------------------------------------------------------
  // ITEMS
  // ----------------------------------------------------------

  if (
    !Array.isArray(
      invoice.items,
    ) ||
    invoice.items.length === 0
  ) {
    await markPendingStatus(
      invoice.local_id,
      "failed",
      "Invoice has no items.",
    );

    return false;
  }

  // ----------------------------------------------------------
  // PHOTO
  // ----------------------------------------------------------

  const photoBase64 =
    typeof invoice.photo_base64 ===
    "string"
      ? invoice.photo_base64.trim()
      : "";

  if (!photoBase64) {
    /**
     * This is most likely an old invoice created before
     * offline photo persistence was fixed.
     *
     * DO NOT send it to the backend.
     *
     * Otherwise backend responds:
     *
     * "Product photo is required."
     */

    await markPendingStatus(
      invoice.local_id,
      "failed",
      "Product photo is missing. This invoice was created before offline photo storage was fixed. Please create the invoice again with the product photo.",
    );

    console.warn(
      "[SYNC] Skipping invoice without photo:",
      invoice.client_uuid,
    );

    return false;
  }

  // ----------------------------------------------------------
  // PHOTO CONTENT TYPE
  // ----------------------------------------------------------

  const contentType =
    invoice.photo_content_type?.trim() ||
    "image/jpeg";

  const allowedTypes = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/heic",
  ];

  if (
    !allowedTypes.includes(
      contentType.toLowerCase(),
    )
  ) {
    await markPendingStatus(
      invoice.local_id,
      "failed",
      `Unsupported product photo type: ${contentType}`,
    );

    return false;
  }

  // ----------------------------------------------------------
  // VALID
  // ----------------------------------------------------------

  return true;
}

// ============================================================
// RUN SYNC
// ============================================================

/**
 * Push all locally queued invoices to the backend.
 *
 * Flow:
 *
 * IndexedDB
 *      ↓
 * pending / failed
 *      ↓
 * local validation
 *      ↓
 * syncing
 *      ↓
 * POST /api/sync/invoices
 *      ↓
 * created / duplicate / error
 *      ↓
 * delete OR failed
 *
 * IMPORTANT:
 *
 * The photo is validated locally before the request is sent.
 *
 * This prevents the backend from repeatedly receiving
 * invalid legacy invoices.
 */

export async function runSync(): Promise<void> {
  // ==========================================================
  // PREVENT SIMULTANEOUS SYNC
  // ==========================================================

  if (syncing) {
    return;
  }

  // ==========================================================
  // OFFLINE
  // ==========================================================

  if (!navigator.onLine) {
    console.log(
      "[SYNC] Browser is offline. Sync skipped.",
    );

    return;
  }

  syncing = true;

  try {
    // ========================================================
    // GET LOCAL INVOICES
    // ========================================================

    const allPending =
      await getPendingInvoices();

    // ========================================================
    // ONLY PROCESS PENDING / FAILED
    // ========================================================

    const pending:
      PendingInvoice[] =
      allPending.filter(
        (invoice) =>
          invoice.status ===
            "pending" ||
          invoice.status ===
            "failed",
      );

    if (
      pending.length ===
      0
    ) {
      return;
    }

    console.log(
      `[SYNC] Starting sync for ${pending.length} invoice(s)`,
    );

    // ========================================================
    // VALIDATE LOCAL INVOICES
    // ========================================================

    const validPending:
      PendingInvoice[] = [];

    for (
      const invoice of pending
    ) {
      const valid =
        await validateLocalInvoice(
          invoice,
        );

      if (valid) {
        validPending.push(
          invoice,
        );
      }
    }

    // ========================================================
    // NOTHING VALID TO SEND
    // ========================================================

    if (
      validPending.length ===
      0
    ) {
      console.log(
        "[SYNC] No valid invoices available for synchronization.",
      );

      return;
    }

    console.log(
      `[SYNC] ${validPending.length} valid invoice(s) ready for sync.`,
    );

    // ========================================================
    // MARK VALID INVOICES AS SYNCING
    // ========================================================

    for (
      const invoice of validPending
    ) {
      if (
        invoice.local_id ===
        undefined
      ) {
        continue;
      }

      await markPendingStatus(
        invoice.local_id,
        "syncing",
        undefined,
      );
    }

    // ========================================================
    // UPDATE UI
    // ========================================================

    await notify();

    // ========================================================
    // DEBUG INFORMATION
    // ========================================================

    console.log(
      "[SYNC] Sending invoices to backend:",
      validPending.map(
        (invoice) => ({
          local_id:
            invoice.local_id,

          client_uuid:
            invoice.client_uuid,

          customer_name:
            invoice.customer_name,

          payment_mode:
            invoice.payment_mode,

          gst_enabled:
            invoice.gst_enabled,

          tax_percent:
            invoice.tax_percent,

          discount_amount:
            invoice.discount_amount,

          grand_total:
            invoice.grand_total,

          item_count:
            invoice.items?.length ??
            0,

          photo_available:
            Boolean(
              invoice.photo_base64,
            ),

          photo_length:
            invoice.photo_base64
              ?.length ??
            0,

          photo_content_type:
            invoice.photo_content_type ||
            "image/jpeg",
        }),
      ),
    );

    // ========================================================
    // SEND TO BACKEND
    // ========================================================

    console.log(
      "[SYNC] Using offline sync endpoint /api/sync/invoices",
    );

    const results =
      await syncInvoices(
        validPending,
      );

    console.log(
      "[SYNC] Backend response:",
      results,
    );

    // ========================================================
    // CREATE RESULT LOOKUP
    // ========================================================

    const resultByUuid =
      new Map(
        results.map(
          (result) => [
            result.client_uuid,
            result,
          ],
        ),
      );

    // ========================================================
    // PROCESS EACH INVOICE
    // ========================================================

    for (
      const invoice of validPending
    ) {
      if (
        invoice.local_id ===
        undefined
      ) {
        continue;
      }

      const result =
        resultByUuid.get(
          invoice.client_uuid,
        );

      console.log(
        "[SYNC] Processing:",
        invoice.client_uuid,
        result,
      );

      // ======================================================
      // CREATED
      // ======================================================

      if (
        result?.status ===
        "created"
      ) {
        await removePendingInvoice(
          invoice.local_id,
        );

        console.log(
          "[SYNC] Invoice created successfully:",
          invoice.client_uuid,
          result.invoice_number,
        );

        continue;
      }

      // ======================================================
      // DUPLICATE
      // ======================================================

      if (
        result?.status ===
        "duplicate"
      ) {
        /**
         * Duplicate is treated as SUCCESS.
         *
         * The backend already has the invoice.
         */

        await removePendingInvoice(
          invoice.local_id,
        );

        console.log(
          "[SYNC] Duplicate invoice removed from local queue:",
          invoice.client_uuid,
        );

        continue;
      }

      // ======================================================
      // BACKEND ERROR
      // ======================================================

      const errorMessage =
        result?.error ||
        "Invoice synchronization failed.";

      await markPendingStatus(
        invoice.local_id,
        "failed",
        errorMessage,
      );

      console.error(
        "[SYNC] Invoice failed:",
        invoice.client_uuid,
        errorMessage,
      );
    }
  } catch (
    err: unknown
  ) {
    // ========================================================
    // NETWORK / REQUEST FAILURE
    // ========================================================

    const message =
      err instanceof Error
        ? err.message
        : "Network error";

    console.error(
      "[SYNC] Network/request failure:",
      err,
    );

    // ========================================================
    // IMPORTANT
    // ========================================================
    //
    // NEVER DELETE invoices here.
    //
    // The request may have reached the backend even if
    // the browser did not receive the response.
    //
    // client_uuid protects against duplicate invoices.
    //

    const pending =
      await getPendingInvoices();

    for (
      const invoice of pending
    ) {
      if (
        invoice.local_id !==
          undefined &&
        invoice.status ===
          "syncing"
      ) {
        await markPendingStatus(
          invoice.local_id,
          "pending",
          message,
        );
      }
    }
  } finally {
    // ========================================================
    // FINISH
    // ========================================================

    syncing = false;

    await notify();

    console.log(
      "[SYNC] Sync operation finished.",
    );
  }
}

// ============================================================
// AUTO SYNC
// ============================================================

/**
 * Start automatic synchronization.
 *
 * Sync occurs:
 *
 * 1. Application startup
 * 2. Browser comes back online
 * 3. Browser/tab becomes visible
 * 4. Every 30 seconds
 */

export function startAutoSync(): void {
  // ==========================================================
  // PREVENT DUPLICATE EVENT LISTENERS
  // ==========================================================

  if (started) {
    return;
  }

  started = true;

  // ==========================================================
  // ONLINE
  // ==========================================================

  window.addEventListener(
    "online",
    () => {
      console.log(
        "[SYNC] Browser is online.",
      );

      void runSync();
    },
  );

  // ==========================================================
  // OFFLINE
  // ==========================================================

  window.addEventListener(
    "offline",
    () => {
      console.log(
        "[SYNC] Browser is offline.",
      );
    },
  );

  // ==========================================================
  // VISIBILITY
  // ==========================================================

  document.addEventListener(
    "visibilitychange",
    () => {
      if (
        document.visibilityState ===
        "visible"
      ) {
        void runSync();
      }
    },
  );

  // ==========================================================
  // PERIODIC RETRY
  // ==========================================================

  window.setInterval(
    () => {
      void runSync();
    },
    30_000,
  );

  // ==========================================================
  // INITIAL SYNC
  // ==========================================================

  void runSync();
}