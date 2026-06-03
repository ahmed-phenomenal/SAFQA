import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import icon from "../../../assets/2.png";
import {
  CONDITION_OPTIONS,
  deleteAuction,
  editAuction,
  getAuctionCategories,
  getAuctionView,
  prepareAuctionForEditForm,
} from "../../../API/createAuction";

const toImageSrc = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
  if (raw.startsWith("data:image/")) return raw;
  return `data:image/png;base64,${raw}`;
};

export default function SellerViewAuction() {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === "ar";
  const navigate = useNavigate();
  const params = useParams();

  const auctionId = Number(params.auctionId || params.id || 0);

  const [auction, setAuction] = useState(null);
  const [form, setForm] = useState(null);
  const [categories, setCategories] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editMode, setEditMode] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  useEffect(() => {
    document.title = t("viewAuction", { defaultValue: "View Auction" });

    const link = document.querySelector("link[rel~='icon']");
    if (link) link.href = icon;
  }, [t]);

  useEffect(() => {
    if (!error && !success) return;

    const timer = setTimeout(() => {
      setError("");
      setSuccess("");
    }, 15000);

    return () => clearTimeout(timer);
  }, [error, success]);

  const loadAuction = async () => {
    try {
      setLoading(true);
      setError("");

      if (!auctionId) {
        throw new Error("Invalid auction ID.");
      }

      const [auctionData, categoriesData] = await Promise.all([
        getAuctionView(auctionId),
        getAuctionCategories().catch(() => []),
      ]);

      setAuction(auctionData);
      setForm(prepareAuctionForEditForm(auctionData));
      setCategories(Array.isArray(categoriesData) ? categoriesData : []);
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to load auction details."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAuction();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auctionId]);

  const formatDate = (value) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "--";
    return date.toLocaleString(i18n.language);
  };

  const formatMoney = (value) => {
    const num = Number(value || 0);
    if (!Number.isFinite(num)) return "$0";
    return `$${num.toLocaleString(i18n.language)}`;
  };

  const getConditionLabel = (value) => {
    const found = CONDITION_OPTIONS.find(
      (item) => Number(item.value) === Number(value)
    );

    return found?.label || String(value || "-");
  };

  const getStatusLabel = (status) => {
    const s = String(status ?? "");
    if (s === "1") return t("draft", { defaultValue: "Draft" });
    if (s === "2") return t("pending", { defaultValue: "Pending" });
    if (s === "3") return t("published", { defaultValue: "Published" });
    if (s === "4") return t("ended", { defaultValue: "Ended" });
    if (s === "5") return t("sold", { defaultValue: "Sold" });
    return s || t("unknown", { defaultValue: "Unknown" });
  };

  const categoryName = useMemo(() => {
    if (!auction) return "";

    return (
      auction.categoryName ||
      categories.find((item) => Number(item.id) === Number(auction.categoryId))
        ?.name ||
      (auction.categoryId ? `Category #${auction.categoryId}` : "-")
    );
  }, [auction, categories]);

  const updateFormField = (key, value) => {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const updateItemField = (itemIndex, key, value) => {
    setForm((prev) => ({
      ...prev,
      items: prev.items.map((item, index) =>
        index === itemIndex
          ? {
              ...item,
              [key]: value,
            }
          : item
      ),
    }));
  };

  const updateItemAttribute = (itemIndex, attrIndex, key, value) => {
    setForm((prev) => ({
      ...prev,
      items: prev.items.map((item, index) => {
        if (index !== itemIndex) return item;

        return {
          ...item,
          attributes: item.attributes.map((attr, i) =>
            i === attrIndex
              ? {
                  ...attr,
                  [key]: value,
                }
              : attr
          ),
        };
      }),
    }));
  };

  const addItem = () => {
    setForm((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          id: 0,
          title: "",
          description: "",
          count: 1,
          condition: 1,
          warrantyInfo: "N/A",
          categoryId: Number(prev.categoryId || 0),
          image: null,
          images: [],
          existingImages: [],
          attributes: [],
        },
      ],
    }));
  };

  const removeItem = (itemIndex) => {
    setForm((prev) => {
      if (prev.items.length <= 1) {
        setError("At least one item is required.");
        return prev;
      }

      return {
        ...prev,
        items: prev.items.filter((_, index) => index !== itemIndex),
      };
    });
  };

  const addAttribute = (itemIndex) => {
    setForm((prev) => ({
      ...prev,
      items: prev.items.map((item, index) =>
        index === itemIndex
          ? {
              ...item,
              attributes: [
                ...item.attributes,
                {
                  categoryAttributeId: "",
                  name: "",
                  value: "",
                },
              ],
            }
          : item
      ),
    }));
  };

  const removeAttribute = (itemIndex, attrIndex) => {
    setForm((prev) => ({
      ...prev,
      items: prev.items.map((item, index) =>
        index === itemIndex
          ? {
              ...item,
              attributes: item.attributes.filter((_, i) => i !== attrIndex),
            }
          : item
      ),
    }));
  };

  const handleMainImageChange = (file) => {
    updateFormField("image", file || null);
  };

  const handleItemImagesChange = (itemIndex, files) => {
    const selected = Array.from(files || []);

    setForm((prev) => ({
      ...prev,
      items: prev.items.map((item, index) =>
        index === itemIndex
          ? {
              ...item,
              images: selected,
              image: selected[0] || null,
            }
          : item
      ),
    }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError("");
      setSuccess("");

      if (!form) {
        throw new Error("Auction form is missing.");
      }

      const payload = {
        ...form,
        categoryId: Number(form.categoryId || 0),
        startingPrice: Number(form.startingPrice || 0),
        bidIncrement: Number(form.bidIncrement || 1),
        items: form.items.map((item) => ({
          ...item,
          id: Number(item.id || 0),
          count: Number(item.count || 1),
          condition: Number(item.condition || 1),
          categoryId: Number(item.categoryId || form.categoryId || 0),
          attributes: item.attributes
            .filter(
              (attr) =>
                Number(attr.categoryAttributeId || 0) > 0 &&
                String(attr.value || "").trim()
            )
            .map((attr) => ({
              categoryAttributeId: Number(attr.categoryAttributeId),
              value: String(attr.value || "").trim(),
            })),
        })),
      };

      const res = await editAuction(auctionId, payload);

      setSuccess(res?.message || res?.Message || "Auction updated successfully.");
      setEditMode(false);

      await loadAuction();
    } catch (err) {
      setError(
        err?.response?.data?.message || err?.message || "Failed to update auction."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      setDeleting(true);
      setError("");
      setSuccess("");

      const res = await deleteAuction(auctionId);

      setSuccess(res?.message || res?.Message || "Deleted Successfully");
      setConfirmDeleteOpen(false);

      setTimeout(() => {
        navigate("/seller-history", { replace: true });
      }, 600);
    } catch (err) {
      setError(
        err?.response?.data?.message || err?.message || "Failed to delete auction."
      );
    } finally {
      setDeleting(false);
    }
  };

  const resetEdit = () => {
    setForm(prepareAuctionForEditForm(auction));
    setEditMode(false);
    setError("");
    setSuccess("");
  };

  return (
    <div className="seller-view-auction" dir={isArabic ? "rtl" : "ltr"}>
      <style>{`
        .seller-view-auction {
          min-height: 100vh;
          background: #f5f6fa;
          padding: 36px 0 70px;
          font-family: Arial, Helvetica, sans-serif;
        }

        .seller-view-auction * {
          box-sizing: border-box;
        }

        .sva-container {
          width: min(1120px, 94%);
          margin: 0 auto;
        }

        .sva-header {
          background: #fff;
          border-radius: 22px;
          padding: 24px;
          box-shadow: 0 8px 24px rgba(0,0,0,0.06);
          margin-bottom: 18px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
          flex-wrap: wrap;
        }

        .sva-title {
          margin: 0;
          color: #023E8A;
          font-size: 32px;
          font-weight: 900;
        }

        .sva-subtitle {
          margin: 8px 0 0;
          color: #64748b;
          font-weight: 700;
        }

        .sva-actions {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }

        .sva-btn {
          border: none;
          border-radius: 12px;
          min-height: 46px;
          padding: 0 18px;
          font-weight: 900;
          cursor: pointer;
        }

        .sva-btn-primary {
          background: #023E8A;
          color: #fff;
        }

        .sva-btn-secondary {
          background: #eaf2ff;
          color: #023E8A;
        }

        .sva-btn-danger {
          background: #ef4444;
          color: #fff;
        }

        .sva-btn:disabled {
          opacity: 0.65;
          cursor: not-allowed;
        }

        .sva-alert-error,
        .sva-alert-success {
          border-radius: 14px;
          padding: 14px 16px;
          margin-bottom: 16px;
          font-weight: 800;
        }

        .sva-alert-error {
          background: #fff1f0;
          color: #cf1322;
          border: 1px solid #ffa39e;
        }

        .sva-alert-success {
          background: #f6ffed;
          color: #237804;
          border: 1px solid #b7eb8f;
        }

        .sva-card {
          background: #fff;
          border-radius: 22px;
          padding: 22px;
          box-shadow: 0 8px 24px rgba(0,0,0,0.06);
          border: 1px solid #eef2f7;
          margin-bottom: 18px;
        }

        .sva-main-grid {
          display: grid;
          grid-template-columns: 320px 1fr;
          gap: 20px;
          align-items: start;
        }

        .sva-image {
          width: 100%;
          height: 240px;
          object-fit: cover;
          border-radius: 18px;
          border: 1px solid #e5e7eb;
          background: #eef2f7;
        }

        .sva-image-fallback {
          width: 100%;
          height: 240px;
          border-radius: 18px;
          border: 1px solid #e5e7eb;
          background: #eef2f7;
          color: #94a3b8;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 900;
        }

        .sva-info-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(160px, 1fr));
          gap: 12px;
        }

        .sva-info-box {
          border: 1px solid #e5e7eb;
          background: #fafafa;
          border-radius: 14px;
          padding: 13px 14px;
        }

        .sva-info-label {
          color: #94a3b8;
          font-size: 12px;
          font-weight: 900;
          text-transform: uppercase;
          margin-bottom: 5px;
        }

        .sva-info-value {
          color: #1f2937;
          font-weight: 800;
          word-break: break-word;
        }

        .sva-section-title {
          margin: 0 0 16px;
          color: #023E8A;
          font-size: 23px;
          font-weight: 900;
        }

        .sva-description {
          color: #334155;
          line-height: 1.7;
          font-size: 15px;
          font-weight: 600;
          white-space: pre-wrap;
        }

        .sva-item {
          border: 1px solid #e5e7eb;
          border-radius: 18px;
          padding: 18px;
          background: #fafafa;
          margin-bottom: 14px;
        }

        .sva-item-header {
          display: flex;
          justify-content: space-between;
          gap: 14px;
          align-items: center;
          margin-bottom: 12px;
        }

        .sva-item-title {
          margin: 0;
          color: #111827;
          font-size: 20px;
          font-weight: 900;
        }

        .sva-chip-row {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin: 12px 0;
        }

        .sva-chip {
          background: #f1f5f9;
          color: #334155;
          border-radius: 999px;
          padding: 8px 12px;
          font-size: 13px;
          font-weight: 800;
        }

        .sva-attrs {
          display: grid;
          grid-template-columns: repeat(2, minmax(180px, 1fr));
          gap: 10px;
          margin-top: 12px;
        }

        .sva-attr {
          background: #fff;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          padding: 10px 12px;
        }

        .sva-attr-name {
          color: #94a3b8;
          font-size: 12px;
          font-weight: 900;
          margin-bottom: 4px;
        }

        .sva-attr-value {
          color: #1f2937;
          font-weight: 800;
        }

        .sva-form-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(180px, 1fr));
          gap: 14px;
        }

        .sva-field {
          display: flex;
          flex-direction: column;
          gap: 7px;
        }

        .sva-field.full {
          grid-column: 1 / -1;
        }

        .sva-label {
          color: #334155;
          font-weight: 900;
          font-size: 13px;
        }

        .sva-input,
        .sva-select,
        .sva-textarea {
          width: 100%;
          border: 1px solid #d1d5db;
          border-radius: 12px;
          padding: 12px 14px;
          outline: none;
          font-size: 15px;
          background: #fff;
        }

        .sva-input,
        .sva-select {
          height: 46px;
        }

        .sva-textarea {
          min-height: 110px;
          resize: vertical;
        }

        .sva-file-note {
          color: #64748b;
          font-size: 12px;
          font-weight: 700;
          margin-top: 4px;
        }

        .sva-attribute-row {
          display: grid;
          grid-template-columns: 1fr 1fr auto;
          gap: 10px;
          margin-bottom: 10px;
        }

        .sva-loading {
          background: #fff;
          border-radius: 18px;
          padding: 35px;
          text-align: center;
          color: #64748b;
          font-weight: 900;
        }

        .sva-modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.55);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 99999;
          padding: 16px;
        }

        .sva-modal {
          width: min(420px, 100%);
          background: #fff;
          border-radius: 18px;
          padding: 22px;
          box-shadow: 0 24px 70px rgba(0,0,0,0.28);
          text-align: center;
        }

        .sva-modal-title {
          color: #cf1322;
          margin: 0 0 10px;
          font-size: 22px;
          font-weight: 900;
        }

        .sva-modal-text {
          color: #64748b;
          line-height: 1.6;
          margin-bottom: 18px;
        }

        .sva-modal-actions {
          display: flex;
          justify-content: center;
          gap: 10px;
          flex-wrap: wrap;
        }

        @media (max-width: 900px) {
          .sva-main-grid {
            grid-template-columns: 1fr;
          }

          .sva-form-grid,
          .sva-info-grid,
          .sva-attrs {
            grid-template-columns: 1fr;
          }

          .sva-attribute-row {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <div className="sva-container">
        <div className="sva-header">
          <div>
            <h1 className="sva-title">
              {editMode
                ? t("editAuction", { defaultValue: "Edit Auction" })
                : t("viewAuction", { defaultValue: "View Auction" })}
            </h1>
            <p className="sva-subtitle">
              {t("auctionId", { defaultValue: "Auction ID" })}: {auctionId}
            </p>
          </div>

          <div className="sva-actions">

            {!editMode && auction ? (
              <>
                <button
                  type="button"
                  className="sva-btn sva-btn-primary"
                  onClick={() => setEditMode(true)}
                >
                  {t("edit", { defaultValue: "Edit" })}
                </button>

                <button
                  type="button"
                  className="sva-btn sva-btn-danger"
                  onClick={() => setConfirmDeleteOpen(true)}
                >
                  {t("delete", { defaultValue: "Delete" })}
                </button>
              </>
            ) : null}

            {editMode ? (
              <>
                <button
                  type="button"
                  className="sva-btn sva-btn-secondary"
                  onClick={resetEdit}
                  disabled={saving}
                >
                  {t("cancel", { defaultValue: "Cancel" })}
                </button>

                <button
                  type="button"
                  className="sva-btn sva-btn-primary"
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving
                    ? t("saving", { defaultValue: "Saving..." })
                    : t("save", { defaultValue: "Save" })}
                </button>
              </>
            ) : null}
          </div>
        </div>

        {error ? <div className="sva-alert-error">{error}</div> : null}
        {success ? <div className="sva-alert-success">{success}</div> : null}

        {loading ? (
          <div className="sva-loading">
            {t("loading", { defaultValue: "Loading..." })}
          </div>
        ) : !auction || !form ? (
          <div className="sva-loading">
            {t("noDataFound", { defaultValue: "No data found." })}
          </div>
        ) : editMode ? (
          <>
            <div className="sva-card">
              <h2 className="sva-section-title">
                {t("auctionDetails", { defaultValue: "Auction Details" })}
              </h2>

              <div className="sva-form-grid">
                <div className="sva-field">
                  <label className="sva-label">{t("title", { defaultValue: "Title" })}</label>
                  <input
                    className="sva-input"
                    value={form.title}
                    onChange={(e) => updateFormField("title", e.target.value)}
                  />
                </div>

                <div className="sva-field">
                  <label className="sva-label">{t("category", { defaultValue: "Category" })}</label>
                  <select
                    className="sva-select"
                    value={form.categoryId}
                    onChange={(e) => {
                      const nextCategoryId = Number(e.target.value || 0);
                      updateFormField("categoryId", nextCategoryId);

                      setForm((prev) => ({
                        ...prev,
                        categoryId: nextCategoryId,
                        items: prev.items.map((item) => ({
                          ...item,
                          categoryId: nextCategoryId,
                        })),
                      }));
                    }}
                  >
                    <option value="0">{t("selectCategory", { defaultValue: "Select category" })}</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sva-field full">
                  <label className="sva-label">
                    {t("description", { defaultValue: "Description" })}
                  </label>
                  <textarea
                    className="sva-textarea"
                    value={form.description}
                    onChange={(e) => updateFormField("description", e.target.value)}
                  />
                </div>

                <div className="sva-field">
                  <label className="sva-label">
                    {t("startingPrice", { defaultValue: "Starting Price" })}
                  </label>
                  <input
                    type="number"
                    className="sva-input"
                    value={form.startingPrice}
                    onChange={(e) => updateFormField("startingPrice", e.target.value)}
                  />
                </div>

                <div className="sva-field">
                  <label className="sva-label">
                    {t("bidIncrement", { defaultValue: "Bid Increment" })}
                  </label>
                  <input
                    type="number"
                    className="sva-input"
                    value={form.bidIncrement}
                    onChange={(e) => updateFormField("bidIncrement", e.target.value)}
                  />
                </div>

                <div className="sva-field">
                  <label className="sva-label">
                    {t("startDate", { defaultValue: "Start Date" })}
                  </label>
                  <input
                    type="datetime-local"
                    className="sva-input"
                    value={form.startDate}
                    onChange={(e) => updateFormField("startDate", e.target.value)}
                  />
                </div>

                <div className="sva-field">
                  <label className="sva-label">
                    {t("endDate", { defaultValue: "End Date" })}
                  </label>
                  <input
                    type="datetime-local"
                    className="sva-input"
                    value={form.endDate}
                    onChange={(e) => updateFormField("endDate", e.target.value)}
                  />
                </div>

                <div className="sva-field full">
                  <label className="sva-label">
                    {t("mainImage", { defaultValue: "Main Image" })}
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    className="sva-input"
                    onChange={(e) => handleMainImageChange(e.target.files?.[0] || null)}
                  />
                  <div className="sva-file-note">
                    {form.image
                      ? form.image.name
                      : form.existingImage
                      ? "Existing image will stay unless you choose a new one."
                      : "No image selected."}
                  </div>
                </div>
              </div>
            </div>

            <div className="sva-card">
              <div className="sva-item-header">
                <h2 className="sva-section-title" style={{ margin: 0 }}>
                  {t("items", { defaultValue: "Items" })}
                </h2>

                <button
                  type="button"
                  className="sva-btn sva-btn-secondary"
                  onClick={addItem}
                >
                  + {t("addItem", { defaultValue: "Add Item" })}
                </button>
              </div>

              {form.items.map((item, itemIndex) => (
                <div className="sva-item" key={`${item.id || "new"}-${itemIndex}`}>
                  <div className="sva-item-header">
                    <h3 className="sva-item-title">
                      {t("item", { defaultValue: "Item" })} #{itemIndex + 1}
                      {item.id ? ` — ID: ${item.id}` : ""}
                    </h3>

                    <button
                      type="button"
                      className="sva-btn sva-btn-danger"
                      onClick={() => removeItem(itemIndex)}
                    >
                      {t("remove", { defaultValue: "Remove" })}
                    </button>
                  </div>

                  <div className="sva-form-grid">
                    <div className="sva-field">
                      <label className="sva-label">{t("title", { defaultValue: "Title" })}</label>
                      <input
                        className="sva-input"
                        value={item.title}
                        onChange={(e) =>
                          updateItemField(itemIndex, "title", e.target.value)
                        }
                      />
                    </div>

                    <div className="sva-field">
                      <label className="sva-label">{t("count", { defaultValue: "Count" })}</label>
                      <input
                        type="number"
                        className="sva-input"
                        value={item.count}
                        onChange={(e) =>
                          updateItemField(itemIndex, "count", e.target.value)
                        }
                      />
                    </div>

                    <div className="sva-field">
                      <label className="sva-label">
                        {t("condition", { defaultValue: "Condition" })}
                      </label>
                      <select
                        className="sva-select"
                        value={item.condition}
                        onChange={(e) =>
                          updateItemField(itemIndex, "condition", e.target.value)
                        }
                      >
                        {CONDITION_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="sva-field">
                      <label className="sva-label">
                        {t("warrantyInfo", { defaultValue: "Warranty Info" })}
                      </label>
                      <input
                        className="sva-input"
                        value={item.warrantyInfo}
                        onChange={(e) =>
                          updateItemField(itemIndex, "warrantyInfo", e.target.value)
                        }
                      />
                    </div>

                    <div className="sva-field full">
                      <label className="sva-label">
                        {t("description", { defaultValue: "Description" })}
                      </label>
                      <textarea
                        className="sva-textarea"
                        value={item.description}
                        onChange={(e) =>
                          updateItemField(itemIndex, "description", e.target.value)
                        }
                      />
                    </div>

                    <div className="sva-field full">
                      <label className="sva-label">
                        {t("images", { defaultValue: "Images" })}
                      </label>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        className="sva-input"
                        onChange={(e) =>
                          handleItemImagesChange(itemIndex, e.target.files)
                        }
                      />
                      <div className="sva-file-note">
                        {item.images?.length
                          ? `${item.images.length} new file(s) selected.`
                          : item.existingImages?.length
                          ? `${item.existingImages.length} existing image(s). They stay unless you choose new images.`
                          : "No images selected."}
                      </div>
                    </div>
                  </div>

                  <div style={{ marginTop: 16 }}>
                    <div className="sva-item-header">
                      <h4 className="sva-item-title" style={{ fontSize: 17 }}>
                        {t("attributes", { defaultValue: "Attributes" })}
                      </h4>

                      <button
                        type="button"
                        className="sva-btn sva-btn-secondary"
                        onClick={() => addAttribute(itemIndex)}
                      >
                        + {t("addAttribute", { defaultValue: "Add Attribute" })}
                      </button>
                    </div>

                    {item.attributes.length ? (
                      item.attributes.map((attr, attrIndex) => (
                        <div className="sva-attribute-row" key={`${attr.categoryAttributeId}-${attrIndex}`}>
                          <input
                            className="sva-input"
                            placeholder="Category Attribute ID"
                            value={attr.categoryAttributeId}
                            onChange={(e) =>
                              updateItemAttribute(
                                itemIndex,
                                attrIndex,
                                "categoryAttributeId",
                                e.target.value.replace(/\D/g, "")
                              )
                            }
                          />

                          <input
                            className="sva-input"
                            placeholder="Value"
                            value={attr.value}
                            onChange={(e) =>
                              updateItemAttribute(
                                itemIndex,
                                attrIndex,
                                "value",
                                e.target.value
                              )
                            }
                          />

                          <button
                            type="button"
                            className="sva-btn sva-btn-danger"
                            onClick={() => removeAttribute(itemIndex, attrIndex)}
                          >
                            {t("remove", { defaultValue: "Remove" })}
                          </button>
                        </div>
                      ))
                    ) : (
                      <div className="sva-file-note">
                        {t("noAttributes", { defaultValue: "No attributes." })}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <>
            <div className="sva-card">
              <div className="sva-main-grid">
                <div>
                  {auction.image ? (
                    <img
                      className="sva-image"
                      src={toImageSrc(auction.image)}
                      alt={auction.title}
                    />
                  ) : (
                    <div className="sva-image-fallback">
                      {t("noImage", { defaultValue: "No Image" })}
                    </div>
                  )}
                </div>

                <div>
                  <h2 className="sva-section-title">{auction.title || "-"}</h2>

                  <div className="sva-description">
                    {auction.description || "-"}
                  </div>

                  <div className="sva-info-grid" style={{ marginTop: 18 }}>
                    <div className="sva-info-box">
                      <div className="sva-info-label">
                        {t("category", { defaultValue: "Category" })}
                      </div>
                      <div className="sva-info-value">{categoryName}</div>
                    </div>

                    <div className="sva-info-box">
                      <div className="sva-info-label">
                        {t("status", { defaultValue: "Status" })}
                      </div>
                      <div className="sva-info-value">
                        {getStatusLabel(auction.status)}
                      </div>
                    </div>

                    <div className="sva-info-box">
                      <div className="sva-info-label">
                        {t("startingPrice", { defaultValue: "Starting Price" })}
                      </div>
                      <div className="sva-info-value">
                        {formatMoney(auction.startingPrice)}
                      </div>
                    </div>

                    <div className="sva-info-box">
                      <div className="sva-info-label">
                        {t("currentPrice", { defaultValue: "Current Price" })}
                      </div>
                      <div className="sva-info-value">
                        {formatMoney(auction.currentPrice)}
                      </div>
                    </div>

                    <div className="sva-info-box">
                      <div className="sva-info-label">
                        {t("bidIncrement", { defaultValue: "Bid Increment" })}
                      </div>
                      <div className="sva-info-value">
                        {formatMoney(auction.bidIncrement)}
                      </div>
                    </div>

                    <div className="sva-info-box">
                      <div className="sva-info-label">
                        {t("bidsCount", { defaultValue: "Bids" })}
                      </div>
                      <div className="sva-info-value">
                        {auction.totalBids || 0}
                      </div>
                    </div>

                    <div className="sva-info-box">
                      <div className="sva-info-label">
                        {t("startDate", { defaultValue: "Start Date" })}
                      </div>
                      <div className="sva-info-value">
                        {formatDate(auction.startDate)}
                      </div>
                    </div>

                    <div className="sva-info-box">
                      <div className="sva-info-label">
                        {t("endDate", { defaultValue: "End Date" })}
                      </div>
                      <div className="sva-info-value">
                        {formatDate(auction.endDate)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="sva-card">
              <h2 className="sva-section-title">
                {t("items", { defaultValue: "Items" })}
              </h2>

              {auction.items?.length ? (
                auction.items.map((item, index) => (
                  <div className="sva-item" key={`${item.id || "item"}-${index}`}>
                    <div className="sva-item-header">
                      <h3 className="sva-item-title">
                        {item.title || `Item #${index + 1}`}
                      </h3>

                      {item.id ? (
                        <span className="sva-chip">ID: {item.id}</span>
                      ) : null}
                    </div>

                    <div className="sva-description">
                      {item.description || "-"}
                    </div>

                    <div className="sva-chip-row">
                      <span className="sva-chip">
                        {t("count", { defaultValue: "Count" })}: {item.count || 0}
                      </span>
                      <span className="sva-chip">
                        {t("condition", { defaultValue: "Condition" })}:{" "}
                        {getConditionLabel(item.condition)}
                      </span>
                      <span className="sva-chip">
                        {t("warrantyInfo", { defaultValue: "Warranty" })}:{" "}
                        {item.warrantyInfo || "-"}
                      </span>
                    </div>

                    {item.images?.length ? (
                      <div className="sva-chip-row">
                        {item.images.map((img, imgIndex) =>
                          toImageSrc(img) ? (
                            <img
                              key={`${imgIndex}-${img}`}
                              src={toImageSrc(img)}
                              alt={`item-${index}-${imgIndex}`}
                              style={{
                                width: 96,
                                height: 72,
                                borderRadius: 12,
                                objectFit: "cover",
                                border: "1px solid #e5e7eb",
                              }}
                            />
                          ) : null
                        )}
                      </div>
                    ) : null}

                    {item.attributes?.length ? (
                      <div className="sva-attrs">
                        {item.attributes.map((attr, attrIndex) => (
                          <div className="sva-attr" key={`${attr.categoryAttributeId}-${attrIndex}`}>
                            <div className="sva-attr-name">
                              {attr.name ||
                                `Attribute #${attr.categoryAttributeId}`}
                            </div>
                            <div className="sva-attr-value">
                              {attr.value || "-"}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ))
              ) : (
                <div className="sva-loading">
                  {t("noItems", { defaultValue: "No items." })}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {confirmDeleteOpen ? (
        <div className="sva-modal-backdrop" onMouseDown={() => setConfirmDeleteOpen(false)}>
          <div className="sva-modal" onMouseDown={(e) => e.stopPropagation()}>
            <h3 className="sva-modal-title">
              {t("deleteAuction", { defaultValue: "Delete Auction" })}
            </h3>

            <div className="sva-modal-text">
              {t("deleteAuctionConfirm", {
                defaultValue:
                  "Are you sure you want to delete this auction? This action cannot be undone.",
              })}
            </div>

            <div className="sva-modal-actions">
              <button
                type="button"
                className="sva-btn sva-btn-secondary"
                onClick={() => setConfirmDeleteOpen(false)}
                disabled={deleting}
              >
                {t("cancel", { defaultValue: "Cancel" })}
              </button>

              <button
                type="button"
                className="sva-btn sva-btn-danger"
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting
                  ? t("deleting", { defaultValue: "Deleting..." })
                  : t("delete", { defaultValue: "Delete" })}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}