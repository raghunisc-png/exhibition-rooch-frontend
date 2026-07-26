import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import CameraCapture, { CapturedPhoto } from "../components/CameraCapture";
import { createInvoiceOnline } from "../api/invoices";
import { queuePendingInvoice } from "../db/offlineDb";
import { runSync } from "../sync/syncManager";
import type { InvoiceFormData } from "../types";

function newClientUuid(): string {
  return crypto.randomUUID();
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Strip the "data:image/jpeg;base64," prefix.
      resolve(result.split(",")[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

const emptyForm = {
  customerName: "",
  customerPhone: "",
  customerEmail: "",
  productName: "",
  productDescription: "",
  quantity: "1",
  unitPrice: "",
  taxPercent: "0",
  discountAmount: "0",
  notes: "",
  exhibitionName: "",
};

export default function NewInvoice() {
  const navigate = useNavigate();
  const [form, setForm] = useState(emptyForm);
  const [photo, setPhoto] = useState<CapturedPhoto | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const update = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  const total = (() => {
    const qty = Number(form.quantity) || 0;
    const price = Number(form.unitPrice) || 0;
    const tax = Number(form.taxPercent) || 0;
    const discount = Number(form.discountAmount) || 0;
    const subtotal = qty * price;
    return Math.max(0, subtotal + (subtotal * tax) / 100 - discount);
  })();

  const validatePhone = (phone: string) => /^\+\d{8,15}$/.test(phone.trim());

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    const phone = form.customerPhone.trim();
    if (!validatePhone(phone)) {
      setError("Enter the customer's phone number with country code, e.g. +919876543210");
      return;
    }
    if (!form.customerName.trim() || !form.productName.trim()) {
      setError("Customer name and product name are required.");
      return;
    }

    setSubmitting(true);
    const clientUuid = newClientUuid();
    const invoiceData: InvoiceFormData = {
      client_uuid: clientUuid,
      customer_name: form.customerName.trim(),
      customer_phone: phone,
      customer_email: form.customerEmail.trim() || undefined,
      product_name: form.productName.trim(),
      product_description: form.productDescription.trim() || undefined,
      quantity: Number(form.quantity) || 1,
      unit_price: Number(form.unitPrice) || 0,
      tax_percent: Number(form.taxPercent) || 0,
      discount_amount: Number(form.discountAmount) || 0,
      notes: form.notes.trim() || undefined,
      exhibition_name: form.exhibitionName.trim() || undefined,
      captured_at: new Date().toISOString(),
    };

    try {
      if (navigator.onLine) {
        await createInvoiceOnline(invoiceData, photo?.file ?? null);
        setSuccessMessage("Invoice created and sent to the customer.");
      } else {
        throw new Error("offline");
      }
    } catch (err) {
      // Covers both "genuinely offline" and "request failed mid-flight"
      // (flaky booth wifi) - either way, save locally and let the
      // background sync manager retry once connectivity returns.
      try {
        if (photo?.file) {
          invoiceData.photo_base64 = await fileToBase64(photo.file);
          invoiceData.photo_content_type = photo.file.type;
        }
        await queuePendingInvoice({ ...invoiceData, status: "pending" });
        setSuccessMessage("Saved on this device. It will sync and send automatically once you're back online.");
        void runSync();
      } catch (queueErr) {
        console.error(queueErr);
        setError("Could not save this invoice. Please try again.");
        setSubmitting(false);
        return;
      }
    }

    setForm(emptyForm);
    if (photo) URL.revokeObjectURL(photo.previewUrl);
    setPhoto(null);
    setSubmitting(false);

    setTimeout(() => navigate("/invoices"), 900);
  };

  return (
    <div>
      <h1 className="mb-4 text-lg font-semibold text-gray-900">New Invoice</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <section className="space-y-3 rounded-xl bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-700">Customer details</h2>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Full name *</label>
            <input
              required
              value={form.customerName}
              onChange={update("customerName")}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-base focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              placeholder="Priya Sharma"
            />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Phone (WhatsApp/SMS) *</label>
              <input
                required
                type="tel"
                inputMode="tel"
                value={form.customerPhone}
                onChange={update("customerPhone")}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-base focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                placeholder="+919876543210"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Email (optional)</label>
              <input
                type="email"
                value={form.customerEmail}
                onChange={update("customerEmail")}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-base focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                placeholder="priya@email.com"
              />
            </div>
          </div>
        </section>

        <section className="space-y-3 rounded-xl bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-700">Product details</h2>

          <CameraCapture value={photo} onChange={setPhoto} />

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Product name *</label>
            <input
              required
              value={form.productName}
              onChange={update("productName")}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-base focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              placeholder="Wireless Earbuds Pro"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Description</label>
            <textarea
              value={form.productDescription}
              onChange={update("productDescription")}
              rows={2}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-base focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              placeholder="Color, size, model number, etc."
            />
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Qty</label>
              <input
                type="number"
                min={1}
                value={form.quantity}
                onChange={update("quantity")}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-base focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Unit price</label>
              <input
                type="number"
                min={0}
                step="0.01"
                value={form.unitPrice}
                onChange={update("unitPrice")}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-base focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Tax %</label>
              <input
                type="number"
                min={0}
                max={100}
                step="0.01"
                value={form.taxPercent}
                onChange={update("taxPercent")}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-base focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Discount</label>
              <input
                type="number"
                min={0}
                step="0.01"
                value={form.discountAmount}
                onChange={update("discountAmount")}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-base focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2.5">
            <span className="text-sm font-medium text-gray-600">Total</span>
            <span className="text-base font-semibold text-gray-900">{total.toFixed(2)}</span>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Exhibition / event name</label>
            <input
              value={form.exhibitionName}
              onChange={update("exhibitionName")}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-base focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              placeholder="e.g. TechExpo Bengaluru 2026"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Notes</label>
            <textarea
              value={form.notes}
              onChange={update("notes")}
              rows={2}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-base focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>
        </section>

        {error && <p className="text-sm text-red-600">{error}</p>}
        {successMessage && (
          <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">
            {successMessage}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-brand-500 py-3 text-sm font-semibold text-white active:bg-brand-700 disabled:opacity-60"
        >
          {submitting ? "Saving…" : "Create invoice & send to customer"}
        </button>
      </form>
    </div>
  );
}
