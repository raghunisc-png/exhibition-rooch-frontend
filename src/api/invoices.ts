import { apiClient } from "./client";

import type {
  GSTBreakup,
  InvoiceFormData,
  InvoiceListItem,
  InvoiceOut,
  PaymentMode,
} from "../types/index";

// ============================================================
// NORMALIZE GST BREAKUP
// ============================================================

function normalizeGSTBreakup(
  breakup: any,
): GSTBreakup {
  return {
    gst_rate: Number(
      breakup?.gst_rate ?? 0,
    ),

    taxable_value: Number(
      breakup?.taxable_value ?? 0,
    ),

    gst_amount: Number(
      breakup?.gst_amount ?? 0,
    ),

    cgst_rate: Number(
      breakup?.cgst_rate ?? 0,
    ),

    cgst_amount: Number(
      breakup?.cgst_amount ?? 0,
    ),

    sgst_rate: Number(
      breakup?.sgst_rate ?? 0,
    ),

    sgst_amount: Number(
      breakup?.sgst_amount ?? 0,
    ),

    inclusive:
      breakup?.inclusive !== false,
  };
}

// ============================================================
// NORMALIZE PAYMENT MODE
// ============================================================

function normalizePaymentMode(
  value: any,
): PaymentMode {
  return value === "cash"
    ? "cash"
    : "online";
}

// ============================================================
// NORMALIZE BOOLEAN
// ============================================================

function normalizeBoolean(
  value: any,
): boolean {
  if (
    typeof value ===
    "boolean"
  ) {
    return value;
  }

  if (
    value === "true" ||
    value === "1" ||
    value === 1
  ) {
    return true;
  }

  return false;
}

// ============================================================
// NORMALIZE PHOTO BASE64
// ============================================================

function normalizePhotoBase64(
  value: any,
): string | undefined {
  if (
    typeof value !==
    "string"
  ) {
    return undefined;
  }

  const cleaned =
    value.trim();

  if (!cleaned) {
    return undefined;
  }

  return cleaned;
}

// ============================================================
// NORMALIZE PHOTO CONTENT TYPE
// ============================================================

function normalizePhotoContentType(
  value: any,
): string {
  if (
    typeof value !==
      "string" ||
    !value.trim()
  ) {
    return "image/jpeg";
  }

  return value.trim();
}

// ============================================================
// INVOICE LIST ITEM
// ============================================================

function normalizeInvoiceListItem(
  item: any,
): InvoiceListItem {
  const grandTotal =
    Number(
      item.grand_total ??
        item.total ??
        0,
    );

  return {
    ...item,

    gst_enabled:
      normalizeBoolean(
        item.gst_enabled,
      ),

    tax_percent:
      Number(
        item.tax_percent ?? 0,
      ),

    payment_mode:
      normalizePaymentMode(
        item.payment_mode,
      ),

    subtotal:
      Number(
        item.subtotal ?? 0,
      ),

    discount_amount:
      Number(
        item.discount_amount ?? 0,
      ),

    grand_total:
      grandTotal,

    // Backward compatibility
    total:
      grandTotal,

    quantity:
      Number(
        item.quantity ?? 0,
      ),

    created_at:
      item.created_at,
  };
}

// ============================================================
// SINGLE INVOICE
// ============================================================

function normalizeInvoice(
  invoice: any,
): InvoiceOut {
  const grandTotal =
    Number(
      invoice.grand_total ??
        invoice.total ??
        0,
    );

  const gstBreakup =
    normalizeGSTBreakup(
      invoice.gst_breakup,
    );

  return {
    ...invoice,

    // --------------------------------------------------------
    // GST
    // --------------------------------------------------------

    gst_enabled:
      normalizeBoolean(
        invoice.gst_enabled,
      ),

    tax_percent:
      Number(
        invoice.tax_percent ?? 0,
      ),

    taxable_value:
      Number(
        invoice.taxable_value ??
          gstBreakup.taxable_value ??
          0,
      ),

    tax_amount:
      Number(
        invoice.tax_amount ??
          gstBreakup.gst_amount ??
          0,
      ),

    cgst_rate:
      Number(
        invoice.cgst_rate ??
          gstBreakup.cgst_rate ??
          0,
      ),

    cgst_amount:
      Number(
        invoice.cgst_amount ??
          gstBreakup.cgst_amount ??
          0,
      ),

    sgst_rate:
      Number(
        invoice.sgst_rate ??
          gstBreakup.sgst_rate ??
          0,
      ),

    sgst_amount:
      Number(
        invoice.sgst_amount ??
          gstBreakup.sgst_amount ??
          0,
      ),

    gst_breakup:
      gstBreakup,

    // --------------------------------------------------------
    // DISCOUNT
    // --------------------------------------------------------

    discount_amount:
      Number(
        invoice.discount_amount ??
          0,
      ),

    // --------------------------------------------------------
    // PAYMENT
    // --------------------------------------------------------

    payment_mode:
      normalizePaymentMode(
        invoice.payment_mode,
      ),

    // --------------------------------------------------------
    // TOTALS
    // --------------------------------------------------------

    quantity:
      Number(
        invoice.quantity ?? 0,
      ),

    subtotal:
      Number(
        invoice.subtotal ?? 0,
      ),

    grand_total:
      grandTotal,

    total:
      grandTotal,

    // --------------------------------------------------------
    // ITEMS
    // --------------------------------------------------------

    items: (
      invoice.items ?? []
    ).map(
      (item: any) => ({
        ...item,

        id:
          item.id !==
          undefined
            ? Number(item.id)
            : undefined,

        item_number:
          Number(
            item.item_number ??
              0,
          ),

        unit_price:
          Number(
            item.unit_price ??
              0,
          ),
      }),
    ),

    // --------------------------------------------------------
    // MESSAGES
    // --------------------------------------------------------

    messages:
      invoice.messages ??
      [],
  };
}

// ============================================================
// GET INVOICE LIST
// ============================================================

export async function fetchInvoices(
  q?: string,
): Promise<
  InvoiceListItem[]
> {
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
 * Backend expects multipart/form-data.
 *
 * IMPORTANT:
 *
 * This function is for direct online invoice creation.
 *
 * Offline invoices are handled by syncInvoices().
 */

export async function createInvoiceOnline(
  invoice: InvoiceFormData,
  photoFile: File,
): Promise<InvoiceOut> {
  // ==========================================================
  // CUSTOMER VALIDATION
  // ==========================================================

  if (
    !invoice.customer_name?.trim()
  ) {
    throw new Error(
      "Customer name is required.",
    );
  }

  // ==========================================================
  // ITEMS VALIDATION
  // ==========================================================

  if (
    !invoice.items ||
    invoice.items.length === 0
  ) {
    throw new Error(
      "At least one product item is required.",
    );
  }

  // ==========================================================
  // PHOTO VALIDATION
  // ==========================================================

  if (
    !photoFile ||
    !(photoFile instanceof File) ||
    photoFile.size <= 0
  ) {
    throw new Error(
      "Product photo is required.",
    );
  }

  // ==========================================================
  // PAYMENT MODE
  // ==========================================================

  const paymentMode =
    normalizePaymentMode(
      invoice.payment_mode,
    );

  // ==========================================================
  // GST
  // ==========================================================

  const gstEnabled =
    normalizeBoolean(
      invoice.gst_enabled,
    );

  const gstRate =
    Number(
      invoice.tax_percent ?? 0,
    );

  if (
    !Number.isFinite(
      gstRate,
    ) ||
    gstRate < 0 ||
    gstRate > 100
  ) {
    throw new Error(
      "GST percentage must be between 0 and 100.",
    );
  }

  // ==========================================================
  // FORM DATA
  // ==========================================================

  const form =
    new FormData();

  // ==========================================================
  // CLIENT UUID
  // ==========================================================

  form.append(
    "client_uuid",
    invoice.client_uuid,
  );

  // ==========================================================
  // CUSTOMER
  // ==========================================================

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

  // ==========================================================
  // ITEMS
  // ==========================================================

  form.append(
    "items",
    JSON.stringify(
      invoice.items,
    ),
  );

  // ==========================================================
  // PRODUCT DESCRIPTION
  // ==========================================================

  if (
    invoice.product_description?.trim()
  ) {
    form.append(
      "product_description",
      invoice.product_description.trim(),
    );
  }

  // ==========================================================
  // GST ENABLED
  // ==========================================================

  form.append(
    "gst_enabled",
    String(
      gstEnabled,
    ),
  );

  // ==========================================================
  // GST RATE
  // ==========================================================

  form.append(
    "tax_percent",
    String(
      gstEnabled
        ? gstRate
        : 0,
    ),
  );

  // ==========================================================
  // DISCOUNT
  // ==========================================================

  form.append(
    "discount_amount",
    String(
      invoice.discount_amount ??
        0,
    ),
  );

  // ==========================================================
  // PAYMENT MODE
  // ==========================================================

  form.append(
    "payment_mode",
    paymentMode,
  );

  // ==========================================================
  // NOTES
  // ==========================================================

  if (
    invoice.notes?.trim()
  ) {
    form.append(
      "notes",
      invoice.notes.trim(),
    );
  }

  // ==========================================================
  // EXHIBITION
  // ==========================================================

  if (
    invoice.exhibition_name?.trim()
  ) {
    form.append(
      "exhibition_name",
      invoice.exhibition_name.trim(),
    );
  }

  // ==========================================================
  // CAPTURED AT
  // ==========================================================

  form.append(
    "captured_at",
    invoice.captured_at,
  );

  // ==========================================================
  // PRODUCT PHOTO
  // ==========================================================

  form.append(
    "photo",
    photoFile,
  );

  // ==========================================================
  // DEBUG
  // ==========================================================

  console.log(
    "[INVOICE API] Creating online invoice:",
    {
      client_uuid:
        invoice.client_uuid,

      payment_mode:
        paymentMode,

      gst_enabled:
        gstEnabled,

      tax_percent:
        gstEnabled
          ? gstRate
          : 0,

      photo_name:
        photoFile.name,

      photo_type:
        photoFile.type,

      photo_size:
        photoFile.size,
    },
  );

  // ==========================================================
  // SEND
  // ==========================================================

  const { data } =
    await apiClient.post(
      "/api/invoices",
      form,
    );

  // ==========================================================
  // RESPONSE
  // ==========================================================

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

  invoice_id?:
    | number
    | null;

  invoice_number?:
    | string
    | null;

  error?: string;
}

// ============================================================
// OFFLINE SYNC
// ============================================================

/**
 * Send invoices stored in IndexedDB to:
 *
 * POST /api/sync/invoices
 *
 * The backend expects:
 *
 * {
 *   items: [
 *     {
 *       client_uuid,
 *       customer_name,
 *       customer_phone,
 *       customer_email,
 *       items,
 *       gst_enabled,
 *       tax_percent,
 *       discount_amount,
 *       payment_mode,
 *       notes,
 *       exhibition_name,
 *       captured_at,
 *       photo_base64,
 *       photo_content_type
 *     }
 *   ]
 * }
 *
 * IMPORTANT:
 *
 * Offline invoices use Base64 photo data.
 *
 * We do NOT use createInvoiceOnline() here because that
 * endpoint expects multipart/form-data with a File.
 */

export async function syncInvoices(
  items: InvoiceFormData[],
): Promise<
  SyncResultItem[]
> {
  if (
    !items ||
    items.length === 0
  ) {
    return [];
  }

  // ==========================================================
  // NORMALIZE + VALIDATE
  // ==========================================================

  const normalizedItems =
    items.map(
      (invoice) => {
        // ----------------------------------------------------
        // PAYMENT MODE
        // ----------------------------------------------------

        const paymentMode =
          normalizePaymentMode(
            invoice.payment_mode,
          );

        // ----------------------------------------------------
        // GST
        // ----------------------------------------------------

        const gstEnabled =
          normalizeBoolean(
            invoice.gst_enabled,
          );

        const taxPercent =
          gstEnabled
            ? Number(
                invoice.tax_percent ??
                  0,
              )
            : 0;

        // ----------------------------------------------------
        // PHOTO
        // ----------------------------------------------------

        const photoBase64 =
          normalizePhotoBase64(
            invoice.photo_base64,
          );

        const photoContentType =
          normalizePhotoContentType(
            invoice.photo_content_type,
          );

        // ----------------------------------------------------
        // DEBUG
        // ----------------------------------------------------

        console.log(
          "[SYNC] Invoice normalization:",
          {
            client_uuid:
              invoice.client_uuid,

            customer_name:
              invoice.customer_name,

            payment_mode:
              paymentMode,

            gst_enabled:
              gstEnabled,

            tax_percent:
              taxPercent,

            discount_amount:
              Number(
                invoice.discount_amount ??
                  0,
              ),

            photo_available:
              Boolean(
                photoBase64,
              ),

            photo_length:
              photoBase64?.length ??
              0,

            photo_content_type:
              photoContentType,
          },
        );

        // ----------------------------------------------------
        // RETURN COMPLETE OBJECT
        // ----------------------------------------------------

        return {
          ...invoice,

          // Explicitly preserve payment mode
          payment_mode:
            paymentMode,

          // Explicitly preserve GST
          gst_enabled:
            gstEnabled,

          tax_percent:
            taxPercent,

          discount_amount:
            Number(
              invoice.discount_amount ??
                0,
            ),

          // Explicitly preserve photo
          photo_base64:
            photoBase64,

          photo_content_type:
            photoContentType,
        };
      },
    );

  // ==========================================================
  // FINAL VALIDATION
  // ==========================================================

  for (
    const invoice of normalizedItems
  ) {
    const photo =
      normalizePhotoBase64(
        invoice.photo_base64,
      );

    if (!photo) {
      console.error(
        "[SYNC] Invoice has no photo_base64:",
        invoice.client_uuid,
      );

      throw new Error(
        `Product photo is missing for invoice ${invoice.client_uuid}.`,
      );
    }

    if (
      !invoice.client_uuid
    ) {
      throw new Error(
        "Invoice client UUID is missing.",
      );
    }

    if (
      !invoice.customer_name?.trim()
    ) {
      throw new Error(
        `Customer name is missing for invoice ${invoice.client_uuid}.`,
      );
    }

    if (
      !invoice.items ||
      invoice.items.length === 0
    ) {
      throw new Error(
        `Invoice ${invoice.client_uuid} has no items.`,
      );
    }
  }

  // ==========================================================
  // DEBUG REQUEST
  // ==========================================================

  console.log(
    "[SYNC] Sending invoices to backend:",
    normalizedItems.map(
      (invoice) => ({
        client_uuid:
          invoice.client_uuid,

        payment_mode:
          invoice.payment_mode,

        gst_enabled:
          invoice.gst_enabled,

        tax_percent:
          invoice.tax_percent,

        photo_available:
          Boolean(
            invoice.photo_base64,
          ),

        photo_length:
          invoice.photo_base64
            ?.length ??
          0,

        photo_content_type:
          invoice.photo_content_type,
      }),
    ),
  );

  // ==========================================================
  // SEND JSON
  // ==========================================================

  const { data } =
    await apiClient.post(
      "/api/sync/invoices",
      {
        items:
          normalizedItems,
      },
    );

  // ==========================================================
  // RESPONSE
  // ==========================================================

  console.log(
    "[SYNC] Backend response:",
    data?.results ??
      data,
  );

  return (
    data?.results ??
    []
  ) as SyncResultItem[];
}
