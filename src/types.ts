// ============================================================
// AGENT
// ============================================================

export interface Agent {
  id: number;
  full_name: string;
  email: string;
  role: "admin" | "agent";
  booth_name?: string | null;
}

// ============================================================
// MESSAGE LOG
// ============================================================

export interface MessageLog {
  channel: "whatsapp" | "sms";
  status: "pending" | "sent" | "failed" | "skipped";
  error_message?: string | null;
  created_at: string;
}

// ============================================================
// INVOICE ITEM
// ============================================================

/**
 * One individually priced product inside an invoice.
 *
 * Example:
 *
 * Ring #1 -> ₹250
 * Ring #2 -> ₹400
 * Ring #3 -> ₹350
 */
export interface InvoiceItem {
  id?: number;
  product_name: string;
  item_number: number;
  unit_price: number;
}

// ============================================================
// INVOICE OUTPUT
// ============================================================

export interface InvoiceOut {
  id: number;

  client_uuid: string;

  invoice_number: string;

  // Customer
  customer_name: string;
  customer_phone?: string | null;
  customer_email?: string | null;

  // Product description shared by the invoice
  product_description?: string | null;

  // Individually priced products
  items: InvoiceItem[];

  // Tax / discount
  tax_percent: number;
  discount_amount: number;

  notes?: string | null;

  exhibition_name?: string | null;

  product_photo_path?: string | null;

  pdf_path?: string | null;

  created_at: string;

  captured_at: string;

  // Calculated by backend
  quantity: number;
  subtotal: number;
  tax_amount: number;
  total: number;

  messages: MessageLog[];
}

// ============================================================
// INVOICE LIST
// ============================================================

export interface InvoiceListItem {
  id: number;

  invoice_number: string;

  customer_name: string;

  customer_phone?: string | null;

  total: number;

  created_at: string;

  quantity: number;
}

// ============================================================
// FORM ITEM
// ============================================================

/**
 * Item being entered by the booth user.
 *
 * The frontend does not use a fixed product price.
 */
export interface InvoiceItemInput {
  product_name: string;

  /**
   * Position shown in the UI:
   *
   * 1, 2, 3, 4, 5
   */
  item_number: number;

  /**
   * Manually entered price for this particular item.
   */
  unit_price: number;
}

// ============================================================
// INVOICE FORM DATA
// ============================================================

/**
 * Invoice captured by the frontend before it is sent
 * online or stored in IndexedDB.
 */
export interface InvoiceFormData {
  client_uuid: string;

  // Required
  customer_name: string;

  // Optional
  customer_phone?: string;

  // Optional
  customer_email?: string;

  // Multiple manually priced products
  items: InvoiceItemInput[];

  product_description?: string;

  tax_percent: number;

  discount_amount: number;

  notes?: string;

  exhibition_name?: string;

  captured_at: string;

  // Required when stored offline.
  photo_base64?: string;

  photo_content_type?: string;
}

// ============================================================
// OFFLINE STATUS
// ============================================================

export type PendingStatus =
  | "pending"
  | "syncing"
  | "failed";

// ============================================================
// PENDING INVOICE
// ============================================================

export interface PendingInvoice
  extends InvoiceFormData {
  local_id?: number;

  status: PendingStatus;

  last_error?: string;
}