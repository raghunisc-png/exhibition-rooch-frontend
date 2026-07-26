import { apiClient } from "./client";
import type { InvoiceFormData, InvoiceListItem, InvoiceOut } from "../types";

export async function fetchInvoices(q?: string): Promise<InvoiceListItem[]> {
  const { data } = await apiClient.get("/api/invoices", { params: q ? { q } : undefined });
  return data as InvoiceListItem[];
}

export async function fetchInvoice(id: number): Promise<InvoiceOut> {
  const { data } = await apiClient.get(`/api/invoices/${id}`);
  return data as InvoiceOut;
}

export async function resendInvoice(id: number): Promise<InvoiceOut> {
  const { data } = await apiClient.post(`/api/invoices/${id}/resend`, {});
  return data as InvoiceOut;
}

/**
 * Create an invoice directly (used when the device is online). Photo is
 * sent as multipart form data along with the rest of the fields.
 */
export async function createInvoiceOnline(
  invoice: InvoiceFormData,
  photoFile: File | null
): Promise<InvoiceOut> {
  const form = new FormData();
  form.append("client_uuid", invoice.client_uuid);
  form.append("customer_name", invoice.customer_name);
  form.append("customer_phone", invoice.customer_phone);
  if (invoice.customer_email) form.append("customer_email", invoice.customer_email);
  form.append("product_name", invoice.product_name);
  if (invoice.product_description) form.append("product_description", invoice.product_description);
  form.append("quantity", String(invoice.quantity));
  form.append("unit_price", String(invoice.unit_price));
  form.append("tax_percent", String(invoice.tax_percent));
  form.append("discount_amount", String(invoice.discount_amount));
  if (invoice.notes) form.append("notes", invoice.notes);
  if (invoice.exhibition_name) form.append("exhibition_name", invoice.exhibition_name);
  form.append("captured_at", invoice.captured_at);
  if (photoFile) form.append("photo", photoFile);

  const { data } = await apiClient.post("/api/invoices", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data as InvoiceOut;
}

export interface SyncResultItem {
  client_uuid: string;
  status: "created" | "duplicate" | "error";
  invoice_id?: number;
  invoice_number?: string;
  error?: string;
}

/** Push a batch of offline-queued invoices to the server. */
export async function syncInvoices(items: InvoiceFormData[]): Promise<SyncResultItem[]> {
  const { data } = await apiClient.post("/api/sync/invoices", { items });
  return data.results as SyncResultItem[];
}
