import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import icon from "../../assets/2.png";
import { getDeliveredOrders, getInProgressOrders } from "../../API/order";
import { getLocalDeliveryProgress } from "../../API/delivery";

const demoTrackingData = {
  title: "Golden Ring",
  image:
    "https://images.unsplash.com/photo-1605100804763-247f67b3557e?q=80&w=900&auto=format&fit=crop",
  deliveryDate: "19 June 2025",
  trackingId: "TRK-9228460-EG",
  statusSteps: [
    {
      id: 1,
      title: "Order placed",
      date: "13 June 2025, 10:00am",
      done: true,
      icon: "fa-solid fa-clipboard-list",
    },
    {
      id: 2,
      title: "In progress",
      date: "13 June 2025, 11:00am",
      done: true,
      icon: "fa-solid fa-gear",
    },
    {
      id: 3,
      title: "Shipping",
      date: "13 June 2025, 03:00pm",
      done: false,
      icon: "fa-solid fa-truck-fast",
    },
    {
      id: 4,
      title: "Delivered",
      date: "19 June 2025, 06:00pm",
      done: false,
      icon: "fa-solid fa-hand-holding-heart",
    },
  ],
};

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
    return Number(location?.state?.auctionId || 0);
  }, [location]);

  const [loading, setLoading] = useState(true);
  const [trackingData, setTrackingData] = useState(demoTrackingData);

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

        if (!auctionId) {
          setTrackingData(demoTrackingData);
          return;
        }

        const localProgressMap = getLocalDeliveryProgress();
        const localProgress = localProgressMap[auctionId] || null;

        const [delivered, inProgress] = await Promise.all([
          getDeliveredOrders(),
          getInProgressOrders(),
        ]);

        const deliveredMatch = (Array.isArray(delivered) ? delivered : []).find(
          (item) => Number(item?.auctionId || 0) === auctionId
        );

        const progressMatch = (Array.isArray(inProgress) ? inProgress : []).find(
          (item) => Number(item?.auctionId || 0) === auctionId
        );

        if (deliveredMatch) {
          const imageSrc = Array.isArray(deliveredMatch.images)
            ? toImageSrc(deliveredMatch.images[0])
            : "";

          setTrackingData({
            title:
              deliveredMatch?.title ||
              tr("auctionNumber", `Auction #${auctionId}`, { id: auctionId }),
            image: imageSrc || demoTrackingData.image,
            deliveryDate: formatDateOnly(deliveredMatch.deliveredAt),
            trackingId: `TRK-${auctionId}-EG`,
            statusSteps: [
              {
                id: 1,
                title: tr("orderPlaced", "Order placed"),
                date: formatDateTime(deliveredMatch.deliveredAt),
                done: true,
                icon: "fa-solid fa-clipboard-list",
              },
              {
                id: 2,
                title: tr("checkedByDelivery", "Checked by delivery"),
                date: formatDateTime(deliveredMatch.deliveredAt),
                done: true,
                icon: "fa-solid fa-circle-check",
              },
              {
                id: 3,
                title: tr("shipping", "Shipping"),
                date: formatDateTime(deliveredMatch.deliveredAt),
                done: true,
                icon: "fa-solid fa-truck-fast",
              },
              {
                id: 4,
                title: tr("delivered", "Delivered"),
                date: formatDateTime(deliveredMatch.deliveredAt),
                done: true,
                icon: "fa-solid fa-hand-holding-heart",
              },
            ],
          });
          return;
        }

        if (progressMatch) {
          const imageSrc = Array.isArray(progressMatch.images)
            ? toImageSrc(progressMatch.images[0])
            : localProgress?.uploadedImage || "";

          const checkedDone = !!localProgress?.step2Checked;
          const contactDone = !!localProgress?.step3Submitted;
          const shippingDone = !!localProgress?.step4Uploaded;
          const failedDone = !!localProgress?.notCompleted;

          setTrackingData({
            title:
              progressMatch?.title ||
              tr("auctionNumber", `Auction #${auctionId}`, { id: auctionId }),
            image: imageSrc || demoTrackingData.image,
            deliveryDate: formatDateOnly(progressMatch.expectedDeliveryDate),
            trackingId: `TRK-${auctionId}-EG`,
            statusSteps: [
              {
                id: 1,
                title: tr("orderPlaced", "Order placed"),
                date: formatDateTime(progressMatch.expectedDeliveryDate),
                done: true,
                icon: "fa-solid fa-clipboard-list",
              },
              {
                id: 2,
                title: tr("inProgress", "In progress"),
                date: checkedDone ? formatDateTime(localProgress?.updatedAt) : "--",
                done: checkedDone,
                icon: "fa-solid fa-gear",
              },
              {
                id: 3,
                title: contactDone
                  ? tr("contactConfirmed", "Contact confirmed")
                  : tr("shipping", "Shipping"),
                date: contactDone
                  ? `${localProgress?.contact || ""} • ${formatDateTime(
                      localProgress?.updatedAt
                    )}`
                  : "--",
                done: contactDone,
                icon: "fa-solid fa-truck-fast",
              },
              {
                id: 4,
                title: failedDone
                  ? tr("deliveryNotCompleted", "Delivery not completed")
                  : shippingDone
                  ? tr("shippingProofUploaded", "Shipping proof uploaded")
                  : tr("delivered", "Delivered"),
                date:
                  shippingDone || failedDone
                    ? formatDateTime(localProgress?.updatedAt)
                    : "--",
                done: shippingDone || failedDone,
                icon: failedDone
                  ? "fa-solid fa-circle-xmark"
                  : "fa-solid fa-hand-holding-heart",
              },
            ],
          });
          return;
        }

        if (localProgress) {
          setTrackingData({
            title: tr("auctionNumber", `Auction #${auctionId}`, { id: auctionId }),
            image: localProgress?.uploadedImage || demoTrackingData.image,
            deliveryDate: formatDateOnly(localProgress?.updatedAt),
            trackingId: `TRK-${auctionId}-EG`,
            statusSteps: [
              {
                id: 1,
                title: tr("orderPlaced", "Order placed"),
                date: formatDateTime(localProgress?.updatedAt),
                done: true,
                icon: "fa-solid fa-clipboard-list",
              },
              {
                id: 2,
                title: tr("inProgress", "In progress"),
                date: localProgress?.step2Checked
                  ? formatDateTime(localProgress?.updatedAt)
                  : "--",
                done: !!localProgress?.step2Checked,
                icon: "fa-solid fa-gear",
              },
              {
                id: 3,
                title: tr("shipping", "Shipping"),
                date: localProgress?.step3Submitted
                  ? `${localProgress?.contact || ""} • ${formatDateTime(
                      localProgress?.updatedAt
                    )}`
                  : "--",
                done: !!localProgress?.step3Submitted,
                icon: "fa-solid fa-truck-fast",
              },
              {
                id: 4,
                title: localProgress?.notCompleted
                  ? tr("deliveryNotCompleted", "Delivery not completed")
                  : tr("delivered", "Delivered"),
                date:
                  localProgress?.step4Uploaded || localProgress?.notCompleted
                    ? formatDateTime(localProgress?.updatedAt)
                    : "--",
                done: !!localProgress?.step4Uploaded || !!localProgress?.notCompleted,
                icon: localProgress?.notCompleted
                  ? "fa-solid fa-circle-xmark"
                  : "fa-solid fa-hand-holding-heart",
              },
            ],
          });
          return;
        }

        setTrackingData(demoTrackingData);
      } catch (err) {
        console.log(err?.response?.data || err?.message || err);
        setTrackingData(demoTrackingData);
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

        @media (max-width: 640px) {
          .tracking-page {
            padding: 22px 14px 50px;
            background: #ffffff;
          }

          .tracking-shell {
            width: 100%;
          }

          .tracking-top {
            margin-bottom: 22px;
          }

          .tracking-title {
            font-size: 26px;
          }

          .tracking-layout {
            gap: 18px;
          }

          .tracking-product-card,
          .tracking-info-panel {
            box-shadow: none;
            border: none;
            padding: 0;
            border-radius: 0;
          }

          .tracking-product-main {
            background: #fff;
            box-shadow: 0 3px 12px rgba(15, 23, 42, 0.08);
            border-radius: 8px;
            padding: 10px;
          }

          .tracking-product-image,
          .tracking-product-empty {
            width: 52px;
            height: 52px;
            border-radius: 6px;
          }

          .tracking-product-name {
            font-size: 14px;
          }

          .tracking-section-title {
            font-size: 15px;
            margin-bottom: 10px;
          }

          .tracking-detail-row {
            font-size: 12px;
          }

          .tracking-section {
            margin-bottom: 22px;
          }

          .tracking-status-item {
            grid-template-columns: 30px 1fr 24px;
            gap: 10px;
            padding-bottom: 18px;
          }

          .tracking-status-list::before {
            left: ${isArabic ? "auto" : "14px"};
            right: ${isArabic ? "14px" : "auto"};
          }

          .tracking-status-title {
            font-size: 13px;
          }

          .tracking-status-date {
            font-size: 10px;
          }

          .tracking-status-icon {
            width: 24px;
            height: 24px;
            font-size: 12px;
          }

          .tracking-status-dot {
            width: 20px;
            height: 20px;
            font-size: 10px;
          }
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
                        <div
                          className={`tracking-status-dot ${
                            step.done ? "done" : ""
                          }`}
                        >
                          {step.done ? (
                            <i className="fa-solid fa-check"></i>
                          ) : null}
                        </div>
                      </div>

                      <div className="tracking-status-content">
                        <h4 className="tracking-status-title">{step.title}</h4>
                        <p className="tracking-status-date">{step.date}</p>
                      </div>

                      <div
                        className={`tracking-status-icon ${
                          step.done ? "" : "inactive"
                        }`}
                      >
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