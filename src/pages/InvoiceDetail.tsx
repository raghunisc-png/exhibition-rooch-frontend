import {
  useEffect,
  useState,
} from "react";

import {
  Link,
  useParams,
} from "react-router-dom";

import {
  fetchInvoice,
  resendInvoice,
} from "../api/invoices";

import { fileUrl } from "../api/client";

import type {
  InvoiceOut,
} from "../types/index";

// ============================================================
// MESSAGE LABELS
// ============================================================

const channelLabel: Record<
  string,
  string
> = {
  whatsapp: "WhatsApp",
  sms: "SMS",
};

// ============================================================
// MESSAGE STATUS COLORS
// ============================================================

const statusStyle: Record<
  string,
  string
> = {
  sent:
    "bg-emerald-100 text-emerald-800",

  failed:
    "bg-red-100 text-red-800",

  pending:
    "bg-gray-100 text-gray-700",

  skipped:
    "bg-gray-100 text-gray-500",
};

// ============================================================
// COMPONENT
// ============================================================

export default function InvoiceDetail() {
  const { id } =
    useParams<{
      id: string;
    }>();

  const [
    invoice,
    setInvoice,
  ] = useState<
    InvoiceOut | null
  >(null);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    resending,
    setResending,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState<
    string | null
  >(null);

  // ==========================================================
  // LOAD INVOICE
  // ==========================================================

  const load =
    async () => {
      if (!id) {
        setError(
          "Invoice ID is missing.",
        );

        setLoading(false);

        return;
      }

      setLoading(true);

      try {
        const data =
          await fetchInvoice(
            Number(id),
          );

        console.log(
          "Invoice detail received:",
          data,
        );

        setInvoice(data);

        setError(null);
      } catch (err) {
        console.error(
          "Failed to load invoice:",
          err,
        );

        setError(
          "Couldn't load this invoice. Check your connection and try again.",
        );
      } finally {
        setLoading(false);
      }
    };

  // ==========================================================
  // INITIAL LOAD
  // ==========================================================

  useEffect(() => {
    void load();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // ==========================================================
  // RESEND
  // ==========================================================

  const handleResend =
    async () => {
      if (!invoice) {
        return;
      }

      setResending(true);

      setError(null);

      try {
        const updated =
          await resendInvoice(
            invoice.id,
          );

        setInvoice(
          updated,
        );
      } catch (err) {
        console.error(
          "Resend failed:",
          err,
        );

        setError(
          "Resend failed. Please check your connection and try again.",
        );
      } finally {
        setResending(false);
      }
    };

  // ==========================================================
  // LOADING
  // ==========================================================

  if (loading) {
    return (
      <div className="py-8 text-center text-sm text-gray-500">
        Loading…
      </div>
    );
  }

  // ==========================================================
  // ERROR
  // ==========================================================

  if (
    error &&
    !invoice
  ) {
    return (
      <div className="rounded-xl bg-red-50 p-4 text-sm text-red-700">
        {error}
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="py-8 text-center text-sm text-gray-500">
        Invoice not found.
      </div>
    );
  }

  // ==========================================================
  // FILE URLS
  // ==========================================================

  const photoUrl =
    fileUrl(
      invoice.product_photo_path,
    );

  const pdfUrl =
    fileUrl(
      invoice.pdf_path,
    );

  // ==========================================================
  // PHONE / MESSAGE LINKS
  // ==========================================================

  const phone =
    invoice.customer_phone
      ? invoice.customer_phone.replace(
          "+",
          "",
        )
      : "";

  const message =
    `Hi ${invoice.customer_name}, ` +
    `here is your invoice ` +
    `${invoice.invoice_number}: ` +
    `${pdfUrl ?? ""}`;

  const waLink =
    invoice.customer_phone
      ? `https://wa.me/${phone}?text=${encodeURIComponent(
          message,
        )}`
      : "#";

  const smsLink =
    invoice.customer_phone
      ? `sms:${invoice.customer_phone}?body=${encodeURIComponent(
          message,
        )}`
      : "#";

  // ==========================================================
  // ITEMS
  // ==========================================================

  const items =
    invoice.items ?? [];

  // ==========================================================
  // UI
  // ==========================================================

  return (
    <div className="space-y-4">
      {/* ======================================================
          BACK
      ====================================================== */}

      <Link
        to="/invoices"
        className="inline-flex items-center text-sm font-medium text-brand-600"
      >
        ← Back to invoices
      </Link>

      {/* ======================================================
          INVOICE SUMMARY
      ====================================================== */}

      <div className="rounded-xl bg-white p-4 shadow-sm">
        {/* Header */}

        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
              {
                invoice.invoice_number
              }
            </p>

            <h1 className="text-lg font-semibold text-gray-900">
              {
                invoice.customer_name
              }
            </h1>

            {invoice.customer_phone && (
              <p className="text-sm text-gray-500">
                {
                  invoice.customer_phone
                }
              </p>
            )}

            {invoice.customer_email && (
              <p className="truncate text-sm text-gray-500">
                {
                  invoice.customer_email
                }
              </p>
            )}
          </div>

          <p className="shrink-0 text-xl font-bold text-gray-900">
            ₹
            {Number(
              invoice.total ?? 0,
            ).toFixed(2)}
          </p>
        </div>

        {/* ====================================================
            PHOTO
        ==================================================== */}

        {photoUrl && (
          <img
            src={photoUrl}
            alt={
              items
                .map(
                  (item) =>
                    item.product_name,
                )
                .join(", ") ||
              "Invoice products"
            }
            className="mb-4 h-48 w-full rounded-lg object-cover"
          />
        )}

        {/* ====================================================
            PRODUCTS
        ==================================================== */}

        <div className="border-t pt-3">
          <h2 className="mb-3 text-sm font-semibold text-gray-700">
            Products
          </h2>

          {items.length ===
          0 ? (
            <p className="text-sm text-gray-500">
              No product items
              found.
            </p>
          ) : (
            <div className="space-y-2">
              {items.map(
                (item) => (
                  <div
                    key={
                      item.id ??
                      `${item.product_name}-${item.item_number}`
                    }
                    className="flex items-center justify-between gap-3 rounded-lg bg-gray-50 px-3 py-2"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {
                          item.product_name
                        }
                      </p>

                      <p className="text-xs text-gray-500">
                        Item #
                        {
                          item.item_number
                        }
                      </p>
                    </div>

                    <p className="text-sm font-semibold text-gray-900">
                      ₹
                      {Number(
                        item.unit_price ??
                          0,
                      ).toFixed(2)}
                    </p>
                  </div>
                ),
              )}
            </div>
          )}
        </div>

        {/* ====================================================
            TOTALS
        ==================================================== */}

        <div className="mt-4 space-y-2 border-t pt-3 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">
              Quantity
            </span>

            <span className="font-medium text-gray-900">
              {Number(
                invoice.quantity ?? 0,
              )}
            </span>
          </div>

          <div className="flex justify-between">
            <span className="text-gray-500">
              Subtotal
            </span>

            <span className="text-gray-900">
              ₹
              {Number(
                invoice.subtotal ?? 0,
              ).toFixed(2)}
            </span>
          </div>

          {Number(
            invoice.tax_percent ?? 0,
          ) > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-500">
                Tax (
                {Number(
                  invoice.tax_percent,
                )}
                %)
              </span>

              <span className="text-gray-900">
                ₹
                {Number(
                  invoice.tax_amount ??
                    0,
                ).toFixed(2)}
              </span>
            </div>
          )}

          {Number(
            invoice.discount_amount ??
              0,
          ) > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-500">
                Discount
              </span>

              <span className="text-gray-900">
                -₹
                {Number(
                  invoice.discount_amount ??
                    0,
                ).toFixed(2)}
              </span>
            </div>
          )}

          <div className="flex justify-between border-t pt-2">
            <span className="font-semibold text-gray-700">
              Total
            </span>

            <span className="font-bold text-gray-900">
              ₹
              {Number(
                invoice.total ?? 0,
              ).toFixed(2)}
            </span>
          </div>
        </div>

        {/* ====================================================
            NOTES
        ==================================================== */}

        {invoice.notes && (
          <div className="mt-4 rounded-lg bg-gray-50 p-3">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">
              Notes
            </p>

            <p className="text-sm text-gray-700">
              {invoice.notes}
            </p>
          </div>
        )}
      </div>

      {/* ======================================================
          DELIVERY
      ====================================================== */}

      <div className="rounded-xl bg-white p-4 shadow-sm">
        <h2 className="mb-2 text-sm font-semibold text-gray-700">
          Delivery status
        </h2>

        {invoice.messages
          .length ===
        0 ? (
          <p className="text-sm text-gray-500">
            No delivery attempts
            yet.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {invoice.messages.map(
              (m, i) => (
                <li
                  key={i}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="text-gray-700">
                    {
                      channelLabel[
                        m.channel
                      ] ||
                      m.channel
                    }
                  </span>

                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      statusStyle[
                        m.status
                      ] ??
                      "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {
                      m.status
                    }
                  </span>
                </li>
              ),
            )}
          </ul>
        )}

        {error && (
          <p className="mt-2 text-xs text-red-600">
            {error}
          </p>
        )}

        {/* ====================================================
            RESEND
        ==================================================== */}

        <button
          onClick={
            handleResend
          }
          disabled={
            resending
          }
          className="mt-3 w-full rounded-lg bg-brand-500 py-2.5 text-sm font-semibold text-white active:bg-brand-700 disabled:opacity-60"
        >
          {resending
            ? "Resending…"
            : "Resend via WhatsApp/SMS"}
        </button>

        {/* ====================================================
            WHATSAPP / SMS
        ==================================================== */}

        <div className="mt-2 grid grid-cols-2 gap-2">
          <a
            href={waLink}
            target="_blank"
            rel="noreferrer"
            aria-disabled={
              !invoice.customer_phone
            }
            className={`rounded-lg border border-gray-300 py-2 text-center text-xs font-medium ${
              invoice.customer_phone
                ? "text-gray-700"
                : "pointer-events-none text-gray-300"
            }`}
          >
            Open in WhatsApp
          </a>

          <a
            href={smsLink}
            aria-disabled={
              !invoice.customer_phone
            }
            className={`rounded-lg border border-gray-300 py-2 text-center text-xs font-medium ${
              invoice.customer_phone
                ? "text-gray-700"
                : "pointer-events-none text-gray-300"
            }`}
          >
            Open in SMS
          </a>
        </div>

        {!invoice.customer_phone && (
          <p className="mt-2 text-center text-xs text-gray-400">
            Customer phone number
            was not provided.
          </p>
        )}

        {/* ====================================================
            PDF
        ==================================================== */}

        {pdfUrl && (
          <a
            href={pdfUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-2 block text-center text-xs font-medium text-brand-600"
          >
            View / download PDF
            invoice
          </a>
        )}
      </div>
    </div>
  );
}
