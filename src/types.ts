export interface Agent {
  id: number;
  full_name: string;
  email: string;
  role: "admin" | "agent";
  booth_name?: string | null;
}

export interface MessageLog {
  channel: "whatsapp" | "sms";
  status: "pending" | "sent" | "failed" | "skipped";
  error_message?: string | null;
  created_at: string;
}

export interface InvoiceOut {
  id: number;
  client_uuid: string;
  invoice_number: string;
  customer_name: string;
  customer_phone: string;
  customer_email?: string | null;
  product_name: string;
  product_description?: string | null;
  quantity: number;
  unit_price: number;
  tax_percent: number;
  discount_amount: number;
  notes?: string | null;
  exhibition_name?: string | null;
  product_photo_path?: string | null;
  pdf_path?: string | null;
  created_at: string;
  captured_at: string;
  subtotal: number;
  tax_amount: number;
  total: number;
  messages: MessageLog[];
}

export interface InvoiceListItem {
  id: number;
  invoice_number: string;
  customer_name: string;
  customer_phone: string;
  product_name: string;
  total: number;
  created_at: string;
}

/** Shape of a locally-drafted invoice before it's synced to the server. */
export interface InvoiceFormData {
  client_uuid: string;
  customer_name: string;
  customer_phone: string;
  customer_email?: string;
  product_name: string;
  product_description?: string;
  quantity: number;
  unit_price: number;
  tax_percent: number;
  discount_amount: number;
  notes?: string;
  exhibition_name?: string;
  captured_at: string;
  photo_base64?: string;
  photo_content_type?: string;
}

export type PendingStatus = "pending" | "syncing" | "failed";

export interface PendingInvoice extends InvoiceFormData {
  local_id?: number;
  status: PendingStatus;
  last_error?: string;
}
