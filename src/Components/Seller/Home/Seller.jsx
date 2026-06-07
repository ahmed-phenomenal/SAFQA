import React, { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

import icon from "../../../assets/2.png";
import auctionImg from "../../../IMG/Seller/2.png";
import singleAuctionImg from "../../../IMG/Seller/2.png";
import historyImg from "../../../IMG/Seller/1.png";
import statisticsImg from "../../../IMG/Seller/3.jpeg";
import "../seller.css";
import {
  getNotifications,
  getUnseenNotificationsCount,
} from "../../../API/Seller_Notifications";
import {
  getSellerDisplayProfile,
  getSellerHome,
  getSellerVerificationStatus,
} from "../../../API/seller";

const LOT_AUCTION_ROUTE = "/lot-Auction";
const SINGLE_AUCTION_ROUTE = "/single-Auction";
const VERIFICATION_ROUTE = "/seller-verification";

const getAnySellerSessionToken = () => {
  return (
    localStorage.getItem("sellerToken") ||
    sessionStorage.getItem("sellerToken") ||
    localStorage.getItem("token") ||
    sessionStorage.getItem("token") ||
    localStorage.getItem("userToken") ||
    sessionStorage.getItem("userToken") ||
    ""
  ).toString().trim();
};

const getCurrentAccountKey = () => {
  return String(
    localStorage.getItem("currentUserEmail") ||
      localStorage.getItem("pendingEmail") ||
      sessionStorage.getItem("currentUserEmail") ||
      sessionStorage.getItem("pendingEmail") ||
      "guest"
  ).trim().toLowerCase();
};

const getScopedKey = (baseKey) => `${baseKey}:${getCurrentAccountKey()}`;

const markSellerVerifiedLocally = () => {
  if (typeof window === "undefined") return false;
  const accountKey = getCurrentAccountKey();
  if (!accountKey || accountKey === "guest") return false;
  const scopedVerifiedKey  = `seller_verified_local:${accountKey}`;
  const scopedSubmittedKey = `seller_verification_submitted:${accountKey}`;
  sessionStorage.setItem(scopedVerifiedKey, "true");
  localStorage.setItem(scopedVerifiedKey, "true");
  sessionStorage.setItem(scopedSubmittedKey, "true");
  localStorage.setItem(scopedSubmittedKey, "true");
  sessionStorage.setItem("role", "seller");
  sessionStorage.setItem("accountType", "seller");
  return true;
};

const markSellerSubmittedLocally = () => {
  if (typeof window === "undefined") return false;
  const accountKey = getCurrentAccountKey();
  if (!accountKey || accountKey === "guest") return false;
  const scopedSubmittedKey = `seller_verification_submitted:${accountKey}`;
  localStorage.setItem(scopedSubmittedKey, "true");
  sessionStorage.setItem(scopedSubmittedKey, "true");
  return true;
};

const hasLocalVerifiedState = () => {
  const accountKey = getCurrentAccountKey();
  if (!accountKey || accountKey === "guest") return false;
  return (
    localStorage.getItem(getScopedKey("seller_verified_local")) === "true" ||
    sessionStorage.getItem(getScopedKey("seller_verified_local")) === "true"
  );
};

const hasLocalSubmittedState = () => {
  const accountKey = getCurrentAccountKey();
  if (!accountKey || accountKey === "guest") return false;
  return (
    localStorage.getItem(`seller_verification_submitted:${accountKey}`) === "true" ||
    sessionStorage.getItem(`seller_verification_submitted:${accountKey}`) === "true"
  );
};

const clearOldBadSellerVerificationCache = () => {
  try {
    ["seller_verified_global", "seller_verification_submitted_global"].forEach((key) => {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    });
  } catch { /* silent */ }
};

const looksLikeBase64Image = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return false;
  if (raw.startsWith("http://") || raw.startsWith("https://")) return true;
  if (raw.startsWith("data:image/")) return true;
  const cleaned = raw.replace(/\s/g, "");
  if (cleaned.length < 80) return false;
  if (cleaned.includes("{") || cleaned.includes("}")) return false;
  if (cleaned.includes("undefined") || cleaned.includes("null")) return false;
  return /^[A-Za-z0-9+/=]+$/.test(cleaned);
};

const toImageSrc = (value) => {
  const raw = String(value || "").trim();
  if (!raw || raw === " ") return "";
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
  if (raw.startsWith("data:image/")) return raw;
  if (!looksLikeBase64Image(raw)) return "";
  return `data:image/png;base64,${raw.replace(/\s/g, "")}`;
};

const skeletonPulse = {
  animation: "sellerSkeletonPulse 1.4s ease-in-out infinite",
  background: "linear-gradient(90deg, #ececec 25%, #f5f5f5 37%, #ececec 63%)",
  backgroundSize: "400% 100%",
};

const makeVerifiedState = (previous = {}) => ({
  ...previous,
  isVerified: true,
  isPending: false,
  isRejected: false,
  hasSubmittedVerification: true,
  sellerCreated: true,
  personalVerified: true,
  businessVerified: true,
  verificationStatus: "verified",
  allowSellerFeatures: true,
});

const makePendingState = (previous = {}) => ({
  ...previous,
  isVerified: false,
  isPending: true,
  isRejected: false,
  hasSubmittedVerification: true,
  verificationStatus: "pending",
  allowSellerFeatures: false,
});

const normalizeVerificationState = (data) => {
  const localVerified = hasLocalVerifiedState();

  const rawStatus = String(data?.verificationStatus || "").trim().toLowerCase();

  const negativeStatus =
    rawStatus.includes("not verified") || rawStatus.includes("not_verified") ||
    rawStatus.includes("notverified")  || rawStatus.includes("unverified") ||
    rawStatus.includes("not approved") || rawStatus.includes("not_approved") ||
    rawStatus.includes("not accepted") || rawStatus.includes("not_accepted");

  const normalizedStatus = negativeStatus ? "" : rawStatus;

  const apiSaysVerified =
    !negativeStatus &&
    (data?.isVerified === true ||
      normalizedStatus === "verified" || normalizedStatus === "approved" ||
      normalizedStatus === "accepted" || normalizedStatus === "admin approved" ||
      normalizedStatus === "fully verified");

  const isVerified = apiSaysVerified || localVerified;
  if (isVerified) return makeVerifiedState(data);

  const isRejected =
    data?.isRejected === true ||
    normalizedStatus === "rejected" || normalizedStatus === "declined" || normalizedStatus === "failed";

  const isPending =
    !isRejected &&
    (data?.isPending === true || data?.hasSubmittedVerification === true ||
      normalizedStatus === "pending" || normalizedStatus === "submitted" ||
      normalizedStatus === "under review" || normalizedStatus === "processing");

  const hasSubmittedVerification = data?.hasSubmittedVerification === true || isPending || hasLocalSubmittedState();

  return {
    isVerified: false,
    isPending: isPending || hasLocalSubmittedState(),
    isRejected,
    hasSubmittedVerification,
    sellerCreated: !!data?.sellerCreated,
    personalVerified: !!data?.personalVerified,
    businessVerified: !!data?.businessVerified,
    verificationStatus: (isPending || hasLocalSubmittedState()) ? "pending" : isRejected ? "rejected" : "",
    allowSellerFeatures: false,
  };
};

export default function Seller() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const didLoadNotificationsRef = useRef(false);
  const handlingVerificationEventRef = useRef(false);

  const [confirmBox, setConfirmBox] = useState(false);
  const [selectedAuctionType, setSelectedAuctionType] = useState("");
  const [verificationChecking, setVerificationChecking] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState(() => normalizeVerificationState({}));
  const [notificationsCount, setNotificationsCount] = useState(0);
  const [notificationsLoading, setNotificationsLoading] = useState(false);

  const [showWelcomeVerificationModal, setShowWelcomeVerificationModal] = useState(false);
  const [bannerCollapsed, setBannerCollapsed] = useState(false);

  const [sellerProfile, setSellerProfile] = useState({ name: "", email: "", image: "" });
  const [sellerProfileLoading, setSellerProfileLoading] = useState(true);
  const [profileImageFailed, setProfileImageFailed] = useState(false);

  useEffect(() => { document.title = t("sellerDocTitle"); }, [t]);

  useEffect(() => {
    clearOldBadSellerVerificationCache();
    const link = document.querySelector("link[rel~='icon']");
    if (link) { link.href = icon; } else {
      const newLink = document.createElement("link");
      newLink.rel = "icon"; newLink.href = icon;
      document.head.appendChild(newLink);
    }
  }, []);

  useEffect(() => {
    const token = getAnySellerSessionToken();
    if (!token) navigate("/login", { replace: true, state: { accountType: "seller" } });
  }, [navigate]);

  const syncVerificationState = useCallback(async () => {
    try {
      if (hasLocalVerifiedState()) {
        const verified = makeVerifiedState({});
        setVerificationStatus(verified);
        setShowWelcomeVerificationModal(false);
        return verified;
      }

      const rawData = await getSellerVerificationStatus();
      const normalized = normalizeVerificationState(rawData);

      if (normalized.isVerified) markSellerVerifiedLocally();

      setVerificationStatus(normalized);
      setShowWelcomeVerificationModal(!normalized.isVerified && !normalized.isPending);

      return normalized;
    } catch {
      if (hasLocalSubmittedState()) {
        const pending = makePendingState({});
        setVerificationStatus(pending);
        setShowWelcomeVerificationModal(false);
        return pending;
      }
      const fallback = normalizeVerificationState({});
      setVerificationStatus(fallback);
      if (!fallback.isVerified && !fallback.isPending) setShowWelcomeVerificationModal(true);
      return fallback;
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    const loadSellerProfile = async () => {
      try {
        setSellerProfileLoading(true);
        setProfileImageFailed(false);

        const [verificationData, profileData] = await Promise.all([
          syncVerificationState(),
          getSellerDisplayProfile(),
        ]);

        if (!mounted) return;

        const realVerification = verificationData;
        if (realVerification.isVerified) markSellerVerifiedLocally();

        setVerificationStatus(realVerification);
        setShowWelcomeVerificationModal(!realVerification.isVerified && !realVerification.isPending);
        setSellerProfile({
          name:  profileData?.name  || "",
          email: profileData?.email || "",
          image: toImageSrc(profileData?.image),
        });
      } catch {
        if (!mounted) return;
        setSellerProfile({ name: "", email: "", image: "" });
      } finally {
        if (mounted) setSellerProfileLoading(false);
      }
    };
    loadSellerProfile();
    return () => { mounted = false; };
  }, [syncVerificationState]);

  useEffect(() => {
    const fetchSellerHome = async () => {
      try { await getSellerHome(); } catch { /* silent */ }
    };
    fetchSellerHome();
  }, []);

  const loadNotificationsCount = useCallback(async () => {
    try {
      setNotificationsLoading(true);
      const data = await getNotifications();

      if (!hasLocalVerifiedState()) {
        markSellerVerifiedLocally();
        setVerificationStatus(makeVerifiedState({}));
        setShowWelcomeVerificationModal(false);
      }

      const list = Array.isArray(data) ? data : [];
      const count = getUnseenNotificationsCount(list);
      setNotificationsCount(count);
    } catch (err) {
      const status = Number(err?.response?.status || 0);

      if (status === 403) {
        if (hasLocalVerifiedState()) {
          setVerificationStatus((prev) => {
            if (prev.isVerified) return normalizeVerificationState({});
            return prev;
          });
        } else if (hasLocalSubmittedState()) {
          setVerificationStatus(makePendingState({}));
        }
      }
      setNotificationsCount(0);
    } finally {
      setNotificationsLoading(false);
    }
  }, []);

  useEffect(() => { syncVerificationState(); }, [syncVerificationState]);

  useEffect(() => {
    if (didLoadNotificationsRef.current) return;
    didLoadNotificationsRef.current = true;
    loadNotificationsCount();
  }, [loadNotificationsCount]);

  useEffect(() => {
    const handleNotificationsUpdated = () => { loadNotificationsCount(); };

    const handleVerificationUpdated = () => {
      if (handlingVerificationEventRef.current) return;
      handlingVerificationEventRef.current = true;
      try { syncVerificationState(); }
      finally { handlingVerificationEventRef.current = false; }
    };

    const handleFocus = async () => {
      await syncVerificationState();
      loadNotificationsCount();
    };

    window.addEventListener("seller-notifications-updated", handleNotificationsUpdated);
    window.addEventListener("seller-verification-updated",  handleVerificationUpdated);
    window.addEventListener("focus", handleFocus);

    return () => {
      window.removeEventListener("seller-notifications-updated", handleNotificationsUpdated);
      window.removeEventListener("seller-verification-updated",  handleVerificationUpdated);
      window.removeEventListener("focus", handleFocus);
    };
  }, [loadNotificationsCount, syncVerificationState]);

  const closeVerificationModal = () => { setConfirmBox(false); setSelectedAuctionType(""); };
  const openVerificationModal  = (auctionType) => { setSelectedAuctionType(auctionType); setConfirmBox(true); };

  const handleConfirmVerification = () => {
    setConfirmBox(false);
    setShowWelcomeVerificationModal(false);
    navigate(VERIFICATION_ROUTE, {
      state: { mode: verificationStatus?.isPending || verificationStatus?.hasSubmittedVerification ? "review" : "verify" },
    });
  };

  const handleDismissWelcomeModal = () => { setShowWelcomeVerificationModal(false); };

  const getAuctionRoute = (auctionType) => auctionType === "lot" ? LOT_AUCTION_ROUTE : SINGLE_AUCTION_ROUTE;
  const getAuctionLabel = (auctionType) => auctionType === "lot" ? t("newLotAuctionLower") : t("newSingleAuctionLower");

  const handleAuctionClick = async (auctionType) => {
    if (verificationChecking) return;
    try {
      setSelectedAuctionType(auctionType);
      setVerificationChecking(true);
      if (verificationStatus?.isVerified || hasLocalVerifiedState()) {
        navigate(getAuctionRoute(auctionType));
        return;
      }
      const freshStatus = await syncVerificationState();
      if (freshStatus.isVerified) { navigate(getAuctionRoute(auctionType)); return; }
      openVerificationModal(auctionType);
    } finally {
      setVerificationChecking(false);
    }
  };

  const isPendingOrSubmitted = verificationStatus?.isPending || verificationStatus?.hasSubmittedVerification;

  return (
    <div className="seller">
      <style>{`
        @keyframes sellerSkeletonPulse {
          0%   { background-position: 100% 50%; }
          100% { background-position: 0 50%; }
        }
      `}</style>

      <div className="seller-page">
        <div className="seller-container">
          <div className="seller-header">
            <h1 className="seller-logo">SAFQA<span>.BUSINESS</span></h1>
          </div>

          {!verificationStatus?.isVerified && (
            <div style={{
              width: "86%",
              margin: "18px auto 24px",
              background: isPendingOrSubmitted ? "#eef6ff" : "#f8efd9",
              border: isPendingOrSubmitted ? "1px solid #9cc4ff" : "1px solid #e7c27a",
              borderRadius: "20px",
              padding: bannerCollapsed ? "12px 18px" : "20px 22px",
              boxShadow: "0 10px 24px rgba(0,0,0,0.06)",
              position: "relative",
              transition: "all 0.25s ease",
              boxSizing: "border-box",
            }}>
              {!bannerCollapsed ? (
                <div style={{
                  display: "flex",
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "12px",
                  flexWrap: "nowrap",
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h4 style={{
                      margin: 0,
                      color: isPendingOrSubmitted ? "#0b4aa2" : "#b36b00",
                      fontSize: "clamp(14px, 3.5vw, 20px)",
                      fontWeight: 800,
                      lineHeight: 1.3,
                      whiteSpace: "normal",
                      wordBreak: "break-word",
                    }}>
                      {isPendingOrSubmitted ? t("verificationPendingReview") : t("youHaveToVerifyToContinue")}
                    </h4>
                    <p style={{
                      margin: "8px 0 0",
                      color: isPendingOrSubmitted ? "#46648f" : "#9a6a14",
                      fontSize: "clamp(12px, 3vw, 15px)",
                      lineHeight: 1.6,
                      wordBreak: "break-word",
                    }}>
                      {isPendingOrSubmitted ? t("verificationPendingBannerText") : t("verificationRequiredBannerText")}
                    </p>
                  </div>
                  <div style={{
                    display: "flex",
                    flexDirection: "row",
                    alignItems: "center",
                    gap: "10px",
                    flexShrink: 0,
                  }}>
                    <button
                      type="button"
                      onClick={() => navigate(VERIFICATION_ROUTE, { state: { mode: isPendingOrSubmitted ? "review" : "verify" } })}
                      style={{
                        border: "none",
                        background: "#003f98",
                        color: "#fff",
                        borderRadius: "14px",
                        padding: "10px 16px",
                        fontWeight: 800,
                        fontSize: "clamp(12px, 3vw, 16px)",
                        cursor: "pointer",
                        whiteSpace: "nowrap",
                        flexShrink: 0,
                      }}
                    >
                      {isPendingOrSubmitted ? t("review") : t("verifyNow")}
                    </button>
                    <button
                      type="button"
                      onClick={() => setBannerCollapsed((p) => !p)}
                      style={{
                        border: "none",
                        background: "transparent",
                        color: isPendingOrSubmitted ? "#0b4aa2" : "#b36b00",
                        cursor: "pointer",
                        fontSize: "20px",
                        width: "24px",
                        height: "24px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: 0,
                        flexShrink: 0,
                      }}
                    >
                      <i className="fa-solid fa-angle-up"></i>
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{
                  display: "flex",
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "12px",
                  flexWrap: "nowrap",
                }}>
                  <div style={{
                    color: isPendingOrSubmitted ? "#0b4aa2" : "#b36b00",
                    fontWeight: 800,
                    fontSize: "clamp(13px, 3.5vw, 17px)",
                    whiteSpace: "normal",
                    wordBreak: "break-word",
                    flex: 1,
                    minWidth: 0,
                  }}>
                    {isPendingOrSubmitted ? t("verificationPendingReview") : t("youHaveToVerifyToContinue")}
                  </div>
                  <button
                    type="button"
                    onClick={() => setBannerCollapsed((p) => !p)}
                    style={{
                      border: "none",
                      background: "transparent",
                      color: isPendingOrSubmitted ? "#0b4aa2" : "#b36b00",
                      cursor: "pointer",
                      fontSize: "20px",
                      width: "24px",
                      height: "24px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: 0,
                      flexShrink: 0,
                    }}
                  >
                    <i className="fa-solid fa-angle-down"></i>
                  </button>
                </div>
              )}
            </div>
          )}

          <div className="seller-user-row">
            <div className="seller-user-left">
              {sellerProfileLoading ? (
                <>
                  <div className="seller-avatar" style={{ borderRadius: "50%", ...skeletonPulse }} />
                  <div className="seller-user-text" style={{ minWidth: 220 }}>
                    <div style={{ width: 90,  height: 12, borderRadius: 8, marginBottom: 10, ...skeletonPulse }} />
                    <div style={{ width: 150, height: 18, borderRadius: 8, marginBottom: 10, ...skeletonPulse }} />
                    <div style={{ width: 120, height: 12, borderRadius: 8, ...skeletonPulse }} />
                  </div>
                </>
              ) : (
                <>
                  {sellerProfile.image && !profileImageFailed ? (
                    <img src={sellerProfile.image} alt={t("profile")} className="seller-avatar" onError={() => setProfileImageFailed(true)} />
                  ) : (
                    <div className="seller-avatar" style={{ background: "#eef2f7", display: "flex", alignItems: "center", justifyContent: "center", color: "#8a94a6", fontSize: "28px" }}>
                      <i className="fa-regular fa-user"></i>
                    </div>
                  )}
                  <div className="seller-user-text">
                    <p>{t("welcome")}</p>
                    <h3>{sellerProfile.name ? t("helloName", { name: sellerProfile.name }) : "-"}</h3>
                    {verificationStatus?.isVerified ? (
                      <p className="status-verified">{t("verifiedSeller")}</p>
                    ) : isPendingOrSubmitted ? (
                      <p className="status-pending">{t("pendingReview")}</p>
                    ) : (
                      <p className="status-not-verified">{t("verificationRequired")}</p>
                    )}
                  </div>
                </>
              )}
            </div>

            <div className="seller-user-icons">
              <Link to="/seller-notifications" className="seller-icon-link" aria-label={t("notifications")} style={{ position: "relative" }}>
                <i className="fa-regular fa-bell"></i>
                {!notificationsLoading && notificationsCount > 0 && (
                  <span style={{ position: "absolute", top: "-6px", right: "-8px", minWidth: "18px", height: "18px", padding: "0 5px", borderRadius: "999px", background: "#e53935", color: "#fff", fontSize: "11px", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1 }}>
                    {notificationsCount > 99 ? "99+" : notificationsCount}
                  </span>
                )}
              </Link>
              <Link to="/seller-profile" className="seller-icon-link" aria-label={t("profile")}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M12 12a3.5 3.5 0 1 0-3.5-3.5A3.5 3.5 0 0 0 12 12Z" />
                  <path d="M5 19a7 7 0 0 1 14 0" />
                </svg>
              </Link>
            </div>
          </div>

          <div className="seller-content">
            <button type="button" onClick={() => handleAuctionClick("lot")} className="seller-card seller-card-large seller-card-button" disabled={verificationChecking}>
              <img src={auctionImg} alt={t("newLotAuction")} />
              <div className="seller-card-overlay"></div>
              <div className="seller-card-text seller-card-text-large">
                {verificationChecking && selectedAuctionType === "lot" ? t("checking") : <>{t("newLotAuction")} <span>+</span></>}
              </div>
            </button>
            <button type="button" onClick={() => handleAuctionClick("single")} className="seller-card seller-card-large seller-card-button" disabled={verificationChecking}>
              <img src={singleAuctionImg} alt={t("newSingleAuction")} />
              <div className="seller-card-overlay"></div>
              <div className="seller-card-text seller-card-text-large">
                {verificationChecking && selectedAuctionType === "single" ? t("checking") : <>{t("newSingleAuction")} <span>+</span></>}
              </div>
            </button>
            <div className="seller-small-grid">
              <Link to="/seller-history"    className="seller-card seller-card-small"><img src={historyImg}    alt={t("history")}    /><div className="seller-card-overlay"></div><div className="seller-card-text seller-card-text-small">{t("history")}</div></Link>
              <Link to="/seller-statistics" className="seller-card seller-card-small"><img src={statisticsImg} alt={t("statistics")} /><div className="seller-card-overlay"></div><div className="seller-card-text seller-card-text-small">{t("statistics")}</div></Link>
            </div>
          </div>
        </div>
      </div>

      {showWelcomeVerificationModal && !verificationStatus?.isVerified && !verificationStatus?.isPending && !verificationStatus?.hasSubmittedVerification && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, padding: "16px" }}>
          <div style={{ width: "100%", maxWidth: "430px", background: "#fff", borderRadius: "18px", padding: "24px", boxShadow: "0 20px 50px rgba(0,0,0,0.18)", textAlign: "center" }}>
            <h3 style={{ margin: 0, marginBottom: "12px", color: "#023E8A", fontWeight: 700 }}>{t("continueAsBusinessAccount")}</h3>
            <p style={{ margin: 0, color: "#5f6c7b", lineHeight: 1.7 }}>{t("completeVerificationBusinessText")}</p>
            <div style={{ display: "flex", gap: "10px", justifyContent: "center", marginTop: "22px", flexWrap: "wrap" }}>
              <button type="button" onClick={handleConfirmVerification} style={{ border: "none", background: "#023E8A", color: "#fff", borderRadius: "10px", padding: "10px 18px", fontWeight: 700, cursor: "pointer", minWidth: "110px" }}>{t("ok")}</button>
              <button type="button" onClick={handleDismissWelcomeModal} style={{ border: "1px solid #d9d9d9", background: "#fff", color: "#444", borderRadius: "10px", padding: "10px 18px", fontWeight: 700, cursor: "pointer", minWidth: "110px" }}>{t("notNow")}</button>
            </div>
          </div>
        </div>
      )}

      {confirmBox && (
        <div className="seller-confirm-overlay">
          <div className="seller-confirm-modal">
            <h3>{isPendingOrSubmitted ? t("reviewVerification") : t("verificationRequired")}</h3>
            <p>
              {isPendingOrSubmitted
                ? <>{t("verificationUnderReviewBeforeAuction")} <strong>{getAuctionLabel(selectedAuctionType)}</strong>.</>
                : <>{t("needVerificationBeforeAuction")} <strong>{getAuctionLabel(selectedAuctionType)}</strong>.</>
              }
            </p>
            <div className="seller-confirm-actions">
              <button className="seller-confirm-btn seller-confirm-cancel" onClick={closeVerificationModal}>{t("cancel")}</button>
              <button className="seller-confirm-btn seller-confirm-ok" onClick={handleConfirmVerification}>{isPendingOrSubmitted ? t("review") : t("verifyNow")}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}