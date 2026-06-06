import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { setLanguage } from "../../../utiles/setLanguage";
import { forgetPasswordSignoutAll } from "../../../API/auth";
import {
  clearStoredSession,
} from "../../../API/authAccess";
import { applyTheme, getSavedTheme, saveTheme } from "../../../utiles/themeManager";
import icon from "../../../assets/2.png";
import "../seller.css";
import { getSellerDisplayProfile } from "../../../API/seller";
import { getNotifications } from "../../../API/Seller_Notifications";

/* ─── Verification-gate cache (in-memory, lives for the session) ──
   We call notifications once and remember the result so navigating
   around the profile page doesn't spam the server.
────────────────────────────────────────────────────────────────── */
let _verifiedCache = null; // null = not checked yet | true | false

const toImageSrc = (value) => {
  const raw = String(value || "").trim();
  if (!raw || raw === " ") return "";
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
  if (raw.startsWith("data:image/")) return raw;
  const looksLikeBase64 =
    /^[A-Za-z0-9+/=\s]+$/.test(raw) && !raw.includes("{") && !raw.includes("}");
  if (!looksLikeBase64) return "";
  return `data:image/png;base64,${raw.replace(/\s/g, "")}`;
};

const skeletonPulse = {
  animation: "sellerProfileSkeletonPulse 1.4s ease-in-out infinite",
  background: "linear-gradient(90deg, #ececec 25%, #f5f5f5 37%, #ececec 63%)",
  backgroundSize: "400% 100%",
};

const statusBadgeStyle = (status) => {
  const value = String(status || "").toLowerCase();
  if (value === "pending") return { background: "#fff4db", color: "#a46800", border: "1px solid #f0d48a" };
  if (value === "verified") return { background: "#e8f8ee", color: "#198754", border: "1px solid #b7e4c7" };
  if (value === "rejected") return { background: "#fdebec", color: "#c92a2a", border: "1px solid #f1b0b7" };
  return { background: "#eef2f7", color: "#5c697d", border: "1px solid #d7dee8" };
};

const statusLabel = (status, t) => {
  const value = String(status || "").toLowerCase();
  if (value === "pending") return t("pendingReview");
  if (value === "verified") return t("verified");
  if (value === "rejected") return t("rejected");
  return t("notVerified");
};

export default function SellerProfile() {
  const navigate = useNavigate();
  const { i18n, t } = useTranslation();
  const isArabic = i18n.language === "ar";

  const [notificationsToggle, setNotificationsToggle] = useState(true);
  const [accountOpen, setAccountOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [verificationPopupOpen, setVerificationPopupOpen] = useState(false);
  const [theme, setTheme] = useState(() => getSavedTheme());

  const [sellerData, setSellerData] = useState({
    name: "", email: "", image: "", storeName: "",
    phoneNumber: "", city: "", country: "", description: "",
    sellerRating: "", followers: "", auctionsCount: "",
    upgradeType: "", verificationStatus: "",
  });

  const [sellerLoading, setSellerLoading] = useState(true);

  /* isVerifiedViaNotifications — single source of truth for the gate AND the badge.
     null = still checking, true = notifications 200 (verified), false = 403 (not verified) */
  const [isVerifiedViaNotifications, setIsVerifiedViaNotifications] = useState(
    _verifiedCache
  );
  const [gateChecking, setGateChecking] = useState(_verifiedCache === null);

  const darkModeActive = theme === "dark";

  /* ── Check verification via notifications endpoint ── */
  useEffect(() => {
    if (_verifiedCache !== null) return;

    let mounted = true;
    const checkGate = async () => {
      try {
        setGateChecking(true);
        await getNotifications();
        _verifiedCache = true;
        if (mounted) setIsVerifiedViaNotifications(true);
      } catch (err) {
        const status = Number(err?.response?.status || 0);
        if (status === 403 || status === 401) {
          _verifiedCache = false;
          if (mounted) setIsVerifiedViaNotifications(false);
        } else {
          // Network error — don't block the user
          _verifiedCache = true;
          if (mounted) setIsVerifiedViaNotifications(true);
        }
      } finally {
        if (mounted) setGateChecking(false);
      }
    };
    checkGate();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    document.title = t("sellerProfileDocTitle");
  }, [t]);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    const link = document.querySelector("link[rel~='icon']");
    if (link) link.href = icon;
  }, []);

  /* ── Load seller profile data ── */
  useEffect(() => {
    let mounted = true;
    const loadSellerProfile = async () => {
      try {
        setSellerLoading(true);
        const data = await getSellerDisplayProfile();
        if (!mounted) return;
        setSellerData({
          name: data?.name || "",
          email: data?.email || "",
          image: data?.image || "",
          storeName: data?.storeName || "",
          phoneNumber: data?.phoneNumber || "",
          city: data?.city || "",
          country: data?.country || "",
          description: data?.description || "",
          sellerRating: data?.sellerRating ?? "",
          followers: data?.followers ?? "",
          auctionsCount: data?.auctionsCount ?? "",
          upgradeType: data?.upgradeType || "",
          verificationStatus: data?.verificationStatus || "",
        });
      } catch {
        if (!mounted) return;
        setSellerData({
          name: "", email: "", image: "", storeName: "",
          phoneNumber: "", city: "", country: "", description: "",
          sellerRating: "", followers: "", auctionsCount: "",
          upgradeType: "", verificationStatus: "",
        });
      } finally {
        if (mounted) setSellerLoading(false);
      }
    };
    loadSellerProfile();
    return () => { mounted = false; };
  }, []);

  /* ── Derive the effective verification status ──────────────────────
     Priority order:
     1. If notifications returned 200 → "verified" (overrides whatever the API says)
     2. If notifications returned 403 → trust the API status (pending / rejected / "")
     3. While still checking (gateChecking) → use API status as-is
  ─────────────────────────────────────────────────────────────────── */
  const effectiveVerificationStatus = useMemo(() => {
    if (isVerifiedViaNotifications === true) return "verified";
    // Not verified via gate — use whatever the API returned (pending, rejected, "")
    return sellerData.verificationStatus || "";
  }, [isVerifiedViaNotifications, sellerData.verificationStatus]);

  const seller = useMemo(() => ({
    name: sellerData.name || "",
    email: sellerData.email || "",
    image: sellerData.image || "",
    storeName: sellerData.storeName || "",
    description: sellerData.description || "",
    rating: sellerData.sellerRating,
    completedOrders: sellerData.auctionsCount,
    followers: sellerData.followers,
    upgradeType: sellerData.upgradeType || "",
    // Always use effectiveVerificationStatus — never the raw API value alone
    verificationStatus: effectiveVerificationStatus,
  }), [sellerData, effectiveVerificationStatus]);

  const toggleDarkMode = () => {
    const nextTheme = darkModeActive ? "light" : "dark";
    setTheme(nextTheme);
    saveTheme(nextTheme);
    applyTheme(nextTheme);
  };

  const renderStars = (rating) => {
    const numericRating = Number(rating || 0);
    const fullStars = Math.round(numericRating);
    return (
      <div className="seller-stars">
        {Array.from({ length: 5 }).map((_, i) => (
          <span
            key={i}
            className={i < fullStars ? "seller-star seller-star-filled" : "seller-star seller-star-empty"}
          >★</span>
        ))}
      </div>
    );
  };

  const doLogout = async () => {
    try {
      await forgetPasswordSignoutAll();
    } catch (error) {
      console.log(error?.response?.data || error.message);
    } finally {
      _verifiedCache = null;
      clearStoredSession();
      sessionStorage.clear();
      navigate("/login", { replace: true });
    }
  };

  const openConfirm = () => setConfirmOpen(true);
  const closeConfirm = () => setConfirmOpen(false);
  const onConfirm = async () => { await doLogout(); };

  const handleVerifiedNavigation = useCallback((path) => {
    if (gateChecking) {
      navigate(path);
      return;
    }
    if (isVerifiedViaNotifications === true) {
      navigate(path);
      return;
    }
    setVerificationPopupOpen(true);
  }, [gateChecking, isVerifiedViaNotifications, navigate]);

  const goToVerification = () => {
    setVerificationPopupOpen(false);
    _verifiedCache = null;
    setIsVerifiedViaNotifications(null);
    setGateChecking(false);

    navigate("/seller-verification", {
      state: {
        // Use effectiveVerificationStatus so the mode is also correct
        mode: effectiveVerificationStatus === "pending" ? "review" : "verify",
      },
    });
  };

  const linkButtonStyle = {
    width: "100%",
    border: "none",
    background: "transparent",
    padding: 0,
    margin: 0,
    textAlign: "inherit",
    cursor: "pointer",
    color: "inherit",
    font: "inherit",
  };

  return (
    <>
      <style>
        {`
          @keyframes sellerProfileSkeletonPulse {
            0% { background-position: 100% 50%; }
            100% { background-position: 0 50%; }
          }
          .seller-profile-dark-toggle-wrap {
            display: flex;
            align-items: center;
            gap: 12px;
          }
          .seller-profile-dark-label {
            color: #023e8a;
            font-size: 14px;
            font-weight: 700;
          }
        `}
      </style>

      <div className="seller-profile py-3" dir={isArabic ? "rtl" : "ltr"}>
        <div className="seller-profile-container">
          <h1 className="seller-profile-title">{t("profileTitle")}</h1>

          {/* ── User card ── */}
          <div className="seller-profile-card seller-profile-user-card">
            <button
              type="button"
              onClick={() => handleVerifiedNavigation("/seller-account")}
              className="seller-profile-link-card"
              style={{ ...linkButtonStyle, flex: 1 }}
            >
              <div className="seller-profile-user-left">
                {sellerLoading || gateChecking ? (
                  <>
                    <div className="seller-profile-avatar" style={{ borderRadius: "50%", ...skeletonPulse }} />
                    <div className="seller-profile-user-info" style={{ minWidth: 180 }}>
                      <div style={{ width: 120, height: 16, borderRadius: 8, marginBottom: 10, ...skeletonPulse }} />
                      <div style={{ width: 170, height: 12, borderRadius: 8, ...skeletonPulse }} />
                    </div>
                  </>
                ) : (
                  <>
                    {toImageSrc(seller.image) ? (
                      <img src={toImageSrc(seller.image)} alt={t("profile")} className="seller-profile-avatar" />
                    ) : (
                      <div
                        className="seller-profile-avatar"
                        style={{ background: "#eef2f7", display: "flex", alignItems: "center", justifyContent: "center", color: "#8a94a6", fontSize: "28px" }}
                      >
                        <i className="fa-regular fa-user"></i>
                      </div>
                    )}
                    <div className="seller-profile-user-info">
                      <h3>{seller.name || "-"}</h3>
                      <p>{seller.email || "-"}</p>
                      {/* Badge now always reflects effectiveVerificationStatus */}
                      <div
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          padding: "4px 10px",
                          borderRadius: 999,
                          fontSize: 12,
                          fontWeight: 700,
                          marginTop: 8,
                          ...statusBadgeStyle(seller.verificationStatus),
                        }}
                      >
                        {statusLabel(seller.verificationStatus, t)}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleVerifiedNavigation("/seller-account-edit")}
              style={{
                width: 38, height: 38, minWidth: 38, borderRadius: "50%",
                display: "flex", alignItems: "center", justifyContent: "center",
                background: "#f3f6fb", color: "#0b3a86", textDecoration: "none",
                border: "1px solid #e3e8ef", cursor: "pointer",
              }}
              title={t("editProfile")}
            >
              <i className="fa-solid fa-pen"></i>
            </button>
          </div>

          {/* ── Notifications toggle ── */}
          <div className="seller-profile-card seller-profile-setting-row">
            <span>{t("notifications")}</span>
            <label className="seller-profile-switch">
              <input
                type="checkbox"
                checked={notificationsToggle}
                onChange={() => setNotificationsToggle(!notificationsToggle)}
              />
              <span className="seller-profile-slider"></span>
            </label>
          </div>

          <button type="button" className="seller-profile-link-card" style={linkButtonStyle} onClick={() => handleVerifiedNavigation("/seller-delivery")}>
            <div className="seller-profile-card seller-profile-simple-row">
              <span>{t("deliveryApp", { defaultValue: "Delivery App" })}</span>
            </div>
          </button>

          <button type="button" className="seller-profile-link-card" style={linkButtonStyle} onClick={() => handleVerifiedNavigation("/seller-plans")}>
            <div className="seller-profile-card seller-profile-simple-row">
              <span>{t("plans")}</span>
            </div>
          </button>

          {/* ── Stats grid ── */}
          <div className="seller-profile-card seller-profile-stats-grid">
            <div className="seller-profile-stat-box">
              <p>{t("rating")}</p>
              {sellerLoading ? (
                <>
                  <div style={{ width: 70, height: 14, borderRadius: 8, margin: "10px auto", ...skeletonPulse }} />
                  <div style={{ width: 40, height: 18, borderRadius: 8, margin: "0 auto", ...skeletonPulse }} />
                </>
              ) : (
                <>
                  <div className="seller-profile-stat-stars">{renderStars(seller.rating)}</div>
                  <h3>{seller.rating !== "" ? seller.rating : "-"}</h3>
                </>
              )}
            </div>

            <div className="seller-profile-stat-box">
              <p>{t("followers")}</p>
              {sellerLoading ? (
                <div style={{ width: 40, height: 18, borderRadius: 8, margin: "18px auto 0", ...skeletonPulse }} />
              ) : (
                <h3>{seller.followers !== "" ? seller.followers : "-"}</h3>
              )}
            </div>

            <div className="seller-profile-stat-box">
              <p>{t("auctions")}</p>
              {sellerLoading ? (
                <div style={{ width: 40, height: 18, borderRadius: 8, margin: "18px auto 0", ...skeletonPulse }} />
              ) : (
                <h3>{seller.completedOrders !== "" ? seller.completedOrders : "-"}</h3>
              )}
            </div>

            <div className="seller-profile-stat-box">
              <p>{t("upgrade")}</p>
              {sellerLoading ? (
                <div style={{ width: 70, height: 18, borderRadius: 8, margin: "18px auto 0", ...skeletonPulse }} />
              ) : (
                <h3>{seller.upgradeType || "-"}</h3>
              )}
            </div>
          </div>

          <button type="button" className="seller-profile-link-card" style={linkButtonStyle} onClick={() => handleVerifiedNavigation("/seller-reviews")}>
            <div className="seller-profile-card seller-profile-simple-row">
              <span>{t("myReviews")}</span>
            </div>
          </button>

          {/* ── Language ── */}
          <div
            className="seller-profile-card seller-profile-setting-row"
            onClick={() => setLanguage(isArabic ? "en" : "ar")}
            style={{ cursor: "pointer" }}
          >
            <span>{t("language")} ({isArabic ? "AR" : "EN"})</span>
          </div>

          {/* ── Appearance ── */}
          <div className="seller-profile-card seller-profile-setting-row">
            <span>{t("appearance", { defaultValue: "Appearance" })}</span>
            <div className="seller-profile-dark-toggle-wrap">
              <span className="seller-profile-dark-label">
                {darkModeActive ? t("darkMode", { defaultValue: "Dark Mode" }) : t("lightMode", { defaultValue: "Light Mode" })}
              </span>
              <label className="seller-profile-switch">
                <input type="checkbox" checked={darkModeActive} onChange={toggleDarkMode} />
                <span className="seller-profile-slider"></span>
              </label>
            </div>
          </div>

          <button type="button" className="seller-profile-link-card" style={linkButtonStyle} onClick={() => handleVerifiedNavigation("/seller-wallet")}>
            <div className="seller-profile-card seller-profile-setting-row">
              <span>{t("wallet")}</span>
            </div>
          </button>

          <button type="button" className="seller-profile-link-card" style={linkButtonStyle} onClick={() => handleVerifiedNavigation("/seller-change-password")}>
            <div className="seller-profile-card seller-profile-setting-row">
              <span>{t("changePassword")}</span>
            </div>
          </button>

          <button type="button" className="seller-profile-link-card" style={linkButtonStyle} onClick={() => navigate("/help-&-support")}>
            <div className="seller-profile-card seller-profile-setting-row">
              <span>{t("helpSupport")}</span>
            </div>
          </button>

          {/* ── Account Management ── */}
          <div className="profile-account-section">
            <div className="profile-card">
              <div
                className="profile-collapse-header"
                onClick={() => setAccountOpen(!accountOpen)}
                role="button"
                tabIndex={0}
              >
                <span>{t("accountManagement")}</span>
                <i className={`fa-solid fa-chevron-${accountOpen ? "up" : "down"}`}></i>
              </div>
            </div>

            {accountOpen && (
              <div className="profile-account-dropdown">
                <div
                  className="profile-account-link profile-account-link-logout"
                  onClick={openConfirm}
                  role="button"
                  tabIndex={0}
                >
                  {t("logout")}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Verification required popup ── */}
      {verificationPopupOpen && (
        <div
          onClick={() => setVerificationPopupOpen(false)}
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 99999, padding: 16,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%", maxWidth: 430, background: "#fff",
              borderRadius: 18, padding: 24,
              boxShadow: "0 20px 50px rgba(0,0,0,0.18)",
              textAlign: "center", direction: isArabic ? "rtl" : "ltr",
            }}
          >
            <h3 style={{ margin: 0, marginBottom: 12, color: "#023E8A", fontWeight: 800, fontSize: 22 }}>
              {t("verificationRequired", { defaultValue: "Verification Required" })}
            </h3>
            <p style={{ margin: 0, color: "#5f6c7b", lineHeight: 1.7 }}>
              {t("youHaveToVerifyToContinue", { defaultValue: "You have to verify to continue." })}
            </p>
            <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 22, flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={goToVerification}
                style={{
                  border: "none", background: "#023E8A", color: "#fff",
                  borderRadius: 10, padding: "10px 18px", fontWeight: 800,
                  cursor: "pointer", minWidth: 120,
                }}
              >
                {effectiveVerificationStatus === "pending"
                  ? t("review", { defaultValue: "Review" })
                  : t("verifyNow", { defaultValue: "Verify Now" })}
              </button>
              <button
                type="button"
                onClick={() => setVerificationPopupOpen(false)}
                style={{
                  border: "1px solid #d9d9d9", background: "#fff", color: "#444",
                  borderRadius: 10, padding: "10px 18px", fontWeight: 800,
                  cursor: "pointer", minWidth: 120,
                }}
              >
                {t("cancel", { defaultValue: "Cancel" })}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Logout confirm ── */}
      {confirmOpen && (
        <div className="profile-modal-backdrop" onClick={closeConfirm}>
          <div className="profile-modal" onClick={(e) => e.stopPropagation()} dir={isArabic ? "rtl" : "ltr"}>
            <div className="profile-modal-head">
              <div className="profile-modal-title">{t("logoutTitle", "Log out?")}</div>
              <div className="profile-modal-text">{t("logoutConfirmText", "Are you sure you want to log out?")}</div>
            </div>
            <div className="profile-modal-actions">
              <button type="button" onClick={onConfirm} className="profile-modal-primary">
                {t("logout", "Logout")}
              </button>
              <button type="button" onClick={closeConfirm} className="profile-modal-secondary">
                {t("cancel", "Cancel")}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}