import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import icon from "../../../assets/2.png";
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

const DRAFT_KEY = `lot_auction_draft:${getCurrentAccountKey()}`;

const makeId = () => {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random()}`;
};

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
  fileName = "image.png",
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

const isAllowedImage = (file) => {
  if (!file) return false;
  const allowed = ["image/jpeg", "image/jpg", "image/png"];
  return allowed.includes(String(file.type || "").toLowerCase());
};

const normalizeNumberInput = (value) =>
  String(value || "").replace(/[^\d.]/g, "");

const normalizeIntegerInput = (value) => String(value || "").replace(/\D/g, "");

const makeEmptyItem = (categoryId = "") => ({
  localId: makeId(),
  title: "",
  categoryId,
  description: "",
  count: "1",
  imageFile: null,
  imagePreview: "",
  imageDataUrl: "",
  imageMeta: {
    name: "item-image.png",
    type: "image/png",
  },
});

const buildInitialItems = (draft) => {
  const draftItems =
    Array.isArray(draft?.items) && draft.items.length
      ? draft.items
      : [makeEmptyItem(draft?.categoryId || "")];

  return draftItems.map((item) => {
    const dataUrl = item?.image?.dataUrl || item?.imageDataUrl || "";
    const name = item?.image?.name || item?.imageMeta?.name || "item-image.png";
    const type = item?.image?.type || item?.imageMeta?.type || "image/png";

    return {
      localId: item?.localId || makeId(),
      title: item?.title || "",
      categoryId: item?.categoryId || draft?.categoryId || "",
      description: item?.description || "",
      count: item?.count || "1",
      imageFile: dataUrl ? dataUrlToFile(dataUrl, name, type) : null,
      imagePreview: dataUrl,
      imageDataUrl: dataUrl,
      imageMeta: {
        name,
        type,
      },
    };
  });
};

export default function Lot_Auction() {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === "ar";
  const cachedDraft = readDraft();

  const [favicon] = useState(icon);

  const [step, setStep] = useState(Number(cachedDraft?.step || 1));
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [loadingCategories, setLoadingCategories] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [categories, setCategories] = useState([]);

  const restoredFile = cachedDraft?.headImage?.dataUrl
    ? dataUrlToFile(
        cachedDraft.headImage.dataUrl,
        cachedDraft.headImage.name,
        cachedDraft.headImage.type
      )
    : null;

  const [lotTitle, setLotTitle] = useState(cachedDraft?.lotTitle || "");
  const [categoryId, setCategoryId] = useState(cachedDraft?.categoryId || "");
  const [description, setDescription] = useState(cachedDraft?.description || "");
  const [lotItems, setLotItems] = useState(() => buildInitialItems(cachedDraft));

  const [selectedBid, setSelectedBid] = useState(
    cachedDraft?.selectedBid || "100"
  );
  const [customBid, setCustomBid] = useState(cachedDraft?.customBid || "");
  const [startingPrice, setStartingPrice] = useState(
    cachedDraft?.startingPrice || ""
  );

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

  const [headImageFile, setHeadImageFile] = useState(restoredFile);
  const [headImagePreview, setHeadImagePreview] = useState(
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
      if (headImagePreview && headImagePreview.startsWith("blob:")) {
        URL.revokeObjectURL(headImagePreview);
      }

      lotItems.forEach((item) => {
        if (item.imagePreview && item.imagePreview.startsWith("blob:")) {
          URL.revokeObjectURL(item.imagePreview);
        }
      });
    };
  }, [headImagePreview, lotItems]);

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
      lotTitle,
      categoryId,
      description,
      selectedBid,
      customBid,
      startingPrice,
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
      items: lotItems.map((item) => ({
        localId: item.localId,
        title: item.title,
        categoryId: item.categoryId,
        description: item.description,
        count: item.count,
        image: item.imageDataUrl
          ? {
              dataUrl: item.imageDataUrl,
              name: item.imageMeta.name,
              type: item.imageMeta.type,
            }
          : null,
      })),
    });
  }, [
    step,
    lotTitle,
    categoryId,
    description,
    selectedBid,
    customBid,
    startingPrice,
    startDate,
    selectedDuration,
    customEndDate,
    headImageDataUrl,
    headImageMeta,
    lotItems,
  ]);

  const handleHeadImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!isAllowedImage(file)) {
      setHeadError(t("onlyJpgPng"));
      return;
    }

    if (headImagePreview && headImagePreview.startsWith("blob:")) {
      URL.revokeObjectURL(headImagePreview);
    }

    const objectUrl = URL.createObjectURL(file);
    const dataUrl = await fileToDataUrl(file);

    setHeadError("");
    setHeadImageFile(file);
    setHeadImagePreview(objectUrl);
    setHeadImageDataUrl(dataUrl);
    setHeadImageMeta({
      name: file.name || "head-image.png",
      type: file.type || "image/png",
    });
  };

  const updateItem = (localId, patch) => {
    setLotItems((prev) =>
      prev.map((item) =>
        item.localId === localId ? { ...item, ...patch } : item
      )
    );
  };

  const handleItemImageUpload = async (localId, e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!isAllowedImage(file)) {
      setError(t("onlyJpgPng"));
      return;
    }

    const currentItem = lotItems.find((item) => item.localId === localId);

    if (currentItem?.imagePreview?.startsWith("blob:")) {
      URL.revokeObjectURL(currentItem.imagePreview);
    }

    const objectUrl = URL.createObjectURL(file);
    const dataUrl = await fileToDataUrl(file);

    updateItem(localId, {
      imageFile: file,
      imagePreview: objectUrl,
      imageDataUrl: dataUrl,
      imageMeta: {
        name: file.name || "item-image.png",
        type: file.type || "image/png",
      },
    });
  };

  const addItem = () => {
    setLotItems((prev) => [...prev, makeEmptyItem(categoryId)]);
  };

  const removeItem = (localId) => {
    setLotItems((prev) => {
      if (prev.length <= 1) return prev;

      const removed = prev.find((item) => item.localId === localId);
      if (removed?.imagePreview?.startsWith("blob:")) {
        URL.revokeObjectURL(removed.imagePreview);
      }

      return prev.filter((item) => item.localId !== localId);
    });
  };

  const validateStepOne = () => {
    if (!headImageFile) {
      return t("headImageRequired", { defaultValue: "Head image is required" });
    }

    if (!lotTitle.trim()) return t("lotTitleRequired");
    if (!description.trim()) return t("lotDescriptionRequired");

    if (!lotItems.length) {
      return t("itemsRequired", { defaultValue: "At least one item is required" });
    }

    for (let index = 0; index < lotItems.length; index += 1) {
      const item = lotItems[index];
      const number = index + 1;

      if (!item.categoryId) {
        return t("itemCategoryRequired", {
          defaultValue: `Item ${number} category is required`,
        });
      }

      if (!item.imageFile) {
        return t("itemImageRequired", {
          defaultValue: `Item ${number} image is required`,
        });
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

    if (startingPriceNumber > MAX_STARTING_PRICE) {
      return `Maximum allowed is ${MAX_STARTING_PRICE}`;
    }

    if (!Number.isFinite(bidIncrementNumber) || bidIncrementNumber <= 0) {
      return t("bidIncrementGreaterThanZero");
    }

    if (bidIncrementNumber > MAX_BID_INCREMENT) {
      return `Maximum allowed is ${MAX_BID_INCREMENT}`;
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

      const mainCategoryId = Number(categoryId || lotItems[0]?.categoryId || 0);

      const payload = {
        title: lotTitle.trim(),
        description: description.trim(),
        categoryId: mainCategoryId,
        startingPrice: Number(startingPrice),
        bidIncrement: Number(effectiveBidIncrement),
        startDate: toApiDateTime(startDate),
        endDate: toApiDateTime(effectiveEndDate),
        image: headImageFile,
        items: lotItems.map((item, index) => ({
          title: item.title.trim() || `${lotTitle.trim()} Item ${index + 1}`,
          description: item.description.trim() || description.trim(),
          count: Number(item.count || 1),
          warrantyInfo: "N/A",
          condition: 1,
          categoryId: Number(item.categoryId),
          image: item.imageFile,
          images: [item.imageFile].filter(Boolean),
        })),
      };
      console.log("LOT AUCTION PAYLOAD BEFORE SEND:", {
  title: payload.title,
  description: payload.description,
  categoryId: payload.categoryId,
  startingPrice: payload.startingPrice,
  bidIncrement: payload.bidIncrement,
  startDate: payload.startDate,
  endDate: payload.endDate,
  hasMainImage: payload.image instanceof File,
  mainImageName: payload.image?.name,
  mainImageType: payload.image?.type,
  mainImageSize: payload.image?.size,
  itemsCount: payload.items?.length || 0,
  items: payload.items?.map((item, index) => ({
    index,
    title: item.title,
    description: item.description,
    count: item.count,
    warrantyInfo: item.warrantyInfo,
    condition: item.condition,
    categoryId: item.categoryId,
    hasImage: item.image instanceof File,
    imageName: item.image?.name,
    imageType: item.image?.type,
    imageSize: item.image?.size,
    imagesCount: item.images?.length || 0,
  })),
});
      const response = await createAuction(payload);

      clearDraft();
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
          width: min(960px, 92%);
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

        .lot-auction .item-image-preview {
          width: 130px;
          height: 130px;
          object-fit: cover;
          border-radius: 14px;
          display: block;
          margin-bottom: 12px;
          border: 1px solid #e7e7e7;
        }

        .lot-auction .image-upload,
        .lot-auction .item-image-upload,
        .lot-auction .save-btn,
        .lot-auction .back-btn,
        .lot-auction .add-btn,
        .lot-auction .remove-btn {
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
          min-height: 120px;
          margin-bottom: 14px;
        }

        .lot-auction .item-image-upload {
          background: #eef6ff;
          color: #023E8A;
          border: 1px dashed #9ec5fe;
          padding: 12px 16px;
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

        .lot-auction .inline-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 14px;
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
          background: #fff1f0;
          color: #cf1322;
          border: 1px solid #ffa39e;
          border-radius: 12px;
          padding: 12px 14px;
          margin-bottom: 14px;
          font-weight: 600;
        }

        .lot-auction .success-note {
          background: #f6ffed;
          color: #237804;
          border: 1px solid #b7eb8f;
          border-radius: 12px;
          padding: 12px 14px;
          margin-bottom: 14px;
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

        .lot-auction .save-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .lot-auction .back-btn {
          background: #eef2ff;
          color: #023E8A;
          padding: 12px 18px;
        }

        .lot-auction .add-btn {
          background: #023E8A;
          color: white;
          padding: 12px 18px;
          margin-bottom: 18px;
        }

        .lot-auction .remove-btn {
          background: #fff1f0;
          color: #cf1322;
          border: 1px solid #ffa39e;
          padding: 10px 14px;
        }

        .lot-auction .item-card {
          border: 1px solid #e5e7eb;
          border-radius: 16px;
          padding: 18px;
          margin-bottom: 16px;
          background: #fcfcfc;
        }

        .lot-auction .item-card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 14px;
        }

        .lot-auction .item-title {
          font-size: 18px;
          font-weight: 800;
          color: #023E8A;
        }

        @media (max-width: 768px) {
          .lot-auction .inline-grid {
            grid-template-columns: 1fr;
          }

          .lot-auction .title {
            font-size: 28px;
          }
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
                {headImagePreview
                  ? t("changeImage", { defaultValue: "Change main image" })
                  : t("headImage", { defaultValue: "Upload main image" })}
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
                onChange={(e) => {
                  const nextCategory = e.target.value;
                  setCategoryId(nextCategory);
                  setLotItems((prev) =>
                    prev.map((item) => ({
                      ...item,
                      categoryId: item.categoryId || nextCategory,
                    }))
                  );
                }}
                disabled={loadingCategories}
              >
                <option value="">
                  {loadingCategories
                    ? t("loadingCategories")
                    : t("selectCategory", { defaultValue: "Select main category" })}
                </option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>

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
              <div className="item-card-header">
                <h3 className="section-title" style={{ margin: 0 }}>
                  {t("lotItems", { defaultValue: "Lot Items" })}
                </h3>

                <button className="add-btn" type="button" onClick={addItem}>
                  + {t("addItem", { defaultValue: "Add Item" })}
                </button>
              </div>

              {lotItems.map((item, index) => (
                <div className="item-card" key={item.localId}>
                  <div className="item-card-header">
                    <div className="item-title">
                      {t("item", { defaultValue: "Item" })} {index + 1}
                    </div>

                    {lotItems.length > 1 && (
                      <button
                        type="button"
                        className="remove-btn"
                        onClick={() => removeItem(item.localId)}
                      >
                        {t("remove", { defaultValue: "Remove" })}
                      </button>
                    )}
                  </div>

                  {item.imagePreview && (
                    <img
                      src={item.imagePreview}
                      className="item-image-preview"
                      alt={`${t("item", { defaultValue: "Item" })} ${index + 1}`}
                    />
                  )}

                  <label className="item-image-upload">
                    {item.imagePreview
                      ? t("changeImage", { defaultValue: "Change image" })
                      : t("uploadItemImage", { defaultValue: "Upload item image" })}
                    <input
                      type="file"
                      hidden
                      accept="image/png, image/jpeg, image/jpg"
                      onChange={(e) => handleItemImageUpload(item.localId, e)}
                    />
                  </label>

                  <div className="inline-grid">
                    <input
                      className="input"
                      placeholder={t("itemTitleOptional", {
                        defaultValue: "Item title (optional)",
                      })}
                      value={item.title}
                      onChange={(e) =>
                        updateItem(item.localId, { title: e.target.value })
                      }
                    />

                    <select
                      className="input"
                      value={item.categoryId}
                      onChange={(e) =>
                        updateItem(item.localId, { categoryId: e.target.value })
                      }
                      disabled={loadingCategories}
                    >
                      <option value="">
                        {loadingCategories
                          ? t("loadingCategories")
                          : t("selectCategory")}
                      </option>
                      {categories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <textarea
                    className="textarea"
                    maxLength={500}
                    placeholder={t("itemDescriptionOptional", {
                      defaultValue: "Item description (optional)",
                    })}
                    value={item.description}
                    onChange={(e) =>
                      updateItem(item.localId, { description: e.target.value })
                    }
                  />

                  <input
                    className="input"
                    type="number"
                    min="1"
                    placeholder={t("count", { defaultValue: "Count" })}
                    value={item.count}
                    onChange={(e) =>
                      updateItem(item.localId, {
                        count: normalizeIntegerInput(e.target.value) || "1",
                      })
                    }
                  />
                </div>
              ))}
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
                max={MAX_STARTING_PRICE}
                placeholder={t("enterStartingPrice")}
                value={startingPrice}
                onChange={(e) =>
                  setStartingPrice(normalizeNumberInput(e.target.value))
                }
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
                  max={MAX_BID_INCREMENT}
                  className="input"
                  value={customBid}
                  onChange={(e) =>
                    setCustomBid(normalizeIntegerInput(e.target.value))
                  }
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