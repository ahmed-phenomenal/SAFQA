import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import icon from "../../../assets/2.png";
import { useTranslatedApiData } from "../../../hooks/useTranslatedApiData";
import { useAutoTranslatedText } from "../../../hooks/useAutoTranslatedText";
import {
  CONDITION_OPTIONS,
  deleteAuction,
  editAuction,
  getAuctionCategories,
  getAuctionView,
} from "../../../API/createAuction";

const toImageSrc = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
  if (raw.startsWith("data:image/")) return raw;
  return `data:image/png;base64,${raw}`;
};

const formatDate = (value) => {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "--";
  return d.toLocaleString();
};

const formatMoney = (value) => {
  const num = Number(value || 0);
  if (!Number.isFinite(num)) return "$0";
  return `$${num.toLocaleString()}`;
};

const getConditionLabel = (value, t) => {
  const found = CONDITION_OPTIONS.find(
    (item) => String(item.value) === String(value)
  );
  return t(String(found?.label || "unknown"), {
    defaultValue: found?.label || t("unknown"),
  });
};

export default function ViewAuction() {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();

  const [favicon] = useState(icon);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [error, setError] = useState("");

  const [auction, setAuction] = useState(null);
  const [categories, setCategories] = useState([]);

  const { translatedData: translatedAuction } = useTranslatedApiData(auction);
  const { translatedData: translatedCategories } = useTranslatedApiData(categories);
  const { translatedText: translatedError } = useAutoTranslatedText(error);

  const displayAuction = translatedAuction || auction;
  const displayCategories = Array.isArray(translatedCategories)
    ? translatedCategories
    : categories;

  const [form, setForm] = useState({
    id: 0,
    title: "",
    description: "",
    categoryId: "",
    imageFile: null,
    imagePreview: "",
    items: [],
  });

  useEffect(() => {
    document.title = t("viewAuctionDocTitle");
  }, [t]);

  useEffect(() => {
    const updateFavicon = (iconUrl) => {
      const link = document.querySelector("link[rel~='icon']");
      if (!link) {
        const newLink = document.createElement("link");
        newLink.rel = "icon";
        newLink.href = iconUrl;
        document.head.appendChild(newLink);
      } else {
        link.href = iconUrl;
      }
    };

    updateFavicon(favicon);
  }, [favicon]);

  const loadPage = async () => {
    try {
      setLoading(true);
      setError("");

      const [auctionData, categoriesData] = await Promise.all([
        getAuctionView(id),
        getAuctionCategories(),
      ]);

      setAuction(auctionData);
      setCategories(Array.isArray(categoriesData) ? categoriesData : []);

      setForm({
        id: Number(auctionData?.id || 0),
        title: auctionData?.title || "",
        description: auctionData?.description || "",
        categoryId: String(auctionData?.categoryId || ""),
        imageFile: null,
        imagePreview: auctionData?.image || "",
        items: Array.isArray(auctionData?.items)
          ? auctionData.items.map((item) => ({
              id: item?.id || 0,
              title: item?.title || "",
              count: String(item?.count || 1),
              description: item?.description || auctionData?.description || "",
              warrantyInfo: item?.warrantyInfo || "",
              condition: String(item?.condition || 1),
              categoryId: Number(item?.categoryId || auctionData?.categoryId || 0),
              attributes: Array.isArray(item?.attributes)
                ? item.attributes.map((attr) => ({
                    categoryAttributeId: Number(attr?.categoryAttributeId || 0),
                    value: String(attr?.value || ""),
                    name: attr?.name || "",
                  }))
                : [],
              image: item?.image || "",
            }))
          : [],
      });
    } catch (err) {
      setError(
        err?.response?.data?.message || err?.message || t("failedToLoadAuction")
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const updateItem = (index, field, value) => {
    setForm((prev) => ({
      ...prev,
      items: prev.items.map((item, i) =>
        i === index
          ? {
              ...item,
              [field]: value,
            }
          : item
      ),
    }));
  };

  const handleHeadImage = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setForm((prev) => ({
      ...prev,
      imageFile: file,
      imagePreview: URL.createObjectURL(file),
    }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError("");

      const payload = {
        title: String(form.title || "").trim(),
        description: String(form.description || "").trim(),
        categoryId: Number(form.categoryId || 0),
        image: form.imageFile || undefined,
        items: form.items.map((item) => ({
          title: String(item.title || "").trim(),
          count: Number(item.count || 1),
          description:
            String(item.description || "").trim() ||
            String(form.description || "").trim(),
          warrantyInfo: String(item.warrantyInfo || "").trim(),
          condition: Number(item.condition || 1),
          categoryId: Number(item.categoryId || form.categoryId || 0),
          attributes: Array.isArray(item.attributes)
            ? item.attributes
                .map((attr) => ({
                  categoryAttributeId: Number(attr.categoryAttributeId || 0),
                  value: String(attr.value || "").trim(),
                }))
                .filter(
                  (attr) =>
                    attr.categoryAttributeId > 0 &&
                    String(attr.value || "").trim() !== ""
                )
            : [],
        })),
      };

      await editAuction(id, payload);
      setEditMode(false);
      await loadPage();
    } catch (err) {
      setError(
        err?.response?.data?.message || err?.message || t("failedToUpdateAuction")
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    const confirmed = window.confirm(t("confirmDeleteAuction"));
    if (!confirmed) return;

    try {
      setDeleting(true);
      setError("");
      await deleteAuction(id);
      navigate("/seller-history");
    } catch (err) {
      setError(
        err?.response?.data?.message || err?.message || t("failedToDeleteAuction")
      );
    } finally {
      setDeleting(false);
    }
  };

  const selectedCategoryName = useMemo(() => {
    const found = displayCategories.find(
      (item) => String(item.id) === String(form.categoryId || auction?.categoryId)
    );
    return found?.name || displayAuction?.categoryName || "-";
  }, [displayCategories, form.categoryId, auction, displayAuction]);

  return (
    <div className="view-auction-page">
      <style>{`
        .view-auction-page {
          width: 100%;
          min-height: 100vh;
          background: #f5f6fa;
          padding: 36px 0 60px;
          font-family: Arial, Helvetica, sans-serif;
        }

        .view-auction-page * {
          box-sizing: border-box;
        }

        .view-auction-container {
          width: min(1280px, 94%);
          margin: 0 auto;
        }

        .view-auction-title {
          text-align: center;
          color: #023E8A;
          font-size: 36px;
          font-weight: 800;
          margin: 0 0 26px;
        }

        .view-auction-error {
          background: #fff1f0;
          color: #cf1322;
          border: 1px solid #ffa39e;
          border-radius: 14px;
          padding: 14px 16px;
          margin-bottom: 18px;
        }

        .view-auction-shell {
          background: #fff;
          border-radius: 22px;
          padding: 24px;
          box-shadow: 0 8px 24px rgba(0,0,0,0.06);
        }

        .view-auction-top {
          display: grid;
          grid-template-columns: 360px 1fr;
          gap: 22px;
          margin-bottom: 24px;
        }

        .view-auction-head-image {
          width: 100%;
          height: 260px;
          object-fit: cover;
          border-radius: 18px;
          background: #eef2f7;
          border: 1px solid #e5e7eb;
        }

        .view-auction-head-fallback {
          width: 100%;
          height: 260px;
          border-radius: 18px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #eef2f7;
          border: 1px solid #e5e7eb;
          color: #94a3b8;
          font-weight: 700;
        }

        .view-auction-summary {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .view-auction-name {
          font-size: 32px;
          font-weight: 900;
          color: #1f2937;
          margin: 0;
        }

        .view-auction-desc {
          font-size: 15px;
          line-height: 1.8;
          color: #4b5563;
          margin: 0;
        }

        .view-auction-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 14px;
        }

        .view-auction-box {
          border: 1px solid #e5e7eb;
          border-radius: 16px;
          padding: 14px 16px;
          background: #fafafa;
        }

        .view-auction-box-label {
          color: #94a3b8;
          font-size: 12px;
          font-weight: 800;
          margin-bottom: 6px;
          text-transform: uppercase;
        }

        .view-auction-box-value {
          color: #111827;
          font-size: 16px;
          font-weight: 800;
          word-break: break-word;
        }

        .view-auction-actions {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
          margin-top: 10px;
        }

        .view-auction-btn {
          min-width: 140px;
          padding: 13px 18px;
          border: none;
          border-radius: 12px;
          font-size: 14px;
          font-weight: 800;
          cursor: pointer;
        }

        .view-auction-btn-edit {
          background: #023E8A;
          color: #fff;
        }

        .view-auction-btn-delete {
          background: #fff1f0;
          color: #cf1322;
        }

        .view-auction-btn-back {
          background: #eef2f7;
          color: #334155;
        }

        .view-auction-section-title {
          color: #111827;
          font-size: 24px;
          font-weight: 800;
          margin: 24px 0 14px;
        }

        .view-auction-items {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .view-auction-item {
          border: 1px solid #e5e7eb;
          border-radius: 18px;
          background: #fff;
          padding: 16px;
          display: grid;
          grid-template-columns: 170px 1fr;
          gap: 16px;
          align-items: center;
        }

        .view-auction-item-image {
          width: 170px;
          height: 120px;
          border-radius: 14px;
          object-fit: cover;
          background: #eef2f7;
          border: 1px solid #e5e7eb;
        }

        .view-auction-item-image-fallback {
          width: 170px;
          height: 120px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #eef2f7;
          border: 1px solid #e5e7eb;
          color: #94a3b8;
          font-weight: 700;
        }

        .view-auction-item-title {
          font-size: 22px;
          font-weight: 800;
          color: #1f2937;
          margin: 0 0 8px;
        }

        .view-auction-item-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-bottom: 10px;
        }

        .view-auction-chip {
          padding: 8px 12px;
          border-radius: 999px;
          background: #f1f5f9;
          color: #334155;
          font-size: 13px;
          font-weight: 700;
        }

        .view-auction-attrs {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 10px;
        }

        .view-auction-attr {
          padding: 8px 10px;
          border-radius: 10px;
          border: 1px solid #e5e7eb;
          background: #fafafa;
          color: #334155;
          font-size: 13px;
          font-weight: 700;
        }

        .view-auction-edit-field {
          margin-bottom: 14px;
        }

        .view-auction-edit-field label {
          display: block;
          margin-bottom: 8px;
          color: #023E8A;
          font-weight: 700;
          font-size: 14px;
        }

        .view-auction-input,
        .view-auction-select,
        .view-auction-textarea {
          width: 100%;
          border: 1px solid #d5dce8;
          border-radius: 12px;
          background: #fff;
          padding: 13px 14px;
          font-size: 14px;
          color: #263248;
          outline: none;
        }

        .view-auction-textarea {
          min-height: 110px;
          resize: vertical;
        }

        @media (max-width: 1000px) {
          .view-auction-top {
            grid-template-columns: 1fr;
          }

          .view-auction-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 760px) {
          .view-auction-item {
            grid-template-columns: 1fr;
          }

          .view-auction-item-image,
          .view-auction-item-image-fallback {
            width: 100%;
            height: 220px;
          }
        }
      `}</style>

      <div className="view-auction-container">
        <h2 className="view-auction-title">
          {editMode ? t("editAuction") : t("viewAuction")}
        </h2>

        {error && <div className="view-auction-error">{translatedError}</div>}

        <div className="view-auction-shell">
          {loading ? (
            <div style={{ textAlign: "center", padding: 30 }}>
              {t("loadingAuction")}
            </div>
          ) : !displayAuction ? (
            <div style={{ textAlign: "center", padding: 30 }}>
              {t("auctionNotFound")}
            </div>
          ) : (
            <>
              <div className="view-auction-top">
                <div>
                  {editMode ? (
                    <>
                      {form.imagePreview ? (
                        <img
                          src={toImageSrc(form.imagePreview)}
                          alt="auction"
                          className="view-auction-head-image"
                        />
                      ) : (
                        <div className="view-auction-head-fallback">{t("noImage")}</div>
                      )}

                      <div className="view-auction-edit-field" style={{ marginTop: 12 }}>
                        <label>{t("changeHeadImage")}</label>
                        <input type="file" onChange={handleHeadImage} />
                      </div>
                    </>
                  ) : displayAuction.image ? (
                    <img
                      src={toImageSrc(displayAuction.image)}
                      alt={displayAuction.title}
                      className="view-auction-head-image"
                    />
                  ) : (
                    <div className="view-auction-head-fallback">{t("noImage")}</div>
                  )}
                </div>

                <div className="view-auction-summary">
                  {editMode ? (
                    <>
                      <div className="view-auction-edit-field">
                        <label>{t("title")}</label>
                        <input
                          className="view-auction-input"
                          value={form.title}
                          onChange={(e) =>
                            setForm((prev) => ({ ...prev, title: e.target.value }))
                          }
                        />
                      </div>

                      <div className="view-auction-edit-field">
                        <label>{t("description")}</label>
                        <textarea
                          className="view-auction-textarea"
                          value={form.description}
                          onChange={(e) =>
                            setForm((prev) => ({
                              ...prev,
                              description: e.target.value,
                            }))
                          }
                        />
                      </div>

                      <div className="view-auction-edit-field">
                        <label>{t("category")}</label>
                        <select
                          className="view-auction-select"
                          value={form.categoryId}
                          onChange={(e) =>
                            setForm((prev) => ({
                              ...prev,
                              categoryId: e.target.value,
                              items: prev.items.map((item) => ({
                                ...item,
                                categoryId: Number(e.target.value || 0),
                              })),
                            }))
                          }
                        >
                          <option value="">{t("selectCategory", { defaultValue: "Select category" })}</option>
                          {displayCategories.map((cat) => (
                            <option key={cat.id} value={cat.id}>
                              {cat.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </>
                  ) : (
                    <>
                      <h3 className="view-auction-name">{displayAuction.title}</h3>
                      <p className="view-auction-desc">{displayAuction.description || "-"}</p>
                    </>
                  )}

                  <div className="view-auction-grid">
                    <div className="view-auction-box">
                      <div className="view-auction-box-label">{t("category")}</div>
                      <div className="view-auction-box-value">
                        {editMode ? selectedCategoryName : displayAuction.categoryName || displayAuction.categoryId || "-"}
                      </div>
                    </div>

                    <div className="view-auction-box">
                      <div className="view-auction-box-label">{t("status")}</div>
                      <div className="view-auction-box-value">
                        {displayAuction.status || "-"}
                      </div>
                    </div>

                    <div className="view-auction-box">
                      <div className="view-auction-box-label">{t("startDate")}</div>
                      <div className="view-auction-box-value">
                        {formatDate(displayAuction.startDate)}
                      </div>
                    </div>

                    <div className="view-auction-box">
                      <div className="view-auction-box-label">{t("endDate")}</div>
                      <div className="view-auction-box-value">
                        {formatDate(displayAuction.endDate)}
                      </div>
                    </div>

                    <div className="view-auction-box">
                      <div className="view-auction-box-label">{t("startingPrice")}</div>
                      <div className="view-auction-box-value">
                        {formatMoney(displayAuction.startingPrice)}
                      </div>
                    </div>

                    <div className="view-auction-box">
                      <div className="view-auction-box-label">{t("currentPrice")}</div>
                      <div className="view-auction-box-value">
                        {formatMoney(displayAuction.currentPrice)}
                      </div>
                    </div>
                  </div>

                  <div className="view-auction-actions">
                    <button
                      type="button"
                      className="view-auction-btn view-auction-btn-back"
                      onClick={() => navigate("/seller-history")}
                    >
                      {t("back")}
                    </button>

                    {editMode ? (
                      <button
                        type="button"
                        className="view-auction-btn view-auction-btn-edit"
                        onClick={handleSave}
                        disabled={saving}
                      >
                        {saving ? t("saving") : t("saveEdit")}
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="view-auction-btn view-auction-btn-edit"
                        onClick={() => setEditMode(true)}
                      >
                        {t("edit")}
                      </button>
                    )}

                    <button
                      type="button"
                      className="view-auction-btn view-auction-btn-delete"
                      onClick={handleDelete}
                      disabled={deleting}
                    >
                      {deleting ? t("deleting") : t("delete")}
                    </button>
                  </div>
                </div>
              </div>

              <h3 className="view-auction-section-title">{t("items")}</h3>

              <div className="view-auction-items">
                {(editMode ? form.items : displayAuction.items || []).map((item, index) => (
                  <div className="view-auction-item" key={item.id || index}>
                    {item.image ? (
                      <img
                        src={toImageSrc(item.image)}
                        alt={item.title}
                        className="view-auction-item-image"
                      />
                    ) : (
                      <div className="view-auction-item-image-fallback">{t("noImage")}</div>
                    )}

                    <div>
                      {editMode ? (
                        <>
                          <div className="view-auction-edit-field">
                            <label>{t("itemTitle")}</label>
                            <input
                              className="view-auction-input"
                              value={item.title}
                              onChange={(e) => updateItem(index, "title", e.target.value)}
                            />
                          </div>

                          <div
                            style={{
                              display: "grid",
                              gridTemplateColumns: "1fr 1fr",
                              gap: 12,
                            }}
                          >
                            <div className="view-auction-edit-field">
                              <label>{t("count")}</label>
                              <input
                                type="number"
                                min="1"
                                className="view-auction-input"
                                value={item.count}
                                onChange={(e) => updateItem(index, "count", e.target.value)}
                              />
                            </div>

                            <div className="view-auction-edit-field">
                              <label>{t("condition")}</label>
                              <select
                                className="view-auction-select"
                                value={item.condition}
                                onChange={(e) =>
                                  updateItem(index, "condition", e.target.value)
                                }
                              >
                                {CONDITION_OPTIONS.map((cond) => (
                                  <option key={cond.value} value={cond.value}>
                                    {t(String(cond.label), { defaultValue: cond.label })}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>

                          <div className="view-auction-edit-field">
                            <label>{t("warrantyInfo")}</label>
                            <input
                              className="view-auction-input"
                              value={item.warrantyInfo}
                              onChange={(e) =>
                                updateItem(index, "warrantyInfo", e.target.value)
                              }
                            />
                          </div>

                          <div className="view-auction-edit-field">
                            <label>{t("description")}</label>
                            <textarea
                              className="view-auction-textarea"
                              value={item.description}
                              onChange={(e) =>
                                updateItem(index, "description", e.target.value)
                              }
                            />
                          </div>
                        </>
                      ) : (
                        <>
                          <h4 className="view-auction-item-title">{item.title}</h4>

                          <div className="view-auction-item-meta">
                            <span className="view-auction-chip">
                              {getConditionLabel(item.condition, t)}
                            </span>
                            <span className="view-auction-chip">
                              {t("count")}: {item.count || 1}
                            </span>
                            {item.warrantyInfo ? (
                              <span className="view-auction-chip">
                                {t("warrantyInfo")}: {item.warrantyInfo}
                              </span>
                            ) : null}
                          </div>

                          <div style={{ color: "#6b7280", lineHeight: 1.7 }}>
                            {item.description || "-"}
                          </div>

                          {Array.isArray(item.attributes) && item.attributes.length > 0 ? (
                            <div className="view-auction-attrs">
                              {item.attributes.map((attr, attrIndex) => (
                                <div
                                  className="view-auction-attr"
                                  key={`${index}-${attrIndex}`}
                                >
                                  {attr.name || `${t("attribute")} ${attr.categoryAttributeId}`}:{" "}
                                  {attr.value || "-"}
                                </div>
                              ))}
                            </div>
                          ) : null}
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}