import { syncInvoices } from "../api/invoices";
import { db, getPendingInvoices, markPendingStatus, removePendingInvoice } from "../db/offlineDb";
import type { PendingInvoice } from "../types";

type Listener = (pendingCount: number) => void;

const listeners = new Set<Listener>();
let syncing = false;

export function onSyncStateChange(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

async function notify() {
  const count = await db.pendingInvoices.where("status").anyOf(["pending", "failed"]).count();
  listeners.forEach((l) => l(count));
}

/**
 * Push everything queued locally to the server. Safe to call repeatedly
 * (e.g. on an interval, on 'online' events, after every new invoice) -
 * items already syncing or already synced are skipped, and the batch is
 * idempotent server-side on client_uuid so partial failures can't create
 * duplicates on retry.
 */
export async function runSync(): Promise<void> {
  if (syncing || !navigator.onLine) return;
  syncing = true;
  try {
    const pending: PendingInvoice[] = (await getPendingInvoices()).filter(
      (p) => p.status === "pending" || p.status === "failed"
    );
    if (pending.length === 0) return;

    for (const item of pending) {
      if (item.local_id !== undefined) {
        await markPendingStatus(item.local_id, "syncing");
      }
    }
    await notify();

    const results = await syncInvoices(pending);
    const resultByUuid = new Map(results.map((r) => [r.client_uuid, r]));

    for (const item of pending) {
      if (item.local_id === undefined) continue;
      const result = resultByUuid.get(item.client_uuid);
      if (result && (result.status === "created" || result.status === "duplicate")) {
        await removePendingInvoice(item.local_id);
      } else {
        await markPendingStatus(item.local_id, "failed", result?.error || "Sync failed");
      }
    }
  } catch (err: any) {
    // Network-level failure (e.g. connection dropped mid-request): put
    // everything back to "pending" so the next trigger retries the batch.
    const pending = await getPendingInvoices();
    for (const item of pending) {
      if (item.local_id !== undefined && item.status === "syncing") {
        await markPendingStatus(item.local_id, "pending", err?.message || "Network error");
      }
    }
  } finally {
    syncing = false;
    await notify();
  }
}

let started = false;

export function startAutoSync(): void {
  if (started) return;
  started = true;

  window.addEventListener("online", () => void runSync());
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") void runSync();
  });
  // Belt-and-braces periodic retry in case the 'online' event is missed
  // (common on flaky booth wifi that flickers without a clean transition).
  setInterval(() => void runSync(), 30_000);

  void runSync();
}
