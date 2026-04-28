import { useState, useEffect, useRef } from "react";
import icon from "../../assets/2.png";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { getDeliveredOrders, getInProgressOrders } from "../../API/order";

const demoDeliveredOrders = [
  {
    auctionId: 1001,
    deliveredAt: "2026-04-20",
    images: [
      "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?q=80&w=900&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?q=80&w=900&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?q=80&w=900&auto=format&fit=crop",
    ],
  },
  {
    auctionId: 1002,
    deliveredAt: "2026-04-18",
    images: [
      "https://images.unsplash.com/photo-1503376780353-7e6692767b70?q=80&w=900&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?q=80&w=900&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=900&auto=format&fit=crop",
    ],
  },
];

const demoProgressOrders = [
  {
    auctionId: 2001,
    expectedDeliveryDate: "2026-04-30",
    images: [
      "https://images.unsplash.com/photo-1523170335258-f5ed11844a49?q=80&w=900&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?q=80&w=900&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1583121274602-3e2820c69888?q=80&w=900&auto=format&fit=crop",
    ],
  },
  {
    auctionId: 2002,
    expectedDeliveryDate: "2026-05-03",
    images: [
      "https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=900&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?q=80&w=900&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?q=80&w=900&auto=format&fit=crop",
    ],
  },
];

const toImageSrc = (value) => {
  const raw = String(value || "").trim();

  if (!raw) return "";
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
  if (raw.startsWith("data:image/")) return raw;

  const cleaned = raw.replace(/\s/g, "");
  const looksLikeBase64 =
    cleaned.length > 40 &&
    /^[A-Za-z0-9+/=]+$/.test(cleaned) &&
    !cleaned.includes("{") &&
    !cleaned.includes("}");

  if (!looksLikeBase64) return "";

  return `data:image/png;base64,${cleaned}`;
};

export default function Order() {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === "ar";

  const tr = (key, fallback) => {
    const value = t(key);
    return value === key ? fallback : value;
  };

  const formatDate = (value) => {
    if (!value) return "";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);

    return date.toLocaleDateString(isArabic ? "ar-EG" : "en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const [activeTab, setActiveTab] = useState("delivery");
  const [popupType, setPopupType] = useState("");
  const [reportStep, setReportStep] = useState(1);

  const [reportReasons, setReportReasons] = useState([]);
  const [reportText, setReportText] = useState("");
  const [reportSolution, setReportSolution] = useState("");
  const [reportImages, setReportImages] = useState([]);

  const [reviewRate, setReviewRate] = useState(0);
  const [reviewComment, setReviewComment] = useState("");

  const [deliveryOrders, setDeliveryOrders] = useState(demoDeliveredOrders);
  const [progressOrders, setProgressOrders] = useState(demoProgressOrders);
  const [loadingDelivered, setLoadingDelivered] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(true);
  const [errorDelivered, setErrorDelivered] = useState("");
  const [errorProgress, setErrorProgress] = useState("");

  const fileInputRef = useRef(null);

  const reasons = {
    notReceived: tr("reportReasonNotReceived", "I did not receive the item."),
    damaged: tr(
      "reportReasonDamaged",
      "The item does not match the description / is damaged."
    ),
    missingParts: tr("reportReasonMissingParts", "The item is missing parts."),
  };

  useEffect(() => {
    document.title = tr("ordersDocTitle", "Orders");
  }, [i18n.language]);

  useEffect(() => {
    const link = document.querySelector("link[rel~='icon']");
    if (link) link.href = icon;
  }, []);

  useEffect(() => {
    const loadDelivered = async () => {
      try {
        setLoadingDelivered(true);
        setErrorDelivered("");

        const data = await getDeliveredOrders();
        const safeData = Array.isArray(data) ? data : [];

        setDeliveryOrders(safeData.length > 0 ? safeData : demoDeliveredOrders);
      } catch (err) {
        console.log(err?.response?.data || err?.message || err);
        setErrorDelivered("");
        setDeliveryOrders(demoDeliveredOrders);
      } finally {
        setLoadingDelivered(false);
      }
    };

    const loadProgress = async () => {
      try {
        setLoadingProgress(true);
        setErrorProgress("");

        const data = await getInProgressOrders();
        const safeData = Array.isArray(data) ? data : [];

        setProgressOrders(safeData.length > 0 ? safeData : demoProgressOrders);
      } catch (err) {
        console.log(err?.response?.data || err?.message || err);
        setErrorProgress("");
        setProgressOrders(demoProgressOrders);
      } finally {
        setLoadingProgress(false);
      }
    };

    loadDelivered();
    loadProgress();
  }, [i18n.language]);

  const openReportPopup = () => {
    setPopupType("report");
    setReportStep(1);
    setReportReasons([]);
    setReportText("");
    setReportSolution("");
    setReportImages([]);
  };

  const openReviewPopup = () => {
    setPopupType("review");
    setReviewRate(0);
    setReviewComment("");
  };

  const closePopup = () => {
    setPopupType("");
    setReportStep(1);
  };

  const toggleReason = (reason) => {
    if (reportReasons.includes(reason)) {
      setReportReasons(reportReasons.filter((item) => item !== reason));
    } else {
      setReportReasons([...reportReasons, reason]);
    }
  };

  const handleUploadImages = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const newImages = files.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
      name: file.name,
    }));

    setReportImages((prev) => [...prev, ...newImages]);
  };

  const removeUploadedImage = (index) => {
    setReportImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSendReport = () => {
    setPopupType("success-report");
  };

  const handleSendReview = () => {
    setPopupType("success-review");
  };

  const renderImages = (images = []) => {
    if (!Array.isArray(images) || images.length === 0) {
      return <div className="card-image-empty">{tr("noImages", "No Images")}</div>;
    }

    return images.slice(0, 3).map((image, i) => {
      const src = toImageSrc(image);

      return src ? (
        <img key={i} src={src} alt={tr("product", "product")} />
      ) : (
        <div key={i} className="card-image-empty">
          {tr("noImage", "No Image")}
        </div>
      );
    });
  };

  return (
    <div className="orders" dir={isArabic ? "rtl" : "ltr"}>
      <div className="container">
        <h2 className="orders-title">{tr("orders", "Orders")}</h2>

        <div className="orders-tabs">
          <div
            className={`tab ${activeTab === "delivery" ? "active" : ""}`}
            onClick={() => setActiveTab("delivery")}
          >
            {tr("delivered", "Delivered")}
          </div>

          <div
            className={`tab ${activeTab === "progress" ? "active" : ""}`}
            onClick={() => setActiveTab("progress")}
          >
            {tr("inProgress", "In Progress")}
          </div>
        </div>

        {activeTab === "delivery" && (
          <div className="orders-content">
            {loadingDelivered ? (
              <div className="order-card">
                <p>{tr("loadingDeliveredOrders", "Loading delivered orders...")}</p>
              </div>
            ) : errorDelivered ? (
              <div className="order-card">
                <p style={{ color: "red" }}>{errorDelivered}</p>
              </div>
            ) : deliveryOrders.length === 0 ? (
              <div className="order-card">
                <p>{tr("noDeliveredOrdersFound", "No delivered orders found.")}</p>
              </div>
            ) : (
              deliveryOrders.map((order, index) => (
                <div className="order-card" key={index}>
                  <p className="order-id">
                    {tr("orderId", "Order ID")} <span>{order.auctionId}</span>
                  </p>

                  <div className="card-row">
                    <div className="card-images">{renderImages(order.images)}</div>

                    <div className="card-actions">
                      <button className="btn-review" onClick={openReviewPopup}>
                        {tr("review", "Review")}
                      </button>

                      <button className="btn-report" onClick={openReportPopup}>
                        {tr("report", "Report")}
                      </button>
                    </div>
                  </div>

                  <p className="delivery-text">
                    <span className="delivered-word">{tr("delivered", "Delivered")}</span>{" "}
                    {tr("on", "on")} {formatDate(order.deliveredAt) || "--"}
                  </p>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === "progress" && (
          <div className="orders-content">
            {loadingProgress ? (
              <div className="order-card">
                <p>{tr("loadingInProgressOrders", "Loading in-progress orders...")}</p>
              </div>
            ) : errorProgress ? (
              <div className="order-card">
                <p style={{ color: "red" }}>{errorProgress}</p>
              </div>
            ) : progressOrders.length === 0 ? (
              <div className="order-card">
                <p>{tr("noInProgressOrdersFound", "No in-progress orders found.")}</p>
              </div>
            ) : (
              progressOrders.map((order, index) => (
                <div className="order-card" key={index}>
                  <p className="order-id">
                    {tr("orderId", "Order ID")} <span>{order.auctionId}</span>
                  </p>

                  <div className="card-row">
                    <div className="card-images">{renderImages(order.images)}</div>

                    <div className="card-actions progress-actions">
                      <Link
                        to="/tracking"
                        state={{ auctionId: order.auctionId }}
                        className="btn-track"
                      >
                        {tr("track", "Track")}
                      </Link>

                      <Link
                        to="/tracking"
                        state={{ auctionId: order.auctionId }}
                        className="arrow-link"
                      >
                        <i
                          className={`fa-solid ${
                            isArabic ? "fa-angle-left" : "fa-angle-right"
                          }`}
                        ></i>
                      </Link>
                    </div>
                  </div>

                  <p className="delivery-text">
                    {tr("deliveryBy", "Delivery by")}{" "}
                    {formatDate(order.expectedDeliveryDate) || "--"}
                  </p>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {popupType === "report" && reportStep === 1 && (
        <div className="popup-overlay" onClick={closePopup}>
          <div className="popup-box" onClick={(e) => e.stopPropagation()}>
            <div className="popup-header">
              <h3 className="popup-title">{tr("whatIsTheProblem", "What is the problem?")}</h3>

              <button className="popup-close" onClick={closePopup}>
                ×
              </button>
            </div>

            <div className="popup-body">
              <label className="popup-check-row">
                <input
                  type="checkbox"
                  checked={reportReasons.includes(reasons.notReceived)}
                  onChange={() => toggleReason(reasons.notReceived)}
                />
                <span>{reasons.notReceived}</span>
              </label>

              <label className="popup-check-row">
                <input
                  type="checkbox"
                  checked={reportReasons.includes(reasons.damaged)}
                  onChange={() => toggleReason(reasons.damaged)}
                />
                <span>{reasons.damaged}</span>
              </label>

              <label className="popup-check-row">
                <input
                  type="checkbox"
                  checked={reportReasons.includes(reasons.missingParts)}
                  onChange={() => toggleReason(reasons.missingParts)}
                />
                <span>{reasons.missingParts}</span>
              </label>

              <button className="popup-main-btn" onClick={() => setReportStep(2)}>
                {tr("next", "Next")}
              </button>
            </div>
          </div>
        </div>
      )}

      {popupType === "report" && reportStep === 2 && (
        <div className="popup-overlay" onClick={closePopup}>
          <div className="popup-box popup-box-lg" onClick={(e) => e.stopPropagation()}>
            <div className="popup-header">
              <h3 className="popup-title">{tr("disputeForm", "Dispute Form")}</h3>

              <button className="popup-close" onClick={closePopup}>
                ×
              </button>
            </div>

            <div className="popup-body">
              <div className="popup-field">
                <label className="popup-label">
                  {tr("explainProblem", "Explain the problem")}
                </label>

                <textarea
                  className="popup-textarea"
                  value={reportText}
                  onChange={(e) => setReportText(e.target.value)}
                  maxLength={500}
                  placeholder={tr("writeHere", "Write here...")}
                />

                <div className="popup-counter">{reportText.length}/500</div>
              </div>

              <div className="popup-field">
                <label className="popup-label">{tr("evidenceUpload", "Evidence Upload")}</label>

                <div
                  className="popup-upload-box"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <span className="popup-upload-text">{tr("addImages", "Add Images")}</span>
                  <span className="popup-upload-plus">+</span>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*"
                  className="popup-hidden-input"
                  onChange={handleUploadImages}
                />

                {reportImages.length > 0 && (
                  <div className="popup-upload-preview">
                    {reportImages.map((img, index) => (
                      <div className="popup-preview-item" key={index}>
                        <img src={img.preview} alt={img.name} />

                        <button
                          type="button"
                          className="popup-remove-image"
                          onClick={() => removeUploadedImage(index)}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="popup-field">
                <label className="popup-label">
                  {tr("requiredSolution", "Required solution")}
                </label>

                <label className="popup-check-row">
                  <input
                    type="checkbox"
                    checked={reportSolution === "full"}
                    onChange={() => setReportSolution(reportSolution === "full" ? "" : "full")}
                  />
                  <span>{tr("fullRefundReturnItem", "Full refund (return of item).")}</span>
                </label>

                <label className="popup-check-row">
                  <input
                    type="checkbox"
                    checked={reportSolution === "partial"}
                    onChange={() =>
                      setReportSolution(reportSolution === "partial" ? "" : "partial")
                    }
                  />
                  <span>{tr("partialRefundKeepItem", "Partial refund (keep of item).")}</span>
                </label>
              </div>

              <button className="popup-main-btn" onClick={handleSendReport}>
                {tr("sendReport", "Send the report")}
              </button>
            </div>
          </div>
        </div>
      )}

      {popupType === "review" && (
        <div className="popup-overlay" onClick={closePopup}>
          <div className="popup-box" onClick={(e) => e.stopPropagation()}>
            <div className="popup-header">
              <h3 className="popup-title">{tr("rateThisOrder", "Rate this order")}</h3>

              <button className="popup-close" onClick={closePopup}>
                ×
              </button>
            </div>

            <div className="popup-body">
              <div className="review-stars">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    className={`review-star ${reviewRate >= star ? "active" : ""}`}
                    onClick={() => setReviewRate(star)}
                  >
                    ★
                  </button>
                ))}
              </div>

              <textarea
                className="popup-textarea"
                placeholder={tr("writeYourComment", "Write your comment...")}
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
              />

              <button className="popup-main-btn" onClick={handleSendReview}>
                {tr("sendReview", "Send Review")}
              </button>
            </div>
          </div>
        </div>
      )}

      {popupType === "success-report" && (
        <div className="popup-overlay" onClick={closePopup}>
          <div className="popup-box popup-success-box" onClick={(e) => e.stopPropagation()}>
            <div className="popup-header">
              <button className="popup-close" onClick={closePopup}>
                ×
              </button>
            </div>

            <div className="popup-body popup-success-body">
              <div className="success-icon">✓</div>

              <p className="success-text">
                {tr(
                  "reportReceivedText",
                  "The report has been received, and the seller is being investigated."
                )}
                <br />
                <span>{tr("yourMoneyIsSafe", "Your money is safe.")}</span>
              </p>

              <div className="success-actions">
                <button className="success-btn-light" onClick={closePopup}>
                  {tr("backToHome", "Back to home")}
                </button>

                <Link to="/tracking" className="success-btn-dark">
                  {tr("trackStatus", "Track Status")}
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {popupType === "success-review" && (
        <div className="popup-overlay" onClick={closePopup}>
          <div className="popup-box popup-success-box" onClick={(e) => e.stopPropagation()}>
            <div className="popup-header">
              <button className="popup-close" onClick={closePopup}>
                ×
              </button>
            </div>

            <div className="popup-body popup-success-body">
              <div className="success-icon">✓</div>

              <p className="success-text">
                {tr("reviewSentSuccessfully", "Your review has been sent successfully.")}
              </p>

              <div className="success-actions success-actions-center">
                <button className="success-btn-dark" onClick={closePopup}>
                  {tr("backToHome", "Back to home")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}