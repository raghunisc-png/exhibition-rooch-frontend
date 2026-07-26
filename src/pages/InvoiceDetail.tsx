import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { fetchInvoice, resendInvoice } from "../api/invoices";
import { fileUrl } from "../api/client";
import type { InvoiceOut } from "../types";

const channelLabel: Record<string, string> = { whatsapp: "WhatsApp", sms: "SMS" };
const statusStyle: Record<string, string> = {
  sent: "bg-emerald-100 text-emerald-800",
  failed: "bg-red-100 text-red-800",
  pending: "bg-gray-100 text-gray-700",
  skipped: "bg-gray-100 text-gray-500",
};

export default function InvoiceDetail() {
  const { id } = useParams<{ id: string }>();
  const [invoice, setInvoice] = useState<InvoiceOut | null>(null);
  const [loading, setLoading] = useState(true);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    try {
      setInvoice(await fetchInvoice(Number(id)));
      setError(null);
    } catch {
      setError("Couldn't load this invoice. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleResend = async () => {
    if (!invoice) return;
    setResending(true);
    try {
      setInvoice(await resendInvoice(invoice.id));
    } catch {
      setError("Resend failed. Please check your connection and try again.");
    } finally {
      setResending(false);
    }
  };

  if (loading) return <p className="text-sm text-gray-500">Loading…</p>;
  if (error && !invoice) return <p className="text-sm text-red-600">{error}</p>;
  if (!invoice) return null;

  const photoUrl = fileUrl(invoice.product_photo_path);
  const pdfUrl = fileUrl(invoice.pdf_path);
  const waLink = `https://wa.me/${invoice.customer_phone.replace("+", "")}?text=${encodeURIComponent(
    `Hi ${invoice.customer_name}, here is your invoice ${invoice.invoice_number}: ${pdfUrl ?? ""}`
  )}`;
  const smsLink = `sms:${invoice.customer_phone}?body=${encodeURIComponent(
    `Hi ${invoice.customer_name}, here is your invoice ${invoice.invoice_number}: ${pdfUrl ?? ""}`
  )}`;

  return (
    <div className="space-y-4">
      <Link to="/invoices" className="text-sm text-brand-600">
        ← Back to invoices
      </Link>

      <div className="rounded-xl bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-start justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{invoice.invoice_number}</p>
            <h1 className="text-lg font-semibold text-gray-900">{invoice.customer_name}</h1>
            <p className="text-sm text-gray-500">{invoice.customer_phone}</p>
          </div>
          <p className="text-xl font-bold text-gray-900">{invoice.total.toFixed(2)}</p>
        </div>

        {photoUrl && (
          <img src={photoUrl} alt={invoice.product_name} className="mb-3 h-48 w-full rounded-lg object-cover" />
        )}

        <div className="space-y-1 border-t pt-3 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Product</span>
            <span className="text-right font-medium text-gray-900">{invoice.product_name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Qty × Unit price</span>
            <span className="text-gray-900">
              {invoice.quantity} × {invoice.unit_price.toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Subtotal</span>
            <span className="text-gray-900">{invoice.subtotal.toFixed(2)}</span>
          </div>
          {invoice.tax_percent > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-500">Tax ({invoice.tax_percent}%)</span>
              <span className="text-gray-900">{invoice.tax_amount.toFixed(2)}</span>
            </div>
          )}
          {invoice.discount_amount > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-500">Discount</span>
              <span className="text-gray-900">-{invoice.discount_amount.toFixed(2)}</span>
            </div>
          )}
        </div>
      </div>

      <div className="rounded-xl bg-white p-4 shadow-sm">
        <h2 className="mb-2 text-sm font-semibold text-gray-700">Delivery status</h2>
        {invoice.messages.length === 0 ? (
          <p className="text-sm text-gray-500">No delivery attempts yet.</p>
        ) : (
          <ul className="space-y-1.5">
            {invoice.messages.map((m, i) => (
              <li key={i} className="flex items-center justify-between text-sm">
                <span className="text-gray-700">{channelLabel[m.channel] || m.channel}</span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusStyle[m.status]}`}>
                  {m.status}
                </span>
              </li>
            ))}
          </ul>
        )}

        {error && <p className="mt-2 text-xs text-red-600">{error}</p>}

        <button
          onClick={handleResend}
          disabled={resending}
          className="mt-3 w-full rounded-lg bg-brand-500 py-2.5 text-sm font-semibold text-white active:bg-brand-700 disabled:opacity-60"
        >
          {resending ? "Resending…" : "Resend via WhatsApp/SMS"}
        </button>

        <div className="mt-2 grid grid-cols-2 gap-2">
          <a
            href={waLink}
            target="_blank"
            rel="noreferrer"
            className="rounded-lg border border-gray-300 py-2 text-center text-xs font-medium text-gray-700"
          >
            Open in WhatsApp
          </a>
          <a
            href={smsLink}
            className="rounded-lg border border-gray-300 py-2 text-center text-xs font-medium text-gray-700"
          >
            Open in SMS
          </a>
        </div>

        {pdfUrl && (
          <a
            href={pdfUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-2 block text-center text-xs font-medium text-brand-600"
          >
            View / download PDF invoice
          </a>
        )}
      </div>
    </div>
  );
}
