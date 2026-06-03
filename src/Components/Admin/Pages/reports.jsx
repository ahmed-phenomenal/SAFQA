import { Link, useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  BarChart, Bar, PieChart, Pie,
  XAxis, YAxis, Tooltip, CartesianGrid,
  Legend, Cell, ResponsiveContainer,
} from "recharts";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { setLanguage } from "../../../utiles/setLanguage";
import { applyTheme, getSavedTheme, saveTheme } from "../../../utiles/themeManager";
import icon from "../../../assets/Person at the Center of Circles.png";
import "../admin.css";

export default function Reports() {
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

  const today   = new Date();
  const minDate = "2025-01-01";
  const [selectedDate, setSelectedDate] = useState(today.toISOString().split("T")[0]);

  useEffect(() => { document.title = `Admin | Reports ${selectedDate}`; }, [selectedDate]);

  useEffect(() => {
    const link = document.querySelector("link[rel~='icon']") || document.createElement("link");
    link.rel  = "icon";
    link.href = icon;
    document.head.appendChild(link);
  }, []);

  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const years = [];
  for (let y = 2025; y <= currentYear; y++) years.push(y);

  const generateDailyData = (date) => {
    const seed = new Date(date).getTime();
    const random = (min, max, offset = 0) =>
      Math.floor((Math.abs(Math.sin(seed + offset)) * 10000) % (max - min) + min);

    return {
      userActivity: [
        { name: t("logins",  "Logins"),  value: random(200, 1000, 1) },
        { name: t("actions", "Actions"), value: random(500, 2000, 2) },
      ],
      sellerActivity: [
        { name: t("listings", "Listings"), value: random(100, 500, 3) },
        { name: t("sales",    "Sales"),    value: random(60,  300, 4) },
      ],
      revenueByCategory: [
        { name: t("electronics", "Electronics"), value: random(10000,  60000, 5) },
        { name: t("vehicles",    "Vehicles"),    value: random(30000,  90000, 6) },
        { name: t("realEstate",  "Real Estate"), value: random(70000, 200000, 7) },
        { name: t("fashion",     "Fashion"),     value: random(5000,   40000, 8) },
        { name: t("others",      "Others"),      value: random(3000,   20000, 9) },
      ],
      problems: [
        { id: 1, email: "ahmed.tamer@gmail.com", role: t("buyer","Buyer"),  issue: t("paymentFailedIssue","Payment failed during checkout"), date, status: "open"     },
        { id: 2, email: "sara.ali@gmail.com",    role: t("seller","Seller"), issue: t("verificationDelayIssue","Account verification delay"),  date, status: "resolved" },
        { id: 3, email: "omar.hassan@gmail.com", role: t("buyer","Buyer"),  issue: t("auctionDisputeIssue","Auction dispute"),                 date, status: "open"     },
      ],
    };
  };

  const dailyData = useMemo(() => generateDailyData(selectedDate), [selectedDate, i18n.language]);

  const [selectedProblem, setSelectedProblem] = useState(null);
  const [responseText, setResponseText]       = useState("");

  const handleSendResponse = () => {
    alert(`${t("responseSentTo","Response sent to")} ${selectedProblem.email}`);
    setSelectedProblem(null);
    setResponseText("");
  };

  const tickColor    = darkModeActive ? "#94a3b8" : "#374151";
  const gridColor    = darkModeActive ? "rgba(255,255,255,0.08)" : "#e2e8f0";
  const chartBg      = darkModeActive ? "#111827" : "#ffffff";
  const tooltipStyle = {
    backgroundColor: darkModeActive ? "#0f172a" : "#ffffff",
    border:          `1px solid ${darkModeActive ? "#334155" : "#e2e8f0"}`,
    color:           darkModeActive ? "#ffffff" : "#111111",
    borderRadius:    10,
    fontWeight:      600,
  };

  const dateInputStyle = {
    background:  darkModeActive ? "#1e293b" : "#ffffff",
    color:       darkModeActive ? "#f1f5f9" : "#374151",
    borderColor: darkModeActive ? "#334155" : "#d1d5db",
    colorScheme: darkModeActive ? "dark"    : "light",
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.text(`${t("safqaDailyReport","Safqa Daily Report")} - ${selectedDate}`, 14, 15);
    autoTable(doc, { startY: 25, head: [[t("userActivity","User Activity"), t("value","Value")]], body: dailyData.userActivity.map((d) => [d.name, d.value]) });
    autoTable(doc, { startY: doc.lastAutoTable.finalY + 10, head: [[t("sellerActivity","Seller Activity"), t("value","Value")]], body: dailyData.sellerActivity.map((d) => [d.name, d.value]) });
    autoTable(doc, { startY: doc.lastAutoTable.finalY + 10, head: [[t("category","Category"), t("revenue","Revenue")]], body: dailyData.revenueByCategory.map((d) => [d.name, d.value]) });
    autoTable(doc, { startY: doc.lastAutoTable.finalY + 10, head: [[t("email","Email"), t("role","Role"), t("problem","Problem"), t("status","Status")]], body: dailyData.problems.map((p) => [p.email, p.role, p.issue, p.status]) });
    doc.save(`Safqa_Report_${selectedDate}.pdf`);
  };

  const exportExcel = () => {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(dailyData.userActivity),      t("userActivity","User Activity"));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(dailyData.sellerActivity),    t("sellerActivity","Seller Activity"));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(dailyData.revenueByCategory), t("revenue","Revenue"));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(dailyData.problems),          t("userProblems","Problems"));
    const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    saveAs(
      new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
      `Safqa_Report_${selectedDate}.xlsx`
    );
  };

function handleLogout() {
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
}

  const PIE_COLORS = ["#023E8A", "#2d6a4f", "#ffb703", "#e63946", "#6c757d"];

  return (
    <div
      className={`admin-layout admin-reports ${darkModeActive ? "dark-admin" : ""}`}
      dir={isArabic ? "rtl" : "ltr"}
    >

      <header className="admin-navbar">
        <div className="left">
          <button className="toggle-btn" onClick={toggleSidebar}>
            <i className="fa fa-bars" />
          </button>
          <div className="brand">
            <i className="fa fa-file-text" />
            <span>Safqa Admin</span>
          </div>
        </div>
<div className="right">
  <button className="admin-nav-icon-btn" onClick={() => setLanguage(isArabic ? "en" : "ar")}>{isArabic ? "EN" : "ع"}</button>
  <button className="admin-nav-icon-btn" onClick={toggleDarkMode}>
    <i className={`fa-solid ${darkModeActive ? "fa-sun" : "fa-moon"}`} />
  </button>
  <span className="admin-year-badge">{new Date().getFullYear()}</span>
  <button onClick={handleLogout} className="logout-btn">
    <i className="fa fa-sign-out" /><span>{t("logout","Logout")}</span>
  </button>
</div>
      </header>

      <aside className={`admin-sidebar ${sidebarShrinked ? "shrinked" : ""}`}>
        <ul>
          <li><Link className={isActive("/admin")}               to="/admin">              <i className="fa fa-dashboard" />           <span>{t("dashboard",    "Dashboard")}</span></Link></li>
          <li><Link className={isActive("/admin_users")}         to="/admin_users">        <i className="fa fa-users" />               <span>{t("allUsers",      "All Users")}</span></Link></li>
          <li><Link className={isActive("/admin_sellers")}       to="/admin_sellers">      <i className="fa fa-user-secret" />         <span>{t("allSellers",    "All Sellers")}</span></Link></li>
          <li><Link className={isActive("/admin_auctions")}      to="/admin_auctions">     <i className="fa fa-gavel" />               <span>{t("allAuctions",   "All Auctions")}</span></Link></li>
          <li><Link className={isActive("/admin_payments")}      to="/admin_payments">     <i className="fa fa-credit-card" />         <span>{t("paymentLogs",   "Payment Logs")}</span></Link></li>
          <li><Link className={isActive("/admin_delivery")}      to="/admin_delivery">     <i className="fa fa-truck" />               <span>{t("adminDelivery", "Admin Delivery")}</span></Link></li>
          <li><Link className={isActive("/admin_track_chats")}   to="/admin_track_chats">  <i className="fa fa-comments" />            <span>{t("trackChats",    "Track Chats")}</span></Link></li>
          <li><Link className={isActive("/admin_reports")}       to="/admin_reports">      <i className="fa-solid fa-clipboard-list" /><span>{t("reports",       "Reports")}</span></Link></li>
          <li><Link className={isActive("/admin_announcements")} to="/admin_announcements"><i className="fa fa-bullhorn" />             <span>{t("announcements", "Announcements")}</span></Link></li>
        </ul>
      </aside>

      <main className={`admin-content ${sidebarShrinked ? "active" : ""}`}>
        <div className="ar-page">

          <h2 className="ar-page-title">
            {t("systemReports","System Reports & Analytics")}
          </h2>

          <div className="ar-controls">
            <label className="ar-controls-label">{t("selectDay","Select Day")}:</label>
            <input
              type="date"
              className="ar-date-input"
              style={dateInputStyle}
              min={minDate}
              max={today.toISOString().split("T")[0]}
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          </div>

          <div className="ar-export-row">
            <button className="ar-export-btn ar-export-btn--excel" onClick={exportExcel}>
              <i className="fa fa-file-excel" />
              {t("exportExcel","Export Excel")}
            </button>
            <button className="ar-export-btn ar-export-btn--pdf" onClick={exportPDF}>
              <i className="fa fa-file-pdf" />
              {t("exportPDF","Export PDF")}
            </button>
          </div>

          {/* ── USER ACTIVITY ── */}
          <section className="ar-section">
            <h4 className="ar-section-title">{t("userActivity","User Activity")}</h4>
            <div className="ar-chart-card" dir="ltr" style={{ background: chartBg }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyData.userActivity} margin={{ top: 16, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: tickColor, fontSize: 12, fontWeight: 600 }}
                    stroke={tickColor}
                    axisLine={{ stroke: tickColor }}
                    tickLine={{ stroke: tickColor }}
                  />
                  <YAxis
                    tick={{ fill: tickColor, fontSize: 12, fontWeight: 600 }}
                    stroke={tickColor}
                    axisLine={{ stroke: tickColor }}
                    tickLine={{ stroke: tickColor }}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    labelStyle={{ color: darkModeActive ? "#ffffff" : "#111111", fontWeight: 700 }}
                    itemStyle={{ color: darkModeActive ? "#ffffff" : "#111111" }}
                  />
                  <Bar dataKey="value" name={t("count","Count")} fill="#023E8A" radius={[6,6,0,0]} legendType="none" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* ── SELLER ACTIVITY ── */}
          <section className="ar-section">
            <h4 className="ar-section-title">{t("sellerActivity","Seller Activity")}</h4>
            <div className="ar-chart-card" dir="ltr" style={{ background: chartBg }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyData.sellerActivity} margin={{ top: 16, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: tickColor, fontSize: 12, fontWeight: 600 }}
                    stroke={tickColor}
                    axisLine={{ stroke: tickColor }}
                    tickLine={{ stroke: tickColor }}
                  />
                  <YAxis
                    tick={{ fill: tickColor, fontSize: 12, fontWeight: 600 }}
                    stroke={tickColor}
                    axisLine={{ stroke: tickColor }}
                    tickLine={{ stroke: tickColor }}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    labelStyle={{ color: darkModeActive ? "#ffffff" : "#111111", fontWeight: 700 }}
                    itemStyle={{ color: darkModeActive ? "#ffffff" : "#111111" }}
                  />
                  <Bar dataKey="value" name={t("count","Count")} fill="#2d6a4f" radius={[6,6,0,0]} legendType="none" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* ── REVENUE BY CATEGORY ── */}
          <section className="ar-section">
            <h4 className="ar-section-title">{t("revenueByCategory","Revenue by Category")}</h4>
            <div className="ar-pie-card" dir="ltr" style={{ background: chartBg }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={dailyData.revenueByCategory}
                    dataKey="value"
                    cx="50%"
                    cy="44%"
                    outerRadius={110}
                    label={false}
                    labelLine={false}
                  >
                    {dailyData.revenueByCategory.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={tooltipStyle}
                    labelStyle={{ color: darkModeActive ? "#ffffff" : "#111111", fontWeight: 700 }}
                    itemStyle={{ color: darkModeActive ? "#ffffff" : "#111111" }}
                    formatter={(value) => [value.toLocaleString(), t("revenue","Revenue")]}
                  />
                  <Legend
                    verticalAlign="bottom"
                    align="center"
                    wrapperStyle={{ color: tickColor, fontWeight: 600, paddingTop: 12 }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* ── USER PROBLEMS ── */}
          <section className="ar-section">
            <h4 className="ar-section-title">{t("userProblems","User Problems")}</h4>
            <div className="ar-table-card">
              <table className="ar-table">
                <thead>
                  <tr>
                    <th>{t("email",   "Email")}</th>
                    <th>{t("role",    "Role")}</th>
                    <th>{t("problem", "Problem")}</th>
                    <th>{t("status",  "Status")}</th>
                    <th>{t("action",  "Action")}</th>
                  </tr>
                </thead>
                <tbody>
                  {dailyData.problems.map((p) => (
                    <tr key={p.id}>
                      <td className="ar-table-email">{p.email}</td>
                      <td>{p.role}</td>
                      <td>{p.issue}</td>
                      <td>
                        <span className={`ar-status ar-status--${p.status}`}>
                          {p.status === "resolved"
                            ? t("resolved","Resolved")
                            : t("open","Open")}
                        </span>
                      </td>
                      <td>
                        <button
                          className="ar-respond-btn"
                          onClick={() => setSelectedProblem(p)}
                          disabled={p.status === "resolved"}
                        >
                          {t("respond","Respond")}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

        </div>
      </main>

      {selectedProblem && (
        <div className="ar-overlay">
          <div className="ar-modal">
            <h4 className="ar-modal-title">
              {t("respondTo","Respond to")} {selectedProblem.email}
            </h4>
            <textarea
              rows="5"
              className="ar-textarea"
              value={responseText}
              onChange={(e) => setResponseText(e.target.value)}
              placeholder={t("typeResponse","Type your response here...")}
            />
            <div className="ar-modal-actions">
              <button className="ar-btn ar-btn--cancel" onClick={() => setSelectedProblem(null)}>
                {t("cancel","Cancel")}
              </button>
              <button className="ar-btn ar-btn--send" onClick={handleSendResponse}>
                {t("send","Send")}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}