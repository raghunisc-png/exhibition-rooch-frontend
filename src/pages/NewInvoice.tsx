import { FormEvent, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import CameraCapture, {
  CapturedPhoto,
} from "../components/CameraCapture";

import {
  createInvoiceOnline,
} from "../api/invoices";

import {
  queuePendingInvoice,
} from "../db/offlineDb";

import {
  runSync,
} from "../sync/syncManager";

import type {
  InvoiceFormData,
} from "../types";


// ============================================================
// PRODUCT TYPES
// ============================================================

type Product = {
  id: string;
  name: string;
  icon: string;
};

type ProductPrices = Record<
  string,
  Record<number, string>
>;


// ============================================================
// CONSTANTS
// ============================================================

const PRODUCT_SLOTS = [1, 2, 3, 4, 5];

const INITIAL_PRODUCTS: Product[] = [
  {
    id: "rings",
    name: "Rings",
    icon: "💍",
  },
  {
    id: "necklace",
    name: "Necklace",
    icon: "📿",
  },
  {
    id: "bracelet",
    name: "Bracelet",
    icon: "🧿",
  },
  {
    id: "earrings",
    name: "Earrings",
    icon: "👂",
  },
  {
    id: "anklets",
    name: "Anklets",
    icon: "👣",
  },
  {
    id: "sets",
    name: "Sets",
    icon: "✨",
  },
];


// ============================================================
// HELPERS
// ============================================================

const createEmptyPrices = (): ProductPrices => {
  const result: ProductPrices = {};

  INITIAL_PRODUCTS.forEach(
    (product) => {
      result[product.id] = {};

      PRODUCT_SLOTS.forEach(
        (slot) => {
          result[product.id][slot] = "";
        },
      );
    },
  );

  return result;
};


function newClientUuid(): string {
  return crypto.randomUUID();
}


/**
 * Convert the product photo to base64.
 *
 * This is only needed when the invoice has to be stored
 * offline in IndexedDB.
 */
function fileToBase64(
  file: File,
): Promise<string> {
  return new Promise(
    (resolve, reject) => {
      const reader =
        new FileReader();

      reader.onload = () => {
        const result =
          reader.result as string;

        resolve(
          result.split(",")[1],
        );
      };

      reader.onerror = reject;

      reader.readAsDataURL(file);
    },
  );
}


// ============================================================
// COMPONENT
// ============================================================

export default function NewInvoice() {
  const navigate =
    useNavigate();

  // ----------------------------------------------------------
  // Customer
  // ----------------------------------------------------------

  const [customerName, setCustomerName] =
    useState("");

  const [customerPhone, setCustomerPhone] =
    useState("");

  const [customerEmail, setCustomerEmail] =
    useState("");


  // ----------------------------------------------------------
  // Products
  // ----------------------------------------------------------

  const [products, setProducts] =
    useState<Product[]>(
      INITIAL_PRODUCTS,
    );

  const [prices, setPrices] =
    useState<ProductPrices>(
      createEmptyPrices,
    );


  // ----------------------------------------------------------
  // Invoice values
  // ----------------------------------------------------------

  const [taxPercent, setTaxPercent] =
    useState("0");

  const [discountAmount, setDiscountAmount] =
    useState("0");

  const [exhibitionName, setExhibitionName] =
    useState("");

  const [notes, setNotes] =
    useState("");


  // ----------------------------------------------------------
  // Photo
  // ----------------------------------------------------------

  const [photo, setPhoto] =
    useState<CapturedPhoto | null>(
      null,
    );


  // ----------------------------------------------------------
  // Add product
  // ----------------------------------------------------------

  const [newProductName, setNewProductName] =
    useState("");


  // ----------------------------------------------------------
  // Submission state
  // ----------------------------------------------------------

  const [submitting, setSubmitting] =
    useState(false);

  const [error, setError] =
    useState<string | null>(
      null,
    );

  const [successMessage, setSuccessMessage] =
    useState<string | null>(
      null,
    );


  // ==========================================================
  // PRICE UPDATE
  // ==========================================================

  const updatePrice = (
    productId: string,
    slot: number,
    value: string,
  ) => {
    if (
      !/^\d*\.?\d*$/.test(
        value,
      )
    ) {
      return;
    }

    setPrices(
      (current) => ({
        ...current,

        [productId]: {
          ...current[productId],

          [slot]: value,
        },
      }),
    );
  };


  // ==========================================================
  // ADD PRODUCT
  // ==========================================================

  const addProduct = () => {
    const name =
      newProductName.trim();

    if (!name) {
      return;
    }

    const id =
      `${name
        .toLowerCase()
        .replace(
          /[^a-z0-9]+/g,
          "-",
        )}-${Date.now()}`;

    const newProduct: Product = {
      id,
      name,
      icon: "＋",
    };

    setProducts(
      (current) => [
        ...current,
        newProduct,
      ],
    );

    setPrices(
      (current) => ({
        ...current,

        [id]:
          PRODUCT_SLOTS.reduce(
            (
              acc,
              slot,
            ) => {
              acc[slot] = "";
              return acc;
            },
            {} as Record<
              number,
              string
            >,
          ),
      }),
    );

    setNewProductName("");
  };


  // ==========================================================
  // REMOVE PRODUCT
  // ==========================================================

  const removeProduct = (
    productId: string,
  ) => {
    setProducts(
      (current) =>
        current.filter(
          (product) =>
            product.id !==
            productId,
        ),
    );

    setPrices(
      (current) => {
        const updated = {
          ...current,
        };

        delete updated[
          productId
        ];

        return updated;
      },
    );
  };


  // ==========================================================
  // SELECTED ITEMS
  // ==========================================================

  const selectedItems =
    useMemo(() => {
      const items: {
        productId: string;
        productName: string;
        productIcon: string;
        slot: number;
        price: number;
      }[] = [];

      products.forEach(
        (product) => {
          PRODUCT_SLOTS.forEach(
            (slot) => {
              const rawValue =
                prices[
                  product.id
                ]?.[slot] ?? "";

              if (
                rawValue.trim() ===
                ""
              ) {
                return;
              }

              const numericValue =
                Number(
                  rawValue,
                );

              if (
                Number.isNaN(
                  numericValue,
                )
              ) {
                return;
              }

              items.push({
                productId:
                  product.id,

                productName:
                  product.name,

                productIcon:
                  product.icon,

                slot,

                price:
                  numericValue,
              });
            },
          );
        },
      );

      return items;
    }, [
      products,
      prices,
    ]);


  // ==========================================================
  // TOTALS
  // ==========================================================

  const totalQuantity =
    selectedItems.length;

  const subtotal =
    useMemo(
      () =>
        selectedItems.reduce(
          (
            sum,
            item,
          ) =>
            sum +
            item.price,
          0,
        ),
      [selectedItems],
    );

  const taxAmount =
    useMemo(() => {
      const tax =
        Number(
          taxPercent,
        ) || 0;

      return (
        subtotal *
        tax /
        100
      );
    }, [
      subtotal,
      taxPercent,
    ]);

  const discount =
    Number(
      discountAmount,
    ) || 0;

  const grandTotal =
    Math.max(
      0,
      subtotal +
        taxAmount -
        discount,
    );


  // ==========================================================
  // GROUPED ITEMS FOR SUMMARY
  // ==========================================================

  const groupedItems =
    useMemo(() => {
      return products
        .map(
          (product) => {
            const items =
              selectedItems.filter(
                (item) =>
                  item.productId ===
                  product.id,
              );

            if (
              items.length ===
              0
            ) {
              return null;
            }

            return {
              product,
              items,
              quantity:
                items.length,

              total:
                items.reduce(
                  (
                    sum,
                    item,
                  ) =>
                    sum +
                    item.price,
                  0,
                ),
            };
          },
        )
        .filter(Boolean) as {
        product: Product;
        items: typeof selectedItems;
        quantity: number;
        total: number;
      }[];
    }, [
      products,
      selectedItems,
    ]);


  // ==========================================================
  // CREATE BACKEND ITEMS
  // ==========================================================

  /**
   * Convert UI items into the backend format.
   *
   * Example:
   *
   * Ring #1 = ₹250
   * Ring #2 = ₹400
   *
   * becomes:
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
  const buildInvoiceItems = () => {
    return selectedItems.map(
      (item) => ({
        product_name:
          item.productName,

        item_number:
          item.slot,

        unit_price:
          item.price,
      }),
    );
  };


  // ==========================================================
  // CREATE INVOICE
  // ==========================================================

  const handleCreateInvoice = async (
    event?: FormEvent,
  ) => {
    event?.preventDefault();

    setError(null);
    setSuccessMessage(null);

    // --------------------------------------------------------
    // Customer name required
    // --------------------------------------------------------

    if (
      !customerName.trim()
    ) {
      setError(
        "Please enter customer name.",
      );

      return;
    }

    // --------------------------------------------------------
    // Product photo required
    // --------------------------------------------------------

    if (!photo) {
      setError(
        "Please add a product photo.",
      );

      return;
    }

    // --------------------------------------------------------
    // At least one priced item
    // --------------------------------------------------------

    if (
      selectedItems.length ===
      0
    ) {
      setError(
        "Please enter at least one product price.",
      );

      return;
    }

    setSubmitting(true);

    const clientUuid =
      newClientUuid();

    // --------------------------------------------------------
    // Build invoice data
    // --------------------------------------------------------

    const invoiceData: InvoiceFormData =
      {
        client_uuid:
          clientUuid,

        customer_name:
          customerName.trim(),

        customer_phone:
          customerPhone.trim() ||
          undefined,

        customer_email:
          customerEmail.trim() ||
          undefined,

        items:
          buildInvoiceItems(),

        tax_percent:
          Number(
            taxPercent,
          ) || 0,

        discount_amount:
          Number(
            discountAmount,
          ) || 0,

        notes:
          notes.trim() ||
          undefined,

        exhibition_name:
          exhibitionName.trim() ||
          undefined,

        captured_at:
          new Date().toISOString(),
      };


    // ========================================================
    // ONLINE
    // ========================================================

    try {
      if (
        navigator.onLine
      ) {
        await createInvoiceOnline(
          invoiceData,
          photo.file,
        );

        setSuccessMessage(
          "Invoice created and sent to the customer.",
        );
      } else {
        throw new Error(
          "offline",
        );
      }
    }

    // ========================================================
    // OFFLINE / NETWORK FAILURE
    // ========================================================

    catch (err) {
      console.error(
        "Online invoice creation failed:",
        err,
      );

      try {
        /*
         * Convert the required photo into base64 so the
         * complete invoice can be stored locally.
         */

        invoiceData.photo_base64 =
          await fileToBase64(
            photo.file,
          );

        invoiceData.photo_content_type =
          photo.file.type ||
          "image/jpeg";


        await queuePendingInvoice(
          {
            ...invoiceData,

            status:
              "pending",
          },
        );


        setSuccessMessage(
          "Invoice saved on this device. It will sync automatically when the connection returns.",
        );


        // Try immediately in case the connection
        // came back during the request.
        void runSync();
      }

      catch (queueError) {
        console.error(
          "Offline invoice save failed:",
          queueError,
        );

        setError(
          "Could not save this invoice. Please try again.",
        );

        setSubmitting(false);

        return;
      }
    }


    // ========================================================
    // RESET FORM
    // ========================================================

    setCustomerName("");
    setCustomerPhone("");
    setCustomerEmail("");

    setPrices(
      createEmptyPrices(),
    );

    setTaxPercent("0");
    setDiscountAmount("0");

    setExhibitionName("");
    setNotes("");

    if (photo) {
      URL.revokeObjectURL(
        photo.previewUrl,
      );
    }

    setPhoto(null);

    setSubmitting(false);


    // ========================================================
    // GO TO INVOICE LIST
    // ========================================================

    setTimeout(
      () => {
        navigate(
          "/invoices",
        );
      },
      900,
    );
  };


  // ==========================================================
  // UI
  // ==========================================================

  return (
    <div className="invoice-page">

      {/* ====================================================
          PAGE HEADER
      ==================================================== */}

      <div className="invoice-page-header">

        <div>
          <h1 className="invoice-page-title">
            Create Invoice
          </h1>

          <p className="invoice-page-description">
            Add customer details and individual product prices.
          </p>
        </div>


        <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">

          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 font-bold text-blue-600">
            #
          </div>

          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Items
            </p>

            <p className="text-sm font-extrabold text-slate-900">
              {totalQuantity}
            </p>
          </div>

        </div>

      </div>


      {/* ====================================================
          MAIN LAYOUT
      ==================================================== */}

      <form
        onSubmit={
          handleCreateInvoice
        }
        className="invoice-layout"
      >

        <div className="invoice-main">


          {/* =================================================
              CUSTOMER DETAILS
          ================================================= */}

          <section className="invoice-card">

            <div className="invoice-card-header">

              <div className="invoice-card-heading">

                <div className="invoice-card-icon">
                  👤
                </div>

                <div>
                  <h2 className="invoice-card-title">
                    Customer details
                  </h2>

                  <p className="invoice-card-description">
                    Add the customer's basic information.
                  </p>
                </div>

              </div>

            </div>


            <div className="invoice-card-body">

              <div className="form-grid">

                <div className="form-full">

                  <label className="form-label">

                    Customer name

                    <span className="required-badge">
                      Required
                    </span>

                  </label>

                  <input
                    required
                    value={
                      customerName
                    }
                    onChange={(e) =>
                      setCustomerName(
                        e.target.value,
                      )
                    }
                    placeholder="Priya Sharma"
                    className="invoice-input"
                  />

                </div>


                <div>

                  <label className="form-label">

                    WhatsApp / Phone{" "}

                    <span className="form-optional">
                      (Optional)
                    </span>

                  </label>

                  <input
                    type="tel"
                    inputMode="tel"
                    value={
                      customerPhone
                    }
                    onChange={(e) =>
                      setCustomerPhone(
                        e.target.value,
                      )
                    }
                    placeholder="+91 9876543210"
                    className="invoice-input"
                  />

                </div>


                <div>

                  <label className="form-label">

                    Email{" "}

                    <span className="form-optional">
                      (Optional)
                    </span>

                  </label>

                  <input
                    type="email"
                    value={
                      customerEmail
                    }
                    onChange={(e) =>
                      setCustomerEmail(
                        e.target.value,
                      )
                    }
                    placeholder="priya@email.com"
                    className="invoice-input"
                  />

                </div>

              </div>

            </div>

          </section>


          {/* =================================================
              PRODUCT PHOTO
          ================================================= */}

          <section className="invoice-card">

            <div className="invoice-card-header">

              <div className="invoice-card-heading">

                <div className="invoice-card-icon">
                  📷
                </div>

                <div>

                  <h2 className="invoice-card-title">

                    Product photo

                    <span className="required-badge">
                      Required
                    </span>

                  </h2>

                  <p className="invoice-card-description">
                    Take or upload a clear photo of the purchased products.
                  </p>

                </div>

              </div>

            </div>


            <div className="invoice-card-body">

              <div className="product-photo-wrapper">

                <CameraCapture
                  value={photo}
                  onChange={setPhoto}
                />

              </div>

            </div>

          </section>


          {/* =================================================
              PRODUCT PRICES
          ================================================= */}

          <section className="invoice-card">

            <div className="invoice-card-header">

              <div className="invoice-card-heading">

                <div className="invoice-card-icon invoice-card-icon-dark">
                  ₹
                </div>

                <div>

                  <h2 className="invoice-card-title">
                    Product prices
                  </h2>

                  <p className="invoice-card-description">
                    Enter the selling price of each unique product.
                  </p>

                </div>

              </div>


              <div className="product-price-note">
                Each box = 1 unique item
              </div>

            </div>


            <div className="product-price-body">

              <div className="product-columns-header">

                <div className="product-column-title">
                  Product
                </div>

                {PRODUCT_SLOTS.map(
                  (slot) => (
                    <div
                      key={slot}
                      className="product-slot-heading"
                    >

                      <div className="product-slot-number">
                        {slot}
                      </div>

                      <span className="product-slot-caption">
                        Item
                      </span>

                    </div>
                  ),
                )}

                <div />

              </div>


              {products.map(
                (product) => {

                  const enteredCount =
                    PRODUCT_SLOTS.filter(
                      (slot) =>
                        (
                          prices[
                            product.id
                          ]?.[slot] ??
                          ""
                        ).trim() !== "",
                    ).length;


                  return (
                    <div
                      key={
                        product.id
                      }
                      className="product-row"
                    >

                      <div className="product-info">

                        <div className="product-icon">
                          {product.icon}
                        </div>

                        <div className="min-w-0">

                          <div className="product-name">
                            {product.name}
                          </div>

                          <div className="product-count">
                            {enteredCount}{" "}
                            {enteredCount ===
                            1
                              ? "item"
                              : "items"}
                          </div>

                        </div>

                      </div>


                      <div className="product-prices-mobile-grid">

                        {PRODUCT_SLOTS.map(
                          (slot) => {

                            const value =
                              prices[
                                product.id
                              ]?.[
                                slot
                              ] ?? "";


                            return (
                              <div
                                key={
                                  slot
                                }
                                className="price-field"
                              >

                                <span className="price-symbol">
                                  ₹
                                </span>

                                <input
                                  type="text"
                                  inputMode="decimal"
                                  value={
                                    value
                                  }
                                  onChange={(
                                    e,
                                  ) =>
                                    updatePrice(
                                      product.id,
                                      slot,
                                      e.target.value,
                                    )
                                  }
                                  placeholder="—"
                                  aria-label={`${product.name} item ${slot} price`}
                                  className="price-input"
                                />

                              </div>
                            );
                          },
                        )}

                      </div>


                      <button
                        type="button"
                        onClick={() =>
                          removeProduct(
                            product.id,
                          )
                        }
                        aria-label={`Remove ${product.name}`}
                        className="remove-product"
                      >
                        ×
                      </button>

                    </div>
                  );
                },
              )}

            </div>


            {/* ADD PRODUCT */}

            <div className="add-product-area">

              <div className="add-product-row">

                <input
                  value={
                    newProductName
                  }
                  onChange={(e) =>
                    setNewProductName(
                      e.target.value,
                    )
                  }
                  onKeyDown={(e) => {
                    if (
                      e.key ===
                      "Enter"
                    ) {
                      e.preventDefault();

                      addProduct();
                    }
                  }}
                  placeholder="Add another product, e.g. Brooch"
                  className="invoice-input"
                />

                <button
                  type="button"
                  onClick={
                    addProduct
                  }
                  className="add-product-button"
                >
                  + Add Product
                </button>

              </div>

            </div>

          </section>


          {/* =================================================
              ADDITIONAL DETAILS
          ================================================= */}

          <section className="invoice-card">

            <div className="invoice-card-header">

              <div className="invoice-card-heading">

                <div className="invoice-card-icon">
                  📝
                </div>

                <div>

                  <h2 className="invoice-card-title">
                    Additional details
                  </h2>

                  <p className="invoice-card-description">
                    Optional event and invoice notes.
                  </p>

                </div>

              </div>

            </div>


            <div className="invoice-card-body">

              <div className="form-grid">

                <div className="form-full">

                  <label className="form-label">

                    Exhibition / Event{" "}

                    <span className="form-optional">
                      (Optional)
                    </span>

                  </label>

                  <input
                    value={
                      exhibitionName
                    }
                    onChange={(e) =>
                      setExhibitionName(
                        e.target.value,
                      )
                    }
                    placeholder="e.g. Jewellery Expo 2026"
                    className="invoice-input"
                  />

                </div>


                <div className="form-full">

                  <label className="form-label">

                    Notes{" "}

                    <span className="form-optional">
                      (Optional)
                    </span>

                  </label>

                  <textarea
                    value={
                      notes
                    }
                    onChange={(e) =>
                      setNotes(
                        e.target.value,
                      )
                    }
                    rows={4}
                    placeholder="Add any special notes..."
                    className="invoice-input"
                  />

                </div>

              </div>

            </div>

          </section>


          {/* =================================================
              ERROR / SUCCESS
          ================================================= */}

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {error}
            </div>
          )}

          {successMessage && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
              {successMessage}
            </div>
          )}

        </div>


        {/* ==================================================
            SUMMARY
        ================================================== */}

        <aside className="invoice-summary">

          <div className="invoice-card">

            <div className="border-b border-slate-100 bg-slate-900 px-5 py-5 text-white">

              <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                Invoice summary
              </p>


              <div className="mt-2 flex items-end justify-between">

                <div>

                  <p className="text-sm text-slate-400">
                    {totalQuantity} unique item
                    {totalQuantity !==
                    1
                      ? "s"
                      : ""}
                  </p>

                  <p className="mt-1 text-3xl font-bold tracking-tight">
                    ₹
                    {grandTotal.toFixed(
                      2,
                    )}
                  </p>

                </div>


                <div className="rounded-xl bg-white/10 px-3 py-2 text-center">

                  <p className="text-[9px] uppercase tracking-wider text-slate-400">
                    Items
                  </p>

                  <p className="text-lg font-bold">
                    {totalQuantity}
                  </p>

                </div>

              </div>

            </div>


            <div className="max-h-[420px] overflow-y-auto p-4">

              {groupedItems.length ===
              0 ? (

                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center">

                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-white text-xl shadow-sm">
                    ₹
                  </div>

                  <p className="text-sm font-semibold text-slate-700">
                    No items yet
                  </p>

                  <p className="mt-1 text-xs leading-5 text-slate-400">
                    Enter prices above to add products to this invoice.
                  </p>

                </div>

              ) : (

                <div className="space-y-4">

                  {groupedItems.map(
                    ({
                      product,
                      items,
                      quantity,
                      total,
                    }) => (

                      <div
                        key={
                          product.id
                        }
                        className="rounded-xl border border-slate-100 bg-slate-50 p-3"
                      >

                        <div className="flex items-center justify-between gap-3">

                          <div className="flex min-w-0 items-center gap-2">

                            <span className="text-lg">
                              {
                                product.icon
                              }
                            </span>

                            <div className="min-w-0">

                              <p className="truncate text-sm font-bold text-slate-800">
                                {
                                  product.name
                                }
                              </p>

                              <p className="text-[10px] text-slate-400">
                                {quantity} unique item
                                {quantity !==
                                1
                                  ? "s"
                                  : ""}
                              </p>

                            </div>

                          </div>


                          <p className="shrink-0 text-sm font-bold text-slate-900">
                            ₹
                            {total.toFixed(
                              2,
                            )}
                          </p>

                        </div>


                        <div className="mt-3 space-y-1.5 border-t border-slate-200 pt-2">

                          {items.map(
                            (item) => (

                              <div
                                key={`${item.productId}-${item.slot}`}
                                className="flex items-center justify-between gap-3 text-xs"
                              >

                                <span className="text-slate-500">
                                  Item{" "}
                                  {
                                    item.slot
                                  }
                                </span>

                                <span className="font-semibold text-slate-700">
                                  ₹
                                  {item.price.toFixed(
                                    2,
                                  )}
                                </span>

                              </div>

                            ),
                          )}

                        </div>

                      </div>

                    ),
                  )}

                </div>

              )}

            </div>


            {/* =================================================
                TOTALS
            ================================================= */}

            <div className="border-t border-slate-100 p-5">

              <div className="space-y-3">

                <div className="flex items-center justify-between text-sm">

                  <span className="text-slate-500">
                    Subtotal
                  </span>

                  <span className="font-semibold text-slate-800">
                    ₹
                    {subtotal.toFixed(
                      2,
                    )}
                  </span>

                </div>


                <div className="grid grid-cols-2 gap-3">

                  <div>

                    <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Tax %
                    </label>

                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={
                        taxPercent
                      }
                      onChange={(e) =>
                        setTaxPercent(
                          e.target.value,
                        )
                      }
                      className="invoice-small-input"
                    />

                  </div>


                  <div>

                    <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Discount
                    </label>

                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={
                        discountAmount
                      }
                      onChange={(e) =>
                        setDiscountAmount(
                          e.target.value,
                        )
                      }
                      className="invoice-small-input"
                    />

                  </div>

                </div>


                <div className="flex items-center justify-between text-sm">

                  <span className="text-slate-500">
                    Tax amount
                  </span>

                  <span className="font-semibold text-slate-800">
                    ₹
                    {taxAmount.toFixed(
                      2,
                    )}
                  </span>

                </div>


                <div className="flex items-center justify-between text-sm">

                  <span className="text-slate-500">
                    Discount
                  </span>

                  <span className="font-semibold text-red-500">
                    - ₹
                    {discount.toFixed(
                      2,
                    )}
                  </span>

                </div>


                <div className="my-3 border-t border-dashed border-slate-200" />


                <div className="flex items-end justify-between gap-3">

                  <div>

                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Grand total
                    </p>

                    <p className="mt-1 text-2xl font-bold text-slate-900">
                      ₹
                      {grandTotal.toFixed(
                        2,
                      )}
                    </p>

                  </div>


                  <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-600">
                    Ready
                  </span>

                </div>

              </div>


              {/* =================================================
                  CREATE BUTTON
              ================================================= */}

              <button
                type="submit"
                disabled={
                  submitting
                }
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
              >

                {submitting
                  ? "Creating Invoice..."
                  : "Create Invoice"}

                {!submitting && (
                  <span>
                    →
                  </span>
                )}

              </button>

            </div>

          </div>

        </aside>

      </form>

    </div>
  );
}