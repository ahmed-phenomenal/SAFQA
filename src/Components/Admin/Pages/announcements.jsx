import { Link, useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { setLanguage } from "../../../utiles/setLanguage";
import { applyTheme, getSavedTheme, saveTheme } from "../../../utiles/themeManager";
import icon from "../../../assets/Person at the Center of Circles.png";
import "../admin.css";

export default function Announcements() {
  const navigate = useNavigate();
  const location = useLocation();
  const { i18n, t } = useTranslation();
  const isArabic = i18n.language === "ar";

  const [theme, setTheme] = useState(() => getSavedTheme());
  const darkModeActive = theme === "dark";

  useEffect(() => { applyTheme(theme); }, [theme]);

  const toggleDarkMode = () => {
    const next = darkModeActive ? "light" : "dark";
    setTheme(next);
    saveTheme(next);
    applyTheme(next);
  };

  const [sidebarShrinked, setSidebarShrinked] = useState(false);
  const toggleSidebar = () => setSidebarShrinked((p) => !p);
  const isActive = (path) => (location.pathname === path ? "active" : "");

  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);

  useEffect(() => { document.title = `Admin | Announcements ${selectedYear}`; }, [selectedYear]);

  useEffect(() => {
    const link = document.querySelector("link[rel~='icon']") || document.createElement("link");
    link.rel = "icon";
    link.href = icon;
    document.head.appendChild(link);
  }, []);

  const [announcements, setAnnouncements] = useState([]);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [connectionError, setConnectionError] = useState(false);
  const [authError, setAuthError] = useState(false);

  const API_BASE_URL = "https://e-safqa.runasp.net";
  const API_KEY = "abc123xyhgfhjgkiho3544351z";

  const getAuthToken = () => {
    return localStorage.getItem("token") ||
           sessionStorage.getItem("token") ||
           localStorage.getItem("adminToken") ||
           sessionStorage.getItem("adminToken") ||
           localStorage.getItem("accessToken") ||
           sessionStorage.getItem("accessToken");
  };

  const getDeviceId = () => {
    return localStorage.getItem("DeviceId") ||
           localStorage.getItem("deviceId") ||
           sessionStorage.getItem("DeviceId") || "";
  };

  const fetchWithTimeout = async (url, options = {}, timeout = 15000) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    try {
      const response = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === "AbortError") throw new Error("Request timeout");
      throw error;
    }
  };

  useEffect(() => {
    const saved = localStorage.getItem("admin_announcements");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) setAnnouncements(parsed);
      } catch (e) {
        console.error("Failed to parse saved announcements", e);
      }
    }
  }, []);

  useEffect(() => {
    if (announcements.length > 0) {
      localStorage.setItem("admin_announcements", JSON.stringify(announcements));
    }
  }, [announcements]);

  const sendAnnouncement = async () => {
    if (!message.trim()) {
      setError(t("pleaseEnterMessage", "Please enter a message"));
      setTimeout(() => setError(""), 3000);
      return;
    }

    setIsSending(true);
    setError("");
    setSuccessMsg("");
    setAuthError(false);

    const token = getAuthToken();

    if (!token) {
      setError(t("authError", "Authentication error. No token found. Please login again."));
      setIsSending(false);
      return;
    }

    try {
      const requestBody = {
        title: title.trim() || "Admin Announcement",
        message: message.trim(),
      };

      const response = await fetchWithTimeout(
        `${API_BASE_URL}/api/Announcement/send-global`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json",
            "x-api-key": API_KEY,
            "DeviceId": getDeviceId(),
          },
          body: JSON.stringify(requestBody),
        },
        15000
      );

      if (response.ok) {
        const result = await response.json().catch(() => ({}));

        const newAnnouncement = {
          id: result.id || Date.now(),
          title: title.trim() || "Admin Announcement",
          content: message.trim(),
          date: new Date().toLocaleString(),
        };

        setAnnouncements((prev) => [newAnnouncement, ...prev]);
        setTitle("");
        setMessage("");
        setSuccessMsg(t("announcementSent", "Announcement sent successfully!"));
        setConnectionError(false);
        setAuthError(false);
        setTimeout(() => setSuccessMsg(""), 3000);

      } else if (response.status === 401) {
        setError(t("unauthorized", "Authentication failed. Your token may have expired. Please login again."));
        setAuthError(true);
      } else {
        let errorMessage = t("failedToSend", "Failed to send announcement");
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorData.error || errorMessage;
        } catch (e) {
          if (response.statusText) errorMessage = `${response.status}: ${response.statusText}`;
        }
        setError(errorMessage);
        setTimeout(() => setError(""), 4000);
      }
    } catch (err) {
      console.error("Send announcement error:", err);
      let errorMsg = t("networkError", "Network error. Please check your connection.");
      if (err.message === "Request timeout") {
        errorMsg = t("timeoutError", "Request timeout. The server might be slow or unreachable.");
      } else if (err.message.includes("Failed to fetch") || err.message.includes("ERR_CONNECTION_REFUSED")) {
        errorMsg = t("connectionRefused", "Cannot connect to server. Please check your internet connection.");
        setConnectionError(true);
      }
      setError(errorMsg);
      setTimeout(() => setError(""), 5000);
    } finally {
      setIsSending(false);
    }
  };

  const clearAllAnnouncements = () => {
    if (window.confirm(t("confirmClearAll", "Are you sure you want to clear all announcements? This cannot be undone."))) {
      setAnnouncements([]);
      localStorage.removeItem("admin_announcements");
      setSuccessMsg(t("allCleared", "All announcements cleared"));
      setTimeout(() => setSuccessMsg(""), 3000);
    }
  };

  const handleRelogin = () => {
    ["token", "adminToken", "accessToken", "refreshToken"].forEach((key) => {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    });
    navigate("/login", { replace: true });
  };

  const handleLogout = () => {
    const AUTH_KEYS = [
      "token","userToken","sellerToken","adminToken","refreshToken",
      "role","accountType","userRole","sellerId","currentUserEmail",
      "pendingEmail","authLoginHintAccountType","lastActivityAt",
    ];
    AUTH_KEYS.forEach((key) => {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    });
    navigate("/login", { replace: true });
  };

  return (
    <div
      className={`admin-layout admin-ann ${darkModeActive ? "dark-admin" : ""}`}
      dir={isArabic ? "rtl" : "ltr"}
    >
      {/* ── NAVBAR ── */}
      <header className="admin-navbar">
        <div className="left">
          <button className="toggle-btn" onClick={toggleSidebar}>
            <i className="fa fa-bars" />
          </button>
          <div className="brand">
            <i className="fa fa-bullhorn" />
            <span>Safqa Admin</span>
          </div>
        </div>
        <div className="right">
          <button
            className="admin-nav-icon-btn"
            onClick={() => setLanguage(isArabic ? "en" : "ar")}
            title={isArabic ? "Switch to English" : "التبديل إلى العربية"}
          >
            {isArabic ? "EN" : "ع"}
          </button>
          <button className="admin-nav-icon-btn" onClick={toggleDarkMode}>
            <i className={`fa-solid ${darkModeActive ? "fa-sun" : "fa-moon"}`} />
          </button>
          <span className="admin-year-badge">{new Date().getFullYear()}</span>
          <button onClick={handleLogout} className="logout-btn">
            <i className="fa fa-sign-out" />
            <span>{t("logout", "Logout")}</span>
          </button>
        </div>
      </header>

      {/* ── SIDEBAR ── */}
      <aside className={`admin-sidebar ${sidebarShrinked ? "shrinked" : ""}`}>
        <ul>
          <li className={isActive("/admin")}>
            <Link to="/admin">
              <i className="fa fa-dashboard" />
              <span>{t("dashboard", "Dashboard")}</span>
            </Link>
          </li>
          <li>
            <Link to="/admin_users">
              <i className="fa fa-users" />
              <span>{t("allUsers", "All Users")}</span>
            </Link>
          </li>
          <li>
            <Link to="/admin_sellers">
              <i className="fa fa-user-secret" />
              <span>{t("allSellers", "All Sellers")}</span>
            </Link>
          </li>
          <li>
            <Link to="/admin_auctions">
              <i className="fa fa-gavel" />
              <span>{t("allAuctions", "All Auctions")}</span>
            </Link>
          </li>
          <li>
            <Link to="/admin_payments">
              <i className="fa fa-credit-card" />
              <span>{t("paymentLogs", "Payment Logs")}</span>
            </Link>
          </li>
          <li className={isActive("/admin_track_chats")}>
            <Link to="/admin_track_chats">
              <i className="fa fa-comments" />
              <span>{t("trackChats", "Track Chats")}</span>
            </Link>
          </li>
          <li>
            <Link className={isActive("/admin_announcements")} to="/admin_announcements">
              <i className="fa fa-bullhorn" />
              <span>{t("announcements", "Announcements")}</span>
            </Link>
          </li>
        </ul>
      </aside>

      {/* ── MAIN CONTENT ── */}
      <main className={`admin-content ${sidebarShrinked ? "active" : ""}`}>
        <div className="ann-page">

          {/* ── FIX: inline color so dark mode always shows white ── */}
          <h2
            className="ann-page-title"
            style={{ color: darkModeActive ? "#f8fafc" : undefined }}
          >
            {t("globalAnnouncements", "Global Announcements")}
          </h2>

          {/* ── Send box ── */}
          <section className="ann-send-box">
            {/* ── FIX: inline color so dark mode always shows white ── */}
            <h4
              className="ann-send-title"
              style={{ color: darkModeActive ? "#f8fafc" : undefined }}
            >
              <i className="fa fa-paper-plane" />
              {t("sendGlobalAnnouncement", "Send Global Announcement")}
            </h4>

            {connectionError && (
              <div className="ann-connection-error" style={{
                color: "#856404", marginBottom: "1rem", padding: "0.75rem",
                backgroundColor: "#fff3cd", borderRadius: "8px",
                border: "1px solid #ffeeba", fontSize: "14px"
              }}>
                <i className="fa fa-exclamation-triangle" style={{ marginRight: "8px" }} />
                {t("connectionError", "⚠️ Cannot connect to server. Please check your internet connection.")}
              </div>
            )}

            {authError && (
              <div className="ann-auth-error" style={{
                color: "#721c24", marginBottom: "1rem", padding: "0.75rem",
                backgroundColor: "#f8d7da", borderRadius: "8px",
                border: "1px solid #f5c6cb", display: "flex",
                justifyContent: "space-between", alignItems: "center",
                flexWrap: "wrap", gap: "10px"
              }}>
                <span>
                  <i className="fa fa-exclamation-circle" style={{ marginRight: "8px" }} />
                  {t("authErrorMessage", "Authentication failed. Your session may have expired.")}
                </span>
                <button
                  onClick={handleRelogin}
                  style={{
                    padding: "6px 16px", backgroundColor: "#dc3545", color: "white",
                    border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "13px"
                  }}
                >
                  {t("loginAgain", "Login Again")}
                </button>
              </div>
            )}

            {error && !authError && (
              <div className="ann-error-message" style={{
                color: "#721c24", marginBottom: "1rem", padding: "0.75rem",
                backgroundColor: "#f8d7da", borderRadius: "8px", border: "1px solid #f5c6cb"
              }}>
                <i className="fa fa-exclamation-circle" style={{ marginRight: "8px" }} />
                {error}
              </div>
            )}

            {successMsg && (
              <div className="ann-success-message" style={{
                color: "#155724", marginBottom: "1rem", padding: "0.75rem",
                backgroundColor: "#d4edda", borderRadius: "8px", border: "1px solid #c3e6cb"
              }}>
                <i className="fa fa-check-circle" style={{ marginRight: "8px" }} />
                {successMsg}
              </div>
            )}

            <div style={{ marginBottom: "16px" }}>
              <label style={{
                display: "block", marginBottom: "8px", fontWeight: "500",
                color: darkModeActive ? "#f8fafc" : "#1e293b"
              }}>
                {t("title", "Title")}{" "}
                <span style={{ color: "#94a3b8", fontSize: "12px" }}>({t("optional", "Optional")})</span>
              </label>
              <input
                type="text"
                className="ann-title-input"
                placeholder={t("titlePlaceholder", "Enter announcement title...")}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={isSending}
                style={{
                  width: "100%", padding: "12px", borderRadius: "8px",
                  border: `1px solid ${darkModeActive ? "#334155" : "#e2e8f0"}`,
                  backgroundColor: darkModeActive ? "#1e293b" : "#ffffff",
                  color: darkModeActive ? "#f8fafc" : "#1e293b", fontSize: "14px",
                }}
              />
            </div>

            <div style={{ marginBottom: "16px" }}>
              <label style={{
                display: "block", marginBottom: "8px", fontWeight: "500",
                color: darkModeActive ? "#f8fafc" : "#1e293b"
              }}>
                {t("message", "Message")}{" "}
                <span style={{ color: "#ef4444", fontSize: "12px" }}>*</span>
              </label>
              <textarea
                className="ann-textarea"
                placeholder={t("announcementPlaceholder", "Write your global announcement message here...")}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                disabled={isSending}
                rows={4}
                style={{
                  width: "100%", padding: "12px", borderRadius: "8px",
                  border: `1px solid ${darkModeActive ? "#334155" : "#e2e8f0"}`,
                  backgroundColor: darkModeActive ? "#1e293b" : "#ffffff",
                  color: darkModeActive ? "#f8fafc" : "#1e293b",
                  fontSize: "14px", resize: "vertical",
                }}
              />
            </div>

            <div className="ann-btn-wrapper" style={{ marginTop: "16px", display: "flex", gap: "12px" }}>
              <button
                className="ann-send-btn"
                onClick={sendAnnouncement}
                disabled={isSending || !message.trim() || authError}
                style={{
                  padding: "10px 24px", borderRadius: "8px", border: "none",
                  backgroundColor: (isSending || !message.trim() || authError) ? "#94a3b8" : "#3b82f6",
                  color: "#ffffff",
                  cursor: (isSending || !message.trim() || authError) ? "not-allowed" : "pointer",
                  fontWeight: "600", transition: "all 0.2s",
                  opacity: (isSending || !message.trim() || authError) ? 0.6 : 1,
                }}
              >
                <i className="fa fa-paper-plane" style={{ marginRight: "8px" }} />
                {isSending ? t("sending", "Sending...") : t("sendAnnouncement", "Send Announcement")}
              </button>

              {announcements.length > 0 && (
                <button
                  onClick={clearAllAnnouncements}
                  style={{
                    padding: "10px 20px", borderRadius: "8px",
                    border: `1px solid ${darkModeActive ? "#ef4444" : "#dc3545"}`,
                    backgroundColor: "transparent",
                    color: darkModeActive ? "#ef4444" : "#dc3545",
                    cursor: "pointer", fontWeight: "500", transition: "all 0.2s",
                  }}
                >
                  <i className="fa fa-trash" style={{ marginRight: "8px" }} />
                  {t("clearAll", "Clear All")}
                </button>
              )}
            </div>
          </section>

          {/* ── Stats ── */}
          <section className="ann-stats-section">
            {/* ── FIX: inline color so dark mode always shows white ── */}
            <h4
              className="ann-stats-title"
              style={{ color: darkModeActive ? "#f8fafc" : undefined }}
            >
              {t("announcementsSummary", "Announcements Summary")}
            </h4>
            <div className="ann-stats-grid">
              <AnnStatCard
                label={t("totalAnnouncements", "Total Announcements")}
                value={announcements.length}
                icon="bullhorn"
                darkMode={darkModeActive}
              />
            </div>
          </section>

          {/* ── Table ── */}
          <div className="ann-table-card">
            <table className="ann-table" style={{
              width: "100%", borderCollapse: "collapse",
              backgroundColor: darkModeActive ? "#0f172a" : "#ffffff",
              borderRadius: "12px", overflow: "hidden",
            }}>
              <thead>
                <tr style={{
                  backgroundColor: darkModeActive ? "#1e293b" : "#f8fafc",
                  borderBottom: `1px solid ${darkModeActive ? "#334155" : "#e2e8f0"}`,
                }}>
                  <th style={{ padding: "12px", textAlign: "left", color: darkModeActive ? "#f8fafc" : undefined }}>#</th>
                  <th style={{ padding: "12px", textAlign: "left", color: darkModeActive ? "#f8fafc" : undefined }}>{t("title", "Title")}</th>
                  <th style={{ padding: "12px", textAlign: "left", color: darkModeActive ? "#f8fafc" : undefined }}>{t("message", "Message")}</th>
                  <th style={{ padding: "12px", textAlign: "left", color: darkModeActive ? "#f8fafc" : undefined }}>{t("date", "Date")}</th>
                </tr>
              </thead>
              <tbody>
                {announcements.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="ann-table-empty" style={{
                      textAlign: "center", padding: "40px", color: "#94a3b8",
                    }}>
                      {t("noAnnouncements", "No announcements sent yet.")}
                    </td>
                  </tr>
                ) : (
                  announcements.map((a, i) => (
                    <tr key={a.id} style={{
                      borderBottom: `1px solid ${darkModeActive ? "#1e293b" : "#f1f5f9"}`,
                    }}>
                      <td style={{ padding: "12px", color: darkModeActive ? "#f8fafc" : undefined }}>{i + 1}</td>
                      <td style={{ padding: "12px", fontWeight: "500", color: darkModeActive ? "#f8fafc" : undefined }}>{a.title || "-"}</td>
                      <td style={{ padding: "12px", color: darkModeActive ? "#f8fafc" : undefined }}>{a.content}</td>
                      <td style={{ padding: "12px", color: darkModeActive ? "#f8fafc" : undefined }}>{a.date}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

        </div>
      </main>
    </div>
  );
}

function AnnStatCard({ label, value, icon, darkMode }) {
  return (
    <div className="ann-stat-card" style={{
      display: "flex", alignItems: "center", gap: "16px", padding: "20px",
      backgroundColor: darkMode ? "#1e293b" : "#ffffff", borderRadius: "12px",
      border: `1px solid ${darkMode ? "#334155" : "#e2e8f0"}`,
      boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
    }}>
      <i className={`fa fa-${icon} ann-stat-icon`} style={{ fontSize: "32px", color: "#3b82f6" }} />
      <div>
        <p className="ann-stat-label" style={{
          margin: 0, fontSize: "14px", color: darkMode ? "#94a3b8" : "#64748b",
        }}>{label}</p>
        <h3 className="ann-stat-value" style={{
          margin: "8px 0 0", fontSize: "28px", fontWeight: "700",
          color: darkMode ? "#f8fafc" : "#1e293b",
        }}>{value}</h3>
      </div>
    </div>
  );
}