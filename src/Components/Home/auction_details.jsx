import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

import icon from "../../assets/2.png";
import api from "../../API/axios";
import {
  placeManualBid,
  activateProxyBid,
  deactivateProxyBid,
  createProxyBid,
  updateProxyBid,
} from "../../API/bid";

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

const toImageSrc = (value, fallback = "") => {
  const raw = String(value || "").trim();
  if (!raw) return fallback;
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
  if (raw.startsWith("data:image/")) return raw;
  const cleaned = raw.replace(/\s/g, "");
  const ok = cleaned.length > 20 && /^[A-Za-z0-9+/=]+$/.test(cleaned) && !cleaned.includes("{");
  if (!ok) return fallback;
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
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
};

const formatDate = (value) => {
  if (!value) return "--";
  const d = new Date(value);
  if (isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
};

const getCountdown = (endDate) => {
  if (!endDate) return "0d : 0h : 0m : 0s";
  const now = new Date().getTime();
  const end = new Date(endDate).getTime();
  if (Number.isNaN(end)) return "0d : 0h : 0m : 0s";
  const diff = Math.max(end - now, 0);
  const days    = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours   = Math.floor((diff / (1000 * 60 * 60)) % 24);
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
      images.push(typeof img === "string" ? getImageSrc(img) : getImageSrc(img?.image || img?.imageBase64 || img?.url));
    });
  }
  if (Array.isArray(root?.images)) {
    root.images.forEach((img) => {
      images.push(typeof img === "string" ? getImageSrc(img) : getImageSrc(img?.image || img?.imageBase64 || img?.url));
    });
  }
  if (root?.image || root?.imageBase64) {
    images.unshift(getImageSrc(root?.image || root?.imageBase64));
  }
  const uniqueImages = [...new Set(images.filter(Boolean))];
  if (!uniqueImages.length) uniqueImages.push(FALLBACK_IMAGE);
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
    sellerId: root?.sellerId || root?.SellerId || "",
    storeName: root?.storeName || "Seller",
    storeLogo: root?.storeLogo ? getImageSrc(root.storeLogo, "") : "",
    items,
    mainImage: uniqueImages[0],
    images: uniqueImages,
  };
};

const normalizeSeller = (data) => {
  const d = data?.data || data || {};
  return {
    userId:      d.userId      || d.UserId      || "",
    sellerId:    d.sellerId    || d.SellerId    || d.id || "",
    storeName:   d.storeName   || d.StoreName   || d.name || "Store",
    description: d.description || d.Description || "",
    city:        d.city        || d.City        || "",
    country:     d.country     || d.Country     || "",
    phone:       d.phone       || d.Phone       || "",
    email:       d.email       || d.Email       || "",
    logo:        toImageSrc(d.logo || d.Logo || d.storeLogo || d.image || ""),
    rating:      Number(d.rating    || d.Rating    || 0),
    followers:   Number(d.followers || d.Followers || d.followersCount || 0),
    auctions:    Number(d.auctions  || d.Auctions  || d.auctionsCount  || 0),
    isFollowing: Boolean(d.isFollowing || d.IsFollowing || false),
    verificationStatus: d.verificationStatus || d.VerificationStatus || "",
  };
};

const normalizeReviews = (data) => {
  const list = Array.isArray(data) ? data
    : Array.isArray(data?.data) ? data.data
    : Array.isArray(data?.reviews) ? data.reviews
    : [];
  return list.map((r) => ({
    id:           r.id           || r.reviewId   || Math.random(),
    buyerName:    r.buyerName    || r.BuyerName   || r.userName || "Buyer",
    buyerImage:   toImageSrc(r.buyerImage || r.BuyerImage || r.userImage || ""),
    sellerRate:   Number(r.sellerRate   || r.SellerRate   || r.rating || 0),
    deliveryRate: Number(r.deliveryRate || r.DeliveryRate || 0),
    comment:      r.comment || r.Comment || r.review || "",
    createdAt:    r.createdAt || r.CreatedAt || "",
  }));
};

const getProxyStorageKey = (auctionId) => `proxy_bid_${auctionId}`;
const readSavedProxy = (auctionId) => {
  try {
    const raw = localStorage.getItem(getProxyStorageKey(auctionId));
    const parsed = JSON.parse(raw || "{}");
    return { exists: Boolean(parsed?.exists), max: parsed?.max || "", step: parsed?.step || "" };
  } catch { return { exists: false, max: "", step: "" }; }
};
const saveProxy = (auctionId, data) => {
  localStorage.setItem(getProxyStorageKey(auctionId), JSON.stringify({
    exists: true, max: String(data.max || ""), step: String(data.step || ""),
  }));
};
const clearProxy = (auctionId) => { localStorage.removeItem(getProxyStorageKey(auctionId)); };

const isDarkMode = () => {
  const html = document.documentElement;
  return (
    html.getAttribute("data-theme") === "dark" ||
    html.classList.contains("dark") ||
    document.body.classList.contains("dark") ||
    document.body.getAttribute("data-theme") === "dark"
  );
};

// ─── MINI-COMPONENTS ──────────────────────────────────────────────────────────

const PopupOverlay = ({ onClick, children, zIndex = 99999 }) => (
  <div onClick={onClick} style={{
    position: "fixed", inset: 0, background: "rgba(0,0,0,0.72)",
    zIndex, display: "flex", alignItems: "center", justifyContent: "center", padding: 18,
  }}>
    {children}
  </div>
);

const PopupBox = ({ onClick, children, D, style = {} }) => (
  <div onClick={(e) => e.stopPropagation()} style={{
    width: "min(100%, 430px)", background: D.card, borderRadius: 18,
    boxShadow: D.popupShadow, padding: 22, position: "relative",
    border: `1px solid ${D.border}`, ...style,
  }}>
    {children}
  </div>
);

const PopupClose = ({ onClick, isArabic }) => (
  <button type="button" onClick={onClick} style={{
    position: "absolute", top: 12,
    [isArabic ? "left" : "right"]: 14,
    border: "none", background: "transparent", color: "#ef233c",
    fontSize: 28, cursor: "pointer", lineHeight: 1,
  }}>×</button>
);

const PopupTitle = ({ children, D }) => (
  <h3 style={{ margin: "0 0 12px", color: D.text, fontSize: 18, fontWeight: 900 }}>{children}</h3>
);

const PopupText = ({ children, D, style = {} }) => (
  <p style={{ color: D.textSoft, fontSize: 14, lineHeight: 1.6, margin: "0 0 14px", ...style }}>{children}</p>
);

const PopupInput = ({ value, onChange, placeholder, type = "number", D }) => (
  <input
    type={type}
    placeholder={placeholder}
    value={value}
    onChange={onChange}
    style={{
      width: "100%", height: 46, borderRadius: 10, border: `1px solid ${D.inputBorder}`,
      padding: "0 14px", marginBottom: 10, fontWeight: 700, outline: "none",
      background: D.inputBg, color: D.inputColor, fontSize: 14,
    }}
  />
);

const PopupError = ({ children }) => (
  <p style={{ color: "#dc2626", fontSize: 13, fontWeight: 800, margin: "8px 0", textAlign: "center" }}>{children}</p>
);

const PrimaryBtn = ({ onClick, disabled, children, style = {} }) => (
  <button type="button" onClick={onClick} disabled={disabled}
    style={{
      width: "90%", display: "block", margin: "0 auto", minHeight: 48,
      borderRadius: 11, fontWeight: 900, cursor: disabled ? "not-allowed" : "pointer",
      border: "none", background: "#023E8A", color: "#fff",
      opacity: disabled ? 0.65 : 1, transition: "0.2s ease", fontSize: 14, ...style,
    }}>{children}</button>
);

const SecondaryBtn = ({ onClick, disabled, children, dark }) => (
  <button type="button" onClick={onClick} disabled={disabled}
    style={{
      width: "90%", display: "block", margin: "10px auto 0", minHeight: 48,
      borderRadius: 11, fontWeight: 900, cursor: disabled ? "not-allowed" : "pointer",
      border: "none", background: dark ? "#1e293b" : "#e8f1ff", color: "#023E8A",
      opacity: disabled ? 0.65 : 1, transition: "0.2s ease", fontSize: 14,
    }}>{children}</button>
);

const DangerBtn = ({ onClick, disabled, children, dark }) => (
  <button type="button" onClick={onClick} disabled={disabled}
    style={{
      width: "90%", display: "block", margin: "10px auto 0", minHeight: 48,
      borderRadius: 11, fontWeight: 900, cursor: disabled ? "not-allowed" : "pointer",
      border: "none", background: dark ? "#2d1010" : "#fee2e2", color: dark ? "#f87171" : "#b91c1c",
      opacity: disabled ? 0.65 : 1, transition: "0.2s ease", fontSize: 14,
    }}>{children}</button>
);

const StarRow = ({ value, onChange, readonly = false, size = 28, dark }) => (
  <div style={{ display: "flex", gap: 4 }}>
    {[1, 2, 3, 4, 5].map((n) => (
      <button key={n} type="button" onClick={() => !readonly && onChange && onChange(n)}
        style={{
          border: "none", background: "transparent", padding: 0,
          cursor: readonly ? "default" : "pointer",
          fontSize: size, lineHeight: 1,
          color: n <= value ? "#f59e0b" : dark ? "#475569" : "#d1d5db",
          transition: "color 0.15s",
        }}>★</button>
    ))}
  </div>
);

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

export default function AuctionDetails() {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === "ar";
  const location = useLocation();
  const navigate = useNavigate();

  const params = new URLSearchParams(location.search);
  const auctionId = params.get("auctionId") || params.get("id");

  const [dark, setDark] = useState(isDarkMode());

  useEffect(() => {
    const observer = new MutationObserver(() => setDark(isDarkMode()));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme", "class"] });
    observer.observe(document.body, { attributes: true, attributeFilter: ["data-theme", "class"] });
    return () => observer.disconnect();
  }, []);

  const [auction, setAuction]             = useState(null);
  const [selectedImage, setSelectedImage] = useState("");
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState("");
  const [countdown, setCountdown]         = useState("0d : 0h : 0m : 0s");

  // ↓ CHANGED: favorite state for this auction
  const [isFav, setIsFav]         = useState(false);
  const [favLoading, setFavLoading] = useState(false);

  const [depositPopup,    setDepositPopup]    = useState(false);
  const [processingPopup, setProcessingPopup] = useState(false);
  const [successPopup,    setSuccessPopup]    = useState(false);
  const [bidPopup,        setBidPopup]        = useState(false);
  const [proxyPopup,      setProxyPopup]      = useState(false);

  const [reportPopup,   setReportPopup]   = useState(false);
  const [reportReason,  setReportReason]  = useState("");
  const [reportLoading, setReportLoading] = useState(false);
  const [reportMessage, setReportMessage] = useState("");
  const [reportSuccess, setReportSuccess] = useState(false);

  const [sellerPopup,   setSellerPopup]   = useState(false);
  const [sellerData,    setSellerData]    = useState(null);
  const [sellerReviews, setSellerReviews] = useState([]);
  const [sellerLoading, setSellerLoading] = useState(false);
  const [sellerError,   setSellerError]   = useState("");
  const [isFollowing,   setIsFollowing]   = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [reviewPopup,   setReviewPopup]   = useState(false);
  const [sellerRate,    setSellerRate]    = useState(0);
  const [deliveryRate,  setDeliveryRate]  = useState(0);
  const [reviewText,    setReviewText]    = useState("");
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewError,   setReviewError]   = useState("");
  const [reviewSuccess, setReviewSuccess] = useState(false);

  const [manualBidAmount, setManualBidAmount] = useState("");
  const [proxyMax,        setProxyMax]        = useState("");
  const [proxyStep,       setProxyStep]       = useState("");
  const [proxyExists,     setProxyExists]     = useState(false);
  const [actionLoading,   setActionLoading]   = useState(false);
  const [actionMessage,   setActionMessage]   = useState("");

  const popupTimerRef = useRef(null);

  const D = useMemo(() => ({
    bg:          dark ? "#0c1117" : "#f5f7fb",
    card:        dark ? "#111827" : "#ffffff",
    cardSoft:    dark ? "#1e293b" : "#f8fafc",
    border:      dark ? "#1e293b" : "#edf1f6",
    text:        dark ? "#f1f5f9" : "#111827",
    textSoft:    dark ? "#94a3b8" : "#6b7280",
    metaItem:    dark ? "#1e293b" : "#f8fafc",
    metaBorder:  dark ? "#334155" : "#edf1f6",
    overlay:     "rgba(0,0,0,0.72)",
    popupShadow: dark ? "0 25px 70px rgba(0,0,0,0.7)" : "0 25px 70px rgba(0,0,0,0.35)",
    inputBg:     dark ? "#0f172a" : "#ffffff",
    inputBorder: dark ? "#334155" : "#cbd5e1",
    inputColor:  dark ? "#f1f5f9" : "#111111",
    textarea:    dark ? "#0f172a" : "#ffffff",
    sellerHover: dark ? "#1e293b" : "#f0f7ff",
    bidPanel:    dark ? "#111827" : "#ffffff",
    bidPanelBorder: dark ? "#1e293b" : "#dbe5f1",
    chipBg:      dark ? "#1a2744" : "#e8f1ff",
    chipColor:   dark ? "#7bb3ff" : "#023E8A",
    statsBg:     dark ? "#111827" : "#ffffff",
    statsBorder: dark ? "#1e293b" : "#e5e7eb",
    reviewCard:  dark ? "#1e293b" : "#f8fafc",
    reviewBorder:dark ? "#334155" : "#edf1f6",
    skBg:        dark ? "linear-gradient(90deg,#1e293b 25%,#334155 37%,#1e293b 63%)" : "linear-gradient(90deg,#eceff5 25%,#f7f8fb 37%,#eceff5 63%)",
    errorBg:     dark ? "#2d1010" : "#fff1f0",
    errorColor:  dark ? "#f87171" : "#b91c1c",
    errorBorder: dark ? "#7f1d1d" : "#fca5a5",
  }), [dark]);

  useEffect(() => {
    document.title = t("auctionDetailsDocTitle", "Auction Details");
    const link = document.querySelector("link[rel~='icon']");
    if (link) link.href = icon;
  }, [t]);

  const loadAuction = async () => {
    try {
      setLoading(true); setError("");
      if (!auctionId) throw new Error("Auction ID is missing.");
      const numericAuctionId = Number(auctionId);
      if (!numericAuctionId) throw new Error("Invalid auction ID.");

      const [auctionRes, favsRes] = await Promise.allSettled([
        api.get(`/Auction/User-Auction-View/${numericAuctionId}`),
        api.get("/Auction/favorites"),
      ]);

      if (auctionRes.status === "rejected") throw auctionRes.reason;

      const normalized = normalizeAuctionResponse(auctionRes.value?.data);
      setAuction(normalized);
      setSelectedImage(normalized.mainImage);
      setCountdown(getCountdown(normalized.endDate));
      const savedProxy = readSavedProxy(normalized.id);
      setProxyExists(savedProxy.exists);
      setProxyMax(savedProxy.max);
      setProxyStep(savedProxy.step);

      // ↓ CHANGED: check if this auction is already favorited
      if (favsRes.status === "fulfilled") {
        const raw = favsRes.value?.data;
        const list = Array.isArray(raw) ? raw
          : Array.isArray(raw?.data) ? raw.data
          : Array.isArray(raw?.Data) ? raw.Data
          : [];
        const favSet = new Set(
          list.map((item) => Number(item?.auctionId ?? item?.AuctionId ?? item?.id ?? item?.Id ?? 0))
        );
        setIsFav(favSet.has(numericAuctionId));
      }
    } catch (err) {
      setError(err?.response?.data?.message || err?.response?.data?.Message || err?.message || "Failed to load auction details.");
    } finally { setLoading(false); }
  };

  useEffect(() => { loadAuction(); }, [auctionId]); // eslint-disable-line

  useEffect(() => {
    if (!auction?.endDate) return;
    const timer = setInterval(() => setCountdown(getCountdown(auction.endDate)), 1000);
    return () => clearInterval(timer);
  }, [auction?.endDate]);

  const firstItem = useMemo(() => auction?.items?.[0] || null, [auction]);

  // ↓ CHANGED: toggle favorite for this auction
  const handleToggleFav = async (e) => {
    e.stopPropagation();
    if (favLoading || !auction?.id) return;
    try {
      setFavLoading(true);
      if (isFav) {
        await api.delete(`/User/RemoveFavorite/${auction.id}`);
        setIsFav(false);
      } else {
        await api.post(`/User/add-favorite/${auction.id}`);
        setIsFav(true);
      }
    } catch {
      // silent
    } finally {
      setFavLoading(false);
    }
  };

  const fetchSellerSafe = async (sellerId) => {
    const endpoints = [
      `/seller/seller/${sellerId}`,
      `/Seller/seller/${sellerId}`,
      `/seller/${sellerId}`,
      `/Seller/${sellerId}`,
    ];
    for (const ep of endpoints) {
      try {
        const res = await api.get(ep);
        if (res?.data) return res;
      } catch (err) {
        const status = Number(err?.response?.status || 0);
        if (status === 404 || status === 400) continue;
        throw err;
      }
    }
    throw new Error(t("sellerNotFound", "Seller not found"));
  };

const openSellerPopup = () => {
  const sid = auction?.sellerId;
  if (!sid) return;
  navigate(`/seller-review?sellerId=${sid}&auctionId=${Number(auctionId || auction.id || 0)}`);
};

  const closeSellerPopup = () => {
    if (reviewLoading) return;
    setSellerPopup(false);
    setReviewPopup(false);
    setSellerRate(0); setDeliveryRate(0); setReviewText("");
    setReviewError(""); setReviewSuccess(false);
  };

  const handleFollow = async () => {
    if (!auction?.sellerId || followLoading) return;
    try {
      setFollowLoading(true);
      if (isFollowing) {
        await api.delete(`/User/Unfollow/${auction.sellerId}`);
        setIsFollowing(false);
        setSellerData((prev) => prev ? { ...prev, followers: Math.max(0, prev.followers - 1), isFollowing: false } : prev);
      } else {
        await api.post("/User/Follow", { sellerId: auction.sellerId });
        setIsFollowing(true);
        setSellerData((prev) => prev ? { ...prev, followers: prev.followers + 1, isFollowing: true } : prev);
      }
    } catch (err) {
      alert(err?.response?.data?.message || err?.message || "Action failed.");
    } finally { setFollowLoading(false); }
  };

  const handleSubmitReview = async () => {
    if (!sellerRate)        { setReviewError(t("pleaseSelectSellerRate",   "Please select seller rate.")); return; }
    if (!deliveryRate)      { setReviewError(t("pleaseSelectDeliveryRate", "Please select delivery rate.")); return; }
    if (!reviewText.trim()) { setReviewError(t("pleaseWriteReview", "Please write a review.")); return; }
    try {
      setReviewLoading(true); setReviewError("");
      await api.post("/Review/add", {
        sellerId: auction.sellerId,
        auctionId: Number(auctionId || auction.id || 0) || undefined,
        sellerRate, deliveryRate,
        comment: reviewText.trim(),
      });
      setReviewSuccess(true);
      setSellerRate(0); setDeliveryRate(0); setReviewText("");
      const res = await api.get(`/Review/${auction.sellerId}`).catch(() => ({ data: [] }));
      setSellerReviews(normalizeReviews(res?.data));
      setTimeout(() => { setReviewSuccess(false); setReviewPopup(false); }, 1800);
    } catch (err) {
      setReviewError(err?.response?.data?.message || err?.message || "Failed to submit review.");
    } finally { setReviewLoading(false); }
  };

  const closeAllPopups = () => {
    setDepositPopup(false); setProcessingPopup(false); setSuccessPopup(false);
    setBidPopup(false); setProxyPopup(false); setActionMessage("");
    if (popupTimerRef.current) { clearTimeout(popupTimerRef.current); popupTimerRef.current = null; }
  };

  const closeReportPopup = () => {
    if (reportLoading) return;
    setReportPopup(false); setReportReason(""); setReportMessage(""); setReportSuccess(false);
  };

  const showSuccessThenReload = () => {
    setSuccessPopup(true);
    popupTimerRef.current = setTimeout(() => { setSuccessPopup(false); loadAuction(); }, 1200);
  };

  const isAlreadyDepositedMessage = (value) => {
    const msg = String(value || "").toLowerCase();
    return msg.includes("already") || msg.includes("deposit") || msg.includes("paid") || msg.includes("exist");
  };

  const checkDeposit = async () => {
    try {
      setActionLoading(true); setActionMessage("");
      const res = await api.post(`/Auction/check-deposit/${auction.id}`);
      const data = res?.data || {};
      const ok = Boolean(data?.isSuccess ?? data?.IsSuccess ?? data?.success ?? data?.Success ?? data?.auth?.isSuccess ?? data?.Auth?.IsSuccess ?? false);
      const message = data?.message || data?.Message || data?.auth?.message || data?.Auth?.Message || "";
      if (ok || isAlreadyDepositedMessage(message)) return true;
      setActionMessage(message || "You need to pay the security deposit first.");
      return false;
    } catch (err) {
      const status = Number(err?.response?.status || 0);
      const message = err?.response?.data?.message || err?.response?.data?.Message || err?.message || "";
      if ([400, 409, 500].includes(status) && isAlreadyDepositedMessage(message)) { setActionMessage(""); return true; }
      setActionMessage(message || "You need to pay the security deposit first.");
      return false;
    } finally { setActionLoading(false); }
  };

  const openStartBidding = async () => {
    const ok = await checkDeposit();
    if (ok) { setDepositPopup(false); setActionMessage(""); setBidPopup(true); return; }
    setDepositPopup(true);
  };

  const openProxyFlow = async () => {
    const ok = await checkDeposit();
    if (!ok) { setDepositPopup(true); return; }
    const savedProxy = readSavedProxy(auction.id);
    setProxyExists(savedProxy.exists); setProxyMax(savedProxy.max); setProxyStep(savedProxy.step);
    setActionMessage(""); setProxyPopup(true);
  };

  const payDeposit = async () => {
    const ok = await checkDeposit();
    if (!ok) return;
    setDepositPopup(false); setProcessingPopup(true);
    popupTimerRef.current = setTimeout(() => { setProcessingPopup(false); setBidPopup(true); }, 900);
  };

  const sendManualBid = async () => {
    try {
      setActionLoading(true); setActionMessage("");
      await placeManualBid({ auctionId: auction.id, amount: manualBidAmount });
      setBidPopup(false); setManualBidAmount(""); showSuccessThenReload();
    } catch (err) {
      setActionMessage(err?.response?.data?.message || err?.response?.data?.Message || err?.message || "Failed to place bid.");
    } finally { setActionLoading(false); }
  };

  const saveOrUpdateProxy = async () => {
    try {
      setActionLoading(true); setActionMessage("");
      if (proxyExists) {
        await updateProxyBid({ auctionId: auction.id, max: proxyMax, step: proxyStep });
      } else {
        await createProxyBid({ auctionId: auction.id, max: proxyMax, step: proxyStep });
        await activateProxyBid(auction.id);
      }
      saveProxy(auction.id, { max: proxyMax, step: proxyStep });
      setProxyExists(true); setProxyPopup(false); showSuccessThenReload();
    } catch (err) {
      setActionMessage(err?.response?.data?.message || err?.response?.data?.Message || err?.message || "Failed to save proxy bid.");
    } finally { setActionLoading(false); }
  };

  const deactivateProxy = async () => {
    try {
      setActionLoading(true); setActionMessage("");
      await deactivateProxyBid(auction.id);
      clearProxy(auction.id);
      setProxyExists(false); setProxyMax(""); setProxyStep(""); setProxyPopup(false);
      showSuccessThenReload();
    } catch (err) {
      setActionMessage(err?.response?.data?.message || err?.response?.data?.Message || err?.message || "Failed to deactivate proxy bid.");
    } finally { setActionLoading(false); }
  };

  const submitAuctionReport = async () => {
    if (!reportReason.trim()) {
      setReportMessage(t("reportReasonRequired", "Please describe the issue."));
      return;
    }
    try {
      setReportLoading(true); setReportMessage("");
      await api.post("/Auction/report", { auctionId: auction.id, reason: reportReason.trim() });
      setReportSuccess(true);
      setReportReason("");
      setTimeout(() => { setReportSuccess(false); setReportPopup(false); }, 2000);
    } catch (err) {
      setReportMessage(err?.response?.data?.message || err?.message || t("reportFailed", "Failed to submit report."));
    } finally { setReportLoading(false); }
  };

  const avgRating = sellerReviews.length
    ? (sellerReviews.reduce((s, r) => s + r.sellerRate, 0) / sellerReviews.length).toFixed(1)
    : "—";

  if (loading) return (
    <div style={{ minHeight: "100vh", background: D.bg, padding: "34px 18px", fontFamily: "Arial,sans-serif", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: D.card, borderRadius: 22, padding: 28, color: "#023E8A", fontWeight: 900, boxShadow: "0 14px 40px rgba(15,23,42,0.08)" }}>
        {t("loadingAuction", "Loading auction details...")}
      </div>
    </div>
  );

  if (error || !auction) return (
    <div style={{ minHeight: "100vh", background: D.bg, padding: "34px 18px", fontFamily: "Arial,sans-serif", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: D.card, borderRadius: 22, padding: 28, color: "#dc2626", fontWeight: 900, boxShadow: "0 14px 40px rgba(15,23,42,0.08)" }}>
        {error || t("auctionNotFound", "Auction not found.")}
      </div>
    </div>
  );

  return (
    <div dir={isArabic ? "rtl" : "ltr"} style={{
      minHeight: "100vh", background: D.bg, padding: "34px 18px 70px",
      fontFamily: "Arial, Helvetica, sans-serif", boxSizing: "border-box",
    }}>
      <style>{`
        *{box-sizing:border-box;}
        @keyframes auctionSpin{to{transform:rotate(360deg);}}
        .auction-spinner{width:42px;height:42px;border:4px solid ${dark ? "#1e3a5f" : "#dbeafe"};border-top-color:#023E8A;border-radius:50%;animation:auctionSpin 0.8s linear infinite;margin:20px auto;}
        .auction-success-icon{width:48px;height:48px;border-radius:50%;background:#22c55e;color:#fff;display:flex;align-items:center;justify-content:center;margin:12px auto;font-size:22px;font-weight:900;}
        .sp-btn-spinner{width:16px;height:16px;border:3px solid rgba(255,255,255,0.35);border-top-color:#fff;border-radius:50%;animation:auctionSpin 0.7s linear infinite;display:inline-block;flex-shrink:0;}
        .auction-thumb{width:110px;height:78px;border-radius:10px;border:2px solid transparent;overflow:hidden;padding:0;cursor:pointer;background:${D.metaItem};flex:0 0 auto;}
        .auction-thumb.active{border-color:#023E8A;}
        .auction-thumb img{width:100%;height:100%;object-fit:cover;}

        /* ↓ CHANGED: seller row — NO hover effect */
        .auction-seller-row{display:flex;align-items:center;gap:12px;margin-top:16px;padding:12px;border-radius:14px;cursor:pointer;}

        .sp-follow-btn{display:inline-flex;align-items:center;justify-content:center;gap:7px;border:none;border-radius:10px;font-size:13px;font-weight:900;padding:10px 14px;cursor:pointer;transition:opacity 0.2s,transform 0.15s;white-space:nowrap;background:#023E8A;color:#fff;}
        .sp-follow-btn--active{background:${dark ? "#2d1010" : "#fee2e2"} !important;color:${dark ? "#f87171" : "#b91c1c"} !important;}
        .sp-follow-btn:hover:not(:disabled){opacity:0.88;transform:translateY(-1px);}
        .sp-follow-btn:disabled{opacity:0.6;cursor:not-allowed;}
        .sp-review-btn{display:inline-flex;align-items:center;justify-content:center;gap:7px;border:1px solid ${dark ? "#166534" : "#bbf7d0"};border-radius:10px;font-size:13px;font-weight:900;padding:10px 14px;cursor:pointer;transition:opacity 0.2s,transform 0.15s;white-space:nowrap;background:${dark ? "#052e16" : "#f0fdf4"};color:${dark ? "#4ade80" : "#16a34a"};}
        .sp-review-btn:hover{transform:translateY(-1px);opacity:0.9;}
        .sp-review-card{background:${D.reviewCard};border:1px solid ${D.reviewBorder};border-radius:14px;padding:14px;margin-bottom:12px;}
        .sp-popup-textarea{width:100%;min-height:100px;border-radius:10px;border:1px solid ${D.inputBorder};padding:10px 14px;font-size:14px;font-weight:600;outline:none;resize:vertical;font-family:inherit;background:${D.textarea};color:${D.inputColor};}
        .sp-popup-textarea:focus{border-color:#023E8A;}
        .sp-popup-submit{width:100%;min-height:48px;border:none;border-radius:12px;background:#023E8A;color:#fff;font-size:15px;font-weight:900;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:10px;transition:opacity 0.2s;}
        .sp-popup-submit:hover:not(:disabled){opacity:0.9;}
        .sp-popup-submit:disabled{opacity:0.65;cursor:not-allowed;}
        .sp-chip{display:inline-flex;align-items:center;gap:5px;background:${D.chipBg};color:${D.chipColor};border-radius:999px;padding:4px 10px;font-size:11px;font-weight:700;}
        .sp-verified-badge{position:absolute;bottom:-4px;right:-4px;width:24px;height:24px;border-radius:50%;background:${D.card};display:flex;align-items:center;justify-content:center;font-size:16px;color:#16a34a;}
        .report-popup-textarea{width:100%;min-height:100px;border-radius:10px;border:1px solid ${D.inputBorder};padding:10px 14px;font-size:14px;font-weight:600;outline:none;resize:vertical;font-family:inherit;background:${D.textarea};color:${D.inputColor};margin-bottom:4px;}
        .report-popup-textarea:focus{border-color:#023E8A;}

        /* ↓ CHANGED: fav star button on image */
        .auction-fav-star-btn {
          position: absolute;
          top: 14px;
          right: 14px;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          border: none;
          background: rgba(255,255,255,0.9);
          color: #d97706;
          font-size: 18px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          z-index: 4;
          backdrop-filter: blur(4px);
          box-shadow: 0 2px 10px rgba(0,0,0,0.18);
          transition: background 0.15s, transform 0.15s;
        }
        .auction-fav-star-btn:hover { background: #fef3c7; transform: scale(1.08); }
        .auction-fav-star-btn--active { background: #fef3c7 !important; }
        .auction-fav-star-btn:disabled { opacity: 0.55; cursor: not-allowed; }

        @media(max-width:900px){
          .auction-meta-grid-inner{grid-template-columns:repeat(2,minmax(0,1fr)) !important;}
          .auction-action-btn{width:100% !important;}
        }
        @media(max-width:640px){
          .auction-shell{padding:12px !important;border-radius:18px !important;}
          .auction-title-text{font-size:22px !important;}
          .auction-info-panel-inner{padding:15px !important;}
          .auction-main-image{height:240px !important;}
          .auction-meta-grid-inner{grid-template-columns:1fr !important;}
          .auction-bid-stats-inner{grid-template-columns:1fr !important;text-align:start !important;}
          .sp-hero-row-inner{flex-direction:column !important;align-items:flex-start !important;}
          .sp-hero-actions-inner{flex-direction:row !important;min-width:unset !important;width:100% !important;}
          .sp-follow-btn,.sp-review-btn{flex:1 !important;}
        }
      `}</style>

      {/* Shell */}
      <div className="auction-shell" style={{
        width: "90%", maxWidth: 1250, margin: "0 auto",
        background: D.card, borderRadius: 24, padding: 24,
        boxShadow: `0 18px 48px rgba(15,23,42,${dark ? "0.4" : "0.08"})`,
        border: `1px solid ${D.border}`,
      }}>
        <div style={{ display: "flex", alignItems: "center", marginBottom: 18 }}>
          <span style={{ color: "#023E8A", fontWeight: 900, fontSize: 18 }}>#{auction.id}</span>
        </div>

        {/* Images */}
        <div style={{ background: D.card, border: `1px solid ${D.border}`, borderRadius: 20, overflow: "hidden", marginBottom: 18 }}>
          {/* ↓ CHANGED: added position relative wrapper + fav star button */}
          <div className="auction-main-image" style={{ height: 500, background: D.metaItem, position: "relative" }}>
            <img src={selectedImage || auction.mainImage} alt={auction.title} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
            <span style={{ position: "absolute", left: 18, bottom: 18, background: "rgba(0,0,0,0.78)", color: "#fff", padding: "8px 14px", borderRadius: 999, fontSize: 13, fontWeight: 900 }}>
              <i className="fa-regular fa-image"></i> {auction.images.length}
            </span>

            {/* ↓ CHANGED: star fav button top-right of main image */}
            <button
              type="button"
              className={`auction-fav-star-btn ${isFav ? "auction-fav-star-btn--active" : ""}`}
              onClick={handleToggleFav}
              disabled={favLoading}
              aria-label={isFav ? "Remove from favorites" : "Add to favorites"}
            >
              <i className={isFav ? "fa-solid fa-star" : "fa-regular fa-star"}></i>
            </button>
          </div>

          <div style={{ display: "flex", gap: 10, padding: 16, overflowX: "auto", background: D.card }}>
            {auction.images.map((img, index) => (
              <button type="button" className={`auction-thumb ${selectedImage === img ? "active" : ""}`} key={`${img}-${index}`} onClick={() => setSelectedImage(img)}>
                <img src={img} alt={`auction ${index + 1}`} />
              </button>
            ))}
          </div>
        </div>

        {/* Info Panel */}
        <div className="auction-info-panel-inner" style={{ background: D.card, border: `1px solid ${D.border}`, borderRadius: 20, padding: 24 }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 18 }}>
            <h1 className="auction-title-text" style={{ margin: 0, color: "#023E8A", fontSize: 30, fontWeight: 900, lineHeight: 1.2, textTransform: "uppercase" }}>
              {auction.title}
            </h1>
            <span style={{ background: dark ? "#1e293b" : "#e8f1ff", color: "#023E8A", borderRadius: 9, padding: "8px 13px", fontWeight: 900, fontSize: 13, whiteSpace: "nowrap" }}>
              {t("count", "Count")}: {firstItem?.count || auction.items.length || 1}
            </span>
          </div>

          <div className="auction-meta-grid-inner" style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 12, margin: "18px 0" }}>
            {[
              { icon: "fa-solid fa-gavel",           label: t("bids", "Bids"),           value: auction.totalBids },
              { icon: "fa-regular fa-calendar",       label: t("startsIn", "Starts In"),  value: formatDateTime(auction.startDate) },
              { icon: "fa-regular fa-calendar-xmark", label: t("endsIn", "Ends In"),      value: formatDateTime(auction.endDate) },
              { icon: "fa-solid fa-clock",            label: t("timeLeft", "Time Left"),  value: countdown },
            ].map(({ icon, label, value }) => (
              <div key={label} style={{ background: D.metaItem, border: `1px solid ${D.metaBorder}`, borderRadius: 12, padding: 12, minHeight: 92 }}>
                <i className={icon} style={{ color: "#023E8A", marginBottom: 8, fontSize: 16 }}></i>
                <span style={{ display: "block", color: D.textSoft, fontSize: 12, fontWeight: 800, marginBottom: 5 }}>{label}</span>
                <span style={{ display: "block", color: D.text, fontSize: 13, fontWeight: 900, lineHeight: 1.35 }}>{value}</span>
              </div>
            ))}
          </div>

          <div style={{ background: D.metaItem, border: `1px solid ${D.metaBorder}`, borderRadius: 15, padding: 15, marginTop: 14 }}>
            <h3 style={{ margin: "0 0 10px", color: D.text, fontSize: 16, fontWeight: 900 }}>{t("description", "Description")}</h3>
            <p style={{ margin: 0, color: D.textSoft, fontSize: 14, lineHeight: 1.8, fontWeight: 500 }}>{auction.description || "--"}</p>
          </div>

          {firstItem ? (
            <>
              <div style={{ background: D.metaItem, border: `1px solid ${D.metaBorder}`, borderRadius: 15, padding: 15, marginTop: 14 }}>
                <h3 style={{ margin: "0 0 10px", color: D.text, fontSize: 16, fontWeight: 900 }}>{t("itemDetails", "Item Details")}</h3>
                <ul style={{ margin: 0, paddingLeft: isArabic ? 0 : 18, paddingRight: isArabic ? 18 : 0, color: D.textSoft, lineHeight: 1.8, fontSize: 14 }}>
                  <li><strong style={{ color: D.text }}>{t("title", "Title")}:</strong> {firstItem.title || "--"}</li>
                  <li><strong style={{ color: D.text }}>{t("condition", "Condition")}:</strong> {firstItem.condition || "--"}</li>
                  <li><strong style={{ color: D.text }}>{t("warrantyInfo", "Warranty INFO")}:</strong> {firstItem.warrantyInfo || "--"}</li>
                  <li><strong style={{ color: D.text }}>{t("count", "Count")}:</strong> {firstItem.count || "--"}</li>
                </ul>
              </div>
              {Array.isArray(firstItem.attributes) && firstItem.attributes.length > 0 ? (
                <div style={{ background: D.metaItem, border: `1px solid ${D.metaBorder}`, borderRadius: 15, padding: 15, marginTop: 14 }}>
                  <h3 style={{ margin: "0 0 10px", color: D.text, fontSize: 16, fontWeight: 900 }}>{t("attributes", "Attributes")}</h3>
                  <ul style={{ margin: 0, paddingLeft: isArabic ? 0 : 18, paddingRight: isArabic ? 18 : 0, color: D.textSoft, lineHeight: 1.8, fontSize: 14 }}>
                    {firstItem.attributes.map((attr) => (
                      <li key={attr.id || `${attr.attributeName}-${attr.value}`}>
                        <strong style={{ color: D.text }}>{attr.attributeName}:</strong> {attr.value}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </>
          ) : null}

          {/* ↓ CHANGED: seller row — cursor pointer but NO hover background effect */}
          <div
            className="auction-seller-row"
            role="button"
            tabIndex={auction.sellerId ? 0 : -1}
            onClick={openSellerPopup}
            onKeyDown={(e) => { if (e.key === "Enter") openSellerPopup(); }}
          >
            {auction.storeLogo ? (
              <img src={auction.storeLogo} alt={auction.storeName} style={{ width: 48, height: 48, borderRadius: "50%", objectFit: "cover", background: dark ? "#1e293b" : "#e8f1ff", flexShrink: 0 }} />
            ) : (
              <div style={{ width: 48, height: 48, borderRadius: "50%", background: dark ? "#1e293b" : "#e8f1ff", display: "inline-flex", alignItems: "center", justifyContent: "center", color: "#023E8A", fontSize: 20, flexShrink: 0 }}>
                <i className="fa-regular fa-user"></i>
              </div>
            )}
            <div>
              <p style={{ margin: "0 0 3px", color: D.textSoft, fontSize: 13, fontWeight: 800 }}>{t("seller", "Seller")}</p>
              <p style={{ margin: 0, fontWeight: 900, color: "#023E8A", fontSize: 16 }}>{auction.storeName}</p>
              {auction.sellerId ? <p style={{ margin: "3px 0 0", color: D.textSoft, fontSize: 12, fontWeight: 700 }}>{t("viewSellerProfile", "View seller profile & reviews")}</p> : null}
            </div>
            {auction.sellerId ? <i className="fa-solid fa-chevron-right" style={{ marginLeft: "auto", color: D.textSoft, fontSize: 14 }}></i> : null}
          </div>

          {/* Bid Panel */}
          <div style={{ background: D.bidPanel, border: `1px solid ${D.bidPanelBorder}`, borderRadius: 16, padding: 16, marginTop: 20, width: "90%", margin: "20px auto 0" }}>
            <div className="auction-bid-stats-inner" style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 12, marginBottom: 14 }}>
              {[
                { label: t("bids", "Bids"), value: auction.totalBids },
                { label: t("timeLeft", "Time Left"), value: countdown },
                { label: t("currentPrice", "Current Price"), value: formatMoney(auction.currentPrice) },
              ].map(({ label, value }) => (
                <div key={label} style={{ textAlign: "center" }}>
                  <span style={{ display: "block", color: D.textSoft, fontSize: 12, fontWeight: 800 }}>{label}</span>
                  <strong style={{ display: "block", color: "#023E8A", fontSize: 16, fontWeight: 900, marginTop: 5 }}>{value}</strong>
                </div>
              ))}
            </div>
            <PrimaryBtn onClick={openStartBidding} disabled={actionLoading}>
              {actionLoading ? t("loading", "Loading...") : t("startBidding", "Start Bidding")}
            </PrimaryBtn>
            <SecondaryBtn onClick={openProxyFlow} disabled={actionLoading} dark={dark}>
              {actionLoading ? t("loading", "Loading...") : t("proxyBid", "Proxy Bid")}
            </SecondaryBtn>
            <DangerBtn disabled={actionLoading} dark={dark} onClick={() => { setReportPopup(true); setReportMessage(""); setReportSuccess(false); setReportReason(""); }}>
              {t("report", "Report")}
            </DangerBtn>
            {actionMessage ? <PopupError>{actionMessage}</PopupError> : null}
          </div>
        </div>
      </div>

      {/* Deposit Popup */}
      {depositPopup && (
        <PopupOverlay onClick={closeAllPopups}>
          <PopupBox D={D}>
            <PopupClose onClick={closeAllPopups} isArabic={isArabic} />
            <PopupTitle D={D}>{t("depositRequired", "Deposit Required")}</PopupTitle>
            <PopupText D={D}>{t("depositRequiredText", "You need to pay the refundable security deposit before bidding.")}</PopupText>
            <div style={{ textAlign: "center", margin: "18px 0" }}>
              <span style={{ display: "block", color: D.textSoft, fontSize: 13, fontWeight: 800 }}>{t("depositAmount", "Deposit amount")}</span>
              <strong style={{ display: "block", color: D.text, fontSize: 26, fontWeight: 900, marginTop: 4 }}>{formatMoney(auction.securityDeposit)}</strong>
            </div>
            {actionMessage ? <PopupError>{actionMessage}</PopupError> : null}
            <PrimaryBtn onClick={payDeposit} disabled={actionLoading}>
              {actionLoading ? t("loading", "Loading...") : t("checkDeposit", "Check Deposit")}
            </PrimaryBtn>
          </PopupBox>
        </PopupOverlay>
      )}

      {/* Processing Popup */}
      {processingPopup && (
        <PopupOverlay onClick={null}>
          <PopupBox D={D}>
            <p style={{ textAlign: "center", fontWeight: 900, color: "#023E8A" }}>{t("processing", "Processing...")}</p>
            <div className="auction-spinner"></div>
          </PopupBox>
        </PopupOverlay>
      )}

      {/* Success Popup */}
      {successPopup && (
        <PopupOverlay onClick={closeAllPopups}>
          <PopupBox D={D}>
            <PopupClose onClick={closeAllPopups} isArabic={isArabic} />
            <p style={{ textAlign: "center", fontWeight: 900, color: "#023E8A" }}>{t("successMessage", "Success! Action completed successfully.")}</p>
            <div className="auction-success-icon"><i className="fa-solid fa-check"></i></div>
          </PopupBox>
        </PopupOverlay>
      )}

      {/* Bid Popup */}
      {bidPopup && (
        <PopupOverlay onClick={closeAllPopups}>
          <PopupBox D={D}>
            <PopupClose onClick={closeAllPopups} isArabic={isArabic} />
            <PopupTitle D={D}>{t("placeYourBid", "Place Your Bid")}</PopupTitle>
            <PopupInput value={manualBidAmount} onChange={(e) => setManualBidAmount(e.target.value)} placeholder={t("enterBidAmount", "Enter bid amount")} D={D} />
            {actionMessage ? <PopupError>{actionMessage}</PopupError> : null}
            <PrimaryBtn onClick={sendManualBid} disabled={actionLoading}>
              {actionLoading ? t("loading", "Loading...") : t("submitBid", "Submit Bid")}
            </PrimaryBtn>
          </PopupBox>
        </PopupOverlay>
      )}

      {/* Proxy Popup */}
      {proxyPopup && (
        <PopupOverlay onClick={closeAllPopups}>
          <PopupBox D={D}>
            <PopupClose onClick={closeAllPopups} isArabic={isArabic} />
            <PopupTitle D={D}>{proxyExists ? t("manageProxyBid", "Manage Proxy Bid") : t("createProxyBid", "Create Proxy Bid")}</PopupTitle>
            {proxyExists ? <PopupText D={D}>{t("proxyExistsText", "You already have a proxy bid. You can edit the values and save, or deactivate it.")}</PopupText> : null}
            <PopupInput value={proxyMax} onChange={(e) => setProxyMax(e.target.value)} placeholder={t("maxAmount", "Max amount")} D={D} />
            <PopupInput value={proxyStep} onChange={(e) => setProxyStep(e.target.value)} placeholder={t("stepAmount", "Step amount")} D={D} />
            {actionMessage ? <PopupError>{actionMessage}</PopupError> : null}
            <PrimaryBtn onClick={saveOrUpdateProxy} disabled={actionLoading}>
              {actionLoading ? t("loading", "Loading...") : proxyExists ? t("saveProxy", "Save Proxy") : t("createProxy", "Create Proxy")}
            </PrimaryBtn>
            {proxyExists ? (
              <DangerBtn onClick={deactivateProxy} disabled={actionLoading} dark={dark}>
                {actionLoading ? t("loading", "Loading...") : t("deactivateProxy", "Deactivate Proxy")}
              </DangerBtn>
            ) : null}
          </PopupBox>
        </PopupOverlay>
      )}

      {/* Report Popup */}
      {reportPopup && (
        <PopupOverlay onClick={closeReportPopup}>
          <PopupBox D={D}>
            <PopupClose onClick={closeReportPopup} isArabic={isArabic} />
            {reportSuccess ? (
              <>
                <p style={{ textAlign: "center", fontWeight: 900, color: "#023E8A" }}>{t("reportSubmitted", "Report submitted successfully.")}</p>
                <div className="auction-success-icon"><i className="fa-solid fa-check"></i></div>
              </>
            ) : (
              <>
                <PopupTitle D={D}>{t("reportAuction", "Report Auction")}</PopupTitle>
                <PopupText D={D}>{t("reportReason", "Describe the issue with this auction:")}</PopupText>
                <textarea
                  className="report-popup-textarea"
                  placeholder={t("writeHere", "Write here...")}
                  value={reportReason}
                  maxLength={500}
                  onChange={(e) => setReportReason(e.target.value)}
                />
                <div style={{ textAlign: "end", color: D.textSoft, fontSize: 12, marginBottom: 10 }}>{reportReason.length}/500</div>
                {reportMessage ? <PopupError>{reportMessage}</PopupError> : null}
                <PrimaryBtn onClick={submitAuctionReport} disabled={reportLoading}>
                  {reportLoading ? t("sending", "Sending...") : t("sendReport", "Send the report")}
                </PrimaryBtn>
              </>
            )}
          </PopupBox>
        </PopupOverlay>
      )}

      {/* Seller Profile Popup */}
      {sellerPopup && (
        <div onClick={closeSellerPopup} style={{
          position: "fixed", inset: 0, background: D.overlay,
          zIndex: 999999, display: "flex", alignItems: "center", justifyContent: "center",
          padding: 16, overflowY: "auto",
        }}>
          <div onClick={(e) => e.stopPropagation()} style={{
            width: "min(100%, 680px)", maxHeight: "92vh",
            background: D.card, borderRadius: 24, boxShadow: D.popupShadow,
            display: "flex", flexDirection: "column", overflow: "hidden",
            position: "relative", border: `1px solid ${D.border}`,
          }}>
            <div style={{ background: "linear-gradient(135deg,#023E8A 0%,#0466c8 60%,#0096c7 100%)", padding: "20px 24px 70px", position: "relative", flexShrink: 0 }}>
              <button type="button" onClick={closeSellerPopup} style={{
                position: "absolute", top: 14, [isArabic ? "left" : "right"]: 16,
                border: "none", background: "rgba(255,255,255,0.18)", color: "#fff",
                fontSize: 22, width: 36, height: 36, borderRadius: "50%",
                cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
              }}>×</button>
            </div>

            {sellerLoading ? (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "60px 20px" }}>
                <div style={{ width: 40, height: 40, border: `4px solid ${dark ? "#1e3a5f" : "#dbeafe"}`, borderTopColor: "#023E8A", borderRadius: "50%", animation: "auctionSpin 0.8s linear infinite" }}></div>
              </div>
            ) : sellerError ? (
              <div style={{ padding: "20px 24px" }}>
                <div style={{ background: D.errorBg, color: D.errorColor, border: `1px solid ${D.errorBorder}`, borderRadius: 14, padding: "16px 20px", fontWeight: 800, fontSize: 14 }}>
                  {sellerError}
                </div>
              </div>
            ) : sellerData ? (
              <div style={{ padding: "0 24px 24px", overflowY: "auto", flex: 1 }}>
                <div className="sp-hero-row-inner" style={{ display: "flex", alignItems: "flex-end", gap: 16, marginTop: -44, marginBottom: 16 }}>
                  <div style={{ position: "relative", flexShrink: 0 }}>
                    {sellerData.logo ? (
                      <img src={sellerData.logo} alt={sellerData.storeName} style={{ width: 88, height: 88, borderRadius: 18, objectFit: "cover", border: `4px solid ${D.card}`, boxShadow: "0 6px 20px rgba(0,0,0,0.18)", background: dark ? "#1e293b" : "#e8f1ff" }} />
                    ) : (
                      <div style={{ width: 88, height: 88, borderRadius: 18, border: `4px solid ${D.card}`, background: dark ? "#1e293b" : "#e8f1ff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 34, color: "#023E8A" }}>
                        <i className="fa-solid fa-store"></i>
                      </div>
                    )}
                    {(sellerData.verificationStatus === "Verified" || sellerData.verificationStatus === "verified") ? (
                      <span className="sp-verified-badge" title="Verified"><i className="fa-solid fa-circle-check"></i></span>
                    ) : null}
                  </div>
                  <div style={{ flex: 1, minWidth: 0, paddingTop: 10 }}>
                    <h2 style={{ margin: "0 0 4px", fontSize: 22, fontWeight: 900, color: D.text }}>{sellerData.storeName}</h2>
                    {sellerData.description ? <p style={{ margin: "0 0 10px", color: D.textSoft, fontSize: 13, lineHeight: 1.5 }}>{sellerData.description}</p> : null}
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {sellerData.country ? <span className="sp-chip"><i className="fa-solid fa-location-dot"></i>{sellerData.country}{sellerData.city ? `, ${sellerData.city}` : ""}</span> : null}
                      {sellerData.phone   ? <span className="sp-chip"><i className="fa-solid fa-phone"></i>{sellerData.phone}</span> : null}
                      {sellerData.email   ? <span className="sp-chip"><i className="fa-solid fa-envelope"></i>{sellerData.email}</span> : null}
                    </div>
                  </div>
                  <div className="sp-hero-actions-inner" style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 130, paddingTop: 10 }}>
                    <button className={`sp-follow-btn ${isFollowing ? "sp-follow-btn--active" : ""}`} onClick={handleFollow} disabled={followLoading}>
                      {followLoading ? <span className="sp-btn-spinner"></span> : <i className={`fa-${isFollowing ? "solid" : "regular"} fa-heart`}></i>}
                      {isFollowing ? t("unfollow", "Unfollow") : t("follow", "Follow")}
                    </button>
                    <button className="sp-review-btn" onClick={() => { setReviewPopup(true); setReviewError(""); setReviewSuccess(false); }}>
                      <i className="fa-solid fa-star"></i>{t("addReview", "Add Review")}
                    </button>
                  </div>
                </div>

                {/* Stats bar */}
                <div style={{ display: "flex", border: `1px solid ${D.statsBorder}`, borderRadius: 14, overflow: "hidden", marginBottom: 20, background: D.statsBg }}>
                  {[
                    { value: sellerData.followers, label: t("followers", "Followers") },
                    { value: sellerData.auctions,  label: t("auctions", "Auctions") },
                    { value: avgRating,            label: t("rating", "Rating") },
                    { value: sellerReviews.length, label: t("reviews", "Reviews") },
                  ].map(({ value, label }, i) => (
                    <div key={label} style={{ flex: 1, padding: "12px 8px", textAlign: "center", borderLeft: i > 0 ? `1px solid ${D.statsBorder}` : "none" }}>
                      <strong style={{ display: "block", fontSize: 18, fontWeight: 900, color: "#023E8A" }}>{value}</strong>
                      <span style={{ display: "block", fontSize: 11, fontWeight: 700, color: D.textSoft, textTransform: "uppercase", marginTop: 2 }}>{label}</span>
                    </div>
                  ))}
                </div>

                <p style={{ fontSize: 16, fontWeight: 900, color: "#023E8A", margin: "0 0 14px", display: "flex", alignItems: "center", gap: 8 }}>
                  <i className="fa-solid fa-star"></i> {t("reviewsRatings", "Reviews & Ratings")}
                </p>
                {sellerReviews.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "32px 20px", color: D.textSoft }}>
                    <i className="fa-regular fa-comment-dots" style={{ fontSize: 36, color: dark ? "#334155" : "#d1d5db", display: "block", marginBottom: 10 }}></i>
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>{t("noReviewsYet", "No reviews yet.")}</p>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {sellerReviews.map((r) => (
                      <div className="sp-review-card" key={r.id}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                          {r.buyerImage ? (
                            <img src={r.buyerImage} alt={r.buyerName} style={{ width: 38, height: 38, borderRadius: "50%", objectFit: "cover", flexShrink: 0, border: `2px solid ${dark ? "#334155" : "#e8f1ff"}` }} />
                          ) : (
                            <div style={{ width: 38, height: 38, borderRadius: "50%", background: dark ? "#1e293b" : "#e8f1ff", display: "flex", alignItems: "center", justifyContent: "center", color: "#023E8A", fontSize: 14, flexShrink: 0 }}>
                              <i className="fa-regular fa-user"></i>
                            </div>
                          )}
                          <div>
                            <p style={{ margin: "0 0 2px", fontWeight: 900, fontSize: 14, color: D.text }}>{r.buyerName}</p>
                            <p style={{ margin: 0, fontSize: 11, color: D.textSoft }}>{formatDate(r.createdAt)}</p>
                          </div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                          <span style={{ fontSize: 11, fontWeight: 800, color: D.textSoft, minWidth: 52, textTransform: "uppercase" }}>{t("seller", "Seller")}</span>
                          <StarRow value={r.sellerRate} readonly size={14} dark={dark} />
                        </div>
                        {r.deliveryRate > 0 ? (
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                            <span style={{ fontSize: 11, fontWeight: 800, color: D.textSoft, minWidth: 52, textTransform: "uppercase" }}>{t("delivery", "Delivery")}</span>
                            <StarRow value={r.deliveryRate} readonly size={14} dark={dark} />
                          </div>
                        ) : null}
                        {r.comment ? (
                          <p style={{ margin: "8px 0 0", fontSize: 13, color: D.textSoft, lineHeight: 1.6, fontStyle: "italic", borderLeft: `3px solid ${dark ? "#1e3a5f" : "#e8f1ff"}`, paddingLeft: 10 }}>"{r.comment}"</p>
                        ) : null}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* Add Review Sub-popup */}
      {reviewPopup && (
        <div onClick={() => { if (!reviewLoading) setReviewPopup(false); }} style={{
          position: "fixed", inset: 0, background: D.overlay,
          zIndex: 9999999, display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
        }}>
          <div onClick={(e) => e.stopPropagation()} style={{
            width: "min(100%, 440px)", background: D.card, borderRadius: 20, padding: 22,
            position: "relative", boxShadow: D.popupShadow, border: `1px solid ${D.border}`,
          }}>
            <button type="button" onClick={() => setReviewPopup(false)} disabled={reviewLoading}
              style={{ position: "absolute", top: 12, [isArabic ? "left" : "right"]: 14, border: "none", background: "transparent", color: "#ef4444", fontSize: 28, cursor: "pointer", lineHeight: 1 }}>×</button>

            {reviewSuccess ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, padding: "16px 0", textAlign: "center" }}>
                <div className="auction-success-icon"><i className="fa-solid fa-check"></i></div>
                <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: D.text }}>{t("reviewSentSuccessfully", "Your review has been sent successfully.")}</p>
              </div>
            ) : (
              <>
                <h3 style={{ margin: "0 0 18px", fontSize: 18, fontWeight: 900, color: "#023E8A", display: "flex", alignItems: "center", gap: 8 }}>
                  <i className="fa-solid fa-star"></i> {t("addAReview", "Add a Review")}
                </h3>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 900, color: D.textSoft, textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: 8 }}>{t("sellerRate", "Seller Rate")}</label>
                  <StarRow value={sellerRate} onChange={setSellerRate} size={30} dark={dark} />
                </div>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 900, color: D.textSoft, textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: 8 }}>{t("deliveryRate", "Delivery Rate")}</label>
                  <StarRow value={deliveryRate} onChange={setDeliveryRate} size={30} dark={dark} />
                </div>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 900, color: D.textSoft, textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: 8 }}>{t("yourReview", "Your Review")}</label>
                  <textarea className="sp-popup-textarea" placeholder={t("writeYourReview", "Write your review...")} value={reviewText} maxLength={500} onChange={(e) => setReviewText(e.target.value)} />
                  <div style={{ fontSize: 11, color: D.textSoft, textAlign: "end", marginTop: 4 }}>{reviewText.trim().split(/\s+/).filter(Boolean).length} {t("words", "words")}</div>
                </div>
                {reviewError ? <p style={{ color: "#dc2626", fontSize: 13, fontWeight: 800, margin: "0 0 12px", textAlign: "center" }}>{reviewError}</p> : null}
                <button className="sp-popup-submit" disabled={reviewLoading} onClick={handleSubmitReview}>
                  {reviewLoading ? <><span className="sp-btn-spinner"></span> {t("sending", "Sending...")}</> : <><i className="fa-solid fa-paper-plane"></i> {t("sendReview", "Send Review")}</>}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}