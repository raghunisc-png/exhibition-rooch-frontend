import { syncInvoices } from "../api/invoices";

import {
  db,
  getPendingInvoices,
  markPendingStatus,
  removePendingInvoice,
} from "../db/offlineDb";

import type { PendingInvoice } from "../types";

// ============================================================
// TYPES
// ============================================================

type Listener = (pendingCount: number) => void;

const listeners = new Set<Listener>();

let syncing = false;
let started = false;

// ============================================================
// LISTENERS
// ============================================================

export function onSyncStateChange(
  listener: Listener,
): () => void {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

/**
 * Notify the UI about the number of invoices that still
 * need synchronization.
 *
 * syncing invoices are also counted here so the header does
 * not incorrectly say "All synced" while a request is active.
 */
async function notify(): Promise<void> {
  const count = await db.pendingInvoices
    .where("status")
    .anyOf([
      "pending",
      "failed",
      "syncing",
    ])
    .count();

  listeners.forEach((listener) => {
    try {
      listener(count);
    } catch (error) {
      console.error(
        "Sync listener failed:",
        error,
      );
    }
  });
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
 *     ↓
 * mark syncing
 *     ↓
 * POST /api/sync/invoices
 *     ↓
 * created / duplicate
 *     ↓
 * delete local record
 *
 * If the request fails:
 *
 * syncing
 *     ↓
 * pending
 *     ↓
 * retry later
 */
export async function runSync(): Promise<void> {
  // ----------------------------------------------------------
  // Prevent multiple simultaneous sync operations.
  // ----------------------------------------------------------

  if (syncing) {
    return;
  }

  // ----------------------------------------------------------
  // Cannot synchronize while offline.
  // ----------------------------------------------------------

  if (!navigator.onLine) {
    return;
  }

  syncing = true;

  try {
    // --------------------------------------------------------
    // Get pending invoices.
    // --------------------------------------------------------

    const allPending =
      await getPendingInvoices();

    const pending: PendingInvoice[] =
      allPending.filter(
        (invoice) =>
          invoice.status === "pending" ||
          invoice.status === "failed",
      );

    if (pending.length === 0) {
      return;
    }

    console.log(
      `[SYNC] Starting sync for ${pending.length} invoice(s)`,
    );

    // --------------------------------------------------------
    // Mark invoices as syncing.
    // --------------------------------------------------------

    for (const invoice of pending) {
      if (invoice.local_id === undefined) {
        continue;
      }

      await markPendingStatus(
        invoice.local_id,
        "syncing",
        undefined,
      );
    }

    // IMPORTANT:
    //
    // Notify AFTER marking syncing.
    //
    // The UI now correctly knows that synchronization is
    // actually happening.
    await notify();

    // --------------------------------------------------------
    // Send invoices to backend.
    // --------------------------------------------------------

    console.log(
      "[SYNC] Sending invoices to backend:",
      pending.map(
        (invoice) => invoice.client_uuid,
      ),
    );

    const results =
      await syncInvoices(pending);

    console.log(
      "[SYNC] Backend response:",
      results,
    );

    // --------------------------------------------------------
    // Create lookup by client UUID.
    // --------------------------------------------------------

    const resultByUuid =
      new Map(
        results.map(
          (result) => [
            result.client_uuid,
            result,
          ],
        ),
      );

    // --------------------------------------------------------
    // Process every invoice.
    // --------------------------------------------------------

    for (const invoice of pending) {
      if (invoice.local_id === undefined) {
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

      // ------------------------------------------------------
      // Successfully created on server.
      // ------------------------------------------------------

      if (
        result?.status === "created"
      ) {
        await removePendingInvoice(
          invoice.local_id,
        );

        console.log(
          "[SYNC] Removed locally after creation:",
          invoice.client_uuid,
        );

        continue;
      }

      // ------------------------------------------------------
      // Server says invoice already exists.
      //
      // This is also success because the invoice does not
      // need to remain in IndexedDB.
      // ------------------------------------------------------

      if (
        result?.status === "duplicate"
      ) {
        await removePendingInvoice(
          invoice.local_id,
        );

        console.log(
          "[SYNC] Removed local duplicate:",
          invoice.client_uuid,
        );

        continue;
      }

      // ------------------------------------------------------
      // Backend explicitly returned an error.
      // ------------------------------------------------------

      await markPendingStatus(
        invoice.local_id,
        "failed",
        result?.error ||
          "Sync failed",
      );

      console.error(
        "[SYNC] Invoice failed:",
        invoice.client_uuid,
        result?.error,
      );
    }

  } catch (err: unknown) {
    // --------------------------------------------------------
    // Network-level failure.
    // --------------------------------------------------------

    const message =
      err instanceof Error
        ? err.message
        : "Network error";

    console.error(
      "[SYNC] Network/request failure:",
      err,
    );

    /*
     * IMPORTANT:
     *
     * Never delete invoices here.
     *
     * The request might have reached the backend even though
     * the browser did not receive the response.
     *
     * client_uuid provides idempotency:
     *
     * retry
     *   ↓
     * same client_uuid
     *   ↓
     * backend finds invoice
     *   ↓
     * duplicate
     *   ↓
     * remove local invoice
     */

    const pending =
      await getPendingInvoices();

    for (const invoice of pending) {
      if (
        invoice.local_id !== undefined &&
        invoice.status === "syncing"
      ) {
        await markPendingStatus(
          invoice.local_id,
          "pending",
          message,
        );
      }
    }

  } finally {
    syncing = false;

    // --------------------------------------------------------
    // Notify ONLY after the complete sync operation finishes.
    //
    // This is important.
    //
    // It prevents the UI from receiving multiple overlapping
    // states and displaying an old "syncing" record.
    // --------------------------------------------------------

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
 * Sync happens:
 *
 * 1. When application starts
 * 2. When browser comes back online
 * 3. When browser/tab becomes visible
 * 4. Every 30 seconds
 */
export function startAutoSync(): void {
  if (started) {
    return;
  }

  started = true;

  // ----------------------------------------------------------
  // Browser comes back online.
  // ----------------------------------------------------------

  window.addEventListener(
    "online",
    () => {
      console.log(
        "[SYNC] Browser is online.",
      );

      void runSync();
    },
  );

  // ----------------------------------------------------------
  // Browser goes offline.
  // ----------------------------------------------------------

  window.addEventListener(
    "offline",
    () => {
      console.log(
        "[SYNC] Browser is offline.",
      );
    },
  );

  // ----------------------------------------------------------
  // App/tab becomes visible.
  // ----------------------------------------------------------

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

  // ----------------------------------------------------------
  // Periodic retry.
  // ----------------------------------------------------------

  window.setInterval(
    () => {
      void runSync();
    },
    30_000,
  );

  // ----------------------------------------------------------
  // Initial synchronization.
  // ----------------------------------------------------------

  void runSync();
}