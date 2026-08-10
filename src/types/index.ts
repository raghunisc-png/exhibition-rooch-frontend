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

  // ----------------------------------------------------------
  // Customer
  // ----------------------------------------------------------

  customer_name: string;

  customer_phone?: string | null;

  customer_email?: string | null;

  // ----------------------------------------------------------
  // Product information
  // ----------------------------------------------------------

  /**
   * Optional description shared by the invoice.
   */
  product_description?: string | null;

  /**
   * Every product/item has its own manually entered price.
   */
  items: InvoiceItem[];

  // ----------------------------------------------------------
  // Tax / discount
  // ----------------------------------------------------------

  tax_percent: number;

  discount_amount: number;

  // ----------------------------------------------------------
  // Additional information
  // ----------------------------------------------------------

  notes?: string | null;

  exhibition_name?: string | null;

  // ----------------------------------------------------------
  // Files
  // ----------------------------------------------------------

  product_photo_path?: string | null;

  pdf_path?: string | null;

  // ----------------------------------------------------------
  // Dates
  // ----------------------------------------------------------

  created_at: string;

  captured_at: string;

  // ----------------------------------------------------------
  // Calculated by backend
  // ----------------------------------------------------------

  /**
   * Total number of individually priced items.
   */
  quantity: number;

  /**
   * Sum of all item prices.
   */
  subtotal: number;

  /**
   * Calculated tax.
   */
  tax_amount: number;

  /**
   * Final amount:
   *
   * subtotal + tax_amount - discount_amount
   */
  total: number;

  // ----------------------------------------------------------
  // WhatsApp / SMS delivery history
  // ----------------------------------------------------------

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

  /**
   * Number of individually priced items in the invoice.
   */
  quantity: number;
}

// ============================================================
// FORM ITEM
// ============================================================

/**
 * Item being entered by the booth user.
 *
 * There is NO fixed product price.
 *
 * The booth agent manually enters the price for every
 * individual item.
 *
 * Example:
 *
 * Rings #1 -> 250
 * Rings #2 -> 400
 * Rings #3 -> 350
 */
export interface InvoiceItemInput {
  /**
   * Product/category name.
   *
   * Example:
   * Rings
   * Necklace
   * Bracelet
   */
  product_name: string;

  /**
   * Position shown in the UI:
   *
   * 1 | 2 | 3 | 4 | 5
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
 * Invoice captured by the frontend before it is:
 *
 * 1. Sent directly to the backend when online
 * OR
 * 2. Stored in IndexedDB when offline
 */
export interface InvoiceFormData {
  // ----------------------------------------------------------
  // Idempotency
  // ----------------------------------------------------------

  /**
   * Client-generated UUID.
   *
   * Used by the backend to prevent duplicate invoices
   * when an offline invoice is retried.
   */
  client_uuid: string;

  // ----------------------------------------------------------
  // Customer
  // ----------------------------------------------------------

  /**
   * REQUIRED.
   */
  customer_name: string;

  /**
   * OPTIONAL.
   */
  customer_phone?: string;

  /**
   * OPTIONAL.
   */
  customer_email?: string;

  // ----------------------------------------------------------
  // Products
  // ----------------------------------------------------------

  /**
   * Multiple individually priced products.
   *
   * Example:
   *
   * [
   *   {
   *     product_name: "Rings",
   *     item_number: 1,
   *     unit_price: 250
   *   },
   *   {
   *     product_name: "Rings",
   *     item_number: 2,
   *     unit_price: 400
   *   }
   * ]
   */
  items: InvoiceItemInput[];

  /**
   * Optional description shared by the invoice.
   */
  product_description?: string;

  // ----------------------------------------------------------
  // Tax / discount
  // ----------------------------------------------------------

  tax_percent: number;

  discount_amount: number;

  // ----------------------------------------------------------
  // Additional details
  // ----------------------------------------------------------

  notes?: string;

  exhibition_name?: string;

  // ----------------------------------------------------------
  // Offline capture timestamp
  // ----------------------------------------------------------

  captured_at: string;

  // ----------------------------------------------------------
  // Offline photo
  // ----------------------------------------------------------

  /**
   * Base64 encoded photo.
   *
   * Used when the invoice is saved offline.
   */
  photo_base64?: string;

  /**
   * Example:
   *
   * image/jpeg
   */
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

/**
 * Invoice stored locally in IndexedDB while offline.
 */
export interface PendingInvoice
  extends InvoiceFormData {
  /**
   * IndexedDB generated local ID.
   */
  local_id?: number;

  /**
   * Current synchronization status.
   */
  status: PendingStatus;

  /**
   * Last synchronization error, if any.
   */
  last_error?: string;
}