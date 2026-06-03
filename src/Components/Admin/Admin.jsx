import { Link, useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  CartesianGrid, Legend, PieChart, Pie, Cell,
} from "recharts";
import icon from "../../assets/Person at the Center of Circles.png";
import "./admin.css";
import api from "../../API/axios";
import { setLanguage } from "../../utiles/setLanguage";
import { applyTheme, getSavedTheme, saveTheme } from "../../utiles/themeManager";

// All keys written by Sign-in.jsx — must ALL be cleared on logout
const AUTH_KEYS = [
  "token",
  "userToken",
  "sellerToken",
  "adminToken",
  "refreshToken",
  "role",
  "accountType",
  "userRole",
  "sellerId",
  "currentUserEmail",
  "pendingEmail",
  "authLoginHintAccountType",
  "lastActivityAt",
];

function clearAllAuth() {
  AUTH_KEYS.forEach((key) => {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  });
}

export default function Admin() {
  const navigate = useNavigate();
  const location = useLocation();
  const { i18n, t } = useTranslation();
  const isArabic = i18n.language === "ar";

  const [theme, setTheme] = useState(() => getSavedTheme());
  const darkModeActive = theme === "dark";
  const [sidebarShrinked, setSidebarShrinked] = useState(false);

  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const years = [];
  for (let y = 2026; y <= currentYear; y++) years.push(y);

  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState({ total: 0, active: 0, blocked: 0 });
  const [sellers, setSellers] = useState({ total: 0, verified: 0, pending: 0 });
  const [auctions, setAuctions] = useState({ total: 0, active: 0, expired: 0, upcoming: 0 });
  const [payments, setPayments] = useState({ total: 0, success: 0, failed: 0 });
  const [chartWidths, setChartWidths] = useState({});

  useEffect(() => { applyTheme(theme); }, [theme]);
  useEffect(() => { document.title = `Admin | Dashboard ${selectedYear}`; }, [selectedYear]);
  useEffect(() => {
    const link = document.querySelector("link[rel~='icon']") || document.createElement("link");
    link.rel = "icon"; link.href = icon; document.head.appendChild(link);
  }, []);
  useEffect(() => { fetchDashboardData(); }, []);

  useEffect(() => {
    const updateWidths = () => {
      const containers = document.querySelectorAll(".admin-chart-container");
      const newWidths = {};
      containers.forEach((el) => {
        const key = el.getAttribute("data-key");
        if (key) newWidths[key] = el.clientWidth || 400;
      });
      setChartWidths(newWidths);
    };
    updateWidths();
    window.addEventListener("resize", updateWidths);
    return () => window.removeEventListener("resize", updateWidths);
  }, [loading]);

  const toggleDarkMode = () => {
    const next = darkModeActive ? "light" : "dark";
    setTheme(next); saveTheme(next); applyTheme(next);
  };

  const fetchDashboardData = async () => {
    setLoading(true);
    const requests = [
      { urls: ["/User/total-users"],                                        onSuccess: (v) => setUsers((p)    => ({ ...p, total:    v })) },
      { urls: ["/User/active-count"],                                       onSuccess: (v) => setUsers((p)    => ({ ...p, active:   v })) },
      { urls: ["/User/blocked-count"],                                      onSuccess: (v) => setUsers((p)    => ({ ...p, blocked:  v })) },
      { urls: ["/seller/total-sellers"],                                    onSuccess: (v) => setSellers((p)  => ({ ...p, total:    v })) },
      { urls: ["/seller/verified-sellers"],                                 onSuccess: (v) => setSellers((p)  => ({ ...p, verified: v })) },
      { urls: ["/seller/pending-sellers"],                                  onSuccess: (v) => setSellers((p)  => ({ ...p, pending:  v })) },
      { urls: ["/Auction/total-auctions",  "/auction/total-auctions"],     onSuccess: (v) => setAuctions((p) => ({ ...p, total:    v })) },
      { urls: ["/Auction/active-auctions", "/auction/active-auctions"],    onSuccess: (v) => setAuctions((p) => ({ ...p, active:   v })) },
      { urls: ["/Auction/expired-auctions","/auction/expired-auctions"],   onSuccess: (v) => setAuctions((p) => ({ ...p, expired:  v })) },
      { urls: ["/Auction/upcoming-auctions","/auction/upcoming-auctions"], onSuccess: (v) => setAuctions((p) => ({ ...p, upcoming: v })) },
      { urls: ["/Transaction/Total-Transactions"],                          onSuccess: (v) => setPayments((p) => ({ ...p, total:    v })) },
      { urls: ["/Transaction/successful"],                                  onSuccess: (v) => setPayments((p) => ({ ...p, success:  v })) },
      { urls: ["/Transaction/failed"],                                      onSuccess: (v) => setPayments((p) => ({ ...p, failed:   v })) },
    ];
    try {
      await Promise.allSettled(requests.map((r) => fetchOne(r.urls, r.onSuccess)));
    } finally {
      setLoading(false);
    }
  };

  const fetchOne = async (urls, onSuccess) => {
    for (const url of urls) {
      try {
        const res = await api.get(url, { timeout: 15000 });
        onSuccess(extractNumber(res.data));
        return;
      } catch (_) {}
    }
    onSuccess(0);
  };

  const toggleSidebar = () => setSidebarShrinked((p) => !p);
  const isActive = (path) => location.pathname === path ? "active" : "";

  async function handleLogout() {
    // 1. Try to call the backend logout endpoint (invalidates refresh token server-side).
    //    We fire-and-forget — if it fails we still clear local storage and redirect.
    try {
      const refreshToken =
        localStorage.getItem("refreshToken") ||
        sessionStorage.getItem("refreshToken");

      // Try the most common logout endpoint patterns; adjust to match your API.
      await api.post(
        "/Auth/logout",
        refreshToken ? { refreshToken } : {},
        { timeout: 8000 }
      );
    } catch (_) {
      // Backend call failed (network error, 401, 404, etc.) — ignore and proceed.
    }

    // 2. Wipe every auth key so ProtectedRoute and Sign-in start clean.
    clearAllAuth();

    // 3. Redirect to login.
    navigate("/login", { replace: true });
  }

  const usersAnalysis = [
    { name: t("active",   "Active"),   value: users.active   },
    { name: t("blocked",  "Blocked"),  value: users.blocked  },
  ];
  const sellersAnalysis = [
    { name: t("verified", "Verified"), value: sellers.verified },
    { name: t("pending",  "Pending"),  value: sellers.pending  },
  ];
  const auctionsAnalysis = [
    { name: t("active",   "Active"),   value: auctions.active  },
    { name: t("expired",  "Expired"),  value: auctions.expired },
    { name: t("upcoming", "Upcoming"), value: auctions.upcoming },
  ];
  const paymentsAnalysis = [
    { name: t("success", "Success"), value: payments.success },
    { name: t("failed",  "Failed"),  value: payments.failed  },
  ];

  const tickColor = darkModeActive ? "#ffffff" : "#111111";
  const gridColor = darkModeActive ? "rgba(255,255,255,0.1)" : "#e2e8f0";
  const tooltipStyle = {
    backgroundColor: darkModeActive ? "#0f172a" : "#ffffff",
    border: `1px solid ${darkModeActive ? "#1e293b" : "#e2e8f0"}`,
    borderRadius: 10,
    color: darkModeActive ? "#ffffff" : "#111111",
    fontWeight: 600,
  };

  const getW = (key) => chartWidths[key] || 400;

  return (
    <div className={`admin-layout ${darkModeActive ? "dark-admin" : ""}`} dir={isArabic ? "rtl" : "ltr"}>

      <header className="admin-navbar">
        <div className="left">
          <button className="toggle-btn" onClick={toggleSidebar}><i className="fa fa-bars" /></button>
          <div className="brand"><i className="fa fa-dashboard" /><span>Safqa Admin</span></div>
        </div>
        <div className="right">
          <button className="admin-nav-icon-btn" onClick={() => setLanguage(isArabic ? "en" : "ar")}>
            {isArabic ? "EN" : "ع"}
          </button>
          <button className="admin-nav-icon-btn" onClick={toggleDarkMode}>
            <i className={`fa-solid ${darkModeActive ? "fa-sun" : "fa-moon"}`} />
          </button>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="admin-nav-year-select"
          >
            {years.map((y) => <option key={y}>{y}</option>)}
          </select>
          <button onClick={handleLogout} className="logout-btn">
            <i className="fa fa-sign-out" /><span>{t("logout", "Logout")}</span>
          </button>
        </div>
      </header>

      <aside className={`admin-sidebar ${sidebarShrinked ? "shrinked" : ""}`}>
        <ul>
          <li><Link className={isActive("/admin")}               to="/admin">              <i className="fa fa-dashboard" />     <span>{t("dashboard","Dashboard")}</span></Link></li>
          <li><Link className={isActive("/admin_users")}         to="/admin_users">        <i className="fa fa-users" />          <span>{t("allUsers","All Users")}</span></Link></li>
          <li><Link className={isActive("/admin_sellers")}       to="/admin_sellers">      <i className="fa fa-user-secret" />    <span>{t("allSellers","All Sellers")}</span></Link></li>
          <li><Link className={isActive("/admin_auctions")}      to="/admin_auctions">     <i className="fa fa-gavel" />          <span>{t("allAuctions","All Auctions")}</span></Link></li>
          <li><Link className={isActive("/admin_payments")}      to="/admin_payments">     <i className="fa fa-credit-card" />    <span>{t("paymentLogs","Payment Logs")}</span></Link></li>
          <li><Link className={isActive("/admin_track_chats")}   to="/admin_track_chats">  <i className="fa fa-comments" />       <span>{t("trackChats","Track Chats")}</span></Link></li>
          <li><Link className={isActive("/admin_announcements")} to="/admin_announcements"><i className="fa fa-bullhorn" />        <span>{t("announcements","Announcements")}</span></Link></li>
        </ul>
      </aside>

      <main className={`admin-content ${sidebarShrinked ? "active" : ""}`}>
        <div className="dashboard-wrapper">
          <h2 className="page-title">
            {t("adminDashboardAnalysis","Admin Dashboard Analysis")} ({selectedYear})
          </h2>

          {loading ? (
            <AdminDashboardSkeleton />
          ) : (
            <>
              <section className="dashboard-section">
                <h4>{t("usersAnalytics","Users Analytics")}</h4>
                <div className="grid" style={{ marginBottom: 28 }}>
                  <Card title={t("totalUsers","Total Users")}     value={users.total}   icon="users" />
                  <Card title={t("activeUsers","Active Users")}   value={users.active}  icon="user-check" />
                  <Card title={t("blockedUsers","Blocked Users")} value={users.blocked} icon="user-times" />
                </div>
                <AnalysisRow
                  chartKey="users" data={usersAnalysis}
                  title={t("usersOverview","Users Overview")}
                  colors={["#2d6a4f","#e63946"]}
                  getW={getW} tickColor={tickColor} gridColor={gridColor}
                  tooltipStyle={tooltipStyle} darkMode={darkModeActive}
                />
              </section>

              <section className="dashboard-section">
                <h4>{t("sellersAnalytics","Sellers Analytics")}</h4>
                <div className="grid" style={{ marginBottom: 28 }}>
                  <Card title={t("totalSellers","Total Sellers")}       value={sellers.total}    icon="store" />
                  <Card title={t("verifiedSellers","Verified Sellers")} value={sellers.verified} icon="check-circle" />
                  <Card title={t("pendingSellers","Pending Sellers")}   value={sellers.pending}  icon="clock" />
                </div>
                <AnalysisRow
                  chartKey="sellers" data={sellersAnalysis}
                  title={t("sellersOverview","Sellers Overview")}
                  colors={["#2d6a4f","#ffb703"]}
                  getW={getW} tickColor={tickColor} gridColor={gridColor}
                  tooltipStyle={tooltipStyle} darkMode={darkModeActive}
                />
              </section>

              <section className="dashboard-section">
                <h4>{t("auctionsAnalytics","Auctions Analytics")}</h4>
                <div className="grid" style={{ marginBottom: 28 }}>
                  <Card title={t("totalAuctions","Total Auctions")}     value={auctions.total}    icon="gavel" />
                  <Card title={t("activeAuctions","Active Auctions")}   value={auctions.active}   icon="play" />
                  <Card title={t("expiredAuctions","Expired Auctions")} value={auctions.expired}  icon="times-circle" />
                  <Card title={t("upcomingAuctions","Upcoming")}        value={auctions.upcoming} icon="calendar" />
                </div>
                <AnalysisRow
                  chartKey="auctions" data={auctionsAnalysis}
                  title={t("auctionsOverview","Auctions Overview")}
                  colors={["#2196F3","#9C27B0","#FF9800"]}
                  getW={getW} tickColor={tickColor} gridColor={gridColor}
                  tooltipStyle={tooltipStyle} darkMode={darkModeActive}
                />
              </section>

              <section className="dashboard-section">
                <h4>{t("paymentsAnalytics","Payments Analytics")}</h4>
                <div className="grid" style={{ marginBottom: 28 }}>
                  <Card title={t("totalTransactions","Total Transactions")} value={payments.total}   icon="credit-card" />
                  <Card title={t("successful","Successful")}                value={payments.success} icon="check" />
                  <Card title={t("failed","Failed")}                        value={payments.failed}  icon="times" />
                </div>
                <AnalysisRow
                  chartKey="payments" data={paymentsAnalysis}
                  title={t("paymentsOverview","Payments Overview")}
                  colors={["#2d6a4f","#e63946"]}
                  getW={getW} tickColor={tickColor} gridColor={gridColor}
                  tooltipStyle={tooltipStyle} darkMode={darkModeActive}
                />
              </section>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

function AnalysisRow({ chartKey, data, title, colors, getW, tickColor, gridColor, tooltipStyle, darkMode }) {
  return (
    <div className="admin-analysis-row" dir="ltr">
      <div className="admin-chart-container" data-key={chartKey}>
        <ResponsiveBarChart
          data={data} title={title}
          tickColor={tickColor} gridColor={gridColor}
          tooltipStyle={tooltipStyle} width={getW(chartKey)}
        />
      </div>
      <div className="admin-pie-container">
        <ResponsivePieChart
          data={data} colors={colors}
          tooltipStyle={tooltipStyle} darkMode={darkMode}
        />
      </div>
    </div>
  );
}

function AdminDashboardSkeleton() {
  return (
    <>
      {[1,2,3,4].map((s) => (
        <section className="dashboard-section admin-skeleton-section" key={s}>
          <SkeletonBlock width="190px" height={22} radius={7} />
          <div className="grid" style={{ marginBottom: 28, marginTop: 18 }}>
            {[1,2,3].map((c) => (
              <div className="dashboard-card" key={c}>
                <SkeletonBlock width={44} height={44} radius={12} />
                <div style={{ width:"100%" }}>
                  <SkeletonBlock width="70%" height={14} radius={7} />
                  <div style={{ height:12 }} />
                  <SkeletonBlock width="45%" height={26} radius={7} />
                </div>
              </div>
            ))}
          </div>
          <div className="admin-analysis-row" dir="ltr">
            <div className="admin-chart-container" style={{ flex:1 }}>
              <SkeletonBlock width="100%" height="260px" radius={12} />
            </div>
            <div className="admin-pie-container">
              <SkeletonBlock width={220} height={220} radius="50%" />
            </div>
          </div>
        </section>
      ))}
    </>
  );
}

function SkeletonBlock({ width="100%", height=16, radius=8 }) {
  return <span className="admin-skeleton-block" style={{ width, height, borderRadius: radius }} />;
}

function extractNumber(data) {
  if (typeof data === "number") return data;
  if (typeof data === "string") { const p = Number(data); return isNaN(p) ? 0 : p; }
  if (data && typeof data === "object") { const p = Number(Object.values(data)[0]); return isNaN(p) ? 0 : p; }
  return 0;
}

function Card({ title, value, icon }) {
  return (
    <div className="dashboard-card">
      <i className={`fa fa-${icon}`} />
      <div><p>{title}</p><h3>{value}</h3></div>
    </div>
  );
}

function ResponsiveBarChart({ data, title, tickColor, gridColor, tooltipStyle, width }) {
  const chartWidth = Math.max((width || 400) - 32, 200);
  return (
    <BarChart
      width={chartWidth}
      height={260}
      data={data}
      barCategoryGap="30%"
      margin={{ top: 16, right: 16, left: 0, bottom: 4 }}
    >
      <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
      <XAxis dataKey="name" stroke={tickColor} tick={{ fill: tickColor, fontWeight: 600, fontSize: 13 }} />
      <YAxis stroke={tickColor} tick={{ fill: tickColor, fontWeight: 600, fontSize: 12 }} />
      <Tooltip
        cursor={{ fill: "rgba(2,62,138,0.06)" }}
        contentStyle={tooltipStyle}
        labelStyle={{ fontWeight: 700 }}
      />
      <Legend wrapperStyle={{ color: tickColor, fontWeight: 600 }} />
      <Bar dataKey="value" name={title} fill="#023E8A" radius={[6,6,0,0]} />
    </BarChart>
  );
}

function ResponsivePieChart({ data, colors, tooltipStyle, darkMode }) {
  const total = data.reduce((s, i) => s + i.value, 0);
  return (
    <PieChart width={220} height={220}>
      <Pie
        data={data}
        cx="50%"
        cy="50%"
        innerRadius={58}
        outerRadius={90}
        paddingAngle={3}
        dataKey="value"
      >
        {data.map((_, i) => (
          <Cell key={i} fill={colors[i % colors.length]} />
        ))}
      </Pie>
      <Tooltip
        contentStyle={tooltipStyle}
        formatter={(v) => [`${v} (${total ? ((v / total) * 100).toFixed(1) : 0}%)`, ""]}
        labelStyle={{ fontWeight: 700, color: darkMode ? "#ffffff" : "#111111" }}
        itemStyle={{ color: darkMode ? "#ffffff" : "#111111" }}
      />
    </PieChart>
  );
}