import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import icon from "../../../assets/2.png";
import { useTranslatedApiData } from "../../../hooks/useTranslatedApiData";
import { useAutoTranslatedText } from "../../../hooks/useAutoTranslatedText";
import {
  ATTRIBUTE_DATA_TYPES,
  ATTRIBUTE_UNITS,
  CONDITION_OPTIONS,
  createAuction,
  getAuctionCategories,
  getCategoryAttributes,
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

const getReadableDate = (value, language = "en") => {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  return date.toLocaleString(language === "ar" ? "ar-EG" : "en-US");
};

const getErrorMessage = (error, fallback = "Something went wrong.") => {
  return (
    error?.response?.data?.message ||
    error?.response?.data?.Message ||
    error?.response?.data?.title ||
    error?.message ||
    fallback
  );
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

const getConditionTranslationKey = (label) => {
  const value = String(label || "").trim().toLowerCase();

  if (value === "new") return "conditionNew";
  if (value === "used") return "conditionUsed";
  if (value === "refurbished") return "conditionRefurbished";

  return "";
};

export default function Single_Auction() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  const [favicon] = useState(icon);

  const [step, setStep] = useState(1);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const { translatedText: translatedError } = useAutoTranslatedText(error);
  const { translatedText: translatedSuccess } = useAutoTranslatedText(success);

  const [loadingCategories, setLoadingCategories] = useState(true);
  const [loadingAttributes, setLoadingAttributes] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [categories, setCategories] = useState([]);
  const [attributes, setAttributes] = useState([]);

  const { translatedData: translatedCategories } =
    useTranslatedApiData(categories);
  const { translatedData: translatedAttributes } =
    useTranslatedApiData(attributes);

  const displayCategories = Array.isArray(translatedCategories)
    ? translatedCategories
    : categories;

  const displayAttributes = Array.isArray(translatedAttributes)
    ? translatedAttributes
    : attributes;

  const [fieldErrors, setFieldErrors] = useState({});

  const [headImageFile, setHeadImageFile] = useState(null);
  const [headPreview, setHeadPreview] = useState("");
  const [headError, setHeadError] = useState("");

  const [itemTitle, setItemTitle] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [itemCount, setItemCount] = useState("1");
  const [warranty, setWarranty] = useState("");
  const [description, setDescription] = useState("");
  const [condition, setCondition] = useState(
    String(CONDITION_OPTIONS?.[0]?.value ?? 1)
  );

  const [attributeValues, setAttributeValues] = useState({});

  const [startingPrice, setStartingPrice] = useState("");
  const [selectedBid, setSelectedBid] = useState("100");
  const [customBid, setCustomBid] = useState("");
  const [startDate, setStartDate] = useState(() =>
    formatDateTimeLocalInput(new Date(Date.now() + 5 * 60 * 1000))
  );
  const [selectedDuration, setSelectedDuration] = useState("24 hours");
  const [customEndDate, setCustomEndDate] = useState("");

  useEffect(() => {
    document.title = t("singleAuctionDocTitle");
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
        setAttributes([]);
        setAttributeValues({});
        return;
      }

      try {
        setLoadingAttributes(true);
        setError("");
        setFieldErrors((prev) => ({
          ...prev,
          attributes: "",
        }));

        const data = await getCategoryAttributes(categoryId);

        if (!mounted) return;

        setAttributes(Array.isArray(data) ? data : []);
        setAttributeValues({});
      } catch (err) {
        if (!mounted) return;
        setAttributes([]);
        setAttributeValues({});
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
      if (headPreview) {
        URL.revokeObjectURL(headPreview);
      }
    };
  }, [headPreview]);

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

  const clearFieldError = (fieldName) => {
    setFieldErrors((prev) => ({
      ...prev,
      [fieldName]: "",
    }));
  };

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowed = ["image/jpeg", "image/jpg", "image/png"];

    if (!allowed.includes(file.type)) {
      setHeadError(t("onlyJpgPng"));
      return;
    }

    if (headPreview) {
      URL.revokeObjectURL(headPreview);
    }

    setHeadError("");
    setHeadImageFile(file);
    setHeadPreview(URL.createObjectURL(file));
  };

  const handleAttributeChange = (attributeId, value) => {
    setAttributeValues((prev) => ({
      ...prev,
      [attributeId]: value,
    }));

    clearFieldError(`attribute_${attributeId}`);
    clearFieldError("attributes");
  };

  const getUnitLabel = (unit) => {
    return ATTRIBUTE_UNITS?.[Number(unit)] || "";
  };

  const validateStepOne = () => {
    const nextErrors = {};

    if (!itemTitle.trim()) nextErrors.itemTitle = t("titleRequired");
    if (!categoryId) nextErrors.categoryId = t("categoryRequired");
    if (!itemCount || Number(itemCount) <= 0) {
      nextErrors.itemCount = t("countGreaterThanZero");
    }
    if (!warranty.trim()) nextErrors.warranty = t("warrantyRequired");
    if (!description.trim()) nextErrors.description = t("descriptionRequired");
    if (!condition) nextErrors.condition = t("conditionRequired");

    displayAttributes.forEach((attr) => {
      const value = attributeValues[attr.id];
      if (attr.isRequired && isEmptyAttributeValue(value)) {
        nextErrors[`attribute_${attr.id}`] = t("fieldRequired", {
          field: attr.name,
        });
      }
    });

    setFieldErrors((prev) => ({
      ...prev,
      ...nextErrors,
    }));

    return Object.keys(nextErrors).length === 0;
  };

  const validateStepTwo = () => {
    const nextErrors = {};

    const startingPriceNumber = Number(startingPrice);
    const bidIncrementNumber = Number(effectiveBidIncrement);

    if (!startDate) nextErrors.startDate = t("startDateRequired");
    if (!effectiveEndDate) nextErrors.endDate = t("endDateRequired");

    if (
      startDate &&
      effectiveEndDate &&
      new Date(effectiveEndDate).getTime() <= new Date(startDate).getTime()
    ) {
      nextErrors.endDate = t("endDateAfterStart");
    }

    if (!Number.isFinite(startingPriceNumber) || startingPriceNumber <= 0) {
      nextErrors.startingPrice = t("startingPriceGreaterThanZero");
    }

    if (!Number.isFinite(bidIncrementNumber) || bidIncrementNumber <= 0) {
      nextErrors.bidIncrement = t("bidIncrementGreaterThanZero");
    }

    setFieldErrors((prev) => ({
      ...prev,
      ...nextErrors,
    }));

    return Object.keys(nextErrors).length === 0;
  };

  const handleSaveContinue = () => {
    setError("");
    setSuccess("");

    const isValid = validateStepOne();

    if (!isValid) {
      setError(t("reviewInvalidFields"));
      return;
    }

    setStep(2);
  };

  const applyBackendFieldErrors = (backendData) => {
    const errors = backendData?.errors;
    if (!errors || typeof errors !== "object") return false;

    const mapped = {};
    let shouldReturnToStepOne = false;

    Object.entries(errors).forEach(([key, value]) => {
      const message = Array.isArray(value)
        ? String(value.find(Boolean) || "").trim()
        : String(value || "").trim();

      if (!message) return;

      const normalizedKey = String(key).toLowerCase();

      if (normalizedKey.includes("condition")) {
        mapped.condition = message;
        shouldReturnToStepOne = true;
      } else if (
        normalizedKey.includes("title") &&
        normalizedKey.includes("items")
      ) {
        mapped.itemTitle = message;
        shouldReturnToStepOne = true;
      } else if (normalizedKey === "title") {
        mapped.itemTitle = message;
        shouldReturnToStepOne = true;
      } else if (normalizedKey.includes("categoryid")) {
        mapped.categoryId = message;
        shouldReturnToStepOne = true;
      } else if (normalizedKey.includes("count")) {
        mapped.itemCount = message;
        shouldReturnToStepOne = true;
      } else if (normalizedKey.includes("warranty")) {
        mapped.warranty = message;
        shouldReturnToStepOne = true;
      } else if (
        normalizedKey.includes("description") &&
        normalizedKey.includes("items")
      ) {
        mapped.description = message;
        shouldReturnToStepOne = true;
      } else if (normalizedKey.includes("attribute")) {
        mapped.attributes = message;
        shouldReturnToStepOne = true;
      } else if (normalizedKey.includes("items")) {
        mapped.attributes = message;
        shouldReturnToStepOne = true;
      } else if (normalizedKey.includes("startingprice")) {
        mapped.startingPrice = message;
      } else if (normalizedKey.includes("bidincrement")) {
        mapped.bidIncrement = message;
      } else if (normalizedKey.includes("startdate")) {
        mapped.startDate = message;
      } else if (normalizedKey.includes("enddate")) {
        mapped.endDate = message;
      }
    });

    if (!Object.keys(mapped).length) return false;

    setFieldErrors((prev) => ({
      ...prev,
      ...mapped,
    }));

    if (shouldReturnToStepOne) {
      setStep(1);
    }

    return true;
  };

  const buildItemAttributes = () => {
    return attributes
      .map((attr) => {
        const rawValue = attributeValues[attr.id];

        if (isEmptyAttributeValue(rawValue)) {
          return null;
        }

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

  const handleSubmit = async () => {
    setError("");
    setSuccess("");

    const stepOneValid = validateStepOne();
    const stepTwoValid = validateStepTwo();

    if (!stepOneValid || !stepTwoValid) {
      setError(t("reviewInvalidFields"));
      return;
    }

    try {
      setSubmitting(true);

      const builtAttributes = buildItemAttributes();

      const payload = {
        title: itemTitle.trim(),
        description: description.trim(),
        categoryId: Number(categoryId),
        startingPrice: Number(startingPrice),
        bidIncrement: Number(effectiveBidIncrement),
        startDate: toApiDateTime(startDate),
        endDate: toApiDateTime(effectiveEndDate),
        image: headImageFile || undefined,
        items: [
          {
            title: itemTitle.trim(),
            count: Number(itemCount),
            description: description.trim(),
            warrantyInfo: warranty.trim(),
            condition: Number(condition),
            categoryId: Number(categoryId),
            image: undefined,
            attributes: builtAttributes,
          },
        ],
      };

      const response = await createAuction(payload);

      setSuccess(response?.message || t("auctionCreatedSuccessfully"));

      navigate("/seller-history", {
        replace: false,
        state: {
          createdAuctionId: response?.auctionId || response?.id || null,
        },
      });
    } catch (err) {
      const handled = applyBackendFieldErrors(err?.response?.data);

      if (handled) {
        setError(t("reviewInvalidFields"));
      } else {
        setError(getErrorMessage(err, t("failedToCreateAuction")));
      }
    } finally {
      setSubmitting(false);
    }
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

  const renderAttributeField = (attribute) => {
    const value = attributeValues[attribute.id] ?? "";
    const unitLabel = getUnitLabel(attribute.unit);
    const kind = getAttributeInputKind(attribute);

    if (kind === "number") {
      return (
        <input
          type="number"
          className="single-auction-input"
          value={value}
          onChange={(e) =>
            handleAttributeChange(
              attribute.id,
              normalizeNumberInput(e.target.value)
            )
          }
          placeholder={
            unitLabel
              ? t("enterFieldWithUnit", {
                  field: attribute.name,
                  unit: unitLabel,
                })
              : t("enterField", { field: attribute.name })
          }
        />
      );
    }

    if (kind === "boolean") {
      return (
        <select
          className="single-auction-input"
          value={value}
          onChange={(e) => handleAttributeChange(attribute.id, e.target.value)}
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
          type="date"
          className="single-auction-input"
          value={value}
          onChange={(e) => handleAttributeChange(attribute.id, e.target.value)}
        />
      );
    }

    if (kind === "datetime") {
      return (
        <input
          type="datetime-local"
          className="single-auction-input"
          value={value}
          onChange={(e) => handleAttributeChange(attribute.id, e.target.value)}
        />
      );
    }

    return (
      <input
        type="text"
        className="single-auction-input"
        value={value}
        onChange={(e) => handleAttributeChange(attribute.id, e.target.value)}
        placeholder={
          unitLabel
            ? t("enterFieldWithUnit", {
                field: attribute.name,
                unit: unitLabel,
              })
            : t("enterField", { field: attribute.name })
        }
      />
    );
  };

  const renderFieldError = (name) => {
    if (!fieldErrors[name]) return null;
    return <div className="single-auction-field-error">{fieldErrors[name]}</div>;
  };

  return (
    <div
      className="single-auction"
      dir={i18n.language === "ar" ? "rtl" : "ltr"}
    >
      <style>{`
        .single-auction {
          width: 100%;
          min-height: 100vh;
          background: #f5f6fa;
          padding: 32px 0 60px;
          box-sizing: border-box;
          font-family: Arial, Helvetica, sans-serif;
        }

        .single-auction * {
          box-sizing: border-box;
        }

        .single-auction-container {
          width: min(920px, 92%);
          margin: 0 auto;
        }

        .single-auction-title {
          text-align: center;
          color: #023E8A;
          font-size: 32px;
          font-weight: 700;
          margin: 0 0 24px;
        }

        .single-auction-section {
          background: #fff;
          border-radius: 18px;
          padding: 22px;
          box-shadow: 0 8px 24px rgba(0,0,0,0.06);
          margin-bottom: 18px;
        }

        .single-auction-section-title,
        .single-auction-description-label,
        .single-auction-condition-title {
          color: #023E8A;
          font-size: 18px;
          font-weight: 700;
          margin: 0 0 14px;
        }

        .single-auction-image-preview {
          width: 180px;
          height: 180px;
          object-fit: cover;
          border-radius: 16px;
          display: block;
          margin-bottom: 14px;
          border: 1px solid #e7e7e7;
        }

        .single-auction-image-upload,
        .single-auction-save-btn,
        .single-auction-back-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border: none;
          cursor: pointer;
          font-weight: 700;
          border-radius: 12px;
          transition: 0.2s ease;
        }

        .single-auction-image-upload {
          background: #023E8A;
          color: #fff;
          padding: 12px 18px;
          margin-bottom: 14px;
        }

        .single-auction-input,
        .single-auction-textarea {
          width: 100%;
          border: 1px solid #d9d9d9;
          border-radius: 12px;
          padding: 14px 16px;
          font-size: 15px;
          outline: none;
          margin-bottom: 6px;
          background: #fff;
        }

        .single-auction-input:focus,
        .single-auction-textarea:focus {
          border-color: #023E8A;
        }

        .single-auction-textarea {
          min-height: 110px;
          resize: vertical;
        }

        .single-auction-counter {
          text-align: end;
          color: #6c757d;
          font-size: 13px;
          margin-top: -2px;
          margin-bottom: 12px;
        }

        .single-auction-condition {
          display: flex;
          flex-wrap: wrap;
          gap: 16px;
        }

        .single-auction-condition label {
          display: flex;
          align-items: center;
          gap: 8px;
          background: #fafafa;
          border: 1px solid #ececec;
          padding: 10px 14px;
          border-radius: 10px;
          cursor: pointer;
        }

        .single-auction-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-bottom: 14px;
        }

        .single-auction-tag {
          padding: 10px 16px;
          border-radius: 999px;
          border: 1px solid #dcdcdc;
          background: #fafafa;
          cursor: pointer;
          font-weight: 600;
          font-size: 14px;
        }

        .single-auction-end-box {
          margin-top: 10px;
          background: #eef6ff;
          border: 1px solid #cfe2ff;
          border-radius: 12px;
          padding: 16px;
          color: #023E8A;
          font-weight: 600;
          line-height: 1.7;
        }

        .single-auction-file-error,
        .single-auction-error-note {
          background: #fff1f0;
          color: #cf1322;
          border: 1px solid #ffa39e;
          border-radius: 12px;
          padding: 12px 14px;
          margin-bottom: 14px;
        }

        .single-auction-success-note {
          background: #f6ffed;
          color: #237804;
          border: 1px solid #b7eb8f;
          border-radius: 12px;
          padding: 12px 14px;
          margin-bottom: 14px;
        }

        .single-auction-inline-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 14px;
        }

        .single-auction-attribute-item {
          border: 1px solid #ececec;
          border-radius: 14px;
          padding: 14px;
          margin-bottom: 12px;
          background: #fcfcfc;
        }

        .single-auction-attribute-title {
          font-size: 14px;
          font-weight: 700;
          color: #1f1f1f;
          margin-bottom: 8px;
        }

        .single-auction-attribute-meta {
          font-size: 12px;
          color: #6c757d;
          margin-bottom: 10px;
        }

        .single-auction-actions {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
          justify-content: center;
          margin-top: 18px;
        }

        .single-auction-save-btn {
          background: #023E8A;
          color: #fff;
          min-width: 180px;
          padding: 14px 24px;
        }

        .single-auction-save-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .single-auction-back-btn {
          background: #fff;
          color: #333;
          border: 1px solid #d9d9d9;
          min-width: 150px;
          padding: 14px 24px;
        }

        .single-auction-loading-note {
          color: #6c757d;
          font-size: 14px;
          margin-bottom: 12px;
        }

        .single-auction-field-error {
          color: #cf1322;
          font-size: 13px;
          font-weight: 600;
          margin-bottom: 12px;
        }

        @media (max-width: 768px) {
          .single-auction-inline-grid {
            grid-template-columns: 1fr;
          }

          .single-auction-title {
            font-size: 28px;
          }
        }
      `}</style>

      <div className="single-auction-container">
        <h2 className="single-auction-title">{t("singleAuction")}</h2>

        {error && (
          <div className="single-auction-error-note">{translatedError}</div>
        )}
        {success && (
          <div className="single-auction-success-note">
            {translatedSuccess}
          </div>
        )}

        {step === 1 && (
          <>
            <div className="single-auction-section">
              {headPreview && (
                <img
                  src={headPreview}
                  alt={t("headPreview")}
                  className="single-auction-image-preview"
                />
              )}

              <label className="single-auction-image-upload">
                {!headPreview ? t("uploadHeadImage") : t("changeImage")}
                <input
                  type="file"
                  hidden
                  accept="image/png, image/jpeg, image/jpg"
                  onChange={handleImageUpload}
                />
              </label>

              {headError && (
                <div className="single-auction-file-error">{headError}</div>
              )}

              <input
                className="single-auction-input"
                placeholder={t("title")}
                value={itemTitle}
                onChange={(e) => {
                  setItemTitle(e.target.value);
                  clearFieldError("itemTitle");
                }}
              />
              {renderFieldError("itemTitle")}

              <select
                className="single-auction-input"
                value={categoryId}
                onChange={(e) => {
                  setCategoryId(e.target.value);
                  clearFieldError("categoryId");
                  clearFieldError("attributes");
                }}
                disabled={loadingCategories}
              >
                <option value="">
                  {loadingCategories
                    ? t("loadingCategories")
                    : t("selectCategory")}
                </option>
                {displayCategories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
              {renderFieldError("categoryId")}

              <input
                className="single-auction-input"
                type="number"
                min="1"
                placeholder={t("count")}
                value={itemCount}
                onChange={(e) => {
                  setItemCount(normalizeIntegerInput(e.target.value));
                  clearFieldError("itemCount");
                }}
              />
              {renderFieldError("itemCount")}

              <input
                className="single-auction-input"
                placeholder={t("warrantyInfoUpper")}
                value={warranty}
                onChange={(e) => {
                  setWarranty(e.target.value);
                  clearFieldError("warranty");
                }}
              />
              {renderFieldError("warranty")}

              <div className="single-auction-description-label">
                {t("description")}
              </div>
              <textarea
                className="single-auction-textarea"
                maxLength={500}
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value);
                  clearFieldError("description");
                }}
                placeholder={t("writeItemDescription")}
              />
              <div className="single-auction-counter">
                {description.length}/500
              </div>
              {renderFieldError("description")}

              <div className="single-auction-condition-title">
                {t("condition")}
              </div>
              <div className="single-auction-condition">
                {CONDITION_OPTIONS.map((item) => {
                  const conditionKey = getConditionTranslationKey(item.label);

                  return (
                    <label key={item.value}>
                      <input
                        type="radio"
                        name="condition"
                        checked={String(condition) === String(item.value)}
                        onChange={() => {
                          setCondition(String(item.value));
                          clearFieldError("condition");
                        }}
                      />
                      {conditionKey
                        ? t(conditionKey)
                        : t(String(item.label), { defaultValue: item.label })}
                    </label>
                  );
                })}
              </div>
              {renderFieldError("condition")}
            </div>

            <div className="single-auction-section">
              <h3 className="single-auction-section-title">
                {t("categoryAttributes")}
              </h3>

              {loadingAttributes ? (
                <div className="single-auction-loading-note">
                  {t("loadingCategoryAttributes")}
                </div>
              ) : !categoryId ? (
                <div className="single-auction-loading-note">
                  {t("selectCategoryAttributes")}
                </div>
              ) : displayAttributes.length === 0 ? (
                <div className="single-auction-loading-note">
                  {t("noAttributesFound")}
                </div>
              ) : (
                displayAttributes.map((attribute) => (
                  <div
                    key={attribute.id}
                    className="single-auction-attribute-item"
                  >
                    <div className="single-auction-attribute-title">
                      {attribute.name}
                      {attribute.isRequired ? " *" : ""}
                    </div>

                    <div className="single-auction-attribute-meta">
                      {t("type")}: {attribute.dataType}
                      {attribute.unit
                        ? ` | ${t("unit")}: ${getUnitLabel(attribute.unit)}`
                        : ""}
                    </div>

                    {renderAttributeField(attribute)}
                    {renderFieldError(`attribute_${attribute.id}`)}
                  </div>
                ))
              )}

              {renderFieldError("attributes")}
            </div>

            <div className="single-auction-actions">
              <button
                className="single-auction-save-btn"
                onClick={handleSaveContinue}
              >
                {t("saveContinue")}
              </button>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <div className="single-auction-section">
              <h3 className="single-auction-section-title">
                {t("priceDuration")}
              </h3>

              <div className="single-auction-inline-grid">
                <div>
                  <h3 className="single-auction-section-title">
                    {t("startingPrice")}
                  </h3>
                  <input
                    type="number"
                    min="1"
                    className="single-auction-input"
                    value={startingPrice}
                    onChange={(e) => {
                      setStartingPrice(normalizeNumberInput(e.target.value));
                      clearFieldError("startingPrice");
                    }}
                    placeholder={t("enterStartingPrice")}
                  />
                  {renderFieldError("startingPrice")}
                </div>

                <div>
                  <h3 className="single-auction-section-title">
                    {t("startDate")}
                  </h3>
                  <input
                    type="datetime-local"
                    className="single-auction-input"
                    value={startDate}
                    onChange={(e) => {
                      setStartDate(e.target.value);
                      clearFieldError("startDate");
                      clearFieldError("endDate");
                    }}
                  />
                  {renderFieldError("startDate")}
                </div>
              </div>

              <h3 className="single-auction-section-title">
                {t("bidIncrement")}
              </h3>
              <div className="single-auction-tags">
                {BID_OPTIONS.map((bid) => (
                  <span
                    key={bid}
                    className="single-auction-tag"
                    onClick={() => {
                      setSelectedBid(bid);
                      clearFieldError("bidIncrement");
                    }}
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
                  className="single-auction-input"
                  value={customBid}
                  onChange={(e) => {
                    setCustomBid(normalizeIntegerInput(e.target.value));
                    clearFieldError("bidIncrement");
                  }}
                  placeholder={t("enterCustomBidIncrement")}
                />
              )}
              {renderFieldError("bidIncrement")}

              <h3 className="single-auction-section-title">
                {t("auctionDuration")}
              </h3>
              <div className="single-auction-tags">
                {DURATION_OPTIONS.map((dur) => (
                  <span
                    key={dur}
                    className="single-auction-tag"
                    onClick={() => {
                      setSelectedDuration(dur);
                      clearFieldError("endDate");
                    }}
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
                  className="single-auction-input"
                  value={customEndDate}
                  onChange={(e) => {
                    setCustomEndDate(e.target.value);
                    clearFieldError("endDate");
                  }}
                />
              )}
              {renderFieldError("endDate")}

              <div className="single-auction-end-box">
                {t("auctionEndsOn")}
                <br />
                <span>{getReadableDate(effectiveEndDate, i18n.language)}</span>
              </div>
            </div>

            <div className="single-auction-actions">
              <button
                className="single-auction-back-btn"
                onClick={() => {
                  setError("");
                  setStep(1);
                }}
                disabled={submitting}
              >
                {t("back")}
              </button>

              <button
                className="single-auction-save-btn"
                onClick={handleSubmit}
                disabled={submitting}
              >
                {submitting ? t("creating") : t("createAuction")}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}