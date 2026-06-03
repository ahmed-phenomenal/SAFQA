import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import icon from "../../../assets/2.png";
import { useTranslatedApiData } from "../../../Hooks/useTranslatedApiData";
import { useAutoTranslatedText } from "../../../Hooks/useAutoTranslatedText";
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