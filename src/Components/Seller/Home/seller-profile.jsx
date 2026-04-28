import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { setLanguage } from "../../../utiles/setLanguage";
import { forgetPasswordSignoutAll } from "../../../API/auth";
import { clearStoredSession } from "../../../API/authAccess";
import icon from "../../../assets/2.png";
import "../seller.css";
import { getSellerDisplayProfile } from "../../../API/seller";

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

const normalizeProfileStatus = (sellerData) => {
  const raw = String(sellerData?.verificationStatus || "")
    .trim()
    .toLowerCase();

  if (raw === "verified") return "verified";
  if (raw === "pending") return "pending";
  if (raw === "rejected") return "rejected";

  const localSubmitted =
    sessionStorage.getItem("seller_verification_submitted") === "true" ||
    localStorage.getItem("seller_verification_submitted") === "true";

  return localSubmitted ? "pending" : "";
};

const statusBadgeStyle = (status) => {
  const value = String(status || "").toLowerCase();

  if (value === "pending") {
    return {
      background: "#fff4db",
      color: "#a46800",
      border: "1px solid #f0d48a",
    };
  }

  if (value === "verified") {
    return {
      background: "#e8f8ee",
      color: "#198754",
      border: "1px solid #b7e4c7",
    };
  }

  if (value === "rejected") {
    return {
      background: "#fdebec",
      color: "#c92a2a",
      border: "1px solid #f1b0b7",
    };
  }

  return {
    background: "#eef2f7",
    color: "#5c697d",
    border: "1px solid #d7dee8",
  };
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

  const [notifications, setNotifications] = useState(true);
  const [accountOpen, setAccountOpen] = useState(false);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmType, setConfirmType] = useState(null);

  const { i18n, t } = useTranslation();
  const isArabic = i18n.language === "ar";

  const [sellerData, setSellerData] = useState({
    name: "",
    email: "",
    image: "",
    storeName: "",
    phoneNumber: "",
    city: "",
    country: "",
    description: "",
    sellerRating: "",
    followers: "",
    auctionsCount: "",
    upgradeType: "",
    verificationStatus: "",
  });
  const [sellerLoading, setSellerLoading] = useState(true);

  useEffect(() => {
    document.title = t("sellerProfileDocTitle");
  }, [t]);

  useEffect(() => {
    const link = document.querySelector("link[rel~='icon']");
    if (link) link.href = icon;
  }, []);

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
          name: "",
          email: "",
          image: "",
          storeName: "",
          phoneNumber: "",
          city: "",
          country: "",
          description: "",
          sellerRating: "",
          followers: "",
          auctionsCount: "",
          upgradeType: "",
          verificationStatus: "",
        });
      } finally {
        if (mounted) setSellerLoading(false);
      }
    };

    loadSellerProfile();

    return () => {
      mounted = false;
    };
  }, []);

  const seller = useMemo(
    () => ({
      name: sellerData.name || "",
      email: sellerData.email || "",
      image: sellerData.image || "",
      storeName: sellerData.storeName || "",
      description: sellerData.description || "",
      rating: sellerData.sellerRating,
      completedOrders: sellerData.auctionsCount,
      followers: sellerData.followers,
      upgradeType: sellerData.upgradeType || "",
      verificationStatus: normalizeProfileStatus(sellerData),
    }),
    [sellerData]
  );

  const renderStars = (rating) => {
    const numericRating = Number(rating || 0);
    const fullStars = Math.round(numericRating);

    return (
      <div className="seller-stars">
        {Array.from({ length: 5 }).map((_, i) => (
          <span
            key={i}
            className={
              i < fullStars
                ? "seller-star seller-star-filled"
                : "seller-star seller-star-empty"
            }
          >
            ★
          </span>
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
      clearStoredSession();
      sessionStorage.clear();
      navigate("/login", { replace: true });
    }
  };

  const doDeactivate = async () => {
    await doLogout();
  };

  const openConfirm = (type) => {
    setConfirmType(type);
    setConfirmOpen(true);
  };

  const closeConfirm = () => {
    setConfirmOpen(false);
    setConfirmType(null);
  };

  const onConfirm = async () => {
    if (confirmType === "logout") {
      await doLogout();
      return;
    }

    if (confirmType === "deactivate") {
      await doDeactivate();
    }
  };

  const confirmTitle =
    confirmType === "logout" ? t("logoutTitle") : t("deactivateTitle");

  const confirmText =
    confirmType === "logout"
      ? t("logoutConfirmText")
      : t("deactivateConfirmText");

  const confirmBtnText =
    confirmType === "logout" ? t("logout") : t("deactivateAccount");

  return (
    <>
      <style>
        {`
          @keyframes sellerProfileSkeletonPulse {
            0% { background-position: 100% 50%; }
            100% { background-position: 0 50%; }
          }
        `}
      </style>

      <div className="seller-profile py-3" dir={isArabic ? "rtl" : "ltr"}>
        <div className="seller-profile-container">
          <h1 className="seller-profile-title">{t("profileTitle")}</h1>

          <div className="seller-profile-card seller-profile-user-card">
            <Link
              to="/seller-account"
              className="seller-profile-link-card"
              style={{ flex: 1, textDecoration: "none", color: "inherit" }}
            >
              <div className="seller-profile-user-left">
                {sellerLoading ? (
                  <>
                    <div
                      className="seller-profile-avatar"
                      style={{ borderRadius: "50%", ...skeletonPulse }}
                    />
                    <div className="seller-profile-user-info" style={{ minWidth: 180 }}>
                      <div
                        style={{
                          width: 120,
                          height: 16,
                          borderRadius: 8,
                          marginBottom: 10,
                          ...skeletonPulse,
                        }}
                      />
                      <div
                        style={{
                          width: 170,
                          height: 12,
                          borderRadius: 8,
                          ...skeletonPulse,
                        }}
                      />
                    </div>
                  </>
                ) : (
                  <>
                    {toImageSrc(seller.image) ? (
                      <img
                        src={toImageSrc(seller.image)}
                        alt={t("profile")}
                        className="seller-profile-avatar"
                      />
                    ) : (
                      <div
                        className="seller-profile-avatar"
                        style={{
                          background: "#eef2f7",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "#8a94a6",
                          fontSize: "28px",
                        }}
                      >
                        <i className="fa-regular fa-user"></i>
                      </div>
                    )}

                    <div className="seller-profile-user-info">
                      <h3>{seller.name || "-"}</h3>
                      <p>{seller.email || "-"}</p>
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
            </Link>

            <Link
              to="/seller-account-edit"
              style={{
                width: 38,
                height: 38,
                minWidth: 38,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "#f3f6fb",
                color: "#0b3a86",
                textDecoration: "none",
                border: "1px solid #e3e8ef",
              }}
              title={t("editProfile")}
            >
              <i className="fa-solid fa-pen"></i>
            </Link>
          </div>

          <div className="seller-profile-card seller-profile-setting-row">
            <span>{t("notifications")}</span>

            <label className="seller-profile-switch">
              <input
                type="checkbox"
                checked={notifications}
                onChange={() => setNotifications(!notifications)}
              />
              <span className="seller-profile-slider"></span>
            </label>
          </div>

          <Link to="/seller-Shipping-Orders" className="seller-profile-link-card">
            <div className="seller-profile-card seller-profile-simple-row">
              <span>{t("pendingShippingOrders")}</span>
            </div>
          </Link>

          <Link to="/seller-plans" className="seller-profile-link-card">
            <div className="seller-profile-card seller-profile-simple-row">
              <span>{t("plans")}</span>
            </div>
          </Link>

          <div className="seller-profile-card seller-profile-stats-grid">
            <div className="seller-profile-stat-box">
              <p>{t("rating")}</p>
              {sellerLoading ? (
                <>
                  <div
                    style={{
                      width: 70,
                      height: 14,
                      borderRadius: 8,
                      margin: "10px auto",
                      ...skeletonPulse,
                    }}
                  />
                  <div
                    style={{
                      width: 40,
                      height: 18,
                      borderRadius: 8,
                      margin: "0 auto",
                      ...skeletonPulse,
                    }}
                  />
                </>
              ) : (
                <>
                  <div className="seller-profile-stat-stars">
                    {renderStars(seller.rating)}
                  </div>
                  <h3>{seller.rating !== "" ? seller.rating : "-"}</h3>
                </>
              )}
            </div>

            <div className="seller-profile-stat-box">
              <p>{t("followers")}</p>
              {sellerLoading ? (
                <div
                  style={{
                    width: 40,
                    height: 18,
                    borderRadius: 8,
                    margin: "18px auto 0",
                    ...skeletonPulse,
                  }}
                />
              ) : (
                <h3>{seller.followers !== "" ? seller.followers : "-"}</h3>
              )}
            </div>

            <div className="seller-profile-stat-box">
              <p>{t("auctions")}</p>
              {sellerLoading ? (
                <div
                  style={{
                    width: 40,
                    height: 18,
                    borderRadius: 8,
                    margin: "18px auto 0",
                    ...skeletonPulse,
                  }}
                />
              ) : (
                <h3>{seller.completedOrders !== "" ? seller.completedOrders : "-"}</h3>
              )}
            </div>

            <div className="seller-profile-stat-box">
              <p>{t("upgrade")}</p>
              {sellerLoading ? (
                <div
                  style={{
                    width: 70,
                    height: 18,
                    borderRadius: 8,
                    margin: "18px auto 0",
                    ...skeletonPulse,
                  }}
                />
              ) : (
                <h3>{seller.upgradeType || "-"}</h3>
              )}
            </div>
          </div>

          <Link to="/seller-reviews" className="seller-profile-link-card">
            <div className="seller-profile-card seller-profile-simple-row">
              <span>{t("myReviews")}</span>
            </div>
          </Link>

          <div
            className="seller-profile-card seller-profile-setting-row"
            onClick={() => setLanguage(isArabic ? "en" : "ar")}
            style={{ cursor: "pointer" }}
          >
            <span>
              {t("language")} ({isArabic ? "AR" : "EN"})
            </span>
          </div>

          <Link to="/seller-wallet" className="seller-profile-link-card">
            <div className="seller-profile-card seller-profile-setting-row">
              <span>{t("wallet")}</span>
            </div>
          </Link>

          <Link to="/seller-change-password" className="seller-profile-link-card">
            <div className="seller-profile-card seller-profile-setting-row">
              <span>{t("changePassword")}</span>
            </div>
          </Link>

          <div className="seller-profile-card seller-profile-setting-row">
            <span>{t("helpSupport")}</span>
          </div>

          <div className="seller-profile-account-section">
            <div className="seller-profile-card">
              <div
                className="seller-profile-collapse-header"
                onClick={() => setAccountOpen(!accountOpen)}
              >
                <span>{t("accountManagement")}</span>
                <i
                  className={`fa-solid fa-chevron-${
                    accountOpen ? "up" : "down"
                  } seller-profile-chevron`}
                ></i>
              </div>
            </div>

            {accountOpen && (
              <div className="seller-profile-account-dropdown">
                <div
                  className="seller-profile-account-link seller-profile-account-link-logout"
                  style={{ cursor: "pointer" }}
                  onClick={() => openConfirm("logout")}
                >
                  {t("logout")}
                </div>

                <div
                  className="seller-profile-account-link seller-profile-account-link-deactivate"
                  style={{ cursor: "pointer" }}
                  onClick={() => openConfirm("deactivate")}
                >
                  {t("deactivateAccount")}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {confirmOpen && (
        <div
          onClick={closeConfirm}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 99999,
            padding: 16,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: 340,
              maxWidth: "95vw",
              background: "#fff",
              borderRadius: 14,
              boxShadow: "0 20px 50px rgba(0,0,0,0.25)",
              overflow: "hidden",
              direction: isArabic ? "rtl" : "ltr",
            }}
          >
            <div style={{ padding: "14px 16px 8px" }}>
              <div
                style={{
                  color: "#d11a2a",
                  fontWeight: 800,
                  fontSize: 16,
                  marginBottom: 6,
                  textAlign: "center",
                }}
              >
                {confirmTitle}
              </div>

              <div
                style={{
                  fontSize: 13,
                  color: "#6b7280",
                  textAlign: "center",
                  paddingBottom: 10,
                  borderBottom: "1px solid #eee",
                }}
              >
                {confirmText}
              </div>
            </div>

            <div
              style={{
                display: "flex",
                gap: 10,
                padding: 12,
                justifyContent: "center",
              }}
            >
              <button
                type="button"
                onClick={onConfirm}
                style={{
                  minWidth: 120,
                  padding: "10px 14px",
                  borderRadius: 10,
                  border: "none",
                  background: "#0b3a86",
                  color: "#fff",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                {confirmBtnText}
              </button>

              <button
                type="button"
                onClick={closeConfirm}
                style={{
                  minWidth: 120,
                  padding: "10px 14px",
                  borderRadius: 10,
                  border: "1px solid #cbd5e1",
                  background: "#fff",
                  color: "#0b3a86",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                {t("cancel")}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}