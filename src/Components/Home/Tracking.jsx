import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import icon from "../../assets/2.png";
import { getDeliveredOrders, getInProgressOrders } from "../../API/order";

const toImageSrc = (value) => {
  const raw = String(value || "").trim();

  if (!raw || raw === " ") return "";
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

export default function Tracking() {
  const location = useLocation();
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === "ar";

  const tr = (key, fallback) => {
    const value = t(key);
    return value === key ? fallback : value;
  };

  const formatDateTime = (value) => {
    if (!value) return "--";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);

    return date.toLocaleString(isArabic ? "ar-EG" : "en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDateOnly = (value) => {
    if (!value) return "--";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);

    return date.toLocaleDateString(isArabic ? "ar-EG" : "en-GB", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  };

  const auctionId = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return Number(location?.state?.auctionId || params.get("auctionId") || 0);
  }, [location]);

  const [loading, setLoading] = useState(true);
  const [trackingData, setTrackingData] = useState(null);
  const [error, setError] = useState("");

  const getStatusLabel = (status, fallbackStatus) => {
    const s = Number(status || fallbackStatus || 1);

    if (s === 1) return tr("orderPlaced", "Order placed");
    if (s === 2) return tr("inProgress", "In progress");
    if (s === 3) return tr("shipping", "Shipping");
    if (s === 4) return tr("delivered", "Delivered");
    if (s === 5) return tr("failed", "Failed");

    return tr("inProgress", "In progress");
  };

  const getStatusSteps = (status, isDelivered) => {
    const s = isDelivered ? 4 : Number(status || 1);

    return [
      {
        id: 1,
        title: tr("orderPlaced", "Order placed"),
        date: s >= 1 ? tr("completed", "Completed") : "--",
        done: s >= 1,
        icon: "fa-solid fa-clipboard-list",
      },
      {
        id: 2,
        title: tr("inProgress", "In progress"),
        date: s >= 2 ? tr("completed", "Completed") : "--",
        done: s >= 2,
        icon: "fa-solid fa-gear",
      },
      {
        id: 3,
        title: tr("shipping", "Shipping"),
        date: s >= 3 ? tr("completed", "Completed") : "--",
        done: s >= 3,
        icon: "fa-solid fa-truck-fast",
      },
      {
        id: 4,
        title: s === 5 ? tr("failed", "Failed") : tr("delivered", "Delivered"),
        date: s === 4 || s === 5 ? tr("completed", "Completed") : "--",
        done: s === 4 || s === 5,
        icon: s === 5 ? "fa-solid fa-circle-xmark" : "fa-solid fa-hand-holding-heart",
      },
    ];
  };

  useEffect(() => {
    document.title = tr("trackingDocTitle", "Tracking");

    const link = document.querySelector("link[rel~='icon']");
    if (link) {
      link.href = icon;
    } else {
      const newLink = document.createElement("link");
      newLink.rel = "icon";
      newLink.href = icon;
      document.head.appendChild(newLink);
    }
  }, [i18n.language]);

  useEffect(() => {
    const loadTracking = async () => {
      try {
        setLoading(true);
        setError("");

        if (!auctionId) {
          setTrackingData(null);
          return;
        }

        const [deliveredOrders, progressOrders] = await Promise.all([
          getDeliveredOrders(),
          getInProgressOrders(),
        ]);

        const deliveredList = Array.isArray(deliveredOrders) ? deliveredOrders : [];
        const progressList = Array.isArray(progressOrders) ? progressOrders : [];

        const deliveredMatch = deliveredList.find(
          (item) => Number(item?.auctionId || item?.id || 0) === auctionId
        );

        const progressMatch = progressList.find(
          (item) => Number(item?.auctionId || item?.id || 0) === auctionId
        );

        const order = deliveredMatch || progressMatch;

        if (!order) {
          setTrackingData(null);
          return;
        }

        const isDelivered = Boolean(deliveredMatch);
        const status = isDelivered ? 4 : Number(order?.status || order?.deliveryStatus || 1);

        const imageSrc = Array.isArray(order?.images)
          ? toImageSrc(order.images[0])
          : toImageSrc(order?.image || order?.Image || "");

        setTrackingData({
          title:
            order?.auctionTitle ||
            order?.title ||
            order?.AuctionTitle ||
            tr("auctionNumber", `Auction #${auctionId}`),
          image: imageSrc,
          deliveryDate: isDelivered
            ? formatDateOnly(order?.deliveredAt)
            : formatDateOnly(order?.expectedDeliveryDate),
          trackingId: order?.code || order?.trackingCode || `TRK-${auctionId}-EG`,
          auctionId,
          userEmail: order?.userEmail || order?.UserEmail || "-",
          userNumber: order?.userNumber || order?.UserNumber || "-",
          finalPrice: order?.finalPrice || order?.FinalPrice || 0,
          statusLabel: getStatusLabel(status, isDelivered ? 4 : 1),
          statusSteps: getStatusSteps(status, isDelivered),
        });
      } catch (err) {
        setError(
          err?.response?.data?.message ||
            err?.message ||
            tr("failedToLoadTracking", "Failed to load tracking.")
        );
        setTrackingData(null);
      } finally {
        setLoading(false);
      }
    };

    loadTracking();
  }, [auctionId, i18n.language]);

  return (
    <div className="tracking-page" dir={isArabic ? "rtl" : "ltr"}>
      <style>{`
        .tracking-page {
          min-height: 100vh;
          background: #f4f7fb;
          padding: 30px 18px 70px;
          box-sizing: border-box;
          font-family: Arial, Helvetica, sans-serif;
        }

        .tracking-page * {
          box-sizing: border-box;
        }

        .tracking-shell {
          width: min(100%, 720px);
          margin: 0 auto;
        }

        .tracking-top {
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 24px;
        }

        .tracking-title {
          margin: 0;
          color: #063b78;
          font-size: 34px;
          line-height: 1.1;
          font-weight: 900;
          letter-spacing: 0.5px;
          text-transform: uppercase;
          font-family: Georgia, "Times New Roman", serif;
          text-align: center;
        }

        .tracking-layout {
          display: flex;
          flex-direction: column;
          gap: 20px;
          align-items: stretch;
        }

        .tracking-product-card {
          width: 100%;
          background: #ffffff;
          border-radius: 16px;
          padding: 22px;
          box-shadow: 0 8px 24px rgba(15, 23, 42, 0.06);
          border: 1px solid #edf1f6;
        }

        .tracking-product-main {
          display: flex;
          align-items: center;
          gap: 18px;
        }

        .tracking-product-image {
          width: 120px;
          height: 120px;
          border-radius: 10px;
          object-fit: cover;
          background: #f1f5f9;
          border: 1px solid #e5e7eb;
          flex-shrink: 0;
        }

        .tracking-product-empty {
          width: 120px;
          height: 120px;
          border-radius: 10px;
          background: #f1f5f9;
          border: 1px solid #e5e7eb;
          color: #94a3b8;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 13px;
          font-weight: 800;
          flex-shrink: 0;
        }

        .tracking-product-name {
          margin: 0;
          color: #111827;
          font-size: 24px;
          font-weight: 900;
          line-height: 1.3;
        }

        .tracking-info-panel {
          width: 100%;
          background: #ffffff;
          border-radius: 16px;
          padding: 26px;
          box-shadow: 0 8px 24px rgba(15, 23, 42, 0.06);
          border: 1px solid #edf1f6;
        }

        .tracking-section {
          margin-bottom: 34px;
        }

        .tracking-section:last-child {
          margin-bottom: 0;
        }

        .tracking-section-title {
          margin: 0 0 16px;
          color: #111827;
          font-size: 24px;
          font-weight: 900;
        }

        .tracking-details {
          display: grid;
          gap: 12px;
        }

        .tracking-detail-row {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 18px;
          color: #111827;
          font-size: 16px;
        }

        .tracking-detail-label {
          color: #6b7280;
          font-weight: 700;
        }

        .tracking-detail-value {
          color: #111827;
          font-weight: 900;
          text-align: end;
          word-break: break-word;
        }

        .tracking-status-list {
          position: relative;
          list-style: none;
          padding: 0;
          margin: 0;
        }

        .tracking-status-list::before {
          content: "";
          position: absolute;
          top: 24px;
          bottom: 24px;
          left: ${isArabic ? "auto" : "16px"};
          right: ${isArabic ? "16px" : "auto"};
          width: 2px;
          background: #d9dee8;
          border-radius: 999px;
        }

        .tracking-status-item {
          position: relative;
          display: grid;
          grid-template-columns: 34px 1fr 32px;
          gap: 16px;
          align-items: start;
          padding: 0 0 26px;
        }

        .tracking-status-item:last-child {
          padding-bottom: 0;
        }

        .tracking-status-dot-wrap {
          position: relative;
          z-index: 2;
          display: flex;
          justify-content: center;
          padding-top: 2px;
        }

        .tracking-status-dot {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: #c5c9d1;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #fff;
          font-size: 11px;
          box-shadow: 0 0 0 5px #fff;
        }

        .tracking-status-dot.done {
          background: #064c9f;
        }

        .tracking-status-content {
          min-width: 0;
        }

        .tracking-status-title {
          margin: 0 0 6px;
          color: #111827;
          font-size: 18px;
          font-weight: 900;
        }

        .tracking-status-date {
          margin: 0;
          color: #9ca3af;
          font-size: 13px;
          line-height: 1.4;
          font-weight: 700;
        }

        .tracking-status-icon {
          width: 32px;
          height: 32px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: #064c9f;
          font-size: 16px;
        }

        .tracking-status-icon.inactive {
          color: #064c9f;
        }

        .tracking-loading {
          background: #ffffff;
          border-radius: 16px;
          padding: 22px;
          color: #063b78;
          font-weight: 900;
          box-shadow: 0 8px 24px rgba(15, 23, 42, 0.06);
          border: 1px solid #edf1f6;
          text-align: center;
        }
      `}</style>

      <div className="tracking-shell">
        <div className="tracking-top">
          <h1 className="tracking-title">{tr("trackingTitle", "Tracking")}</h1>
        </div>

        {loading ? (
          <div className="tracking-loading">
            {tr("loadingTracking", "Loading tracking...")}
          </div>
        ) : error ? (
          <div className="tracking-loading" style={{ color: "#dc2626" }}>
            {error}
          </div>
        ) : !trackingData ? (
          <div className="tracking-loading">
            {tr("noTrackingData", "No tracking data found.")}
          </div>
        ) : (
          <div className="tracking-layout">
            <div className="tracking-product-card">
              <div className="tracking-product-main">
                {trackingData.image ? (
                  <img
                    src={trackingData.image}
                    alt={trackingData.title}
                    className="tracking-product-image"
                  />
                ) : (
                  <div className="tracking-product-empty">
                    {tr("noImage", "No Image")}
                  </div>
                )}

                <h2 className="tracking-product-name">{trackingData.title}</h2>
              </div>
            </div>

            <div className="tracking-info-panel">
              <div className="tracking-section">
                <h3 className="tracking-section-title">
                  {tr("orderDetails", "Order Details")}
                </h3>

                <div className="tracking-details">
                  <div className="tracking-detail-row">
                    <span className="tracking-detail-label">
                      {tr("deliveryDate", "Delivery Date")}
                    </span>
                    <span className="tracking-detail-value">
                      {trackingData.deliveryDate}
                    </span>
                  </div>

                  <div className="tracking-detail-row">
                    <span className="tracking-detail-label">
                      {tr("trackingId", "Tracking ID")}
                    </span>
                    <span className="tracking-detail-value">
                      {trackingData.trackingId}
                    </span>
                  </div>

                  <div className="tracking-detail-row">
                    <span className="tracking-detail-label">
                      {tr("status", "Status")}
                    </span>
                    <span className="tracking-detail-value">
                      {trackingData.statusLabel}
                    </span>
                  </div>
                </div>
              </div>

              <div className="tracking-section">
                <h3 className="tracking-section-title">
                  {tr("orderStatus", "Order Status")}
                </h3>

                <ul className="tracking-status-list">
                  {trackingData.statusSteps.map((step) => (
                    <li className="tracking-status-item" key={step.id}>
                      <div className="tracking-status-dot-wrap">
                        <div className={`tracking-status-dot ${step.done ? "done" : ""}`}>
                          {step.done ? <i className="fa-solid fa-check"></i> : null}
                        </div>
                      </div>

                      <div className="tracking-status-content">
                        <h4 className="tracking-status-title">{step.title}</h4>
                        <p className="tracking-status-date">{step.date}</p>
                      </div>

                      <div className={`tracking-status-icon ${step.done ? "" : "inactive"}`}>
                        <i className={step.icon}></i>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}