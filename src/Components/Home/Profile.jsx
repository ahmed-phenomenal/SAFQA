import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { setLanguage } from "../../utiles/setLanguage";
import { forgetPasswordSignoutAll } from "../../API/auth";
import { clearStoredSession } from "../../API/authAccess";
import icon from "../../assets/2.png";
import { getUserDisplayProfile } from "../../API/userProfile";
import Navbar from "../Sign-in/Navbar";

const skeletonPulse = {
  animation: "userProfileSkeletonPulse 1.4s ease-in-out infinite",
  background: "linear-gradient(90deg, #ececec 25%, #f5f5f5 37%, #ececec 63%)",
  backgroundSize: "400% 100%",
};

export default function Profile() {
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState(true);
  const [appInfoOpen, setAppInfoOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmType, setConfirmType] = useState(null);

  const { i18n, t } = useTranslation();
  const isArabic = i18n.language === "ar";

  const [profileData, setProfileData] = useState({
    fullName: "",
    email: "",
    image: "",
    imageSrc: "",
  });

  const [profileLoading, setProfileLoading] = useState(true);

  useEffect(() => {
    document.title = t("profileDocTitle", "Profile");
  }, [t]);

  useEffect(() => {
    const link = document.querySelector("link[rel~='icon']");

    if (!link) {
      const newLink = document.createElement("link");
      newLink.rel = "icon";
      newLink.href = icon;
      document.head.appendChild(newLink);
    } else {
      link.href = icon;
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    const loadProfile = async () => {
      try {
        setProfileLoading(true);

        const data = await getUserDisplayProfile();

        if (!mounted) return;

        setProfileData({
          fullName: data?.fullName || "",
          email: data?.email || "",
          image: data?.image || "",
          imageSrc: data?.imageSrc || "",
        });
      } catch {
        if (!mounted) return;

        setProfileData({
          fullName: "",
          email: "",
          image: "",
          imageSrc: "",
        });
      } finally {
        if (mounted) setProfileLoading(false);
      }
    };

    loadProfile();

    return () => {
      mounted = false;
    };
  }, []);

  const user = useMemo(
    () => ({
      fullName: profileData.fullName || "",
      email: profileData.email || "",
      imageSrc: profileData.imageSrc || "",
    }),
    [profileData]
  );

  const doLogout = async () => {
    try {
      await forgetPasswordSignoutAll();
    } catch (error) {
      console.log(error?.response?.data || error.message);
    } finally {
      clearStoredSession();
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
    confirmType === "logout"
      ? t("logoutTitle", "Log out?")
      : t("deactivateTitle", "Deactivate account?");

  const confirmText =
    confirmType === "logout"
      ? t("logoutConfirmText", "Are you sure you want to log out?")
      : t(
          "deactivateConfirmText",
          "Are you sure you want to deactivate your account?"
        );

  const confirmBtnText =
    confirmType === "logout"
      ? t("logout", "Logout")
      : t("deactivateAccount", "Deactivate Account");

  return (
    <>
    <Navbar />
      <style>
        {`
          @keyframes userProfileSkeletonPulse {
            0% { background-position: 100% 50%; }
            100% { background-position: 0 50%; }
          }
          .seller-profile{
          padding:120px 0 0;
          }
          .seller-profile-account-dropdown {
            display: grid !important;
            grid-template-columns: 1fr !important;
            gap: 0 !important;
            width: 100%;
            background: #ffffff;
            border-radius: 0 0 18px 18px;
            overflow: hidden;
          }

          .seller-profile-account-link {
            display: block !important;
            width: 100%;
            padding: 14px 18px;
            text-decoration: none;
            color: #0b3a86;
            font-weight: 700;
            border-top: 1px solid #eef2f7;
            text-align: inherit;
          }

          .seller-profile-account-link:hover {
            background: #f3f6fb;
          }

          .seller-profile-account-link-logout,
          .seller-profile-account-link-deactivate {
            color: #d11a2a;
          }

          .seller-profile-collapse-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            width: 100%;
          }
        `}
      </style>

      <div className="seller-profile" dir={isArabic ? "rtl" : "ltr"}>
        <div className="seller-profile-container">
          <h1 className="seller-profile-title">
            {t("profileTitle", "PROFILE")}
          </h1>

          <div className="seller-profile-card seller-profile-user-card">
            <Link
              to="/account"
              className="seller-profile-link-card"
              style={{ flex: 1, textDecoration: "none", color: "inherit" }}
            >
              <div className="seller-profile-user-left">
                {profileLoading ? (
                  <>
                    <div
                      className="seller-profile-avatar"
                      style={{ borderRadius: "50%", ...skeletonPulse }}
                    />

                    <div
                      className="seller-profile-user-info"
                      style={{ minWidth: 180 }}
                    >
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
                    {user.imageSrc ? (
                      <img
                        src={user.imageSrc}
                        alt="profile"
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
                      <h3>{user.fullName || "-"}</h3>
                      <p>{user.email || "-"}</p>
                    </div>
                  </>
                )}
              </div>
            </Link>

            <Link
              to="/account-edit"
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
              title={t("editProfile", "Edit profile")}
            >
              <i className="fa-solid fa-pen"></i>
            </Link>
          </div>

          <div className="seller-profile-card seller-profile-setting-row">
            <span>{t("notifications", "Notifications")}</span>

            <label className="seller-profile-switch">
              <input
                type="checkbox"
                checked={notifications}
                onChange={() => setNotifications(!notifications)}
              />
              <span className="seller-profile-slider"></span>
            </label>
          </div>

          <Link to="/orders" className="seller-profile-link-card">
            <div className="seller-profile-card seller-profile-simple-row">
              <span>{t("orders", "Orders")}</span>
            </div>
          </Link>

          <Link to="/wallet" className="seller-profile-link-card">
            <div className="seller-profile-card seller-profile-setting-row">
              <span>{t("wallet", "Wallet")}</span>
            </div>
          </Link>

          <div
            className="seller-profile-card seller-profile-setting-row"
            onClick={() => setLanguage(isArabic ? "en" : "ar")}
            style={{ cursor: "pointer" }}
          >
            <span>
              {t("language", "Language")} ({isArabic ? "AR" : "EN"})
            </span>
          </div>

          <Link to="/change-password" className="seller-profile-link-card">
            <div className="seller-profile-card seller-profile-setting-row">
              <span>{t("changePassword", "Change Password")}</span>
            </div>
          </Link>

          <Link to="/help-&-support" className="seller-profile-link-card">
            <div className="seller-profile-card seller-profile-setting-row">
              <span>{t("helpSupport", "Help & Support")}</span>
            </div>
          </Link>

          <div className="seller-profile-account-section">
            <div className="seller-profile-card">
              <div
                className="seller-profile-collapse-header"
                onClick={() => setAppInfoOpen(!appInfoOpen)}
                style={{ cursor: "pointer" }}
              >
                <span>{t("appInfo", "App Info")}</span>
                <i
                  className={`fa-solid fa-chevron-${
                    appInfoOpen ? "up" : "down"
                  } seller-profile-chevron`}
                ></i>
              </div>
            </div>

            {appInfoOpen && (
              <div className="seller-profile-account-dropdown">
                <Link to="/How_To_Bid" className="seller-profile-account-link">
                  {t("howToBid.pageTitle", "How To Bid")}
                </Link>

                <Link
                  to="/Terms&Conditions"
                  className="seller-profile-account-link"
                >
                  {t("terms.title", "Terms & Conditions")}
                </Link>

                <Link
                  to="/Privacy_Policy"
                  className="seller-profile-account-link"
                >
                  {t("privacyPageTitle", "Privacy Policy")}
                </Link>
              </div>
            )}
          </div>

          <div className="seller-profile-account-section">
            <div className="seller-profile-card">
              <div
                className="seller-profile-collapse-header"
                onClick={() => setAccountOpen(!accountOpen)}
                style={{ cursor: "pointer" }}
              >
                <span>{t("accountManagement", "Account Management")}</span>
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
                  {t("logout", "Logout")}
                </div>

                <div
                  className="seller-profile-account-link seller-profile-account-link-deactivate"
                  style={{ cursor: "pointer" }}
                  onClick={() => openConfirm("deactivate")}
                >
                  {t("deactivateAccount", "Deactivate Account")}
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
                {t("cancel", "Cancel")}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}