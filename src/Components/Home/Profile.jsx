import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { setLanguage } from "../../utiles/setLanguage";
import { forgetPasswordSignoutAll } from "../../API/auth";
import { clearStoredSession } from "../../API/authAccess";
import icon from "../../assets/2.png";
import { getUserDisplayProfile } from "../../API/userProfile";
import Navbar from "../Sign-in/Navbar";
import { applyTheme, getSavedTheme, saveTheme } from "../../utiles/themeManager";

export default function Profile() {
  const navigate = useNavigate();
  const { i18n, t } = useTranslation();
  const isArabic = i18n.language === "ar";

  const [notifications, setNotifications] = useState(true);
  const [appInfoOpen, setAppInfoOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [theme, setTheme] = useState(() => getSavedTheme());

  const [profileData, setProfileData] = useState({
    fullName: "",
    email: "",
    imageSrc: "",
  });

  const [profileLoading, setProfileLoading] = useState(true);

  useEffect(() => {
    document.title = t("profileDocTitle", "Profile");
  }, [t]);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    const link = document.querySelector("link[rel~='icon']");
    if (link) link.href = icon;
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
          imageSrc: data?.imageSrc || "",
        });
      } catch {
        if (!mounted) return;
        setProfileData({ fullName: "", email: "", imageSrc: "" });
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

  const darkModeActive = theme === "dark";

  const toggleDarkMode = () => {
    const nextTheme = darkModeActive ? "light" : "dark";
    setTheme(nextTheme);
    saveTheme(nextTheme);
    applyTheme(nextTheme);
  };

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

  const openConfirm = () => {
    setConfirmOpen(true);
  };

  const closeConfirm = () => {
    setConfirmOpen(false);
  };

  const onConfirm = async () => {
    await doLogout();
  };

  return (
    <>
      <Navbar />

      <main className="profile" dir={isArabic ? "rtl" : "ltr"}>
        <div className="profile-container">
          <h1 className="profile-title">{t("profileTitle", "PROFILE")}</h1>

          <div className="profile-card profile-user-card">
            <Link to="/account" className="profile-link-card">
              <div className="profile-user-left">
                {profileLoading ? (
                  <>
                    <div className="profile-avatar profile-skeleton-avatar" />
                    <div className="profile-user-info">
                      <div className="profile-skeleton-line profile-skeleton-name" />
                      <div className="profile-skeleton-line profile-skeleton-email" />
                    </div>
                  </>
                ) : (
                  <>
                    {user.imageSrc ? (
                      <img src={user.imageSrc} alt="profile" className="profile-avatar" />
                    ) : (
                      <div className="profile-avatar profile-avatar-placeholder">
                        <i className="fa-regular fa-user"></i>
                      </div>
                    )}

                    <div className="profile-user-info">
                      <h3>{user.fullName || "-"}</h3>
                      <p>{user.email || "-"}</p>
                    </div>
                  </>
                )}
              </div>
            </Link>

            <Link to="/account-edit" className="profile-edit-btn">
              <i className="fa-solid fa-pen"></i>
            </Link>
          </div>

          <div className="profile-card profile-setting-row">
            <span>{t("notifications", "Notifications")}</span>

            <label className="profile-switch">
              <input
                type="checkbox"
                checked={notifications}
                onChange={() => setNotifications(!notifications)}
              />
              <span className="profile-slider"></span>
            </label>
          </div>

          <Link to="/orders" className="profile-link-card">
            <div className="profile-card profile-simple-row">
              <span>{t("orders", "Orders")}</span>
            </div>
          </Link>
          <Link to="/my-reports" className="profile-link-card">
            <div className="profile-card profile-simple-row">
              <span>{t("myReports", "My Reports")}</span>
            </div>
          </Link>

          <Link to="/wallet" className="profile-link-card">
            <div className="profile-card profile-simple-row">
              <span>{t("wallet", "Wallet")}</span>
            </div>
          </Link>

          <div
            className="profile-card profile-simple-row"
            onClick={() => setLanguage(isArabic ? "en" : "ar")}
            role="button"
            tabIndex={0}
          >
            <span>
              {t("language", "Language")} ({isArabic ? "AR" : "EN"})
            </span>
          </div>

          <div className="profile-card profile-setting-row">
            <span>{t("appearance", "Appearance")}</span>

            <div className="profile-dark-toggle-wrap">
              <span className="profile-dark-label">
                {darkModeActive ? t("darkMode", "Dark Mode") : t("lightMode", "Light Mode")}
              </span>

              <label className="profile-switch">
                <input
                  type="checkbox"
                  checked={darkModeActive}
                  onChange={toggleDarkMode}
                />
                <span className="profile-slider"></span>
              </label>
            </div>
          </div>

          <Link to="/change-password" className="profile-link-card">
            <div className="profile-card profile-simple-row">
              <span>{t("changePassword", "Change Password")}</span>
            </div>
          </Link>

          <Link to="/help-&-support" className="profile-link-card">
            <div className="profile-card profile-simple-row">
              <span>{t("helpSupport", "Help & Support")}</span>
            </div>
          </Link>

          <div className="profile-account-section">
            <div className="profile-card">
              <div
                className="profile-collapse-header"
                onClick={() => setAppInfoOpen(!appInfoOpen)}
                role="button"
                tabIndex={0}
              >
                <span>{t("appInfo", "App Info")}</span>
                <i className={`fa-solid fa-chevron-${appInfoOpen ? "up" : "down"}`}></i>
              </div>
            </div>

            {appInfoOpen && (
              <div className="profile-account-dropdown">
                <Link to="/How_To_Bid" className="profile-account-link">
                  {t("howToBid.pageTitle", "How To Bid")}
                </Link>

                <Link to="/Terms&Conditions" className="profile-account-link">
                  {t("terms.title", "Terms & Conditions")}
                </Link>

                <Link to="/Privacy_Policy" className="profile-account-link">
                  {t("privacyPageTitle", "Privacy Policy")}
                </Link>
              </div>
            )}
          </div>

          <div className="profile-account-section">
            <div className="profile-card">
              <div
                className="profile-collapse-header"
                onClick={() => setAccountOpen(!accountOpen)}
                role="button"
                tabIndex={0}
              >
                <span>{t("accountManagement", "Account Management")}</span>
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
                  {t("logout", "Logout")}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {confirmOpen && (
        <div className="profile-modal-backdrop" onClick={closeConfirm}>
          <div
            className="profile-modal"
            onClick={(e) => e.stopPropagation()}
            dir={isArabic ? "rtl" : "ltr"}
          >
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