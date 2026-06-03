import { useState, useEffect, useRef, useMemo } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import icon from "../../../assets/Person at the Center of Circles.png";
import { useTranslation } from "react-i18next";
import { setLanguage } from "../../../utiles/setLanguage";
import { applyTheme, getSavedTheme, saveTheme } from "../../../utiles/themeManager";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";

import "../admin.css";

const initialDeliveries = [
  { id: 1, title: "BMW X5 2022",       winner: "Ahmed Tamer",   business: "BMW Motors",     price: 45000, status: "pending"     },
  { id: 2, title: "iPhone 15 Pro Max", winner: "John Smith",    business: "Apple Store",    price: 1300,  status: "in_progress" },
  { id: 3, title: "Diamond Necklace",  winner: "Sara Ali",      business: "Luxury Jewelry", price: 8500,  status: "delivered"   },
  { id: 4, title: "MacBook Pro M3",    winner: "Michael Brown", business: "Apple Store",    price: 2800,  status: "failed"      },
  { id: 5, title: "Rolex Submariner",  winner: "Omar Khaled",   business: "Rolex Boutique", price: 12000, status: "pending"     },
];

function useChartJS() {
  const [ready, setReady] = useState(!!window.Chart);
  useEffect(() => {
    if (window.Chart) { setReady(true); return; }
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js";
    script.onload = () => setReady(true);
    document.head.appendChild(script);
  }, []);
  return ready;
}

function LineChartJS({ data, darkMode }) {
  const canvasRef = useRef(null);
  const chartRef  = useRef(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null; }

    const tickColor = darkMode ? "#94a3b8" : "#555";
    const gridColor = darkMode ? "rgba(148,163,184,0.12)" : "#e2e8f0";

    const ctx = canvasRef.current.getContext("2d");
    chartRef.current = new window.Chart(ctx, {
      type: "line",
      data: {
        labels: data.map((d) => d.month),
        datasets: [
          {
            label: "Delivered",
            data: data.map((d) => d.delivered),
            borderColor: "#2d6a4f",
            backgroundColor: "rgba(45,106,79,0.10)",
            borderWidth: 3,
            pointRadius: 5,
            pointHoverRadius: 7,
            tension: 0.4,
            fill: true,
          },
          {
            label: "Pending",
            data: data.map((d) => d.pending),
            borderColor: "#ffb703",
            backgroundColor: "rgba(255,183,3,0.10)",
            borderWidth: 3,
            pointRadius: 5,
            pointHoverRadius: 7,
            tension: 0.4,
            fill: true,
          },
          {
            label: "Failed",
            data: data.map((d) => d.failed),
            borderColor: "#e63946",
            backgroundColor: "rgba(230,57,70,0.10)",
            borderWidth: 3,
            pointRadius: 5,
            pointHoverRadius: 7,
            tension: 0.4,
            fill: true,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: "index", intersect: false },
        plugins: {
          legend: {
            display: true,
            position: "top",
            labels: { color: tickColor, font: { size: 13 }, boxWidth: 14, padding: 16 },
          },
          tooltip: {
            backgroundColor: darkMode ? "#0f172a" : "#ffffff",
            titleColor: darkMode ? "#f8fafc" : "#111111",
            bodyColor: darkMode ? "#cbd5e1" : "#374151",
            borderColor: darkMode ? "#1e293b" : "#e2e8f0",
            borderWidth: 1,
            padding: 12,
            cornerRadius: 10,
            callbacks: {
              label: (ctx) => ` ${ctx.dataset.label}: ${ctx.parsed.y}`,
            },
          },
        },
        scales: {
          x: {
            ticks: { color: tickColor, font: { size: 12 } },
            grid:  { color: gridColor },
          },
          y: {
            beginAtZero: true,
            ticks: { color: tickColor, font: { size: 12 } },
            grid:  { color: gridColor },
          },
        },
      },
    });

    return () => { if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null; } };
  }, [data, darkMode]);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <canvas ref={canvasRef} />
    </div>
  );
}

function ResponsiveBarChart({ data, title, tickColor, gridColor, tooltipStyle, width, colors }) {
  const chartWidth = Math.max((width || 400) - 32, 200);
  const total = data.reduce((s, i) => s + i.value, 0);
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const item = payload[0];
      const pct = total ? ((item.value / total) * 100).toFixed(1) : 0;
      return (
        <div style={tooltipStyle}>
          <p style={{ margin: 0, padding: "8px 12px", fontWeight: 700 }}>
            {item.payload.name}: {item.value} ({pct}%)
          </p>
        </div>
      );
    }
    return null;
  };

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
      <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(2,62,138,0.06)" }} />
      <Legend wrapperStyle={{ color: tickColor, fontWeight: 600 }} />
      <Bar dataKey="value" name={title} radius={[6, 6, 0, 0]}>
        {data.map((_, i) => (
          <Cell key={i} fill={colors[i % colors.length]} />
        ))}
      </Bar>
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
        formatter={(v, name) => [`${name}: ${v} (${total ? ((v / total) * 100).toFixed(1) : 0}%)`, ""]}
        labelStyle={{ fontWeight: 700, color: darkMode ? "#ffffff" : "#111111" }}
        itemStyle={{ color: darkMode ? "#ffffff" : "#111111" }}
      />
    </PieChart>
  );
}

export default function AdminDelivery() {

  const navigate  = useNavigate();
  const location  = useLocation();
  const { i18n, t } = useTranslation();
  const isArabic  = i18n.language === "ar";
  const chartJSReady = useChartJS();

  const [theme, setTheme] = useState(() => getSavedTheme());
  const darkModeActive = theme === "dark";

  useEffect(() => { applyTheme(theme); }, [theme]);

  const toggleDarkMode = () => {
    const next = darkModeActive ? "light" : "dark";
    setTheme(next); saveTheme(next); applyTheme(next);
  };

  const [sidebarShrinked, setSidebarShrinked] = useState(false);
  const toggleSidebar = () => setSidebarShrinked((p) => !p);
  const isActive = (path) => (location.pathname === path ? "active" : "");

  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const years = [];
  for (let y = 2025; y <= currentYear; y++) years.push(y);

  useEffect(() => { document.title = `Admin | Delivery ${selectedYear}`; }, [selectedYear]);
  useEffect(() => {
    const link = document.querySelector("link[rel~='icon']") || document.createElement("link");
    link.rel = "icon"; link.href = icon; document.head.appendChild(link);
  }, []);

  const [deliveries, setDeliveries] = useState(initialDeliveries);
  const [chartWidths, setChartWidths] = useState({});
  const [confirmId,  setConfirmId]   = useState(null);

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
  }, []);

  const getW = (key) => chartWidths[key] || 400;

  const delivered = deliveries.filter((d) => d.status === "delivered");
  const pending   = deliveries.filter((d) => d.status === "pending");
  const progress  = deliveries.filter((d) => d.status === "in_progress");
  const failed    = deliveries.filter((d) => d.status === "failed");

  const stats = {
    total:     deliveries.length,
    delivered: delivered.length,
    pending:   pending.length,
    progress:  progress.length,
    failed:    failed.length,
  };

  const deliveryStatusData = useMemo(() => [
    { name: t("delivered",  "Delivered"),   value: stats.delivered },
    { name: t("pending",    "Pending"),     value: stats.pending   },
    { name: t("inProgress", "In Progress"), value: stats.progress  },
    { name: t("failed",     "Failed"),      value: stats.failed    },
  ], [stats.delivered, stats.pending, stats.progress, stats.failed, i18n.language]); // eslint-disable-line

  // ── FIX: 12 translated months ────────────────────────────────────────────────
  const monthKeys = ["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"];

  const chartData = useMemo(
    () => monthKeys.map((key) => ({
      month:     t(key),
      delivered: stats.delivered,
      pending:   stats.pending,
      failed:    stats.failed,
    })),
    [stats.delivered, stats.pending, stats.failed, i18n.language] // eslint-disable-line
  );

  const pieColors = ["#2d6a4f", "#ffb703", "#219ebc", "#e63946"];

  const tickColor    = darkModeActive ? "#ffffff" : "#111111";
  const gridColor    = darkModeActive ? "rgba(255,255,255,0.1)" : "#e2e8f0";
  const tooltipStyle = {
    backgroundColor: darkModeActive ? "#0f172a" : "#ffffff",
    border:          `1px solid ${darkModeActive ? "#1e293b" : "#e2e8f0"}`,
    borderRadius:    10,
    color:           darkModeActive ? "#ffffff" : "#111111",
    fontWeight:      600,
  };

  const confirmDelete = (id) => setConfirmId(id);
  const cancelDelete  = ()   => setConfirmId(null);
  const doDelete      = ()   => {
    setDeliveries((prev) => prev.map((d) => d.id === confirmId ? { ...d, status: "deleted" } : d));
    setConfirmId(null);
  };

  const confirmItem = deliveries.find((d) => d.id === confirmId);

  const handleLogout = () => {
    localStorage.removeItem("userToken");
    localStorage.removeItem("adminToken");
    sessionStorage.removeItem("userToken");
    sessionStorage.removeItem("adminToken");
    navigate("/login");
  };

  return (
    <div className={`admin-layout ${darkModeActive ? "dark-admin" : ""}`} dir={isArabic ? "rtl" : "ltr"}>

      {/* Confirm Delete Modal */}
      {confirmId && confirmItem && (
        <div className="confirm-overlay">
          <div className="confirm-modal">
            <h3>{t("confirmDelete", "Confirm Delete")}</h3>
            <p>{t("areYouSureDelete", "Are you sure you want to delete")} <strong>{confirmItem.title}</strong>?</p>
            <div className="confirm-actions">
              <button className="btn cancel" onClick={cancelDelete}>{t("cancel", "Cancel")}</button>
              <button className="btn danger" onClick={doDelete}>{t("yesDelete", "Yes, Delete")}</button>
            </div>
          </div>
        </div>
      )}

      <header className="admin-navbar">
        <div className="left">
          <button className="toggle-btn" onClick={toggleSidebar}><i className="fa fa-bars" /></button>
          <div className="brand"><i className="fa fa-truck" /><span>Safqa Admin</span></div>
        </div>
        <div className="right">
          <button className="admin-nav-icon-btn" onClick={() => setLanguage(isArabic ? "en" : "ar")}>
            {isArabic ? "EN" : "ع"}
          </button>
          <button className="admin-nav-icon-btn" onClick={toggleDarkMode}>
            <i className={`fa-solid ${darkModeActive ? "fa-sun" : "fa-moon"}`} />
          </button>
          <select value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))} className="admin-nav-year-select">
            {years.map((y) => <option key={y}>{y}</option>)}
          </select>
          <button onClick={handleLogout} className="logout-btn">
            <i className="fa fa-sign-out" /><span>{t("logout", "Logout")}</span>
          </button>
        </div>
      </header>

      <aside className={`admin-sidebar ${sidebarShrinked ? "shrinked" : ""}`}>
        <ul>
          <li><Link className={isActive("/admin")}               to="/admin">              <i className="fa fa-dashboard" />          <span>{t("dashboard","Dashboard")}</span></Link></li>
          <li><Link className={isActive("/admin_users")}         to="/admin_users">        <i className="fa fa-users" />               <span>{t("allUsers","All Users")}</span></Link></li>
          <li><Link className={isActive("/admin_sellers")}       to="/admin_sellers">      <i className="fa fa-user-secret" />         <span>{t("allSellers","All Sellers")}</span></Link></li>
          <li><Link className={isActive("/admin_auctions")}      to="/admin_auctions">     <i className="fa fa-gavel" />               <span>{t("allAuctions","All Auctions")}</span></Link></li>
          <li><Link className={isActive("/admin_payments")}      to="/admin_payments">     <i className="fa fa-credit-card" />         <span>{t("paymentLogs","Payment Logs")}</span></Link></li>
          <li><Link className={isActive("/admin_delivery")}      to="/admin_delivery">     <i className="fa fa-truck" />               <span>{t("adminDelivery","Admin Delivery")}</span></Link></li>
          <li><Link className={isActive("/admin_track_chats")}   to="/admin_track_chats">  <i className="fa fa-comments" />            <span>{t("trackChats","Track Chats")}</span></Link></li>
          <li><Link className={isActive("/admin_reports")}       to="/admin_reports">      <i className="fa-solid fa-clipboard-list" /><span>{t("reports","Reports")}</span></Link></li>
          <li><Link className={isActive("/admin_announcements")} to="/admin_announcements"><i className="fa fa-bullhorn" />             <span>{t("announcements","Announcements")}</span></Link></li>
        </ul>
      </aside>

      <main className={`admin-content ${sidebarShrinked ? "active" : ""}`}>
        <div className="admin-delivery">

          <h2 className="ad-page-title">
            {t("deliveryTracking", "Delivery Tracking")} ({selectedYear})
          </h2>

          <section className="dashboard-section">
            <h4>{t("deliveryAnalytics", "Delivery Analytics")}</h4>
            <div className="grid" style={{ marginBottom: 28 }}>
              <DCard title={t("totalDeliveries", "Total Deliveries")} value={stats.total}     icon="truck"        />
              <DCard title={t("delivered",        "Delivered")}        value={stats.delivered} icon="check-circle" />
              <DCard title={t("pending",          "Pending")}          value={stats.pending}   icon="clock-o"      />
              <DCard title={t("inProgress",       "In Progress")}      value={stats.progress}  icon="spinner"      />
              <DCard title={t("failed",           "Failed")}           value={stats.failed}    icon="times-circle" />
            </div>
            <div className="admin-analysis-row" dir="ltr">
              <div className="admin-chart-container" data-key="delivery-status">
                <ResponsiveBarChart
                  data={deliveryStatusData}
                  title={t("deliveryOverview", "Delivery Overview")}
                  tickColor={tickColor}
                  gridColor={gridColor}
                  tooltipStyle={tooltipStyle}
                  width={getW("delivery-status")}
                  colors={pieColors}
                />
              </div>
              <div className="admin-pie-container">
                <ResponsivePieChart
                  data={deliveryStatusData}
                  colors={pieColors}
                  tooltipStyle={tooltipStyle}
                  darkMode={darkModeActive}
                />
              </div>
            </div>
          </section>

          <section className="dashboard-section">
            <h4>{t("monthlyTrend", "Monthly Trend")}</h4>
            <div className="admin-analysis-row" dir="ltr">
              <div className="admin-chart-container" data-key="delivery-trend" style={{ height: 290 }}>
                {chartJSReady
                  ? <LineChartJS data={chartData} darkMode={darkModeActive} />
                  : <div style={{ color: "#94a3b8", padding: 20 }}>{t("loadingChart", "Loading chart...")}</div>
                }
              </div>
            </div>
          </section>

          <DeliverySection title={t("pending",    "Pending")}     items={pending}   onDelete={confirmDelete} t={t} />
          <DeliverySection title={t("inProgress", "In Progress")} items={progress}  onDelete={confirmDelete} t={t} />
          <DeliverySection title={t("delivered",  "Delivered")}   items={delivered} t={t} />
          <DeliverySection title={t("failed",     "Failed")}      items={failed}    t={t} />

        </div>
      </main>
    </div>
  );
}

function DCard({ title, value, icon }) {
  return (
    <div className="dashboard-card">
      <i className={`fa fa-${icon}`} />
      <div><p>{title}</p><h3>{value}</h3></div>
    </div>
  );
}

function DeliverySection({ title, items, onDelete, t }) {
  if (!items.length) return null;
  return (
    <>
      <h3 className="ad-section-title">{title}</h3>
      <div className="ad-cards-grid">
        {items.map((d) => (
          <DeliveryCard key={d.id} delivery={d} onDelete={onDelete} t={t} />
        ))}
      </div>
    </>
  );
}

function DeliveryCard({ delivery, onDelete, t }) {
  if (delivery.status === "deleted") return null;

  const statusLabel =
    delivery.status === "in_progress"
      ? t("inProgress", "In Progress")
      : delivery.status.charAt(0).toUpperCase() + delivery.status.slice(1);

  return (
    <div className="ad-card">
      <h4 className="ad-card-title">{delivery.title}</h4>
      <p className="ad-card-row"><span className="ad-card-key">{t("business","Business")}:</span>{delivery.business}</p>
      <p className="ad-card-row"><span className="ad-card-key">{t("winner","Winner")}:</span>{delivery.winner}</p>
      <p className="ad-card-row"><span className="ad-card-key">{t("finalPrice","Final Price")}:</span>${delivery.price.toLocaleString()}</p>
      <p className="ad-card-row">
        <span className="ad-card-key">{t("status","Status")}:</span>
        <span className={`ad-status ad-status--${delivery.status}`}>{statusLabel}</span>
      </p>
      {onDelete && (
        <div className="ad-card-actions">
          <button className="ad-btn ad-btn--delete" onClick={() => onDelete(delivery.id)}>
            {t("delete","Delete")}
          </button>
        </div>
      )}
    </div>
  );
}