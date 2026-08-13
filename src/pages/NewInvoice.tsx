import React, {
  FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { useNavigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext";

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
  DiscountMode,
  InvoiceFormData,
} from "../types";

// ============================================================
// TYPES
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

const PRODUCT_SLOTS = [
  1,
  2,
  3,
  4,
  5,
];

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
    icon: "✨",
  },
  {
    id: "earrings",
    name: "Earrings",
    icon: "◇",
  },
  {
    id: "anklets",
    name: "Anklets",
    icon: "✦",
  },
  {
    id: "sets",
    name: "Sets",
    icon: "◆",
  },
];

// ============================================================
// HELPERS
// ============================================================

function createEmptyPrices(): ProductPrices {
  const result: ProductPrices = {};

  INITIAL_PRODUCTS.forEach((product) => {
    result[product.id] = {};

    PRODUCT_SLOTS.forEach((slot) => {
      result[product.id][slot] = "";
    });
  });

  return result;
}

function createEmptyProductPrices(): Record<
  number,
  string
> {
  const result: Record<number, string> = {};

  PRODUCT_SLOTS.forEach((slot) => {
    result[slot] = "";
  });

  return result;
}

function newClientUuid(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}`;
}

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

        const parts =
          result.split(",");

        resolve(
          parts.length > 1
            ? parts[1]
            : result,
        );
      };

      reader.onerror = () => {
        reject(
          new Error(
            "Unable to read photo.",
          ),
        );
      };

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

  const {
    gstEnabled,
    gstRate,
    setGstEnabled,
    setGstRate,
  } = useAuth();

  // GST must start OFF when a new invoice screen is opened.
  // The setter from AuthContext may get a new function identity when
  // the context updates. A ref makes sure this reset happens ONLY ONCE
  // for this mounted NewInvoice screen, so clicking the GST toggle to
  // ON is not immediately reset back to OFF.
  const gstInitialisedRef = useRef(false);

  useEffect(() => {
    if (gstInitialisedRef.current) {
      return;
    }

    gstInitialisedRef.current = true;
    setGstEnabled(false);
  }, [setGstEnabled]);

  // ==========================================================
  // CUSTOMER
  // ==========================================================

  const [
    customerName,
    setCustomerName,
  ] = useState("");

  const [
    customerPhone,
    setCustomerPhone,
  ] = useState("+91 ");

  const [
    customerEmail,
    setCustomerEmail,
  ] = useState("");

  // ==========================================================
  // PRODUCTS
  // ==========================================================

  const [
    products,
    setProducts,
  ] = useState<Product[]>(
    INITIAL_PRODUCTS,
  );

  const [
    prices,
    setPrices,
  ] = useState<ProductPrices>(
    createEmptyPrices,
  );

  // ==========================================================
  // INVOICE DETAILS
  // ==========================================================

  const [
    discountAmount,
    setDiscountAmount,
  ] = useState("0");

  const [
    discountMode,
    setDiscountMode,
  ] = useState<DiscountMode>(
    "amount",
  );

  const [
    discountPercentage,
    setDiscountPercentage,
  ] = useState("0");

  const [
    exhibitionName,
    setExhibitionName,
  ] = useState("");

  const [
    notes,
    setNotes,
  ] = useState("");

  // ==========================================================
  // PAYMENT
  // ==========================================================

  const [
    paymentMode,
    setPaymentMode,
  ] = useState<
    "online" | "cash"
  >("online");

  // ==========================================================
  // PHOTO
  // ==========================================================

  const [
    photo,
    setPhoto,
  ] = useState<CapturedPhoto | null>(
    null,
  );

  // ==========================================================
  // ADD PRODUCT
  // ==========================================================

  const [
    newProductName,
    setNewProductName,
  ] = useState("");

  // ==========================================================
  // SUBMIT
  // ==========================================================

  const [
    submitting,
    setSubmitting,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState<string | null>(
    null,
  );

  const [
    successMessage,
    setSuccessMessage,
  ] = useState<string | null>(
    null,
  );

  // ==========================================================
  // UPDATE PRICE
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
      icon: "✦",
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
          createEmptyProductPrices(),
      }),
    );

    setNewProductName("");
  };

  // ==========================================================
  // REMOVE PRODUCT
  // ==========================================================

  const isInitialProduct = (
    productId: string,
  ) =>
    INITIAL_PRODUCTS.some(
      (initialProduct) =>
        initialProduct.id === productId,
    );

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
                !Number.isFinite(
                  numericValue,
                )
              ) {
                return;
              }

              if (
                numericValue < 0
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
  // QUANTITY
  // ==========================================================

  const totalQuantity =
    selectedItems.length;

  // ==========================================================
  // SUBTOTAL
  // ==========================================================

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

  // ==========================================================
  // GST RATE
  // ==========================================================

  const effectiveGstRate =
    gstEnabled
      ? Math.min(
          100,
          Math.max(
            0,
            Number(gstRate) || 0,
          ),
        )
      : 0;

  // ==========================================================
  // DISCOUNT
  // ==========================================================

  const normalizedDiscountPercentage =
    Math.min(
      100,
      Math.max(
        0,
        Number(
          discountPercentage,
        ) || 0,
      ),
    );

  const enteredDiscountAmount =
    Math.max(
      0,
      Number(
        discountAmount,
      ) || 0,
    );

  /**
   * The backend continues to receive only discount_amount.
   *
   * Amount mode:
   *     discount = entered rupee amount
   *
   * Percentage mode:
   *     discount = subtotal * percentage / 100
   */

  const discount =
    discountMode === "percentage"
      ? Math.min(
          subtotal,
          (subtotal *
            normalizedDiscountPercentage) /
            100,
        )
      : enteredDiscountAmount;

  // ==========================================================
  // DISCOUNTED SUBTOTAL
  // ==========================================================

  const discountedSubtotal =
    Math.max(
      0,
      subtotal - discount,
    );

  // ==========================================================
  // GST CALCULATION
  // ==========================================================

  const gstCalculation =
    useMemo(() => {
      if (
        !gstEnabled ||
        discountedSubtotal <=
          0 ||
        effectiveGstRate <= 0
      ) {
        return {
          gstRate: 0,

          taxableValue:
            discountedSubtotal,

          gstAmount: 0,

          cgstRate: 0,

          cgstAmount: 0,

          sgstRate: 0,

          sgstAmount: 0,
        };
      }

      // GST is inclusive.

      const taxableValue =
        discountedSubtotal /
        (
          1 +
          effectiveGstRate /
            100
        );

      const gstAmount =
        discountedSubtotal -
        taxableValue;

      const cgstAmount =
        gstAmount / 2;

      const sgstAmount =
        gstAmount -
        cgstAmount;

      return {
        gstRate:
          effectiveGstRate,

        taxableValue,

        gstAmount,

        cgstRate:
          effectiveGstRate / 2,

        cgstAmount,

        sgstRate:
          effectiveGstRate / 2,

        sgstAmount,
      };
    }, [
      gstEnabled,
      discountedSubtotal,
      effectiveGstRate,
    ]);

  // ==========================================================
  // TAX
  // ==========================================================

  const taxAmount =
    gstCalculation.gstAmount;

  // ==========================================================
  // GRAND TOTAL
  // ==========================================================

  /*
   * Product prices are GST inclusive.
   *
   * Therefore GST is NOT added again.
   *
   * Grand total:
   *
   * subtotal - discount
   */

  const grandTotal =
    Math.max(
      0,
      subtotal - discount,
    );

  // ==========================================================
  // GROUPED ITEMS
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
        .filter(
          Boolean,
        ) as {
        product: Product;

        items:
          typeof selectedItems;

        quantity: number;

        total: number;
      }[];
    }, [
      products,
      selectedItems,
    ]);

  // ==========================================================
  // BACKEND ITEMS
  // ==========================================================

  const buildInvoiceItems =
    () => {
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

  const handleCreateInvoice =
    async (
      event?: FormEvent,
    ) => {
      event?.preventDefault();

      setError(null);
      setSuccessMessage(null);

      // ------------------------------------------------------
      // CUSTOMER
      // ------------------------------------------------------

      if (
        !customerName.trim()
      ) {
        setError(
          "Please enter the customer name.",
        );

        return;
      }

      // ------------------------------------------------------
      // PHOTO
      // ------------------------------------------------------

      if (!photo) {
        setError(
          "Please add a product photo.",
        );

        return;
      }

      // ------------------------------------------------------
      // PRODUCTS
      // ------------------------------------------------------

      if (
        selectedItems.length ===
        0
      ) {
        setError(
          "Please enter at least one product price.",
        );

        return;
      }

      // ------------------------------------------------------
      // DISCOUNT
      // ------------------------------------------------------

      if (
        discount > subtotal
      ) {
        setError(
          "Discount cannot exceed the product total.",
        );

        return;
      }

      if (
        discountMode === "percentage" &&
        (
          normalizedDiscountPercentage < 0 ||
          normalizedDiscountPercentage > 100
        )
      ) {
        setError(
          "Discount percentage must be between 0 and 100.",
        );

        return;
      }

      // ------------------------------------------------------
      // GST
      // ------------------------------------------------------

      if (
        effectiveGstRate < 0 ||
        effectiveGstRate > 100
      ) {
        setError(
          "GST rate must be between 0 and 100.",
        );

        return;
      }

      setSubmitting(true);

      // ------------------------------------------------------
      // UUID
      // ------------------------------------------------------

      const clientUuid =
        newClientUuid();

      // ------------------------------------------------------
      // INVOICE DATA
      // ------------------------------------------------------

      const invoiceData:
        InvoiceFormData = {
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

        gst_enabled:
          gstEnabled,

        tax_percent:
          gstEnabled
            ? effectiveGstRate
            : 0,

        discount_amount:
          discount,

        payment_mode:
          paymentMode,

        grand_total:
          grandTotal,

        notes:
          notes.trim() ||
          undefined,

        exhibition_name:
          exhibitionName.trim() ||
          undefined,

        captured_at:
          new Date().toISOString(),
      };

      // ======================================================
      // ONLINE / OFFLINE
      // ======================================================

      try {
        if (navigator.onLine) {
          await createInvoiceOnline(
            invoiceData,
            photo.file,
          );

          setSuccessMessage(
            "Invoice created successfully.",
          );
        } else {
          throw new Error(
            "offline",
          );
        }
      } catch (err) {
        console.error(
          "Invoice creation failed:",
          err,
        );

        // ====================================================
        // OFFLINE SAVE
        // ====================================================

        try {
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
            "Invoice saved securely on this device and will sync automatically.",
          );

          void runSync();
        } catch (
          queueError
        ) {
          console.error(
            "Offline queue failed:",
            queueError,
          );

          setError(
            "Could not save the invoice. Please try again.",
          );

          setSubmitting(false);

          return;
        }
      }

      // ======================================================
      // RESET FORM
      // ======================================================

      setCustomerName("");
      setCustomerPhone("+91 ");
      setCustomerEmail("");

      setPrices(
        createEmptyPrices(),
      );

      setDiscountAmount(
        "0",
      );

      setDiscountPercentage(
        "0",
      );

      setDiscountMode(
        "amount",
      );

      setPaymentMode(
        "online",
      );

      setExhibitionName("");
      setNotes("");

      // ------------------------------------------------------
      // PHOTO CLEANUP
      // ------------------------------------------------------

      if (photo) {
        URL.revokeObjectURL(
          photo.previewUrl,
        );
      }

      setPhoto(null);

      setSubmitting(false);

      // ======================================================
      // NAVIGATE
      // ======================================================

      setTimeout(() => {
        navigate(
          "/invoices",
        );
      }, 900);
    };

  // ==========================================================
  // UI
  // ==========================================================

  return (
    <div className="invoice-page">

      {/* ====================================================
          PAGE HEADER
      ==================================================== */}

      <header className="invoice-page-header">

        <div>

          <div className="invoice-eyebrow">
            ROOCH · EXHIBITION DESK
          </div>

          <h1 className="invoice-page-title">
            Create Invoice
          </h1>

          <p className="invoice-page-description">
            Capture the customer
            details, jewellery
            pricing and payment
            information in one
            place.
          </p>

        </div>

        <div className="invoice-item-counter">

          <span className="invoice-item-counter-label">
            ITEMS
          </span>

          <strong>
            {totalQuantity}
          </strong>

        </div>

      </header>

      {/* ====================================================
          FORM
      ==================================================== */}

      <form
        onSubmit={
          handleCreateInvoice
        }
        className="invoice-layout"
      >

        {/* ==================================================
            MAIN
        ================================================== */}

        <main className="invoice-main">

          {/* ==================================================
              CUSTOMER
          ================================================== */}

          <section className="invoice-card">

            <div className="invoice-card-header">

              <div className="invoice-card-heading">

                <div className="invoice-card-number">
                  01
                </div>

                <div>

                  <h2 className="invoice-card-title">
                    Customer details
                  </h2>

                  <p className="invoice-card-description">
                    Enter the customer's
                    basic information.
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
                    WhatsApp / Phone

                    <span className="form-optional">
                      Optional
                    </span>
                  </label>

                  <input
                    type="tel"
                    inputMode="tel"
                    value={
                      customerPhone
                    }
                    onChange={(e) => {
                      const value = e.target.value;
                      const withoutPrefix = value.replace(/^\+91\s*/, "");
                      setCustomerPhone(
                        `+91 ${withoutPrefix}`.trimEnd(),
                      );
                    }}
                    placeholder="+91 98765 43210"
                    className="invoice-input"
                  />

                </div>

                <div>

                  <label className="form-label">
                    Email

                    <span className="form-optional">
                      Optional
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

          {/* ==================================================
              PHOTO
          ================================================== */}

          <section className="invoice-card">

            <div className="invoice-card-header">

              <div className="invoice-card-heading">

                <div className="invoice-card-number">
                  02
                </div>

                <div>

                  <h2 className="invoice-card-title">

                    Product photo

                    <span className="required-badge">
                      Required
                    </span>

                  </h2>

                  <p className="invoice-card-description">
                    Add a clear photograph
                    of the purchased
                    jewellery.
                  </p>

                </div>

              </div>

            </div>

            <div className="invoice-card-body">

              <div className="product-photo-wrapper">

                <CameraCapture
                  value={photo}
                  onChange={
                    setPhoto
                  }
                />

              </div>

            </div>

          </section>

          {/* ==================================================
              PRODUCT PRICES
          ================================================== */}

          <section className="invoice-card">

            <div className="invoice-card-header">

              <div className="invoice-card-heading">

                <div className="invoice-card-number">
                  03
                </div>

                <div>

                  <h2 className="invoice-card-title">
                    Product prices
                  </h2>

                  <p className="invoice-card-description">
                    Enter the final
                    customer price for
                    each unique item.
                  </p>

                </div>

              </div>

              <div className="product-price-note">
                GST inclusive
              </div>

            </div>

            <div className="product-price-body">

              {/* COLUMN HEADERS */}

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
                        ITEM
                      </span>
                    </div>
                  ),
                )}

                <div />

              </div>

              {/* PRODUCTS */}

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

                      {/* PRODUCT */}

                      <div className="product-info">

                        <div className="product-icon">
                          {
                            product.icon
                          }
                        </div>

                        <div className="product-info-copy">

                          <div className="product-name">
                            {
                              product.name
                            }
                          </div>

                          <div className="product-count">
                            {
                              enteredCount
                            }{" "}
                            {
                              enteredCount ===
                              1
                                ? "item"
                                : "items"
                            }
                          </div>

                        </div>

                      </div>

                      {/* FIVE PRICE BOXES */}

                      <div className="product-prices-grid">

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
                                      e
                                        .target
                                        .value,
                                    )
                                  }
                                  placeholder="0"
                                  aria-label={`${product.name} item ${slot} price`}
                                  className="price-input"
                                />

                              </div>
                            );
                          },
                        )}

                      </div>

                      {/* REMOVE — ONLY FOR NEWLY ADDED PRODUCTS */}

                      {!isInitialProduct(
                        product.id,
                      ) && (
                        <button
                          type="button"
                          onClick={() =>
                            removeProduct(
                              product.id,
                            )
                          }
                          className="remove-product"
                          aria-label={`Remove ${product.name}`}
                        >
                          ×
                        </button>
                      )}

                    </div>
                  );
                },
              )}

            </div>

            {/* ADD PRODUCT */}

            <div className="add-product-area">

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
                placeholder="Add another product"
                className="invoice-input"
              />

              <button
                type="button"
                onClick={
                  addProduct
                }
                className="add-product-button"
              >
                + Add product
              </button>

            </div>

          </section>

          {/* ==================================================
              ADDITIONAL DETAILS
          ================================================== */}

          <section className="invoice-card">

            <div className="invoice-card-header">

              <div className="invoice-card-heading">

                <div className="invoice-card-number">
                  04
                </div>

                <div>

                  <h2 className="invoice-card-title">
                    Additional details
                  </h2>

                  <p className="invoice-card-description">
                    Event information
                    and notes.
                  </p>

                </div>

              </div>

            </div>

            <div className="invoice-card-body">

              <div className="form-grid">

                <div className="form-full">

                  <label className="form-label">
                    Exhibition / Event

                    <span className="form-optional">
                      Optional
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
                    placeholder="Jewellery Expo 2026"
                    className="invoice-input"
                  />

                </div>

                <div className="form-full">

                  <label className="form-label">
                    Notes

                    <span className="form-optional">
                      Optional
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

          {/* ERROR */}

          {error && (
            <div className="invoice-alert invoice-alert-error">
              {error}
            </div>
          )}

          {/* SUCCESS */}

          {successMessage && (
            <div className="invoice-alert invoice-alert-success">
              {successMessage}
            </div>
          )}

        </main>

        {/* ====================================================
            INVOICE SUMMARY
        ==================================================== */}

        <aside className="invoice-summary">

          <div className="invoice-summary-card">

            {/* SUMMARY HEADER */}

            <div className="invoice-summary-brand">

              <div>

                <span>
                  INVOICE SUMMARY
                </span>

                <strong>
                  {totalQuantity}{" "}
                  {
                    totalQuantity ===
                    1
                      ? "item"
                      : "items"
                  }
                </strong>

              </div>

            </div>

            {/* GRAND TOTAL */}

            <div className="invoice-summary-total">

              <span>
                GRAND TOTAL
              </span>

              <strong>
                ₹
                {grandTotal.toFixed(
                  2,
                )}
              </strong>

            </div>

            {/* PRODUCTS */}

            <div className="invoice-summary-items">

              {groupedItems.length ===
              0 ? (

                <div className="invoice-empty-summary">

                  <div className="invoice-empty-icon">
                    ₹
                  </div>

                  <strong>
                    No items yet
                  </strong>

                  <span>
                    Enter product
                    prices above to
                    build the invoice.
                  </span>

                </div>

              ) : (

                groupedItems.map(
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
                      className="summary-product-card"
                    >

                      <div className="summary-product-header">

                        <div className="summary-product-left">

                          <span className="summary-product-icon">
                            {
                              product.icon
                            }
                          </span>

                          <div>

                            <strong>
                              {
                                product.name
                              }
                            </strong>

                            <span>
                              {
                                quantity
                              }{" "}
                              {
                                quantity ===
                                1
                                  ? "item"
                                  : "items"
                              }
                            </span>

                          </div>

                        </div>

                        <strong className="summary-product-total">
                          ₹
                          {total.toFixed(
                            2,
                          )}
                        </strong>

                      </div>

                      <div className="summary-product-items">

                        {items.map(
                          (item) => (

                            <div
                              key={`${item.productId}-${item.slot}`}
                              className="summary-product-item"
                            >

                              <span>
                                Item{" "}
                                {
                                  item.slot
                                }
                              </span>

                              <strong>
                                ₹
                                {item.price.toFixed(
                                  2,
                                )}
                              </strong>

                            </div>

                          ),
                        )}

                      </div>

                    </div>

                  ),
                )

              )}

            </div>

            {/* PAYMENT MODE */}

            <div className="invoice-summary-section">

              <span className="invoice-summary-section-label">
                PAYMENT MODE
              </span>

              <div className="payment-mode-options">

                <button
                  type="button"
                  className={`payment-mode-option ${
                    paymentMode ===
                    "online"
                      ? "selected"
                      : ""
                  }`}
                  onClick={() =>
                    setPaymentMode(
                      "online",
                    )
                  }
                >

                  <span className="payment-mode-icon">
                    ₹
                  </span>

                  <span>
                    Digital
                  </span>

                </button>

                <button
                  type="button"
                  className={`payment-mode-option ${
                    paymentMode ===
                    "cash"
                      ? "selected"
                      : ""
                  }`}
                  onClick={() =>
                    setPaymentMode(
                      "cash",
                    )
                  }
                >

                  <span className="payment-mode-icon">
                    ₹
                  </span>

                  <span>
                    Cash
                  </span>

                </button>

              </div>

            </div>

            {/* SUMMARY BREAKDOWN */}

            <div className="invoice-summary-breakdown">

              {/* PRODUCT TOTAL */}

              <div>

                <span>
                  Product total
                </span>

                <strong>
                  ₹
                  {subtotal.toFixed(
                    2,
                  )}
                </strong>

              </div>

              {/* GST */}

              <div>

                <span>
                  GST
                </span>

                <div className="summary-inline-input">

                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={
                      gstEnabled
                        ? effectiveGstRate
                        : 0
                    }
                    onChange={(e) =>
                      setGstRate(
                        Number(
                          e.target
                            .value,
                        ),
                      )
                    }
                    disabled={
                      !gstEnabled
                    }
                    aria-label="GST rate"
                  />

                  <span>
                    %
                  </span>

                </div>

              </div>

              {/* GST TOGGLE */}

              <div className="gst-status-row">

                <span>
                  GST status
                </span>

                <div className="gst-control">

                  <span
                    className={
                      gstEnabled
                        ? "gst-status-on"
                        : "gst-status-off"
                    }
                  >
                    {gstEnabled
                      ? "ON"
                      : "OFF"}
                  </span>

                  <button
                    type="button"
                    onClick={() =>
                      setGstEnabled(
                        !gstEnabled,
                      )
                    }
                    className={`gst-toggle ${
                      gstEnabled
                        ? "gst-toggle-on"
                        : "gst-toggle-off"
                    }`}
                    aria-label={
                      gstEnabled
                        ? "Disable GST"
                        : "Enable GST"
                    }
                    aria-pressed={
                      gstEnabled
                    }
                  >

                    <span
                      className={`gst-toggle-knob ${
                        gstEnabled
                          ? "gst-toggle-knob-on"
                          : "gst-toggle-knob-off"
                      }`}
                    />

                  </button>

                </div>

              </div>

              {/* TAX */}

              <div>

                <span>
                  Tax amount
                </span>

                <strong>
                  ₹
                  {taxAmount.toFixed(
                    2,
                  )}
                </strong>

              </div>

              {/* ==================================================
                  DISCOUNT
              ================================================== */}

              <div>

                {/* DISCOUNT LABEL + RADIO BUTTONS */}

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent:
                      "space-between",
                    gap: "8px",
                    marginBottom:
                      "8px",
                    flexWrap: "wrap",
                  }}
                >

                  <span>
                    Discount
                  </span>

                  {/* RADIO OPTIONS */}

                  <div
                    style={{
                      display: "flex",
                      alignItems:
                        "center",
                      gap: "12px",
                    }}
                  >

                    {/* AMOUNT RADIO */}

                    <label
                      style={{
                        display:
                          "flex",
                        alignItems:
                          "center",
                        gap: "4px",
                        cursor:
                          "pointer",
                        fontSize:
                          "11px",
                        fontWeight:
                          600,
                        color:
                          "#6f0730",
                      }}
                    >

                      <input
                        type="radio"
                        name="discountMode"
                        value="amount"
                        checked={
                          discountMode ===
                          "amount"
                        }
                        onChange={() =>
                          setDiscountMode(
                            "amount",
                          )
                        }
                        style={{
                          accentColor:
                            "#6f0730",
                          cursor:
                            "pointer",
                        }}
                      />

                      <span>
                        Amount
                      </span>

                    </label>

                    {/* PERCENTAGE RADIO */}

                    <label
                      style={{
                        display:
                          "flex",
                        alignItems:
                          "center",
                        gap: "4px",
                        cursor:
                          "pointer",
                        fontSize:
                          "11px",
                        fontWeight:
                          600,
                        color:
                          "#6f0730",
                      }}
                    >

                      <input
                        type="radio"
                        name="discountMode"
                        value="percentage"
                        checked={
                          discountMode ===
                          "percentage"
                        }
                        onChange={() =>
                          setDiscountMode(
                            "percentage",
                          )
                        }
                        style={{
                          accentColor:
                            "#6f0730",
                          cursor:
                            "pointer",
                        }}
                      />

                      <span>
                        Percentage
                      </span>

                    </label>

                  </div>

                </div>

                {/* DISCOUNT INPUTS */}

                <div
                  style={{
                    display:
                      "flex",
                    flexDirection:
                      "column",
                    gap: "7px",
                  }}
                >

                  {/* ==================================================
                      DISCOUNT AMOUNT
                  ================================================== */}

                  <div
                    className="summary-inline-input"
                    title={
                      discountMode ===
                      "percentage"
                        ? "Discount amount is calculated from the percentage"
                        : "Enter discount amount"
                    }
                    style={{
                      opacity:
                        discountMode ===
                        "percentage"
                          ? 0.55
                          : 1,

                      background:
                        discountMode ===
                        "percentage"
                          ? "#f1f1f1"
                          : undefined,
                    }}
                  >

                    <span>
                      ₹
                    </span>

                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={
                        discountMode ===
                        "percentage"
                          ? discount.toFixed(
                              2,
                            )
                          : discountAmount
                      }
                      onChange={(e) =>
                        setDiscountAmount(
                          e.target.value,
                        )
                      }
                      disabled={
                        discountMode ===
                        "percentage"
                      }
                      aria-label="Discount amount"
                      style={{
                        background:
                          discountMode ===
                          "percentage"
                            ? "#f1f1f1"
                            : undefined,

                        color:
                          discountMode ===
                          "percentage"
                            ? "#8b8b8b"
                            : undefined,

                        cursor:
                          discountMode ===
                          "percentage"
                            ? "not-allowed"
                            : undefined,
                      }}
                    />

                  </div>

                  {/* ==================================================
                      DISCOUNT PERCENTAGE
                  ================================================== */}

                  <div
                    className="summary-inline-input"
                    title={
                      discountMode ===
                      "amount"
                        ? "Select Percentage to enter a percentage discount"
                        : "Enter discount percentage"
                    }
                    style={{
                      opacity:
                        discountMode ===
                        "amount"
                          ? 0.55
                          : 1,

                      background:
                        discountMode ===
                        "amount"
                          ? "#f1f1f1"
                          : undefined,
                    }}
                  >

                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={
                        discountPercentage
                      }
                      onChange={(e) =>
                        setDiscountPercentage(
                          e.target.value,
                        )
                      }
                      disabled={
                        discountMode ===
                        "amount"
                      }
                      aria-label="Discount percentage"
                      style={{
                        background:
                          discountMode ===
                          "amount"
                            ? "#f1f1f1"
                            : undefined,

                        color:
                          discountMode ===
                          "amount"
                            ? "#8b8b8b"
                            : undefined,

                        cursor:
                          discountMode ===
                          "amount"
                            ? "not-allowed"
                            : undefined,
                      }}
                    />

                    <span>
                      %
                    </span>

                  </div>

                </div>

              </div>

            </div>

            {/* ==================================================
                GST BREAKUP
            ================================================== */}

            {gstEnabled &&
              discountedSubtotal >
                0 && (

                <div className="invoice-summary-gst-details">

                  <div className="gst-detail-row">

                    <span>
                      Taxable value
                    </span>

                    <strong>
                      ₹
                      {gstCalculation.taxableValue.toFixed(
                        2,
                      )}
                    </strong>

                  </div>

                  <div className="gst-detail-row">

                    <span>
                      CGST @{" "}
                      {gstCalculation.cgstRate.toFixed(
                        2,
                      )}
                      %
                    </span>

                    <strong>
                      ₹
                      {gstCalculation.cgstAmount.toFixed(
                        2,
                      )}
                    </strong>

                  </div>

                  <div className="gst-detail-row">

                    <span>
                      SGST @{" "}
                      {gstCalculation.sgstRate.toFixed(
                        2,
                      )}
                      %
                    </span>

                    <strong>
                      ₹
                      {gstCalculation.sgstAmount.toFixed(
                        2,
                      )}
                    </strong>

                  </div>

                </div>
              )}

            {/* ==================================================
                GRAND TOTAL
            ================================================== */}

            <div className="invoice-grand-total">

              <div>

                <span>
                  GRAND TOTAL
                </span>

                <strong>
                  ₹
                  {grandTotal.toFixed(
                    2,
                  )}
                </strong>

              </div>

              <span className="invoice-ready-badge">
                Ready
              </span>

            </div>

            {/* ==================================================
                CREATE
            ================================================== */}

            <button
              type="submit"
              disabled={
                submitting
              }
              className="create-invoice-button"
            >

              {submitting
                ? "Creating invoice..."
                : "Create invoice"}

              {!submitting && (
                <span>
                  →
                </span>
              )}

            </button>

            {/* NOTE */}

            <p className="invoice-summary-note">
              Your invoice is saved
              securely and can sync
              automatically when
              connectivity is restored.
            </p>

          </div>

        </aside>

      </form>

    </div>
  );
}