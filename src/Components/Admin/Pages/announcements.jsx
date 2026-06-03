import { Link, useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { setLanguage } from "../../../utiles/setLanguage";
import { applyTheme, getSavedTheme, saveTheme } from "../../../utiles/themeManager";
import icon from "../../../assets/Person at the Center of Circles.png";
import "../admin.css";

/* ================================================================
   ANNOUNCEMENTS COMPONENT
   ================================================================ */

export default function Announcements() {
  const navigate = useNavigate();
  const location = useLocation();
  const { i18n, t } = useTranslation();
  const isArabic = i18n.language === "ar";

  /* --- theme --- */
  const [theme, setTheme] = useState(() => getSavedTheme());
  const darkModeActive = theme === "dark";

  useEffect(() => { applyTheme(theme); }, [theme]);

  const toggleDarkMode = () => {
    const next = darkModeActive ? "light" : "dark";
    setTheme(next);
    saveTheme(next);
    applyTheme(next);
  };

  /* --- sidebar --- */
  const [sidebarShrinked, setSidebarShrinked] = useState(false);
  const toggleSidebar = () => setSidebarShrinked((p) => !p);
  const isActive = (path) => (location.pathname === path ? "active" : "");

  /* --- year --- */
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);

  useEffect(() => { document.title = `Admin | Announcements ${selectedYear}`; }, [selectedYear]);

  /* --- favicon --- */
  useEffect(() => {
    const link = document.querySelector("link[rel~='icon']") || document.createElement("link");
    link.rel  = "icon";
    link.href = icon;
    document.head.appendChild(link);
  }, []);

  /* --- state --- */
  const [announcements, setAnnouncements] = useState([]);
  const [message, setMessage] = useState("");

  /* --- send --- */
  const sendAnnouncement = () => {
    if (!message.trim()) return;
    setAnnouncements((prev) => [
      { id: Date.now(), content: message, date: new Date().toLocaleString() },
      ...prev,
    ]);
    setMessage("");
  };

  /* --- logout --- */
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

  /* ============================================================ */
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
          <li>
            <Link to="/admin_delivery">
              <i className="fa fa-truck" />
              <span>{t("adminDelivery", "Admin Delivery")}</span>
            </Link>
          </li>
          <li className={isActive("/admin_track_chats")}>
            <Link to="/admin_track_chats">
              <i className="fa fa-comments" />
              <span>{t("trackChats", "Track Chats")}</span>
            </Link>
          </li>
          <li>
            <Link to="/admin_reports">
              <i className="fa-solid fa-clipboard-list" />
              <span>{t("reports", "Reports")}</span>
            </Link>
          </li>
          <li>
            <Link  className={isActive("/admin_announcements")} to="/admin_announcements">
              <i className="fa fa-bullhorn" />
              <span>{t("announcements", "Announcements")}</span>
            </Link>
          </li>
        </ul>
      </aside>

      {/* ── MAIN CONTENT ── */}
      <main className={`admin-content ${sidebarShrinked ? "active" : ""}`}>
        <div className="ann-page">

          <h2 className="ann-page-title">
            {t("globalAnnouncements", "Global Announcements")}
          </h2>

          {/* ── Send box ── */}
          <section className="ann-send-box">
            <h4 className="ann-send-title">
              <i className="fa fa-paper-plane" />
              {t("sendGlobalAnnouncement", "Send Global Announcement")}
            </h4>

            <textarea
              className="ann-textarea"
              placeholder={t("announcementPlaceholder", "Write your global announcement message here...")}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />

            <div className="ann-btn-wrapper">
              <button className="ann-send-btn" onClick={sendAnnouncement}>
                <i className="fa fa-paper-plane" />
                {t("sendAnnouncement", "Send Announcement")}
              </button>
            </div>
          </section>

          {/* ── Stats ── */}
          <section className="ann-stats-section">
            <h4 className="ann-stats-title">
              {t("announcementsSummary", "Announcements Summary")}
            </h4>
            <div className="ann-stats-grid">
              <AnnStatCard
                label={t("totalAnnouncements", "Total Announcements")}
                value={announcements.length}
                icon="bullhorn"
              />
            </div>
          </section>

          {/* ── Table ── */}
          <div className="ann-table-card">
            <table className="ann-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>{t("message", "Message")}</th>
                  <th>{t("date", "Date")}</th>
                </tr>
              </thead>
              <tbody>
                {announcements.length === 0 ? (
                  <tr>
                    <td colSpan="3" className="ann-table-empty">
                      {t("noAnnouncements", "No announcements sent yet.")}
                    </td>
                  </tr>
                ) : (
                  announcements.map((a, i) => (
                    <tr key={a.id}>
                      <td className="ann-table-num">{i + 1}</td>
                      <td className="ann-table-msg">{a.content}</td>
                      <td className="ann-table-date">{a.date}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

        </div>{/* /.ann-page */}
      </main>

    </div>
  );
}

/* ── Stat Card ── */
function AnnStatCard({ label, value, icon }) {
  return (
    <div className="ann-stat-card">
      <i className={`fa fa-${icon} ann-stat-icon`} />
      <div>
        <p className="ann-stat-label">{label}</p>
        <h3 className="ann-stat-value">{value}</h3>
      </div>
    </div>
  );
}