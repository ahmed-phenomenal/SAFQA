import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import icon from "../../../assets/2.png";
import {
  createAuction,
  getAuctionCategories,
  getCategoryAttributes,
  CONDITION_OPTIONS,
  ATTRIBUTE_DATA_TYPES,
  ATTRIBUTE_UNITS,
} from "../../../API/createAuction";

const BID_OPTIONS = ["100", "300", "500", "Specify"];
const DURATION_OPTIONS = ["24 hours", "3 days", "7 days", "Specify"];

const formatDateTimeLocalInput = (date) => {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "";

  const pad = (value) => String(value).padStart(2, "0");

  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(
    d.getDate()
  )}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const addHours = (dateValue, hours) => {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "";
  date.setHours(date.getHours() + hours);
  return formatDateTimeLocalInput(date);
};

const durationToHours = (value) => {
  if (value === "24 hours") return 24;
  if (value === "3 days") return 72;
  if (value === "7 days") return 168;
  return 0;
};

const toApiDateTime = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString();
};

const isAllowedImage = (file) => {
  if (!file) return false;
  const allowed = ["image/jpeg", "image/jpg", "image/png"];
  return allowed.includes(String(file.type || "").toLowerCase());
};

const isEmptyAttributeValue = (value) => {
  return value === undefined || value === null || String(value).trim() === "";
};

const normalizeNumberInput = (value) =>
  String(value || "").replace(/[^\d.]/g, "");

const normalizeIntegerInput = (value) =>
  String(value || "").replace(/\D/g, "");

const getAttributeInputKind = (attribute) => {
  const dataType = Number(attribute?.dataType || 0);

  if (dataType === ATTRIBUTE_DATA_TYPES.TEXT) return "text";
  if (dataType === ATTRIBUTE_DATA_TYPES.NUMBER) return "number";
  if (dataType === ATTRIBUTE_DATA_TYPES.BOOLEAN) return "boolean";
  if (dataType === ATTRIBUTE_DATA_TYPES.DATE) return "date";
  if (dataType === ATTRIBUTE_DATA_TYPES.DATETIME) return "datetime";

  return "text";
};

const buildDefaultItem = () => ({
  imageFile: null,
  imagePreview: "",
  error: "",
  title: "",
  count: "1",
  warrantyInfo: "",
  condition: String(CONDITION_OPTIONS?.[0]?.value ?? 1),
  attributeValues: {},
});

export default function Lot_Auction() {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === "ar";

  const [favicon] = useState(icon);

  const [step, setStep] = useState(1);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [loadingCategories, setLoadingCategories] = useState(true);
  const [loadingAttributes, setLoadingAttributes] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [categories, setCategories] = useState([]);
  const [categoryAttributes, setCategoryAttributes] = useState([]);

  const [lotTitle, setLotTitle] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [description, setDescription] = useState("");

  const [selectedBid, setSelectedBid] = useState("100");
  const [customBid, setCustomBid] = useState("");
  const [startingPrice, setStartingPrice] = useState("");

  const [startDate, setStartDate] = useState(() =>
    formatDateTimeLocalInput(new Date(Date.now() + 5 * 60 * 1000))
  );
  const [selectedDuration, setSelectedDuration] = useState("24 hours");
  const [customEndDate, setCustomEndDate] = useState("");

  const [items, setItems] = useState([buildDefaultItem()]);

  const [headImageFile, setHeadImageFile] = useState(null);
  const [headImagePreview, setHeadImagePreview] = useState("");
  const [headError, setHeadError] = useState("");

  useEffect(() => {
    document.title = t("lotAuctionDocTitle");
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

  const getReadableDate = (value) => {
    if (!value) return "--";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "--";
    return date.toLocaleString(i18n.language);
  };

  const getErrorMessage = (err, fallback = t("somethingWentWrong")) => {
    return (
      err?.response?.data?.message ||
      err?.response?.data?.Message ||
      err?.response?.data?.title ||
      err?.message ||
      fallback
    );
  };

  const getUnitLabel = (unit) => {
    return ATTRIBUTE_UNITS?.[Number(unit)] || "";
  };

  const getBidLabel = (bid) => {
    if (bid === "Specify") return t("specify");
    return bid;
  };

  const getDurationLabel = (duration) => {
    if (duration === "24 hours") return t("duration24Hours");
    if (duration === "3 days") return t("duration3Days");
    if (duration === "7 days") return t("duration7Days");
    if (duration === "Specify") return t("specify");
    return duration;
  };

  const getConditionLabel = (label) => {
    const value = String(label || "").trim().toLowerCase();

    if (value === "new") return t("conditionNew");
    if (value === "used") return t("conditionUsed");
    if (value === "refurbished") return t("conditionRefurbished");

    return t(String(label), { defaultValue: label });
  };

  useEffect(() => {
    let mounted = true;

    const loadCategories = async () => {
      try {
        setLoadingCategories(true);
        setError("");
        const data = await getAuctionCategories();
        if (!mounted) return;
        setCategories(Array.isArray(data) ? data : []);
      } catch (err) {
        if (!mounted) return;
        setError(getErrorMessage(err, t("failedToLoadCategories")));
      } finally {
        if (mounted) setLoadingCategories(false);
      }
    };

    loadCategories();

    return () => {
      mounted = false;
    };
  }, [t]);

  useEffect(() => {
    let mounted = true;

    const loadAttributes = async () => {
      if (!categoryId) {
        setCategoryAttributes([]);
        setItems((prev) =>
          prev.map((item) => ({
            ...item,
            attributeValues: {},
          }))
        );
        return;
      }

      try {
        setLoadingAttributes(true);
        const data = await getCategoryAttributes(categoryId);
        if (!mounted) return;

        const safeAttributes = Array.isArray(data) ? data : [];
        setCategoryAttributes(safeAttributes);

        setItems((prev) =>
          prev.map((item) => ({
            ...item,
            attributeValues: {},
          }))
        );
      } catch (err) {
        if (!mounted) return;
        setCategoryAttributes([]);
        setError(getErrorMessage(err, t("failedToLoadCategoryAttributes")));
      } finally {
        if (mounted) setLoadingAttributes(false);
      }
    };

    loadAttributes();

    return () => {
      mounted = false;
    };
  }, [categoryId, t]);

  useEffect(() => {
    return () => {
      if (headImagePreview) {
        URL.revokeObjectURL(headImagePreview);
      }

      items.forEach((item) => {
        if (item.imagePreview) {
          URL.revokeObjectURL(item.imagePreview);
        }
      });
    };
  }, [headImagePreview, items]);

  const effectiveBidIncrement = useMemo(() => {
    if (selectedBid === "Specify") return String(customBid || "").trim();
    return String(selectedBid || "").trim();
  }, [selectedBid, customBid]);

  const effectiveEndDate = useMemo(() => {
    if (selectedDuration === "Specify") return customEndDate;

    const hours = durationToHours(selectedDuration);
    if (!hours || !startDate) return "";

    return addHours(startDate, hours);
  }, [selectedDuration, customEndDate, startDate]);

  const addItem = () => {
    setItems((prev) => [...prev, buildDefaultItem()]);
  };

  const removeItem = (index) => {
    if (items.length === 1) return;

    const oldPreview = items[index]?.imagePreview;
    if (oldPreview) URL.revokeObjectURL(oldPreview);

    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const updateItem = (index, field, value) => {
    setItems((prev) =>
      prev.map((item, i) =>
        i === index
          ? {
              ...item,
              [field]: value,
            }
          : item
      )
    );
  };

  const updateItemAttribute = (itemIndex, attributeId, value) => {
    setItems((prev) =>
      prev.map((item, i) =>
        i === itemIndex
          ? {
              ...item,
              attributeValues: {
                ...(item.attributeValues || {}),
                [attributeId]: value,
              },
            }
          : item
      )
    );
  };

  const handleHeadImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!isAllowedImage(file)) {
      setHeadError(t("onlyJpgPng"));
      return;
    }

    if (headImagePreview) {
      URL.revokeObjectURL(headImagePreview);
    }

    setHeadError("");
    setHeadImageFile(file);
    setHeadImagePreview(URL.createObjectURL(file));
  };

  const handleItemImageUpload = (e, index) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!isAllowedImage(file)) {
      updateItem(index, "error", t("onlyJpgPng"));
      return;
    }

    const oldPreview = items[index]?.imagePreview;
    if (oldPreview) {
      URL.revokeObjectURL(oldPreview);
    }

    updateItem(index, "error", "");
    updateItem(index, "imageFile", file);
    updateItem(index, "imagePreview", URL.createObjectURL(file));
  };

  const validateStepOne = () => {
    if (!lotTitle.trim()) return t("lotTitleRequired");
    if (!categoryId) return t("lotCategoryRequired");
    if (!description.trim()) return t("lotDescriptionRequired");
    if (!items.length) return t("atLeastOneItemRequired");

    for (let i = 0; i < items.length; i += 1) {
      const item = items[i];

      if (!String(item.title || "").trim()) {
        return t("itemTitleRequiredIndexed", { index: i + 1 });
      }

      if (!item.count || Number(item.count) <= 0) {
        return t("itemCountGreaterThanZeroIndexed", { index: i + 1 });
      }

      if (!String(item.warrantyInfo || "").trim()) {
        return t("itemWarrantyRequiredIndexed", { index: i + 1 });
      }

      for (const attr of categoryAttributes) {
        const rawValue = item.attributeValues?.[attr.id];

        if (attr.isRequired && isEmptyAttributeValue(rawValue)) {
          return t("attributeRequiredForItem", {
            attribute: attr.name,
            index: i + 1,
          });
        }
      }
    }

    return "";
  };

  const validateStepTwo = () => {
    const startingPriceNumber = Number(startingPrice);
    const bidIncrementNumber = Number(effectiveBidIncrement);

    if (!startDate) return t("startDateRequired");
    if (!effectiveEndDate) return t("endDateRequired");

    if (new Date(effectiveEndDate).getTime() <= new Date(startDate).getTime()) {
      return t("endDateAfterStart");
    }

    if (!Number.isFinite(startingPriceNumber) || startingPriceNumber <= 0) {
      return t("startingPriceGreaterThanZero");
    }

    if (!Number.isFinite(bidIncrementNumber) || bidIncrementNumber <= 0) {
      return t("bidIncrementGreaterThanZero");
    }

    return "";
  };

  const handleSave = () => {
    const validationMessage = validateStepOne();

    if (validationMessage) {
      setError(validationMessage);
      return;
    }

    setError("");
    setSuccess("");
    setStep(2);
  };

  const buildItemAttributes = (item) => {
    return categoryAttributes
      .map((attr) => {
        const rawValue = item.attributeValues?.[attr.id];

        if (isEmptyAttributeValue(rawValue)) return null;

        const kind = getAttributeInputKind(attr);
        let finalValue = rawValue;

        if (kind === "datetime") {
          finalValue = toApiDateTime(rawValue);
        } else if (kind === "date") {
          finalValue = String(rawValue).trim();
        } else if (kind === "boolean") {
          finalValue =
            String(rawValue).trim().toLowerCase() === "true" ? "true" : "false";
        } else {
          finalValue = String(rawValue).trim();
        }

        return {
          categoryAttributeId: Number(attr.id),
          value: finalValue,
        };
      })
      .filter(Boolean);
  };

  const renderAttributeInput = (attribute, item, itemIndex) => {
    const value = item.attributeValues?.[attribute.id] ?? "";
    const unitLabel = getUnitLabel(attribute.unit);
    const kind = getAttributeInputKind(attribute);

    if (kind === "number") {
      return (
        <input
          className="input"
          type="number"
          value={value}
          onChange={(e) =>
            updateItemAttribute(
              itemIndex,
              attribute.id,
              normalizeNumberInput(e.target.value)
            )
          }
          placeholder={
            unitLabel
              ? t("enterFieldWithUnit", { field: attribute.name, unit: unitLabel })
              : t("enterField", { field: attribute.name })
          }
        />
      );
    }

    if (kind === "boolean") {
      return (
        <select
          className="input"
          value={value}
          onChange={(e) =>
            updateItemAttribute(itemIndex, attribute.id, e.target.value)
          }
        >
          <option value="">{t("select")}</option>
          <option value="true">{t("true")}</option>
          <option value="false">{t("false")}</option>
        </select>
      );
    }

    if (kind === "date") {
      return (
        <input
          className="input"
          type="date"
          value={value}
          onChange={(e) =>
            updateItemAttribute(itemIndex, attribute.id, e.target.value)
          }
        />
      );
    }

    if (kind === "datetime") {
      return (
        <input
          className="input"
          type="datetime-local"
          value={value}
          onChange={(e) =>
            updateItemAttribute(itemIndex, attribute.id, e.target.value)
          }
        />
      );
    }

    return (
      <input
        className="input"
        type="text"
        value={value}
        onChange={(e) =>
          updateItemAttribute(itemIndex, attribute.id, e.target.value)
        }
        placeholder={
          unitLabel
            ? t("enterFieldWithUnit", { field: attribute.name, unit: unitLabel })
            : t("enterField", { field: attribute.name })
        }
      />
    );
  };

  const handleSubmit = async () => {
    const validationStepOne = validateStepOne();
    if (validationStepOne) {
      setError(validationStepOne);
      setStep(1);
      return;
    }

    const validationMessage = validateStepTwo();

    if (validationMessage) {
      setError(validationMessage);
      return;
    }

    try {
      setSubmitting(true);
      setError("");
      setSuccess("");

      const payload = {
        title: lotTitle.trim(),
        description: description.trim(),
        categoryId: Number(categoryId),
        startingPrice: Number(startingPrice),
        bidIncrement: Number(effectiveBidIncrement),
        startDate: toApiDateTime(startDate),
        endDate: toApiDateTime(effectiveEndDate),
        image: headImageFile || undefined,
        items: items.map((item) => ({
          title: String(item.title || "").trim(),
          count: Number(item.count),
          description: description.trim(),
          warrantyInfo: String(item.warrantyInfo || "").trim(),
          condition: Number(item.condition),
          categoryId: Number(categoryId),
          image: item.imageFile || undefined,
          attributes: buildItemAttributes(item),
        })),
      };

      const response = await createAuction(payload);

      setSuccess(response?.message || t("lotAuctionCreatedSuccessfully"));

      setTimeout(() => {
        window.location.href = "/seller-history";
      }, 700);
    } catch (err) {
      setError(getErrorMessage(err, t("failedToCreateLotAuction")));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="lot-auction" dir={isArabic ? "rtl" : "ltr"}>
      <style>{`
        .lot-auction {
          width: 100%;
          min-height: 100vh;
          background: #f5f6fa;
          padding: 32px 0 60px;
          box-sizing: border-box;
          font-family: Arial, Helvetica, sans-serif;
        }
        .lot-auction * { box-sizing: border-box; }
        .lot-auction .container-inner {
          width: min(920px, 92%);
          margin: 0 auto;
        }
        .lot-auction .title {
          text-align: center;
          color: #023E8A;
          font-size: 32px;
          font-weight: 700;
          margin: 0 0 24px;
        }
        .lot-auction .section {
          background: #fff;
          border-radius: 18px;
          padding: 22px;
          box-shadow: 0 8px 24px rgba(0,0,0,0.06);
          margin-bottom: 18px;
        }
        .lot-auction .section-title {
          color: #1f2a37;
          font-size: 18px;
          font-weight: 700;
          margin: 0 0 14px;
        }
        .lot-auction .image-preview {
          width: 180px;
          height: 180px;
          object-fit: cover;
          border-radius: 16px;
          display: block;
          margin-bottom: 14px;
          border: 1px solid #e7e7e7;
        }
        .lot-auction .image-upload,
        .lot-auction .save-btn,
        .lot-auction .add-btn,
        .lot-auction .remove-btn,
        .lot-auction .back-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border: none;
          cursor: pointer;
          font-weight: 700;
          border-radius: 12px;
          transition: 0.2s ease;
        }
        .lot-auction .image-upload {
          background: #fff;
          color: #6b7280;
          border: 2px dashed #d1d5db;
          width: 100%;
          min-height: 140px;
          margin-bottom: 14px;
        }
        .lot-auction .input,
        .lot-auction .textarea {
          width: 100%;
          border: 1px solid #d9d9d9;
          border-radius: 12px;
          padding: 14px 16px;
          font-size: 15px;
          outline: none;
          margin-bottom: 14px;
          background: #fff;
        }
        .lot-auction .textarea {
          min-height: 110px;
          resize: vertical;
        }
        .lot-auction .condition {
          display: flex;
          flex-wrap: wrap;
          gap: 16px;
          margin-top: 8px;
        }
        .lot-auction .condition label {
          display: flex;
          align-items: center;
          gap: 8px;
          background: #fafafa;
          border: 1px solid #ececec;
          padding: 10px 14px;
          border-radius: 10px;
          cursor: pointer;
        }
        .lot-auction .tags {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-bottom: 14px;
        }
        .lot-auction .tag {
          padding: 10px 16px;
          border-radius: 12px;
          border: 1px solid #dcdcdc;
          background: #fafafa;
          cursor: pointer;
          font-weight: 600;
          font-size: 14px;
        }
        .lot-auction .info-box {
          margin-top: 20px;
          color: #023E8A;
          font-weight: 600;
          line-height: 1.7;
        }
        .lot-auction .error-note {
          color: red;
          margin-bottom: 20px;
          font-weight: 600;
        }
        .lot-auction .success-note {
          color: green;
          margin-bottom: 20px;
          font-weight: 600;
        }
        .lot-auction .file-error {
          background: #fff1f0;
          color: #cf1322;
          border: 1px solid #ffa39e;
          border-radius: 12px;
          padding: 12px 14px;
          margin-bottom: 14px;
        }
        .lot-auction .save-btn {
          background: #023E8A;
          color: white;
          width: 100%;
          min-height: 58px;
          font-size: 17px;
        }
        .lot-auction .add-btn,
        .lot-auction .back-btn,
        .lot-auction .remove-btn {
          background: #eef2ff;
          color: #023E8A;
          padding: 12px 18px;
        }
        .lot-auction .actions {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
        }
        .lot-auction .attribute-box {
          border: 1px solid #ececec;
          border-radius: 14px;
          padding: 14px;
          margin-bottom: 14px;
          background: #fcfcfc;
        }
        .lot-auction .attribute-title {
          font-size: 14px;
          font-weight: 700;
          color: #1f1f1f;
          margin-bottom: 8px;
        }
        .lot-auction .attribute-meta {
          font-size: 12px;
          color: #6c757d;
          margin-bottom: 10px;
        }
      `}</style>

      <div className="container-inner">
        {step === 1 && (
          <>
            <h2 className="title">{t("lotAuction")}</h2>

            <div className="section">
              <h3 className="section-title">{t("lotDetails")}</h3>

              {headImagePreview && (
                <img
                  src={headImagePreview}
                  className="image-preview"
                  alt={t("headPreview")}
                />
              )}

              <label className="image-upload">
                {t("headImage")}
                <input
                  type="file"
                  hidden
                  accept="image/png, image/jpeg, image/jpg"
                  onChange={handleHeadImageUpload}
                />
              </label>

              {headError && <div className="file-error">{headError}</div>}

              <input
                className="input"
                placeholder={t("lotTitle")}
                value={lotTitle}
                onChange={(e) => setLotTitle(e.target.value)}
              />

              <select
                className="input"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                disabled={loadingCategories}
              >
                <option value="">
                  {loadingCategories ? t("loadingCategories") : t("selectCategory")}
                </option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            {items.map((item, index) => (
              <div key={index} className="section">
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 12,
                    marginBottom: 14,
                  }}
                >
                  <h3 className="section-title" style={{ margin: 0 }}>
                    {t("itemIndexed", { index: index + 1 })}
                  </h3>

                  {items.length > 1 ? (
                    <button
                      type="button"
                      className="remove-btn"
                      onClick={() => removeItem(index)}
                    >
                      {t("remove")}
                    </button>
                  ) : null}
                </div>

                {item.imagePreview && (
                  <img
                    src={item.imagePreview}
                    className="image-preview"
                    alt={t("headPreview")}
                  />
                )}

                <label className="image-upload">
                  {t("addImage")}
                  <input
                    type="file"
                    hidden
                    accept="image/png, image/jpeg, image/jpg"
                    onChange={(e) => handleItemImageUpload(e, index)}
                  />
                </label>

                {item.error && <div className="file-error">{item.error}</div>}

                <input
                  className="input"
                  placeholder={t("title")}
                  value={item.title}
                  onChange={(e) => updateItem(index, "title", e.target.value)}
                />

                <input
                  className="input"
                  type="number"
                  min="1"
                  placeholder={t("count")}
                  value={item.count}
                  onChange={(e) =>
                    updateItem(index, "count", normalizeIntegerInput(e.target.value))
                  }
                />

                <input
                  className="input"
                  placeholder={t("warrantyInfoUpper")}
                  value={item.warrantyInfo}
                  onChange={(e) =>
                    updateItem(index, "warrantyInfo", e.target.value)
                  }
                />

                <div className="condition">
                  {CONDITION_OPTIONS.map((cond) => (
                    <label key={`${index}-${cond.value}`}>
                      <input
                        type="radio"
                        name={`cond-${index}`}
                        checked={String(item.condition) === String(cond.value)}
                        onChange={() =>
                          updateItem(index, "condition", String(cond.value))
                        }
                      />
                      {getConditionLabel(cond.label)}
                    </label>
                  ))}
                </div>
              </div>
            ))}

            <div className="actions" style={{ marginBottom: 18 }}>
              <button className="add-btn" onClick={addItem} type="button">
                {t("addItem")}
              </button>
            </div>

            <div className="section">
              <h3 className="section-title">{t("lotDescription")}</h3>

              <textarea
                className="textarea"
                maxLength={500}
                placeholder={t("writeDescription")}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="section">
              <h3 className="section-title">{t("categoryAttributes")}</h3>

              {loadingAttributes ? (
                <div className="info-box">{t("loadingCategoryAttributes")}</div>
              ) : !categoryId ? (
                <div className="info-box">{t("selectCategoryAttributes")}</div>
              ) : categoryAttributes.length === 0 ? (
                <div className="info-box">{t("noAttributesFound")}</div>
              ) : (
                items.map((item, itemIndex) => (
                  <div key={`attrs-${itemIndex}`} style={{ marginBottom: 20 }}>
                    <h4
                      style={{
                        marginBottom: 14,
                        color: "#023E8A",
                        fontSize: 16,
                        fontWeight: 700,
                      }}
                    >
                      {t("itemAttributesIndexed", { index: itemIndex + 1 })}
                    </h4>

                    {categoryAttributes.map((attribute) => (
                      <div
                        key={`${itemIndex}-${attribute.id}`}
                        className="attribute-box"
                      >
                        <div className="attribute-title">
                          {attribute.name}
                          {attribute.isRequired ? " *" : ""}
                        </div>

                        <div className="attribute-meta">
                          {t("type")}: {attribute.dataType}
                          {attribute.unit
                            ? ` | ${t("unit")}: ${getUnitLabel(attribute.unit)}`
                            : ""}
                        </div>

                        {renderAttributeInput(attribute, item, itemIndex)}
                      </div>
                    ))}
                  </div>
                ))
              )}
            </div>

            {error && <div className="error-note">{error}</div>}
            {success && <div className="success-note">{success}</div>}

            <button className="save-btn" onClick={handleSave} type="button">
              {t("saveContinue")}
            </button>
          </>
        )}

        {step === 2 && (
          <>
            <h2 className="title">{t("priceDuration")}</h2>

            <div className="section">
              <h3 className="section-title">{t("startingPrice")}</h3>
              <input
                className="input"
                type="number"
                min="1"
                placeholder={t("enterStartingPrice")}
                value={startingPrice}
                onChange={(e) => setStartingPrice(normalizeNumberInput(e.target.value))}
              />
            </div>

            <div className="section">
              <h3 className="section-title">{t("startDate")}</h3>
              <input
                type="datetime-local"
                className="input"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            <div className="section">
              <h3 className="section-title">{t("bidIncrement")}</h3>

              <div className="tags">
                {BID_OPTIONS.map((bid) => (
                  <span
                    key={bid}
                    className="tag"
                    onClick={() => setSelectedBid(bid)}
                    style={{
                      background: selectedBid === bid ? "#023E8A" : "#fafafa",
                      color: selectedBid === bid ? "#fff" : "#333",
                    }}
                  >
                    {getBidLabel(bid)}
                  </span>
                ))}
              </div>

              {selectedBid === "Specify" && (
                <input
                  type="number"
                  min="1"
                  className="input"
                  value={customBid}
                  onChange={(e) => setCustomBid(normalizeIntegerInput(e.target.value))}
                  placeholder={t("enterCustomBidIncrement")}
                />
              )}
            </div>

            <div className="section">
              <h3 className="section-title">{t("auctionDuration")}</h3>

              <div className="tags">
                {DURATION_OPTIONS.map((dur) => (
                  <span
                    key={dur}
                    className="tag"
                    onClick={() => setSelectedDuration(dur)}
                    style={{
                      background:
                        selectedDuration === dur ? "#023E8A" : "#fafafa",
                      color: selectedDuration === dur ? "#fff" : "#333",
                    }}
                  >
                    {getDurationLabel(dur)}
                  </span>
                ))}
              </div>

              {selectedDuration === "Specify" && (
                <input
                  type="datetime-local"
                  className="input"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                />
              )}

              <div className="info-box">
                {t("auctionEndsOn")}
                <br />
                {getReadableDate(effectiveEndDate)}
              </div>
            </div>

            {error && <div className="error-note">{error}</div>}
            {success && <div className="success-note">{success}</div>}

            <button
              className="save-btn"
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting ? t("publishing") : t("boostPublish")}
            </button>

            <button
              className="back-btn"
              type="button"
              onClick={() => {
                setError("");
                setStep(1);
              }}
              style={{ marginTop: 12 }}
              disabled={submitting}
            >
              {t("back")}
            </button>
          </>
        )}
      </div>
    </div>
  );
}