import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchInvoices } from "../api/invoices";
import { cacheInvoiceList, getCachedInvoiceList, getPendingInvoices } from "../db/offlineDb";
import { onSyncStateChange, runSync } from "../sync/syncManager";
import type { InvoiceListItem, PendingInvoice } from "../types";

export default function InvoiceList() {
  const [invoices, setInvoices] = useState<InvoiceListItem[]>([]);
  const [pending, setPending] = useState<PendingInvoice[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [offlineNotice, setOfflineNotice] = useState(false);

  const loadPending = async () => setPending(await getPendingInvoices());

  const loadInvoices = async (q?: string) => {
    setLoading(true);
    try {
      const data = await fetchInvoices(q);
      setInvoices(data);
      setOfflineNotice(false);
      if (!q) await cacheInvoiceList(data);
    } catch {
      const cached = await getCachedInvoiceList();
      setInvoices(cached);
      setOfflineNotice(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadInvoices();
    void loadPending();
    void runSync();
    const unsubscribe = onSyncStateChange(() => {
      void loadPending();
      void loadInvoices(query);
    });
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    void loadInvoices(query || undefined);
  };

  return (
    <div>
      <h1 className="mb-4 text-lg font-semibold text-gray-900">Invoices</h1>

      <form onSubmit={handleSearch} className="mb-4 flex gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search name, phone, invoice #…"
          className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
        <button type="submit" className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700">
          Search
        </button>
      </form>

      {offlineNotice && (
        <p className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
          Showing your last downloaded list — you're offline right now.
        </p>
      )}

      {pending.length > 0 && (
        <div className="mb-5">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
            Queued on this device ({pending.length})
          </h2>
          <div className="space-y-2">
            {pending.map((p) => (
              <div
                key={p.client_uuid}
                className="flex items-center justify-between rounded-xl border border-dashed border-amber-300 bg-amber-50 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-gray-900">{p.customer_name}</p>
                  <p className="truncate text-xs text-gray-500">
                    {p.product_name} · {p.customer_phone}
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-amber-200 px-2 py-1 text-[11px] font-medium text-amber-900">
                  {p.status === "syncing" ? "Syncing…" : p.status === "failed" ? "Retry pending" : "Queued"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : invoices.length === 0 && pending.length === 0 ? (
        <p className="text-sm text-gray-500">No invoices yet. Create your first one from the New Invoice tab.</p>
      ) : (
        <div className="space-y-2">
          {invoices.map((inv) => (
            <Link
              key={inv.id}
              to={`/invoices/${inv.id}`}
              className="flex items-center justify-between rounded-xl bg-white px-4 py-3 shadow-sm active:bg-gray-50"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-gray-900">{inv.customer_name}</p>
                <p className="truncate text-xs text-gray-500">
                  {inv.product_name} · {inv.invoice_number}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-sm font-semibold text-gray-900">{inv.total.toFixed(2)}</p>
                <p className="text-[11px] text-gray-400">{new Date(inv.created_at).toLocaleDateString()}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
