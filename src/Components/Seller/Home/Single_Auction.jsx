import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import icon from "../../../assets/2.png";
import { useTranslatedApiData } from "../../../Hooks/useTranslatedApiData";
import { useAutoTranslatedText } from "../../../Hooks/useAutoTranslatedText";
import { createAuction, getAuctionCategories } from "../../../API/createAuction";

const BID_OPTIONS = ["100", "300", "500", "Specify"];
const DURATION_OPTIONS = ["24 hours", "3 days", "7 days", "Specify"];
const DRAFT_TTL_MS = 15 * 60 * 1000;
const MAX_STARTING_PRICE = 999999999;
const MAX_BID_INCREMENT = 2147483647;

const getCurrentAccountKey = () => {
  return String(
    localStorage.getItem("currentUserEmail") ||
      sessionStorage.getItem("currentUserEmail") ||
      localStorage.getItem("pendingEmail") ||
      sessionStorage.getItem("pendingEmail") ||
      "guest"
  )
    .trim()
    .toLowerCase();
};

const DRAFT_KEY = `single_auction_draft:${getCurrentAccountKey()}`;

const readDraft = () => {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (!parsed?.expiresAt || Date.now() > parsed.expiresAt) {
      localStorage.removeItem(DRAFT_KEY);
      return null;
    }

    return parsed?.draft || null;
  } catch {
    return null;
  }
};

const saveDraft = (draft) => {
  try {
    localStorage.setItem(
      DRAFT_KEY,
      JSON.stringify({
        expiresAt: Date.now() + DRAFT_TTL_MS,
        draft,
      })
    );
  } catch {
    //
  }
};

const clearDraft = () => {
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch {
    //
  }
};

const fileToDataUrl = (file) =>
  new Promise((resolve) => {
    if (!file) {
      resolve("");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => resolve("");
    reader.readAsDataURL(file);
  });

const dataUrlToFile = (
  dataUrl,
  fileName = "head-image.png",
  mimeType = "image/png"
) => {
  try {
    if (!dataUrl || !dataUrl.includes(",")) return null;

    const [header, base64] = dataUrl.split(",");
    const detectedMime =
      header.match(/data:(.*?);base64/)?.[1] || mimeType || "image/png";

    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);

    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }

    return new File([bytes], fileName, { type: detectedMime });
  } catch {
    return null;
  }
};

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

const normalizeNumberInput = (value) =>
  String(value || "").replace(/[^\d.]/g, "");

const normalizeIntegerInput = (value) => String(value || "").replace(/\D/g, "");

export default function Single_Auction() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const cachedDraft = readDraft();

  const [favicon] = useState(icon);

  const [step, setStep] = useState(Number(cachedDraft?.step || 1));
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const { translatedText: translatedError } = useAutoTranslatedText(error);
  const { translatedText: translatedSuccess } = useAutoTranslatedText(success);

  const [loadingCategories, setLoadingCategories] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [categories, setCategories] = useState([]);
  const { translatedData: translatedCategories } =
    useTranslatedApiData(categories);

  const displayCategories = Array.isArray(translatedCategories)
    ? translatedCategories
    : categories;

  const [fieldErrors, setFieldErrors] = useState({});

  const restoredFile = cachedDraft?.headImage?.dataUrl
    ? dataUrlToFile(
        cachedDraft.headImage.dataUrl,
        cachedDraft.headImage.name,
        cachedDraft.headImage.type
      )
    : null;

  const [headImageFile, setHeadImageFile] = useState(restoredFile);
  const [headPreview, setHeadPreview] = useState(
    cachedDraft?.headImage?.dataUrl || ""
  );
  const [headImageDataUrl, setHeadImageDataUrl] = useState(
    cachedDraft?.headImage?.dataUrl || ""
  );
  const [headImageMeta, setHeadImageMeta] = useState({
    name: cachedDraft?.headImage?.name || "head-image.png",
    type: cachedDraft?.headImage?.type || "image/png",
  });
  const [headError, setHeadError] = useState("");

  const [itemTitle, setItemTitle] = useState(cachedDraft?.itemTitle || "");
  const [categoryId, setCategoryId] = useState(cachedDraft?.categoryId || "");
  const [description, setDescription] = useState(cachedDraft?.description || "");

  const [startingPrice, setStartingPrice] = useState(
    cachedDraft?.startingPrice || ""
  );
  const [selectedBid, setSelectedBid] = useState(
    cachedDraft?.selectedBid || "100"
  );
  const [customBid, setCustomBid] = useState(cachedDraft?.customBid || "");
  const [startDate, setStartDate] = useState(
    cachedDraft?.startDate ||
      formatDateTimeLocalInput(new Date(Date.now() + 5 * 60 * 1000))
  );
  const [selectedDuration, setSelectedDuration] = useState(
    cachedDraft?.selectedDuration || "24 hours"
  );
  const [customEndDate, setCustomEndDate] = useState(
    cachedDraft?.customEndDate || ""
  );

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
    return () => {
      if (headPreview && headPreview.startsWith("blob:")) {
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

  useEffect(() => {
    saveDraft({
      step,
      itemTitle,
      categoryId,
      description,
      startingPrice,
      selectedBid,
      customBid,
      startDate,
      selectedDuration,
      customEndDate,
      headImage: headImageDataUrl
        ? {
            dataUrl: headImageDataUrl,
            name: headImageMeta.name,
            type: headImageMeta.type,
          }
        : null,
    });
  }, [
    step,
    itemTitle,
    categoryId,
    description,
    startingPrice,
    selectedBid,
    customBid,
    startDate,
    selectedDuration,
    customEndDate,
    headImageDataUrl,
    headImageMeta,
  ]);

  const clearFieldError = (fieldName) => {
    setFieldErrors((prev) => ({
      ...prev,
      [fieldName]: "",
    }));
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowed = ["image/jpeg", "image/jpg", "image/png"];

    if (!allowed.includes(String(file.type || "").toLowerCase())) {
      setHeadError(t("onlyJpgPng"));
      return;
    }

    if (headPreview && headPreview.startsWith("blob:")) {
      URL.revokeObjectURL(headPreview);
    }

    const objectUrl = URL.createObjectURL(file);
    const dataUrl = await fileToDataUrl(file);

    setHeadError("");
    setHeadImageFile(file);
    setHeadPreview(objectUrl);
    setHeadImageDataUrl(dataUrl);
    setHeadImageMeta({
      name: file.name || "head-image.png",
      type: file.type || "image/png",
    });
    clearFieldError("headImage");
  };

  const validateStepOne = () => {
    const nextErrors = {};

    if (!headImageFile) {
      nextErrors.headImage = t("headImageRequired", {
        defaultValue: "Head image is required",
      });
    }

    if (!itemTitle.trim()) nextErrors.itemTitle = t("titleRequired");
    if (!categoryId) nextErrors.categoryId = t("categoryRequired");
    if (!description.trim()) nextErrors.description = t("descriptionRequired");

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

    if (startingPriceNumber > MAX_STARTING_PRICE) {
      nextErrors.startingPrice = `Maximum allowed is ${MAX_STARTING_PRICE}`;
    }

    if (!Number.isFinite(bidIncrementNumber) || bidIncrementNumber <= 0) {
      nextErrors.bidIncrement = t("bidIncrementGreaterThanZero");
    }

    if (bidIncrementNumber > MAX_BID_INCREMENT) {
      nextErrors.bidIncrement = `Maximum allowed is ${MAX_BID_INCREMENT}`;
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

      const payload = {
        title: itemTitle.trim(),
        description: description.trim(),
        categoryId: Number(categoryId),
        startingPrice: Number(startingPrice),
        bidIncrement: Number(effectiveBidIncrement),
        startDate: toApiDateTime(startDate),
        endDate: toApiDateTime(effectiveEndDate),
        image: headImageFile,
        items: [
          {
            title: itemTitle.trim(),
            description: description.trim(),
            count: 1,
            warrantyInfo: "N/A",
            condition: 1,
            categoryId: Number(categoryId),
            image: headImageFile,
            images: [headImageFile],
          },
        ],
      };

      const response = await createAuction(payload);

      clearDraft();
      setSuccess(response?.message || t("auctionCreatedSuccessfully"));

      navigate("/seller-history", {
        replace: false,
        state: {
          createdAuctionId: response?.auctionId || response?.id || null,
        },
      });
    } catch (err) {
      setError(getErrorMessage(err, t("failedToCreateAuction")));
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

        .single-auction * { box-sizing: border-box; }

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
        .single-auction-description-label {
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
          color: #111827;
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

        .single-auction-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-bottom: 14px;
        }

        .single-auction-tag {
          padding: 10px 16px;
          border-radius: 999px;
          cursor: pointer;
          font-weight: 600;
          font-size: 14px;
          outline: none;
          appearance: none;
          transition: 0.18s ease;
          background: #fafafa;
          color: #333;
          border: 1px solid #dcdcdc;
        }

        .single-auction-tag:hover {
          transform: translateY(-1px);
        }

        .single-auction-tag.active {
          background: #023E8A !important;
          color: #fff !important;
          border-color: #023E8A !important;
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

        .single-auction-field-error {
          color: #cf1322;
          font-size: 13px;
          font-weight: 600;
          margin-bottom: 12px;
        }

        @media (prefers-color-scheme: dark) {
          .single-auction {
            background: #000;
          }

          .single-auction-section {
            background: #151515;
          }

          .single-auction-input,
          .single-auction-textarea {
            background: #000;
            color: #fff;
            border-color: #333;
          }

          .single-auction-section-title,
          .single-auction-description-label,
          .single-auction-title {
            color: #4da3ff;
          }

          .single-auction-tag {
            background: #0d0d0d;
            color: #f5f5f5;
            border-color: #333;
          }

          .single-auction-tag.active {
            background: #023E8A !important;
            color: #fff !important;
            border-color: #023E8A !important;
          }

          .single-auction-end-box {
            background: #10243f;
            border-color: #263b5c;
            color: #4da3ff;
          }

          .single-auction-back-btn {
            background: #151515;
            color: #f5f5f5;
            border-color: #333;
          }
        }

        @media (max-width: 768px) {
          .single-auction-inline-grid { grid-template-columns: 1fr; }
          .single-auction-title { font-size: 28px; }
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
              {renderFieldError("headImage")}

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
            </div>

            <div className="single-auction-actions">
              <button
                className="single-auction-save-btn"
                onClick={handleSaveContinue}
                type="button"
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
                    max={MAX_STARTING_PRICE}
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
                {BID_OPTIONS.map((bid) => {
                  const active = selectedBid === bid;

                  return (
                    <button
                      key={bid}
                      type="button"
                      className={`single-auction-tag ${active ? "active" : ""}`}
                      onClick={() => {
                        setSelectedBid(bid);
                        if (bid !== "Specify") setCustomBid("");
                        clearFieldError("bidIncrement");
                      }}
                    >
                      {getBidLabel(bid)}
                    </button>
                  );
                })}
              </div>

              {selectedBid === "Specify" && (
                <input
                  type="number"
                  min="1"
                  max={MAX_BID_INCREMENT}
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
                {DURATION_OPTIONS.map((dur) => {
                  const active = selectedDuration === dur;

                  return (
                    <button
                      key={dur}
                      type="button"
                      className={`single-auction-tag ${active ? "active" : ""}`}
                      onClick={() => {
                        setSelectedDuration(dur);
                        if (dur !== "Specify") setCustomEndDate("");
                        clearFieldError("endDate");
                      }}
                    >
                      {getDurationLabel(dur)}
                    </button>
                  );
                })}
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
                type="button"
              >
                {t("back")}
              </button>

              <button
                className="single-auction-save-btn"
                onClick={handleSubmit}
                disabled={submitting}
                type="button"
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