export interface InvoiceItemFormData {
  product_name: string;
  item_number: number;
  unit_price: number;
}

export interface InvoiceFormData {
  client_uuid: string;

  customer_name: string;

  customer_phone?: string;

  customer_email?: string;

  items: InvoiceItemFormData[];

  product_description?: string;

  tax_percent: number;

  discount_amount: number;

  payment_mode:
    | "online"
    | "cash";

  notes?: string;

  exhibition_name?: string;

  captured_at?: string;

  photo_base64?: string;

  photo_content_type?: string;
}
