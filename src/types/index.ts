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
// PAYMENT MODE
// ============================================================

export type PaymentMode =
  | "online"
  | "cash";

// ============================================================
// DISCOUNT MODE
// ============================================================

/**
 * Discount can be entered either as:
 *
 * amount     -> fixed rupee amount
 * percentage -> percentage of subtotal
 */
export type DiscountMode =
  | "amount"
  | "percentage";

// ============================================================
// MESSAGE LOG
// ============================================================

export interface MessageLog {
  channel:
    | "whatsapp"
    | "sms";

  status:
    | "pending"
    | "sent"
    | "failed"
    | "skipped";

  provider_sid?: string | null;

  error_message?: string | null;

  created_at: string;
}

// ============================================================
// INVOICE ITEM
// ============================================================

export interface InvoiceItem {
  id?: number;

  product_name: string;

  item_number: number;

  /**
   * Final customer-facing GST-inclusive price.
   */
  unit_price: number;
}

// ============================================================
// GST BREAKUP
// ============================================================

export interface GSTBreakup {
  gst_rate: number;

  taxable_value: number;

  gst_amount: number;

  cgst_rate: number;

  cgst_amount: number;

  sgst_rate: number;

  sgst_amount: number;

  inclusive: boolean;
}

// ============================================================
// INVOICE OUTPUT
// ============================================================

export interface InvoiceOut {
  id: number;

  client_uuid: string;

  invoice_number: string;

  // ----------------------------------------------------------
  // Agent
  // ----------------------------------------------------------

  agent_id?: number;

  // ----------------------------------------------------------
  // Customer
  // ----------------------------------------------------------

  customer_name: string;

  customer_phone?: string | null;

  customer_email?: string | null;

  // ----------------------------------------------------------
  // Products
  // ----------------------------------------------------------

  product_description?: string | null;

  items: InvoiceItem[];

  // ----------------------------------------------------------
  // GST
  // ----------------------------------------------------------

  gst_enabled: boolean;

  tax_percent: number;

  taxable_value: number;

  tax_amount: number;

  cgst_rate: number;

  cgst_amount: number;

  sgst_rate: number;

  sgst_amount: number;

  gst_breakup?: GSTBreakup;

  // ----------------------------------------------------------
  // Discount
  // ----------------------------------------------------------

  /**
   * Final calculated discount amount in rupees.
   *
   * This remains the authoritative value used by
   * the backend.
   */
  discount_amount: number;

  /**
   * Optional frontend information about how the discount
   * was entered.
   */
  discount_mode?: DiscountMode;

  /**
   * Discount percentage when percentage mode is used.
   */
  discount_percentage?: number;

  // ----------------------------------------------------------
  // Payment
  // ----------------------------------------------------------

  payment_mode: PaymentMode;

  // ----------------------------------------------------------
  // Grand total
  // ----------------------------------------------------------

  /**
   * Final customer payable amount.
   *
   * GST is already included in item prices.
   *
   * grand_total =
   * subtotal - discount
   */
  grand_total: number;

  // ----------------------------------------------------------
  // Calculated values
  // ----------------------------------------------------------

  quantity: number;

  subtotal: number;

  /**
   * Kept for compatibility with existing frontend code.
   *
   * Backend total should represent the final payable amount.
   */
  total: number;

  // ----------------------------------------------------------
  // Additional
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
  // Messaging
  // ----------------------------------------------------------

  messages: MessageLog[];
}

// ============================================================
// INVOICE LIST ITEM
// ============================================================

export interface InvoiceListItem {
  id: number;

  invoice_number: string;

  customer_name: string;

  customer_phone?: string | null;

  /**
   * Final payable amount.
   */
  total: number;

  /**
   * Same final payable amount as stored in backend.
   */
  grand_total?: number;

  quantity: number;

  created_at: string;
}

// ============================================================
// FORM ITEM
// ============================================================

export interface InvoiceItemInput {
  product_name: string;

  item_number: number;

  /**
   * Manually entered final customer price.
   *
   * GST is already included.
   */
  unit_price: number;
}

// ============================================================
// INVOICE FORM DATA
// ============================================================

export interface InvoiceFormData {
  // ----------------------------------------------------------
  // Idempotency
  // ----------------------------------------------------------

  client_uuid: string;

  // ----------------------------------------------------------
  // Customer
  // ----------------------------------------------------------

  customer_name: string;

  customer_phone?: string;

  customer_email?: string;

  // ----------------------------------------------------------
  // Products
  // ----------------------------------------------------------

  items: InvoiceItemInput[];

  product_description?: string;

  // ----------------------------------------------------------
  // GST
  // ----------------------------------------------------------

  /**
   * true  = GST enabled
   * false = GST disabled
   */
  gst_enabled: boolean;

  /**
   * Example:
   *
   * 3 = 3%
   */
  tax_percent: number;

  // ----------------------------------------------------------
  // Discount
  // ----------------------------------------------------------

  /**
   * How the user entered the discount.
   *
   * amount:
   *     Fixed rupee discount.
   *
   * percentage:
   *     Percentage-based discount.
   *
   * Optional so existing invoice records/code remain
   * backward compatible.
   */
  discount_mode?: DiscountMode;

  /**
   * Percentage entered by the user when percentage mode
   * is selected.
   *
   * Example:
   *
   * 10 = 10%
   */
  discount_percentage?: number;

  /**
   * Final calculated discount amount in rupees.
   *
   * This field remains the value sent to the backend.
   *
   * Example:
   *
   * subtotal = 1000
   * percentage = 10
   * discount_amount = 100
   */
    discount_amount: number;

  /**
   * Final customer payable amount.
   *
   * Used by the offline database and sync manager.
   */
  grand_total: number;

  // ----------------------------------------------------------
  // Payment
  // ----------------------------------------------------------

  payment_mode: PaymentMode;

  // ----------------------------------------------------------
  // Additional
  // ----------------------------------------------------------

  notes?: string;

  exhibition_name?: string;

  // ----------------------------------------------------------
  // Timestamp
  // ----------------------------------------------------------

  captured_at: string;

  // ----------------------------------------------------------
  // Offline photo
  // ----------------------------------------------------------

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