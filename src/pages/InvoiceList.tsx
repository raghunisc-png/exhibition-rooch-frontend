import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { fetchInvoices } from "../api/invoices";

import {
  cacheInvoiceList,
  getCachedInvoiceList,
  getPendingInvoices,
} from "../db/offlineDb";

import {
  onSyncStateChange,
  runSync,
} from "../sync/syncManager";

import type {
  InvoiceListItem,
  PendingInvoice,
} from "../types";

export default function InvoiceList() {
  // ==========================================================
  // STATE
  // ==========================================================

  const [invoices, setInvoices] =
    useState<InvoiceListItem[]>([]);

  const [pending, setPending] =
    useState<PendingInvoice[]>([]);

  const [query, setQuery] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [offlineNotice, setOfflineNotice] =
    useState(false);

  // ==========================================================
  // LOAD PENDING OFFLINE INVOICES
  // ==========================================================

  const loadPending = useCallback(
    async () => {
      try {
        const data =
          await getPendingInvoices();

        console.log(
          "Pending invoices:",
          data,
        );

        setPending(data);
      } catch (error) {
        console.error(
          "Failed to load pending invoices:",
          error,
        );
      }
    },
    [],
  );

  // ==========================================================
  // LOAD SERVER INVOICES
  // ==========================================================

  const loadInvoices = useCallback(
    async (q?: string) => {
      setLoading(true);

      try {
        const data =
          await fetchInvoices(q);

        console.log(
          "Invoices received from API:",
          data,
        );

        setInvoices(data);
        setOfflineNotice(false);

        // Cache only the normal unfiltered invoice list.
        if (!q) {
          await cacheInvoiceList(data);
        }

      } catch (error) {
        console.error(
          "Failed to load invoices:",
          error,
        );

        // ----------------------------------------------------
        // Backend unavailable/offline.
        // Show cached invoices.
        // ----------------------------------------------------

        try {
          const cached =
            await getCachedInvoiceList();

          setInvoices(cached);
          setOfflineNotice(true);

        } catch (cacheError) {
          console.error(
            "Failed to load cached invoices:",
            cacheError,
          );

          setInvoices([]);
          setOfflineNotice(true);
        }

      } finally {
        setLoading(false);
      }
    },
    [],
  );

  // ==========================================================
  // REFRESH EVERYTHING AFTER SYNC
  // ==========================================================

  const refreshAfterSync =
    useCallback(async () => {
      console.log(
        "[INVOICE LIST] Refreshing after sync...",
      );

      // IMPORTANT:
      //
      // Wait for IndexedDB first.
      //
      // This prevents the UI from showing an old "syncing"
      // record after the sync manager has already removed it.

      await loadPending();

      await loadInvoices(
        query.trim() || undefined,
      );
    }, [
      loadPending,
      loadInvoices,
      query,
    ]);

  // ==========================================================
  // INITIAL LOAD
  // ==========================================================

  useEffect(() => {
    let mounted = true;

    const initialize =
      async () => {
        if (!mounted) {
          return;
        }

        await loadInvoices();
        await loadPending();

        // Try to synchronize any existing offline invoices.
        await runSync();

        // Load once more after sync.
        //
        // This is important because runSync() may have deleted
        // invoices from IndexedDB.
        await loadPending();
        await loadInvoices();
      };

    void initialize();

    return () => {
      mounted = false;
    };
  }, [
    loadInvoices,
    loadPending,
  ]);

  // ==========================================================
  // LISTEN FOR SYNC CHANGES
  // ==========================================================

  useEffect(() => {
    const unsubscribe =
      onSyncStateChange(
        () => {
          void refreshAfterSync();
        },
      );

    return unsubscribe;
  }, [
    refreshAfterSync,
  ]);

  // ==========================================================
  // SEARCH
  // ==========================================================

  const handleSearch =
    (
      event: React.FormEvent,
    ) => {
      event.preventDefault();

      void loadInvoices(
        query.trim() || undefined,
      );
    };

  // ==========================================================
  // RETRY
  // ==========================================================

  const handleRetry =
    async () => {
      console.log(
        "[INVOICE LIST] Manual sync retry...",
      );

      await runSync();

      await loadPending();

      await loadInvoices(
        query.trim() || undefined,
      );
    };

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <div className="space-y-4">

      {/* =====================================================
          HEADER
          ===================================================== */}

      <div>
        <h1 className="text-xl font-semibold text-gray-900">
          Invoices
        </h1>

        <p className="mt-1 text-sm text-gray-500">
          View invoices created at this booth.
        </p>
      </div>

      {/* =====================================================
          SEARCH
          ===================================================== */}

      <form
        onSubmit={handleSearch}
        className="flex gap-2"
      >
        <input
          value={query}
          onChange={(event) =>
            setQuery(
              event.target.value,
            )
          }
          placeholder="Search name, phone, invoice #..."
          className="min-w-0 flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />

        <button
          type="submit"
          className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700"
        >
          Search
        </button>
      </form>

      {/* =====================================================
          OFFLINE NOTICE
          ===================================================== */}

      {offlineNotice && (
        <div className="rounded-lg bg-amber-50 px-3 py-2">
          <p className="text-xs font-medium text-amber-800">
            Showing your last downloaded invoice list.
            You are currently offline or the server is
            unavailable.
          </p>
        </div>
      )}

      {/* =====================================================
          LOCAL QUEUE
          ===================================================== */}

      {pending.length > 0 && (
        <div>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Queued on this device ({pending.length})
            </h2>

            <button
              type="button"
              onClick={handleRetry}
              className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-900"
            >
              Retry
            </button>
          </div>

          <div className="space-y-2">

            {pending.map(
              (invoice) => {
                const itemCount =
                  invoice.items?.length ?? 0;

                const statusText =
                  invoice.status ===
                  "syncing"
                    ? "Syncing..."
                    : invoice.status ===
                      "failed"
                    ? "Retry pending"
                    : "Queued";

                return (
                  <div
                    key={
                      invoice.client_uuid
                    }
                    className="rounded-xl border border-dashed border-amber-300 bg-amber-50 px-4 py-3"
                  >
                    <div className="flex items-center justify-between gap-3">

                      {/* Customer */}
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-gray-900">
                          {
                            invoice.customer_name
                          }
                        </p>

                        <p className="truncate text-xs text-gray-500">
                          {itemCount}{" "}
                          {itemCount === 1
                            ? "item"
                            : "items"}

                          {invoice.customer_phone
                            ? ` · ${invoice.customer_phone}`
                            : ""}
                        </p>

                        {/* Error */}
                        {invoice.last_error && (
                          <p className="mt-1 truncate text-xs text-red-600">
                            {
                              invoice.last_error
                            }
                          </p>
                        )}
                      </div>

                      {/* Status */}
                      <span
                        className={`
                          shrink-0 rounded-full px-2 py-1
                          text-[11px] font-medium
                          ${
                            invoice.status ===
                            "syncing"
                              ? "bg-blue-200 text-blue-900"
                              : invoice.status ===
                                "failed"
                              ? "bg-red-200 text-red-900"
                              : "bg-amber-200 text-amber-900"
                          }
                        `}
                      >
                        {statusText}
                      </span>
                    </div>
                  </div>
                );
              },
            )}

          </div>
        </div>
      )}

      {/* =====================================================
          LOADING
          ===================================================== */}

      {loading && (
        <div className="rounded-xl bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500">
            Loading invoices...
          </p>
        </div>
      )}

      {/* =====================================================
          EMPTY STATE
          ===================================================== */}

      {!loading &&
        invoices.length === 0 &&
        pending.length === 0 && (
          <div className="rounded-xl bg-white p-6 text-center shadow-sm">
            <p className="text-sm text-gray-500">
              No invoices yet.
            </p>

            <Link
              to="/"
              className="mt-3 inline-block text-sm font-medium text-brand-600"
            >
              Create your first invoice
            </Link>
          </div>
        )}

      {/* =====================================================
          SERVER INVOICES
          ===================================================== */}

      {!loading &&
        invoices.length > 0 && (
          <div className="space-y-2">

            {invoices.map(
              (invoice) => (
                <Link
                  key={invoice.id}
                  to={`/invoices/${invoice.id}`}
                  className="block rounded-xl bg-white px-4 py-3 shadow-sm transition active:bg-gray-50"
                >
                  <div className="flex items-center justify-between gap-3">

                    {/* Left */}
                    <div className="min-w-0">

                      <p className="truncate text-sm font-medium text-gray-900">
                        {
                          invoice.customer_name
                        }
                      </p>

                      <p className="truncate text-xs text-gray-500">
                        {invoice.quantity}{" "}
                        {invoice.quantity ===
                        1
                          ? "item"
                          : "items"}

                        {" · "}

                        {
                          invoice.invoice_number
                        }
                      </p>

                      {invoice.customer_phone && (
                        <p className="mt-0.5 truncate text-xs text-gray-400">
                          {
                            invoice.customer_phone
                          }
                        </p>
                      )}

                    </div>

                    {/* Right */}
                    <div className="shrink-0 text-right">

                      <p className="text-sm font-semibold text-gray-900">
                        ₹
                        {Number(
                          invoice.total,
                        ).toFixed(2)}
                      </p>

                      <p className="text-[11px] text-gray-400">
                        {new Date(
                          invoice.created_at,
                        ).toLocaleDateString()}
                      </p>

                    </div>

                  </div>
                </Link>
              ),
            )}

          </div>
        )}

    </div>
  );
}