import { apiClient } from "./client";

import type {
  InvoiceFormData,
  InvoiceListItem,
  InvoiceOut,
} from "../types";

// ============================================================
// NORMALIZE API NUMBERS
// ============================================================
//
// FastAPI / SQLAlchemy Decimal values may arrive in JSON as
// strings. The frontend needs actual numbers for:
//
//   .toFixed()
//   arithmetic
//   comparisons
//
// So we normalize them here in ONE place.
//

function normalizeInvoiceListItem(
  item: any,
): InvoiceListItem {
  return {
    ...item,

    total: Number(item.total ?? 0),

    quantity: Number(
      item.quantity ?? 0,
    ),
  };
}

function normalizeInvoice(
  invoice: any,
): InvoiceOut {
  return {
    ...invoice,

    tax_percent: Number(
      invoice.tax_percent ?? 0,
    ),

    discount_amount: Number(
      invoice.discount_amount ?? 0,
    ),

    quantity: Number(
      invoice.quantity ?? 0,
    ),

    subtotal: Number(
      invoice.subtotal ?? 0,
    ),

    tax_amount: Number(
      invoice.tax_amount ?? 0,
    ),

    total: Number(
      invoice.total ?? 0,
    ),

    items: (
      invoice.items ?? []
    ).map(
      (item: any) => ({
        ...item,

        id:
          item.id !== undefined
            ? Number(item.id)
            : undefined,

        item_number: Number(
          item.item_number ?? 0,
        ),

        unit_price: Number(
          item.unit_price ?? 0,
        ),
      }),
    ),

    messages:
      invoice.messages ?? [],
  };
}

// ============================================================
// GET INVOICE LIST
// ============================================================

export async function fetchInvoices(
  q?: string,
): Promise<InvoiceListItem[]> {
  const { data } =
    await apiClient.get(
      "/api/invoices",
      {
        params: q
          ? { q }
          : undefined,
      },
    );

  return (
    data as any[]
  ).map(
    normalizeInvoiceListItem,
  );
}

// ============================================================
// GET SINGLE INVOICE
// ============================================================

export async function fetchInvoice(
  id: number,
): Promise<InvoiceOut> {
  const { data } =
    await apiClient.get(
      `/api/invoices/${id}`,
    );

  return normalizeInvoice(
    data,
  );
}

// ============================================================
// RESEND INVOICE
// ============================================================

export async function resendInvoice(
  id: number,
): Promise<InvoiceOut> {
  const { data } =
    await apiClient.post(
      `/api/invoices/${id}/resend`,
      {},
    );

  return normalizeInvoice(
    data,
  );
}

// ============================================================
// CREATE ONLINE INVOICE
// ============================================================

/**
 * Create an invoice while online.
 *
 * Backend expects multipart/form-data:
 *
 * - customer information
 * - items as JSON
 * - tax
 * - discount
 * - photo
 */

export async function createInvoiceOnline(
  invoice: InvoiceFormData,
  photoFile: File,
): Promise<InvoiceOut> {
  // ----------------------------------------------------------
  // Validation
  // ----------------------------------------------------------

  if (!invoice.customer_name.trim()) {
    throw new Error(
      "Customer name is required.",
    );
  }

  if (
    !invoice.items ||
    invoice.items.length === 0
  ) {
    throw new Error(
      "At least one product item is required.",
    );
  }

  if (!photoFile) {
    throw new Error(
      "Product photo is required.",
    );
  }

  // ----------------------------------------------------------
  // FormData
  // ----------------------------------------------------------

  const form =
    new FormData();

  // ----------------------------------------------------------
  // Customer
  // ----------------------------------------------------------

  form.append(
    "client_uuid",
    invoice.client_uuid,
  );

  form.append(
    "customer_name",
    invoice.customer_name.trim(),
  );

  if (
    invoice.customer_phone?.trim()
  ) {
    form.append(
      "customer_phone",
      invoice.customer_phone.trim(),
    );
  }

  if (
    invoice.customer_email?.trim()
  ) {
    form.append(
      "customer_email",
      invoice.customer_email.trim(),
    );
  }

  // ----------------------------------------------------------
  // Items
  // ----------------------------------------------------------

  form.append(
    "items",
    JSON.stringify(
      invoice.items,
    ),
  );

  // ----------------------------------------------------------
  // Optional fields
  // ----------------------------------------------------------

  if (
    invoice.product_description?.trim()
  ) {
    form.append(
      "product_description",
      invoice.product_description.trim(),
    );
  }

  form.append(
    "tax_percent",
    String(
      invoice.tax_percent ?? 0,
    ),
  );

  form.append(
    "discount_amount",
    String(
      invoice.discount_amount ?? 0,
    ),
  );

  if (
    invoice.notes?.trim()
  ) {
    form.append(
      "notes",
      invoice.notes.trim(),
    );
  }

  if (
    invoice.exhibition_name?.trim()
  ) {
    form.append(
      "exhibition_name",
      invoice.exhibition_name.trim(),
    );
  }

  form.append(
    "captured_at",
    invoice.captured_at,
  );

  // ----------------------------------------------------------
  // Product photo
  // ----------------------------------------------------------

  form.append(
    "photo",
    photoFile,
  );

  // ----------------------------------------------------------
  // Send
  // ----------------------------------------------------------
  //
  // DO NOT manually set Content-Type.
  // Browser/Axios will add the multipart boundary.
  //

  const { data } =
    await apiClient.post(
      "/api/invoices",
      form,
    );

  return normalizeInvoice(
    data,
  );
}

// ============================================================
// SYNC RESULT
// ============================================================

export interface SyncResultItem {
  client_uuid: string;

  status:
    | "created"
    | "duplicate"
    | "error";

  invoice_id?: number;

  invoice_number?: string;

  error?: string;
}

// ============================================================
// OFFLINE SYNC
// ============================================================

export async function syncInvoices(
  items: InvoiceFormData[],
): Promise<SyncResultItem[]> {
  if (!items.length) {
    return [];
  }

  const { data } =
    await apiClient.post(
      "/api/sync/invoices",
      {
        items,
      },
    );

  return data.results as SyncResultItem[];
}