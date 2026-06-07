import { useState, useEffect, useRef } from "react";
import icon from "../../assets/2.png";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { getDeliveredOrders, getInProgressOrders } from "../../API/order";
import { createDispute } from "../../API/dispute";

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

  return looksLikeBase64 ? `data:image/png;base64,${cleaned}` : "";
};

export default function Order() {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === "ar";

  const tr = (key, fallback) => {
    const value = t(key);
    return value === key ? fallback : value;
  };

  const [activeTab, setActiveTab] = useState("delivery");
  const [popupType, setPopupType] = useState("");
  const [reportStep, setReportStep] = useState(1);

  const [selectedOrder, setSelectedOrder] = useState(null);
  const [reportReasons, setReportReasons] = useState([]);
  const [reportText, setReportText] = useState("");
  const [reportSolution, setReportSolution] = useState("");
  const [reportImages, setReportImages] = useState([]);
  const [createdDisputeId, setCreatedDisputeId] = useState("");

  const [deliveryOrders, setDeliveryOrders] = useState([]);
  const [progressOrders, setProgressOrders] = useState([]);
  const [loadingDelivered, setLoadingDelivered] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(true);
  const [errorDelivered, setErrorDelivered] = useState("");
  const [errorProgress, setErrorProgress] = useState("");
  const [submitLoading, setSubmitLoading] = useState(false);

  const [reviewRate, setReviewRate] = useState(0);
  const [reviewComment, setReviewComment] = useState("");

  const fileInputRef = useRef(null);

  const reasons = {
    notReceived: tr("reportReasonNotReceived", "I did not receive the item."),
    damaged: tr(
      "reportReasonDamaged",
      "The item does not match the description / is damaged."
    ),
    missingParts: tr("reportReasonMissingParts", "The item is missing parts."),
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

  useEffect(() => {
    document.title = tr("ordersDocTitle", "Orders");
    const link = document.querySelector("link[rel~='icon']");
    if (link) link.href = icon;
  }, [i18n.language]);

  useEffect(() => {
    const loadDelivered = async () => {
      try {
        setLoadingDelivered(true);
        setErrorDelivered("");
        const data = await getDeliveredOrders();
        setDeliveryOrders(Array.isArray(data) ? data : []);
      } catch (err) {
        setErrorDelivered(
          err?.response?.data?.message ||
            err?.message ||
            tr("failedLoadDelivered", "Failed to load delivered orders.")
        );
        setDeliveryOrders([]);
      } finally {
        setLoadingDelivered(false);
      }
    };

    const loadProgress = async () => {
      try {
        setLoadingProgress(true);
        setErrorProgress("");
        const data = await getInProgressOrders();
        setProgressOrders(Array.isArray(data) ? data : []);
      } catch (err) {
        setErrorProgress(
          err?.response?.data?.message ||
            err?.message ||
            tr("failedLoadProgress", "Failed to load in-progress orders.")
        );
        setProgressOrders([]);
      } finally {
        setLoadingProgress(false);
      }
    };

    loadDelivered();
    loadProgress();
  }, [i18n.language]);

  const openReportPopup = (order) => {
    setSelectedOrder(order);
    setPopupType("report");
    setReportStep(1);
    setReportReasons([]);
    setReportText("");
    setReportSolution("");
    setReportImages([]);
    setCreatedDisputeId("");
  };

  const openReviewPopup = (order) => {
    setSelectedOrder(order);
    setPopupType("review");
    setReviewRate(0);
    setReviewComment("");
  };

  const closePopup = () => {
    setPopupType("");
    setReportStep(1);
    setSubmitLoading(false);
  };

  const toggleReason = (reason) => {
    setReportReasons((prev) =>
      prev.includes(reason)
        ? prev.filter((item) => item !== reason)
        : [...prev, reason]
    );
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

  const handleSendReport = async () => {
    try {
      setSubmitLoading(true);

      const auctionId = Number(selectedOrder?.auctionId || selectedOrder?.id || 0);

      const description = [reportReasons.join(" | "), reportText]
        .filter(Boolean)
        .join("\n");

      const resolutionType = reportSolution === "partial" ? 2 : 1;

      const evidences = reportImages.map(
        (img) => img.preview || img.name || "evidence"
      );

      const res = await createDispute({
        auctionId,
        description,
        resolutionType,
        evidences,
      });

      const disputeId =
        res?.disputeId ||
        res?.DisputeId ||
        res?.data?.disputeId ||
        res?.Data?.disputeId ||
        res?.result?.disputeId ||
        "";

      setCreatedDisputeId(disputeId);
      setPopupType("success-report");
    } catch (err) {
      alert(
        err?.response?.data?.message ||
          err?.response?.data?.Message ||
          err?.message ||
          "Failed to create dispute."
      );
    } finally {
      setSubmitLoading(false);
    }
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

  const renderOrderCard = (order, index, type) => {
    const auctionId = Number(order?.auctionId || order?.id || 0);

    return (
      <div className="order-card" key={`${type}-${auctionId || index}`}>
        <p className="order-id">
          {tr("orderId", "Order ID")} <span>{auctionId || "-"}</span>
        </p>

        <div className="card-row">
          <div className="card-images">{renderImages(order.images)}</div>

          {type === "delivered" ? (
            <div className="card-actions">
              <button className="btn-review" onClick={() => openReviewPopup(order)}>
                {tr("review", "Review")}
              </button>

              <button className="btn-report" onClick={() => openReportPopup(order)}>
                {tr("report", "Report")}
              </button>
            </div>
          ) : (
            <div className="card-actions progress-actions">
              <Link
                to="/tracking"
                state={{ auctionId }}
                className="btn-track"
              >
                {tr("track", "Track")}
              </Link>

              <Link
                to="/tracking"
                state={{ auctionId }}
                className="arrow-link"
              >
                <i
                  className={`fa-solid ${
                    isArabic ? "fa-angle-left" : "fa-angle-right"
                  }`}
                />
              </Link>
            </div>
          )}
        </div>

        <p className="delivery-text">
          {type === "delivered" ? (
            <>
              <span className="delivered-word">
                {tr("delivered", "Delivered")}
              </span>{" "}
              {tr("on", "on")} {formatDate(order.deliveredAt) || "--"}
            </>
          ) : (
            <>
              {tr("deliveryBy", "Delivery by")}{" "}
              {formatDate(order.expectedDeliveryDate) || "--"}
            </>
          )}
        </p>
      </div>
    );
  };

  return (
    <div className="orders" dir={isArabic ? "rtl" : "ltr"}>
      <style>{`
        /* ── Reset & force light background ── */
        .orders,
        .orders * {
          box-sizing: border-box;
        }

        .orders {
          min-height: 100vh;
          background-color: #f4f7fb !important;
          background: #f4f7fb !important;
          padding: 30px 16px 70px;
          font-family: Arial, Helvetica, sans-serif;
          color: #111827;
        }

        .container {
          width: 100%;
          max-width: 900px;
          margin: 0 auto;
        }

        /* ── Title ── */
        .orders-title {
          text-align: center;
          color: #063b78;
          font-size: clamp(24px, 6vw, 36px);
          font-weight: 900;
          margin-bottom: 24px;
          font-family: Georgia, "Times New Roman", serif;
          text-transform: uppercase;
        }

        /* ── Tabs ── */
        .orders-tabs {
          display: grid;
          grid-template-columns: 1fr 1fr;
          background: #fff;
          border-radius: 14px;
          overflow: hidden;
          margin-bottom: 22px;
          border: 1px solid #e5e7eb;
        }

        .tab {
          padding: 14px 8px;
          text-align: center;
          cursor: pointer;
          font-weight: 900;
          color: #063b78;
          font-size: clamp(13px, 3.5vw, 16px);
          line-height: 1.3;
          white-space: normal;
          word-break: break-word;
          background: #fff;
          transition: background 0.2s, color 0.2s;
        }

        .tab.active {
          background: #063b78;
          color: #fff;
        }

        /* ── Order card ── */
        .order-card {
          background: #fff !important;
          border-radius: 16px;
          padding: 20px;
          margin-bottom: 16px;
          border: 1px solid #e5e7eb;
          box-shadow: 0 8px 24px rgba(15, 23, 42, 0.06);
          color: #111827;
        }

        .order-id {
          font-weight: 900;
          color: #111827;
          margin: 0 0 14px;
          font-size: clamp(13px, 3.5vw, 15px);
        }

        .order-id span {
          color: #063b78;
        }

        .card-row {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          align-items: center;
          flex-wrap: wrap;
        }

        .card-images {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          flex: 1;
          min-width: 0;
        }

        .card-images img,
        .card-image-empty {
          width: 80px;
          height: 80px;
          border-radius: 12px;
          object-fit: cover;
          background: #f1f5f9;
          border: 1px solid #e5e7eb;
          flex-shrink: 0;
        }

        .card-image-empty {
          display: flex;
          align-items: center;
          justify-content: center;
          color: #94a3b8;
          font-size: 11px;
          font-weight: 800;
          text-align: center;
          padding: 4px;
        }

        .card-actions {
          display: flex;
          flex-direction: column;
          gap: 10px;
          flex-shrink: 0;
        }

        .progress-actions {
          flex-direction: row;
          align-items: center;
        }

        /* ── Buttons ── */
        .btn-review,
        .btn-report,
        .btn-track,
        .arrow-link,
        .popup-main-btn,
        .success-btn-dark,
        .success-btn-light {
          border: none;
          border-radius: 10px;
          padding: 10px 14px;
          font-weight: 900;
          cursor: pointer;
          text-decoration: none;
          text-align: center;
          display: inline-flex;
          justify-content: center;
          align-items: center;
          font-size: clamp(12px, 3vw, 14px);
          white-space: nowrap;
        }

        .btn-review,
        .btn-track,
        .success-btn-dark,
        .popup-main-btn {
          background: #063b78;
          color: #fff;
        }

        .btn-report {
          background: #fee2e2;
          color: #b91c1c;
        }

        .arrow-link,
        .success-btn-light {
          background: #e8f1ff;
          color: #063b78;
        }

        .delivery-text {
          color: #4b5563;
          margin: 14px 0 0;
          font-weight: 700;
          font-size: clamp(12px, 3vw, 14px);
        }

        .delivered-word {
          color: #16a34a;
          font-weight: 900;
        }

        /* ── Mobile: card row stacks ── */
        @media (max-width: 480px) {
          .card-row {
            flex-direction: column;
            align-items: stretch;
          }

          .card-images {
            justify-content: flex-start;
          }

          .card-images img,
          .card-image-empty {
            width: 72px;
            height: 72px;
          }

          .card-actions {
            flex-direction: row;
            width: 100%;
          }

          .card-actions > * {
            flex: 1;
          }

          .progress-actions {
            flex-direction: row;
          }
        }

        /* ── Popup ── */
        .popup-overlay {
          position: fixed;
          inset: 0;
          background: rgba(15, 23, 42, 0.45);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
          z-index: 9999;
        }

        .popup-box {
          width: 100%;
          max-width: 520px;
          background: #fff;
          border-radius: 18px;
          padding: 20px;
          box-shadow: 0 18px 48px rgba(0,0,0,0.2);
          max-height: 90vh;
          overflow-y: auto;
        }

        .popup-box-lg {
          max-width: 650px;
        }

        .popup-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }

        .popup-title {
          margin: 0;
          color: #111827;
          font-size: clamp(18px, 5vw, 24px);
          font-weight: 900;
        }

        .popup-close {
          border: none;
          background: transparent;
          font-size: 28px;
          cursor: pointer;
          color: #111827;
          line-height: 1;
          padding: 4px;
        }

        .popup-body {
          display: grid;
          gap: 16px;
        }

        .popup-check-row {
          display: flex;
          align-items: center;
          gap: 10px;
          font-weight: 800;
          color: #374151;
          font-size: clamp(13px, 3.5vw, 15px);
        }

        .popup-field {
          display: grid;
          gap: 8px;
        }

        .popup-label {
          font-weight: 900;
          color: #111827;
          font-size: clamp(13px, 3.5vw, 15px);
        }

        .popup-textarea {
          width: 100%;
          min-height: 110px;
          border: 1px solid #d1d5db;
          border-radius: 12px;
          padding: 12px;
          resize: vertical;
          font-size: 14px;
          color: #111827;
          background: #fff;
        }

        .popup-counter {
          text-align: end;
          color: #6b7280;
          font-size: 13px;
        }

        .popup-upload-box {
          border: 2px dashed #cbd5e1;
          border-radius: 14px;
          padding: 16px;
          cursor: pointer;
          display: flex;
          justify-content: space-between;
          align-items: center;
          color: #063b78;
          font-weight: 900;
          font-size: clamp(13px, 3.5vw, 15px);
        }

        .popup-hidden-input {
          display: none;
        }

        .popup-upload-preview {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
        }

        .popup-preview-item {
          position: relative;
        }

        .popup-preview-item img {
          width: 72px;
          height: 72px;
          border-radius: 10px;
          object-fit: cover;
        }

        .popup-remove-image {
          position: absolute;
          top: -8px;
          right: -8px;
          border: none;
          background: #dc2626;
          color: white;
          border-radius: 50%;
          width: 24px;
          height: 24px;
          cursor: pointer;
          font-size: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .popup-main-btn {
          width: 100%;
          padding: 14px;
          font-size: clamp(14px, 3.5vw, 16px);
          border-radius: 12px;
        }

        .review-stars {
          display: flex;
          justify-content: center;
          gap: 8px;
        }

        .review-star {
          border: none;
          background: transparent;
          font-size: clamp(28px, 8vw, 36px);
          cursor: pointer;
          color: #d1d5db;
          padding: 0;
        }

        .review-star.active {
          color: #f59e0b;
        }

        .popup-success-body {
          text-align: center;
          display: grid;
          gap: 16px;
        }

        .success-icon {
          width: 72px;
          height: 72px;
          margin: 0 auto;
          border-radius: 50%;
          background: #16a34a;
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 38px;
          font-weight: 900;
        }

        .success-text {
          color: #374151;
          font-weight: 800;
          line-height: 1.7;
          font-size: clamp(13px, 3.5vw, 15px);
          margin: 0;
        }

        .success-actions {
          display: flex;
          justify-content: center;
          gap: 12px;
          flex-wrap: wrap;
        }

        .success-btn-dark,
        .success-btn-light {
          padding: 12px 20px;
          border-radius: 10px;
          font-size: clamp(13px, 3.5vw, 15px);
          flex: 1;
          min-width: 120px;
          max-width: 200px;
        }
      `}</style>

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
                {tr("loadingDeliveredOrders", "Loading delivered orders...")}
              </div>
            ) : errorDelivered ? (
              <div className="order-card" style={{ color: "red" }}>
                {errorDelivered}
              </div>
            ) : deliveryOrders.length === 0 ? (
              <div className="order-card">
                {tr("noDeliveredOrdersFound", "No delivered orders found.")}
              </div>
            ) : (
              deliveryOrders.map((order, index) =>
                renderOrderCard(order, index, "delivered")
              )
            )}
          </div>
        )}

        {activeTab === "progress" && (
          <div className="orders-content">
            {loadingProgress ? (
              <div className="order-card">
                {tr("loadingInProgressOrders", "Loading in-progress orders...")}
              </div>
            ) : errorProgress ? (
              <div className="order-card" style={{ color: "red" }}>
                {errorProgress}
              </div>
            ) : progressOrders.length === 0 ? (
              <div className="order-card">
                {tr("noInProgressOrdersFound", "No in-progress orders found.")}
              </div>
            ) : (
              progressOrders.map((order, index) =>
                renderOrderCard(order, index, "progress")
              )
            )}
          </div>
        )}
      </div>

      {popupType === "report" && reportStep === 1 && (
        <div className="popup-overlay" onClick={closePopup}>
          <div className="popup-box" onClick={(e) => e.stopPropagation()}>
            <div className="popup-header">
              <h3 className="popup-title">
                {tr("whatIsTheProblem", "What is the problem?")}
              </h3>
              <button className="popup-close" onClick={closePopup}>×</button>
            </div>

            <div className="popup-body">
              {Object.values(reasons).map((reason) => (
                <label className="popup-check-row" key={reason}>
                  <input
                    type="checkbox"
                    checked={reportReasons.includes(reason)}
                    onChange={() => toggleReason(reason)}
                  />
                  <span>{reason}</span>
                </label>
              ))}

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
              <button className="popup-close" onClick={closePopup}>×</button>
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
                <label className="popup-label">
                  {tr("evidenceUpload", "Evidence Upload")}
                </label>

                <div
                  className="popup-upload-box"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <span>{tr("addImages", "Add Images")}</span>
                  <span>+</span>
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
                    onChange={() =>
                      setReportSolution(reportSolution === "full" ? "" : "full")
                    }
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

              <button
                className="popup-main-btn"
                onClick={handleSendReport}
                disabled={submitLoading}
              >
                {submitLoading
                  ? tr("sending", "Sending...")
                  : tr("sendReport", "Send the report")}
              </button>
            </div>
          </div>
        </div>
      )}

      {popupType === "review" && (
        <div className="popup-overlay" onClick={closePopup}>
          <div className="popup-box" onClick={(e) => e.stopPropagation()}>
            <div className="popup-header">
              <h3 className="popup-title">
                {tr("rateThisOrder", "Rate this order")}
              </h3>
              <button className="popup-close" onClick={closePopup}>×</button>
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
          <div className="popup-box" onClick={(e) => e.stopPropagation()}>
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

                <Link
                  to={`/dispute-tracking?disputeId=${createdDisputeId}`}
                  state={{ disputeId: createdDisputeId }}
                  className="success-btn-dark"
                >
                  {tr("trackStatus", "Track Status")}
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {popupType === "success-review" && (
        <div className="popup-overlay" onClick={closePopup}>
          <div className="popup-box" onClick={(e) => e.stopPropagation()}>
            <div className="popup-body popup-success-body">
              <div className="success-icon">✓</div>
              <p className="success-text">
                {tr("reviewSentSuccessfully", "Your review has been sent successfully.")}
              </p>
              <button className="success-btn-dark" onClick={closePopup}>
                {tr("backToHome", "Back to home")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}