import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

import icon from "../../assets/2.png";
import api from "../../API/axios";

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1503376780353-7e6692767b70?q=80&w=1400&auto=format&fit=crop";

const getImageSrc = (value, fallback = FALLBACK_IMAGE) => {
  const raw = String(value || "").trim();

  if (!raw) return fallback;
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
  if (raw.startsWith("data:image/")) return raw;

  const cleaned = raw.replace(/\s/g, "");
  const looksLikeBase64 =
    cleaned.length > 20 &&
    /^[A-Za-z0-9+/=]+$/.test(cleaned) &&
    !cleaned.includes("{") &&
    !cleaned.includes("}");

  if (!looksLikeBase64) return fallback;

  return `data:image/png;base64,${cleaned}`;
};

const formatMoney = (value) => {
  const amount = Number(value || 0);

  return `$${amount.toLocaleString(undefined, {
    minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
};

const formatDateTime = (value) => {
  if (!value) return "--";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";

  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getCountdown = (endDate) => {
  if (!endDate) return "0d : 0h : 0m : 0s";

  const now = new Date().getTime();
  const end = new Date(endDate).getTime();

  if (Number.isNaN(end)) return "0d : 0h : 0m : 0s";

  const diff = Math.max(end - now, 0);

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / (1000 * 60)) % 60);
  const seconds = Math.floor((diff / 1000) % 60);

  return `${days}d : ${hours}h : ${minutes}m : ${seconds}s`;
};

const normalizeAuctionResponse = (payload) => {
  const root = payload?.data?.data || payload?.data || payload;
  const items = Array.isArray(root?.items) ? root.items : [];
  const firstItem = items[0] || {};
  const images = [];

  if (Array.isArray(firstItem?.images)) {
    firstItem.images.forEach((img) => {
      if (typeof img === "string") {
        images.push(getImageSrc(img));
      } else {
        images.push(getImageSrc(img?.image || img?.imageBase64 || img?.url));
      }
    });
  }

  if (Array.isArray(root?.images)) {
    root.images.forEach((img) => {
      if (typeof img === "string") {
        images.push(getImageSrc(img));
      } else {
        images.push(getImageSrc(img?.image || img?.imageBase64 || img?.url));
      }
    });
  }

  if (root?.image || root?.imageBase64) {
    images.unshift(getImageSrc(root?.image || root?.imageBase64));
  }

  const uniqueImages = [...new Set(images.filter(Boolean))];

  if (!uniqueImages.length) {
    uniqueImages.push(FALLBACK_IMAGE);
  }

  return {
    id: Number(root?.id || root?.auctionId || 0),
    title: root?.title || firstItem?.title || "Auction",
    description: root?.description || firstItem?.description || "",
    startDate: root?.startDate || "",
    endDate: root?.endDate || "",
    currentPrice: Number(root?.currentPrice || root?.price || 0),
    totalBids: Number(root?.totalBids || 0),
    securityDeposit: Number(root?.securityDeposit || 0),
    bidIncrement: Number(root?.bidIncrement || 0),
    sellerId: root?.sellerId || "",
    storeName: root?.storeName || "Seller",
    storeLogo: root?.storeLogo ? getImageSrc(root.storeLogo, "") : "",
    items,
    mainImage: uniqueImages[0],
    images: uniqueImages,
  };
};

export default function AuctionDetails() {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === "ar";
  const location = useLocation();
  const navigate = useNavigate();

  const params = new URLSearchParams(location.search);
  const auctionId = params.get("auctionId") || params.get("id");

  const [auction, setAuction] = useState(null);
  const [selectedImage, setSelectedImage] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [countdown, setCountdown] = useState("0d : 0h : 0m : 0s");

  const [depositPopup, setDepositPopup] = useState(false);
  const [processingPopup, setProcessingPopup] = useState(false);
  const [successPopup, setSuccessPopup] = useState(false);
  const [failedPopup, setFailedPopup] = useState(false);

  const [bidPopup, setBidPopup] = useState(false);
  const [proxyPopup, setProxyPopup] = useState(false);

  const [manualBidAmount, setManualBidAmount] = useState("");
  const [proxyMax, setProxyMax] = useState("");
  const [proxyStep, setProxyStep] = useState("");

  const [actionLoading, setActionLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState("");

  const popupTimerRef = useRef(null);

  useEffect(() => {
    document.title = t("auctionDetailsDocTitle", "Auction Details");

    const link = document.querySelector("link[rel~='icon']");
    if (link) link.href = icon;
  }, [t]);

  const loadAuction = async () => {
    try {
      setLoading(true);
      setError("");

      if (!auctionId) {
        throw new Error("Auction ID is missing.");
      }

      const numericAuctionId = Number(auctionId);

      if (!numericAuctionId) {
        throw new Error("Invalid auction ID.");
      }

      const res = await api.get(`/Auction/User-Auction-View/${numericAuctionId}`);

      const normalized = normalizeAuctionResponse(res?.data);
      setAuction(normalized);
      setSelectedImage(normalized.mainImage);
      setCountdown(getCountdown(normalized.endDate));
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.response?.data?.Message ||
          err?.message ||
          "Failed to load auction details."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAuction();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auctionId]);

  useEffect(() => {
    if (!auction?.endDate) return;

    const timer = setInterval(() => {
      setCountdown(getCountdown(auction.endDate));
    }, 1000);

    return () => clearInterval(timer);
  }, [auction?.endDate]);

  const firstItem = useMemo(() => auction?.items?.[0] || null, [auction]);

const goToSellerReviews = () => {
  if (!auction?.sellerId) return;

  const realAuctionId = Number(auctionId || auction.id || 0);

  navigate(`/seller-review?sellerId=${auction.sellerId}&auctionId=${realAuctionId}`);
};

  const closeAllPopups = () => {
    setDepositPopup(false);
    setProcessingPopup(false);
    setSuccessPopup(false);
    setFailedPopup(false);
    setBidPopup(false);
    setProxyPopup(false);
    setActionMessage("");

    if (popupTimerRef.current) {
      clearTimeout(popupTimerRef.current);
      popupTimerRef.current = null;
    }
  };

  const checkDeposit = async () => {
    try {
      setActionLoading(true);
      setActionMessage("");

      const res = await api.post(`/Auction/check-deposit/${auction.id}`);
      const ok = Boolean(res?.data?.isSuccess ?? res?.data?.auth?.isSuccess);

      if (!ok) {
        setActionMessage(
          res?.data?.message ||
            res?.data?.auth?.message ||
            "Insufficient balance for security deposit."
        );
        return false;
      }

      return true;
    } catch (err) {
      setActionMessage(
        err?.response?.data?.message ||
          err?.response?.data?.Message ||
          err?.message ||
          "Failed to check deposit."
      );
      return false;
    } finally {
      setActionLoading(false);
    }
  };

  const openDepositFlow = () => {
    setActionMessage("");
    setDepositPopup(true);
  };

  const payDeposit = async () => {
    setDepositPopup(false);
    setProcessingPopup(true);

    popupTimerRef.current = setTimeout(() => {
      setProcessingPopup(false);
      setSuccessPopup(true);

      popupTimerRef.current = setTimeout(() => {
        setSuccessPopup(false);
        setBidPopup(true);
      }, 1200);
    }, 1300);
  };

  const sendManualBid = async () => {
    try {
      setActionLoading(true);
      setActionMessage("");

      const amount = Number(manualBidAmount || 0);

      if (!amount || amount <= 0) {
        throw new Error("Please enter a valid bid amount.");
      }

      await api.post("/Bid/manual", {
        auctionId: auction.id,
        amount,
      });

      setBidPopup(false);
      setManualBidAmount("");
      setSuccessPopup(true);

      popupTimerRef.current = setTimeout(() => {
        setSuccessPopup(false);
        loadAuction();
      }, 1200);
    } catch (err) {
      setActionMessage(
        err?.response?.data?.message ||
          err?.response?.data?.Message ||
          err?.message ||
          "Failed to place bid."
      );
    } finally {
      setActionLoading(false);
    }
  };

  const createProxy = async () => {
    try {
      setActionLoading(true);
      setActionMessage("");

      const max = Number(proxyMax || 0);
      const step = Number(proxyStep || 0);

      if (!max || max <= 0) {
        throw new Error("Please enter proxy max amount.");
      }

      if (!step || step <= 0) {
        throw new Error("Please enter proxy step.");
      }

      await api.post("/Bid/create-Proxy", {
        auctionId: auction.id,
        max,
        step,
      });

      await api.post(`/Bid/activate/${auction.id}`);

      setProxyPopup(false);
      setProxyMax("");
      setProxyStep("");
      setSuccessPopup(true);

      popupTimerRef.current = setTimeout(() => {
        setSuccessPopup(false);
        loadAuction();
      }, 1200);
    } catch (err) {
      setActionMessage(
        err?.response?.data?.message ||
          err?.response?.data?.Message ||
          err?.message ||
          "Failed to create proxy bid."
      );
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="auction-details-page">
        <style>{`
          .auction-details-page {
            min-height: 100vh;
            background: #f5f7fb;
            padding: 34px 18px 70px;
            font-family: Arial, Helvetica, sans-serif;
          }

          .auction-details-card-shell {
            width: 90%;
            max-width: 1250px;
            margin: 0 auto;
            background: #fff;
            border-radius: 22px;
            padding: 28px;
            box-shadow: 0 14px 40px rgba(15, 23, 42, 0.08);
            color: #063b78;
            font-weight: 900;
          }
        `}</style>

        <div className="auction-details-card-shell">Loading auction details...</div>
      </div>
    );
  }

  if (error || !auction) {
    return (
      <div className="auction-details-page">
        <style>{`
          .auction-details-page {
            min-height: 100vh;
            background: #f5f7fb;
            padding: 34px 18px 70px;
            font-family: Arial, Helvetica, sans-serif;
          }

          .auction-details-card-shell {
            width: 90%;
            max-width: 1250px;
            margin: 0 auto;
            background: #fff;
            border-radius: 22px;
            padding: 28px;
            box-shadow: 0 14px 40px rgba(15, 23, 42, 0.08);
            color: #dc2626;
            font-weight: 900;
          }
        `}</style>

        <div className="auction-details-card-shell">{error || "Auction not found."}</div>
      </div>
    );
  }

  return (
    <div className="auction-details-page" dir={isArabic ? "rtl" : "ltr"}>
      <style>{`
        .auction-details-page {
          min-height: 100vh;
          background: #f5f7fb;
          padding: 34px 18px 70px;
          font-family: Arial, Helvetica, sans-serif;
          box-sizing: border-box;
        }

        .auction-details-page * {
          box-sizing: border-box;
        }

        .auction-details-card-shell {
          width: 90%;
          max-width: 1250px;
          margin: 0 auto;
          background: #ffffff;
          border-radius: 24px;
          padding: 24px;
          box-shadow: 0 18px 48px rgba(15, 23, 42, 0.08);
          border: 1px solid #edf1f6;
        }

        .auction-details-header {
          display: flex;
          align-items: center;
          justify-content: flex-start;
          margin-bottom: 18px;
        }

        .auction-details-lot {
          color: #063b78;
          font-weight: 900;
          font-size: 18px;
        }

        .auction-image-card {
          background: #ffffff;
          border: 1px solid #edf1f6;
          border-radius: 20px;
          overflow: hidden;
          margin-bottom: 18px;
        }

        .auction-image-main {
          height: 500px;
          background: #e5e7eb;
          position: relative;
        }

        .auction-image-main img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .auction-photo-count {
          position: absolute;
          left: 18px;
          bottom: 18px;
          background: rgba(0, 0, 0, 0.78);
          color: #fff;
          padding: 8px 14px;
          border-radius: 999px;
          font-size: 13px;
          font-weight: 900;
        }

        .auction-thumbs {
          display: flex;
          gap: 10px;
          padding: 16px;
          overflow-x: auto;
          background: #fff;
        }

        .auction-thumb {
          width: 110px;
          height: 78px;
          border-radius: 10px;
          border: 2px solid transparent;
          overflow: hidden;
          padding: 0;
          cursor: pointer;
          background: #f1f5f9;
          flex: 0 0 auto;
        }

        .auction-thumb.active {
          border-color: #063b78;
        }

        .auction-thumb img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .auction-info-panel {
          background: #ffffff;
          border: 1px solid #edf1f6;
          border-radius: 20px;
          padding: 24px;
        }

        .auction-title-row {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 18px;
        }

        .auction-title {
          margin: 0;
          color: #063b78;
          font-size: 30px;
          font-weight: 900;
          line-height: 1.2;
          text-transform: uppercase;
        }

        .auction-count-chip {
          background: #e8f1ff;
          color: #063b78;
          border-radius: 9px;
          padding: 8px 13px;
          font-weight: 900;
          font-size: 13px;
          white-space: nowrap;
        }

        .auction-meta-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 12px;
          margin: 18px 0;
        }

        .auction-meta-item {
          background: #f8fafc;
          border: 1px solid #edf1f6;
          border-radius: 12px;
          padding: 12px;
          min-height: 92px;
        }

        .auction-meta-item i {
          color: #063b78;
          margin-bottom: 8px;
          font-size: 16px;
        }

        .auction-meta-label {
          display: block;
          color: #6b7280;
          font-size: 12px;
          font-weight: 800;
          margin-bottom: 5px;
        }

        .auction-meta-value {
          display: block;
          color: #111827;
          font-size: 13px;
          font-weight: 900;
          line-height: 1.35;
        }

        .auction-section-box {
          background: #f8fafc;
          border: 1px solid #edf1f6;
          border-radius: 15px;
          padding: 15px;
          margin-top: 14px;
        }

        .auction-section-title {
          margin: 0 0 10px;
          color: #111827;
          font-size: 16px;
          font-weight: 900;
        }

        .auction-description {
          margin: 0;
          color: #374151;
          font-size: 14px;
          line-height: 1.8;
          font-weight: 500;
        }

        .auction-list {
          margin: 0;
          padding-left: ${isArabic ? "0" : "18px"};
          padding-right: ${isArabic ? "18px" : "0"};
          color: #374151;
          line-height: 1.8;
          font-size: 14px;
        }

        .auction-seller {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-top: 16px;
          padding: 12px;
          border-radius: 14px;
          transition: 0.2s ease;
        }

        .auction-seller.clickable {
          cursor: pointer;
        }

        .auction-seller-avatar {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          object-fit: cover;
          background: #e8f1ff;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: #063b78;
          font-size: 20px;
          flex-shrink: 0;
        }

        .auction-seller-name {
          margin: 0;
          font-weight: 900;
          color: #063b78;
          font-size: 16px;
        }

        .auction-seller-label {
          margin: 0 0 3px;
          color: #6b7280;
          font-size: 13px;
          font-weight: 800;
        }

        .auction-seller-hint {
          margin: 3px 0 0;
          color: #64748b;
          font-size: 12px;
          font-weight: 700;
        }

        .auction-bid-panel {
          width: 90%;
          margin: 20px auto 0;
          background: #ffffff;
          border: 1px solid #dbe5f1;
          border-radius: 16px;
          padding: 16px;
        }

        .auction-bid-stats {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 12px;
          margin-bottom: 14px;
        }

        .auction-bid-stat {
          text-align: center;
        }

        .auction-bid-stat span {
          display: block;
          color: #6b7280;
          font-size: 12px;
          font-weight: 800;
        }

        .auction-bid-stat strong {
          display: block;
          color: #111827;
          font-size: 16px;
          font-weight: 900;
          margin-top: 5px;
        }

        .auction-primary-btn,
        .auction-secondary-btn {
          width: 90%;
          min-height: 48px;
          border-radius: 11px;
          font-weight: 900;
          cursor: pointer;
          border: none;
          transition: 0.2s ease;
          display: block;
          margin-left: auto;
          margin-right: auto;
        }

        .auction-primary-btn {
          background: #063b78;
          color: #fff;
        }

        .auction-secondary-btn {
          margin-top: 10px;
          background: #e8f1ff;
          color: #063b78;
        }

        .auction-primary-btn:hover {
          background: #052f60;
        }

        .auction-secondary-btn:hover {
          background: #dceaff;
        }

        .auction-primary-btn:disabled,
        .auction-secondary-btn:disabled {
          opacity: 0.65;
          cursor: not-allowed;
        }

        .auction-popup-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.55);
          z-index: 99999;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 18px;
        }

        .auction-popup-box {
          width: min(100%, 430px);
          background: #fff;
          border-radius: 18px;
          box-shadow: 0 25px 70px rgba(0, 0, 0, 0.35);
          padding: 22px;
          position: relative;
        }

        .auction-popup-close {
          position: absolute;
          top: 12px;
          right: ${isArabic ? "auto" : "14px"};
          left: ${isArabic ? "14px" : "auto"};
          border: none;
          background: transparent;
          color: #ef233c;
          font-size: 28px;
          cursor: pointer;
          line-height: 1;
        }

        .auction-popup-title {
          margin: 0 0 12px;
          color: #111827;
          font-size: 18px;
          font-weight: 900;
        }

        .auction-popup-text {
          color: #4b5563;
          font-size: 14px;
          line-height: 1.6;
          margin: 0 0 14px;
        }

        .auction-popup-amount {
          text-align: center;
          margin: 18px 0;
        }

        .auction-popup-amount span {
          display: block;
          color: #6b7280;
          font-size: 13px;
          font-weight: 800;
        }

        .auction-popup-amount strong {
          display: block;
          color: #111827;
          font-size: 26px;
          font-weight: 900;
          margin-top: 4px;
        }

        .auction-popup-input {
          width: 100%;
          height: 46px;
          border-radius: 10px;
          border: 1px solid #cbd5e1;
          padding: 0 14px;
          margin-bottom: 10px;
          font-weight: 700;
          outline: none;
        }

        .auction-popup-error {
          color: #dc2626;
          font-size: 13px;
          font-weight: 800;
          margin: 8px 0;
        }

        .auction-spinner {
          width: 42px;
          height: 42px;
          border: 4px solid #dbeafe;
          border-top-color: #063b78;
          border-radius: 50%;
          animation: auctionSpin 0.8s linear infinite;
          margin: 20px auto;
        }

        @keyframes auctionSpin {
          to {
            transform: rotate(360deg);
          }
        }

        .auction-success-icon,
        .auction-failed-icon {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          color: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 12px auto;
          font-size: 22px;
          font-weight: 900;
        }

        .auction-success-icon {
          background: #22c55e;
        }

        .auction-failed-icon {
          background: #ef4444;
        }

        @media (max-width: 900px) {
          .auction-image-main {
            height: 340px;
          }

          .auction-meta-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .auction-bid-panel,
          .auction-primary-btn,
          .auction-secondary-btn {
            width: 100%;
          }
        }

        @media (max-width: 640px) {
          .auction-details-page {
            padding: 18px 10px 50px;
          }

          .auction-details-card-shell {
            width: 100%;
            padding: 12px;
            border-radius: 18px;
          }

          .auction-title-row {
            flex-direction: column;
          }

          .auction-title {
            font-size: 22px;
          }

          .auction-info-panel {
            padding: 15px;
          }

          .auction-image-main {
            height: 240px;
          }

          .auction-meta-grid {
            grid-template-columns: 1fr;
          }

          .auction-bid-stats {
            grid-template-columns: 1fr;
            text-align: start;
          }
        }
      `}</style>

      <div className="auction-details-card-shell">
        <div className="auction-details-header">
          <div className="auction-details-lot">#{auction.id}</div>
        </div>

        <div className="auction-image-card">
          <div className="auction-image-main">
            <img src={selectedImage || auction.mainImage} alt={auction.title} />
            <span className="auction-photo-count">
              <i className="fa-regular fa-image"></i> {auction.images.length}
            </span>
          </div>

          <div className="auction-thumbs">
            {auction.images.map((img, index) => (
              <button
                type="button"
                className={`auction-thumb ${selectedImage === img ? "active" : ""}`}
                key={`${img}-${index}`}
                onClick={() => setSelectedImage(img)}
              >
                <img src={img} alt={`auction ${index + 1}`} />
              </button>
            ))}
          </div>
        </div>

        <div className="auction-info-panel">
          <div className="auction-title-row">
            <h1 className="auction-title">{auction.title}</h1>
            <span className="auction-count-chip">
              {t("count", "Count")}: {firstItem?.count || auction.items.length || 1}
            </span>
          </div>

          <div className="auction-meta-grid">
            <div className="auction-meta-item">
              <i className="fa-solid fa-gavel"></i>
              <span className="auction-meta-label">{t("bids", "Bids")}</span>
              <span className="auction-meta-value">{auction.totalBids}</span>
            </div>

            <div className="auction-meta-item">
              <i className="fa-regular fa-calendar"></i>
              <span className="auction-meta-label">{t("startsIn", "Starts In")}</span>
              <span className="auction-meta-value">{formatDateTime(auction.startDate)}</span>
            </div>

            <div className="auction-meta-item">
              <i className="fa-regular fa-calendar-xmark"></i>
              <span className="auction-meta-label">{t("endsIn", "Ends In")}</span>
              <span className="auction-meta-value">{formatDateTime(auction.endDate)}</span>
            </div>

            <div className="auction-meta-item">
              <i className="fa-solid fa-clock"></i>
              <span className="auction-meta-label">{t("timeLeft", "Time Left")}</span>
              <span className="auction-meta-value">{countdown}</span>
            </div>
          </div>

          <div className="auction-section-box">
            <h3 className="auction-section-title">{t("description", "Description")}</h3>
            <p className="auction-description">{auction.description || "--"}</p>
          </div>

          {firstItem ? (
            <>
              <div className="auction-section-box">
                <h3 className="auction-section-title">{t("itemDetails", "Item Details")}</h3>
                <ul className="auction-list">
                  <li>
                    <strong>{t("title", "Title")}:</strong> {firstItem.title || "--"}
                  </li>
                  <li>
                    <strong>{t("condition", "Condition")}:</strong> {firstItem.condition || "--"}
                  </li>
                  <li>
                    <strong>{t("warrantyInfo", "Warranty INFO")}:</strong>{" "}
                    {firstItem.warrantyInfo || "--"}
                  </li>
                  <li>
                    <strong>{t("count", "Count")}:</strong> {firstItem.count || "--"}
                  </li>
                </ul>
              </div>

              {Array.isArray(firstItem.attributes) && firstItem.attributes.length > 0 ? (
                <div className="auction-section-box">
                  <h3 className="auction-section-title">{t("attributes", "Attributes")}</h3>
                  <ul className="auction-list">
                    {firstItem.attributes.map((attr) => (
                      <li key={attr.id || `${attr.attributeName}-${attr.value}`}>
                        <strong>{attr.attributeName}:</strong> {attr.value}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </>
          ) : null}

          <div
            className={`auction-seller ${auction.sellerId ? "clickable" : ""}`}
            role="button"
            tabIndex={auction.sellerId ? 0 : -1}
            onClick={goToSellerReviews}
            onKeyDown={(e) => {
              if (e.key === "Enter") goToSellerReviews();
            }}
          >
            {auction.storeLogo ? (
              <img
                src={auction.storeLogo}
                alt={auction.storeName}
                className="auction-seller-avatar"
              />
            ) : (
              <div className="auction-seller-avatar">
                <i className="fa-regular fa-user"></i>
              </div>
            )}

            <div>
              <p className="auction-seller-label">{t("seller", "Seller")}</p>
              <p className="auction-seller-name">{auction.storeName}</p>
              {auction.sellerId ? (
                <p className="auction-seller-hint">
                  {t("viewSellerReviews", "View seller reviews")}
                </p>
              ) : null}
            </div>
          </div>

          <div className="auction-bid-panel">
            <div className="auction-bid-stats">
              <div className="auction-bid-stat">
                <span>{t("bids", "Bids")}</span>
                <strong>{auction.totalBids}</strong>
              </div>

              <div className="auction-bid-stat">
                <span>{t("timeLeft", "Time Left")}</span>
                <strong>{countdown}</strong>
              </div>

              <div className="auction-bid-stat">
                <span>{t("currentPrice", "Current Price")}</span>
                <strong>{formatMoney(auction.currentPrice)}</strong>
              </div>
            </div>

            <button type="button" className="auction-primary-btn" onClick={openDepositFlow}>
              {t("startBidding", "Start Bidding")}
            </button>

            <button
              type="button"
              className="auction-secondary-btn"
              onClick={() => {
                setActionMessage("");
                setProxyPopup(true);
              }}
            >
              {t("proxyBid", "Proxy Bid")}
            </button>
          </div>
        </div>
      </div>

      {depositPopup && (
        <div className="auction-popup-overlay" onClick={closeAllPopups}>
          <div className="auction-popup-box" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="auction-popup-close" onClick={closeAllPopups}>
              ×
            </button>

            <h3 className="auction-popup-title">
              {t("secureYourSpot", "Secure Your Spot, Pay Insurance Now")}
            </h3>

            <p className="auction-popup-text">
              {t(
                "depositPopupText",
                "A refundable security deposit is required to participate in this auction. Once paid, you will instantly gain access to place bids."
              )}
            </p>

            <div className="auction-popup-amount">
              <span>{t("depositAmount", "Deposit amount")}</span>
              <strong>{formatMoney(auction.securityDeposit)}</strong>
            </div>

            {actionMessage ? <p className="auction-popup-error">{actionMessage}</p> : null}

            <button
              type="button"
              className="auction-primary-btn"
              disabled={actionLoading}
              onClick={async () => {
                const ok = await checkDeposit();
                if (ok) payDeposit();
              }}
            >
              {actionLoading ? t("loading", "Loading...") : t("payNow", "Pay now")}
            </button>
          </div>
        </div>
      )}

      {processingPopup && (
        <div className="auction-popup-overlay">
          <div className="auction-popup-box">
            <p
              className="auction-popup-text"
              style={{ textAlign: "center", fontWeight: 900, color: "#063b78" }}
            >
              {t("paymentProcessing", "Payment is processing. You will receive a notification soon")}
            </p>
            <div className="auction-spinner"></div>
          </div>
        </div>
      )}

      {successPopup && (
        <div className="auction-popup-overlay" onClick={closeAllPopups}>
          <div className="auction-popup-box" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="auction-popup-close" onClick={closeAllPopups}>
              ×
            </button>

            <p
              className="auction-popup-text"
              style={{ textAlign: "center", fontWeight: 900, color: "#063b78" }}
            >
              {t("successMessage", "Success! You are now eligible to bid")}
            </p>

            <div className="auction-success-icon">
              <i className="fa-solid fa-check"></i>
            </div>
          </div>
        </div>
      )}

      {failedPopup && (
        <div className="auction-popup-overlay" onClick={closeAllPopups}>
          <div className="auction-popup-box" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="auction-popup-close" onClick={closeAllPopups}>
              ×
            </button>

            <p
              className="auction-popup-text"
              style={{ textAlign: "center", fontWeight: 900, color: "#dc2626" }}
            >
              {t("failedPleaseCheckBalance", "Failed. Please check your balance")}
            </p>

            <div className="auction-failed-icon">
              <i className="fa-solid fa-xmark"></i>
            </div>
          </div>
        </div>
      )}

      {bidPopup && (
        <div className="auction-popup-overlay" onClick={closeAllPopups}>
          <div className="auction-popup-box" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="auction-popup-close" onClick={closeAllPopups}>
              ×
            </button>

            <h3 className="auction-popup-title">{t("placeYourBid", "Place Your Bid")}</h3>

            <input
              type="number"
              className="auction-popup-input"
              placeholder={t("enterBidAmount", "Enter bid amount")}
              value={manualBidAmount}
              onChange={(e) => setManualBidAmount(e.target.value)}
            />

            {actionMessage ? <p className="auction-popup-error">{actionMessage}</p> : null}

            <button
              type="button"
              className="auction-primary-btn"
              disabled={actionLoading}
              onClick={sendManualBid}
            >
              {actionLoading ? t("loading", "Loading...") : t("submitBid", "Submit Bid")}
            </button>
          </div>
        </div>
      )}

      {proxyPopup && (
        <div className="auction-popup-overlay" onClick={closeAllPopups}>
          <div className="auction-popup-box" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="auction-popup-close" onClick={closeAllPopups}>
              ×
            </button>

            <h3 className="auction-popup-title">{t("proxyBid", "Proxy Bid")}</h3>

            <input
              type="number"
              className="auction-popup-input"
              placeholder={t("maxAmount", "Max amount")}
              value={proxyMax}
              onChange={(e) => setProxyMax(e.target.value)}
            />

            <input
              type="number"
              className="auction-popup-input"
              placeholder={t("stepAmount", "Step amount")}
              value={proxyStep}
              onChange={(e) => setProxyStep(e.target.value)}
            />

            {actionMessage ? <p className="auction-popup-error">{actionMessage}</p> : null}

            <button
              type="button"
              className="auction-primary-btn"
              disabled={actionLoading}
              onClick={createProxy}
            >
              {actionLoading ? t("loading", "Loading...") : t("createProxy", "Create Proxy")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}