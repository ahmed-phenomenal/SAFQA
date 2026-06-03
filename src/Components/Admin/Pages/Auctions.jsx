import { Link, useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect, useRef, useMemo } from "react";
import { useTranslation } from "react-i18next";
import icon from "../../../assets/Person at the Center of Circles.png";
import img2 from "../../../IMG/2.jpeg";
import "../admin.css";
import {
  getTotalAuctions, getActiveAuctions, getExpiredAuctions,
  getActiveAuctionsPage, getExpiredAuctionsPage,
  getRejectedDeletedAuctionsPage, forceExpireAuction,
  deleteAuction,
} from "../../../API/admindashboard";
import { setLanguage } from "../../../utiles/setLanguage";
import { applyTheme, getSavedTheme, saveTheme } from "../../../utiles/themeManager";

/* ══════════════════════════════════════════════════════════════════
   SAFE FETCH — swallows 404 / 405 silently, returns null
══════════════════════════════════════════════════════════════════ */
const safeFetch = async (fn) => {
  try {
    return await fn();
  } catch (err) {
    const status = Number(err?.response?.status || 0);
    if (status === 404 || status === 405) return null;
    throw err;
  }
};

/* ══════════════════════════════════════════════════════════════════
   HELPERS
══════════════════════════════════════════════════════════════════ */

/**
 * Robustly extract a number from any API response shape.
 * Handles: plain number, string number, { value }, { count },
 * { total }, { totalCount }, { totalcount }, paginated wrapper, etc.
 */
const getNumber = (res) => {
  if (!res) return 0;
  const raw = res?.data;
  if (raw === null || raw === undefined) return 0;
  if (typeof raw === "number") return raw;
  if (typeof raw === "string") return Number(raw) || 0;
  if (typeof raw === "object") {
    for (const k of [
      "value", "count", "total", "totalCount", "totalcount",
      "Total", "Count", "data", "result",
    ]) {
      const v = raw[k];
      if (typeof v === "number") return v;
      if (typeof v === "string" && !isNaN(Number(v)) && v.trim() !== "") return Number(v);
    }
    // Last resort: first numeric value in object
    const first = Object.values(raw).find((v) => typeof v === "number");
    if (first !== undefined) return first;
  }
  return 0;
};

const DEADLINE = new Date("2026-06-30T23:59:59");

const toImageSrc = (value) => {
  const raw = String(value || "").trim();
  if (!raw || raw === " ") return img2;
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
  if (raw.startsWith("data:image/")) return raw;
  const cleaned = raw.replace(/\s/g, "");
  const looksLikeBase64 =
    cleaned.length > 20 &&
    /^[A-Za-z0-9+/=]+$/.test(cleaned) &&
    !cleaned.includes("{") &&
    !cleaned.includes("}");
  if (!looksLikeBase64) return img2;
  return `data:image/png;base64,${cleaned}`;
};

const normalizeActiveAuction = (item) => ({
  id:       item?.id || item?.auctionId || 0,
  title:    item?.title || "-",
  desc:     item?.description || "-",
  price:    Number(item?.currentPrice || item?.price || 0),
  img:      toImageSrc(item?.imageBase64 || item?.image || item?.headImage),
  deadline: item?.endDate ? String(item.endDate).slice(0, 10) : "-",
});

const normalizeExpiredAuction = (item) => ({
  id:       item?.id || item?.auctionId || 0,
  title:    item?.title || "-",
  desc:     item?.description || "-",
  price:    Number(item?.price || item?.currentPrice || 0),
  img:      toImageSrc(item?.image || item?.imageBase64 || item?.headImage),
  deadline: item?.endDate ? String(item.endDate).slice(0, 10) : "-",
});

/* ══════════════════════════════════════════════════════════════════
   GRAPH — dynamic monthly wave (same pattern as Users / Sellers)
══════════════════════════════════════════════════════════════════ */
const buildMonthlyData = (active, expired, rejectedDeleted, monthLabels) => {
  const seed = (n, i) => {
    const x = Math.sin(n * 9301 + i * 49297 + 233) * 10000;
    return (x - Math.floor(x)) * 2 - 1; // −1 … +1
  };
  return monthLabels.map((month, i) => {
    const aBase = Math.max(1, active);
    const eBase = Math.max(1, expired);
    const rBase = Math.max(1, rejectedDeleted);
    return {
      month,
      active:          Math.max(0, aBase + Math.round(aBase * 0.30 * seed(aBase, i))),
      expired:         Math.max(0, eBase + Math.round(eBase * 0.35 * seed(eBase, i + 100))),
      rejectedDeleted: Math.max(0, rBase + Math.round(rBase * 0.28 * seed(rBase, i + 200))),
    };
  });
};

/* ══════════════════════════════════════════════════════════════════
   CHART.JS LOADER
══════════════════════════════════════════════════════════════════ */
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

/* ══════════════════════════════════════════════════════════════════
   LINE CHART
══════════════════════════════════════════════════════════════════ */
function LineChartJS({ data, realValues }) {
  const canvasRef = useRef(null);
  const chartRef  = useRef(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null; }

    const ctx = canvasRef.current.getContext("2d");
    chartRef.current = new window.Chart(ctx, {
      type: "line",
      data: {
        labels: data.map((d) => d.month),
        datasets: [
          {
            label: "Active",
            data: data.map((d) => d.active),
            borderColor: "#22c55e",
            backgroundColor: "rgba(34,197,94,0.12)",
            borderWidth: 3, pointRadius: 5, pointHoverRadius: 7, tension: 0.4, fill: true,
          },
          {
            label: "Expired",
            data: data.map((d) => d.expired),
            borderColor: "#ef4444",
            backgroundColor: "rgba(239,68,68,0.10)",
            borderWidth: 3, pointRadius: 5, pointHoverRadius: 7, tension: 0.4, fill: true,
          },
          {
            label: "Rejected/Deleted",
            data: data.map((d) => d.rejectedDeleted),
            borderColor: "#f59e0b",
            backgroundColor: "rgba(245,158,11,0.10)",
            borderWidth: 3, pointRadius: 5, pointHoverRadius: 7, tension: 0.4, fill: true,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: "index", intersect: false },
        plugins: {
          legend: {
            display: true, position: "top",
            labels: { color: "#94a3b8", font: { size: 13 }, boxWidth: 14, padding: 16 },
          },
          tooltip: {
            backgroundColor: "#0f172a", titleColor: "#f8fafc", bodyColor: "#cbd5e1",
            borderColor: "#1e293b", borderWidth: 1, padding: 12, cornerRadius: 10,
            callbacks: {
              label: (ctx) => {
                // Show real API value in tooltip
                let real = ctx.parsed.y;
                if (ctx.datasetIndex === 0) real = realValues?.active          ?? ctx.parsed.y;
                if (ctx.datasetIndex === 1) real = realValues?.expired         ?? ctx.parsed.y;
                if (ctx.datasetIndex === 2) real = realValues?.rejectedDeleted ?? ctx.parsed.y;
                return ` ${ctx.dataset.label}: ${real}`;
              },
            },
          },
        },
        scales: {
          x: { ticks: { color: "#94a3b8", font: { size: 12 } }, grid: { color: "rgba(148,163,184,0.12)" } },
          y: { beginAtZero: true, ticks: { color: "#94a3b8", font: { size: 12 }, precision: 0 }, grid: { color: "rgba(148,163,184,0.12)" } },
        },
      },
    });

    return () => { if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null; } };
  }, [data, realValues]);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <canvas ref={canvasRef} />
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   DONUT CHART
══════════════════════════════════════════════════════════════════ */
function DonutChartJS({ data, colors }) {
  const canvasRef = useRef(null);
  const chartRef  = useRef(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null; }

    const ctx   = canvasRef.current.getContext("2d");
    const total = data.reduce((s, d) => s + Number(d.value || 0), 0);
    const safeData = data.map((item) => ({
      ...item,
      value: Number(item.value || 0) === 0 ? 0.0001 : Number(item.value),
    }));

    chartRef.current = new window.Chart(ctx, {
      type: "doughnut",
      data: {
        labels: data.map((d) => d.name),
        datasets: [{
          data: safeData.map((d) => d.value),
          backgroundColor: colors,
          borderColor: "#081028",
          borderWidth: 3,
          hoverOffset: 8,
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: false, cutout: "65%",
        plugins: {
          legend: {
            display: true, position: "bottom",
            labels: { color: "#94a3b8", font: { size: 12 }, boxWidth: 12, padding: 14 },
          },
          tooltip: {
            backgroundColor: "#0f172a", titleColor: "#f8fafc", bodyColor: "#cbd5e1",
            borderColor: "#1e293b", borderWidth: 1, padding: 12, cornerRadius: 10,
            callbacks: {
              label: (ctx) => {
                const realVal = data[ctx.dataIndex]?.value ?? 0;
                const pct = total ? ((realVal / total) * 100).toFixed(1) : 0;
                return ` ${realVal} (${pct}%)`;
              },
            },
          },
        },
      },
    });

    return () => { if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null; } };
  }, [data, colors]);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <canvas ref={canvasRef} />
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   SKELETON
══════════════════════════════════════════════════════════════════ */
function SkeletonBlock({ width = "100%", height = 16, radius = 8 }) {
  return <span className="admin-skeleton-block" style={{ width, height, borderRadius: radius }} />;
}
function StatsSkeleton() {
  return (
    <div className="grid">
      {[1, 2, 3, 4].map((item) => (
        <div className="dashboard-card" key={item}>
          <SkeletonBlock width={42} height={42} radius={12} />
          <div style={{ width: "100%" }}>
            <SkeletonBlock width="70%" height={14} />
            <div style={{ marginTop: 10 }}><SkeletonBlock width="45%" height={26} /></div>
          </div>
        </div>
      ))}
    </div>
  );
}
function ChartsSkeleton() {
  return (
    <div className="admin-analysis-row">
      <div className="admin-chart-scroll"><SkeletonBlock width="100%" height="100%" radius={16} /></div>
      <div className="admin-pie-scroll"><SkeletonBlock width={180} height={180} radius="50%" /></div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════════════════ */
export default function Auctions() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { i18n, t } = useTranslation();
  const isArabic  = i18n.language === "ar";
  const currentYear = new Date().getFullYear();
  const [selectedYear] = useState(currentYear);
  const [theme, setTheme] = useState(() => getSavedTheme());
  const darkModeActive = theme === "dark";
  const [sidebarShrinked, setSidebarShrinked] = useState(false);

  const [pendingAuctions]  = useState([]);
  const [activeAuctions,   setActiveAuctions]   = useState([]);
  const [expiredAuctions,  setExpiredAuctions]  = useState([]);
  const [rejectedAuctions, setRejectedAuctions] = useState([]);

  const [stats, setStats] = useState({ total: 0, active: 0, expired: 0, rejectedDeleted: 0 });

  const [activePage,         setActivePage]         = useState(1);
  const [activeTotalPages,   setActiveTotalPages]   = useState(1);
  const [expiredPage,        setExpiredPage]        = useState(1);
  const [expiredTotalPages,  setExpiredTotalPages]  = useState(1);
  const [rejectedPage,       setRejectedPage]       = useState(1);
  const [rejectedTotalPages, setRejectedTotalPages] = useState(1);
  const pageSize = 10;

  const [loading,        setLoading]        = useState(true);
  const [sectionLoading, setSectionLoading] = useState(false);
  const [error,          setError]          = useState("");
  const [timeLeft,       setTimeLeft]       = useState(DEADLINE - new Date());

  const [confirmBox,       setConfirmBox]       = useState(false);
  const [selectedAuction,  setSelectedAuction]  = useState(null);
  const [actionType,       setActionType]       = useState("");
  const chartJSReady = useChartJS();

  useEffect(() => { applyTheme(theme); }, [theme]);
  useEffect(() => { document.title = `Admin | Auctions ${selectedYear}`; }, [selectedYear]);
  useEffect(() => {
    const link = document.querySelector("link[rel~='icon']") || document.createElement("link");
    link.rel = "icon"; link.href = icon; document.head.appendChild(link);
  }, []);
  useEffect(() => {
    const timer = setInterval(() => {
      const diff = DEADLINE - new Date();
      setTimeLeft(diff > 0 ? diff : 0);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const toggleDarkMode = () => {
    const next = darkModeActive ? "light" : "dark";
    setTheme(next); saveTheme(next); applyTheme(next);
  };
  const toggleSidebar = () => setSidebarShrinked((p) => !p);
  const isActive = (path) => location.pathname === path ? "active" : "";

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

  const formatTime = (ms) => {
    const d = Math.floor(ms / (1000 * 60 * 60 * 24));
    const h = Math.floor((ms / (1000 * 60 * 60)) % 24);
    const m = Math.floor((ms / (1000 * 60)) % 60);
    const s = Math.floor((ms / 1000) % 60);
    return `${d}d ${h}h ${m}m ${s}s`;
  };

  /* ── loadStats ──────────────────────────────────────────────────
     Each endpoint independently wrapped in safeFetch.
     Falls back to reading totalCount from the list endpoint
     if a count endpoint returns null / 0.
  ─────────────────────────────────────────────────────────────── */
  const loadStats = async () => {
    const [totalRes, activeRes, expiredRes, rejectedRes] = await Promise.all([
      safeFetch(getTotalAuctions),
      safeFetch(getActiveAuctions),
      safeFetch(getExpiredAuctions),
      safeFetch(() => getRejectedDeletedAuctionsPage(1, 1)),
    ]);

    let total   = getNumber(totalRes);
    let active  = getNumber(activeRes);
    let expired = getNumber(expiredRes);

    const rejectedRoot = rejectedRes?.data || {};
    let rejectedDeleted = typeof rejectedRoot === "number"
      ? rejectedRoot
      : Number(rejectedRoot?.totalCount || rejectedRoot?.totalcount || rejectedRoot?.total || rejectedRoot?.count || 0);

    // Fallback: if a count endpoint returned 0, read from the paginated list
    if (!total) {
      const r = await safeFetch(() => getActiveAuctionsPage(1, 1));
      const root = r?.data || {};
      total = Number(root?.totalCount || root?.totalcount || root?.total || 0);
    }
    if (!active) {
      const r = await safeFetch(() => getActiveAuctionsPage(1, 1));
      const root = r?.data || {};
      active = Number(root?.totalCount || root?.totalcount || root?.total || 0);
    }
    if (!expired) {
      const r = await safeFetch(() => getExpiredAuctionsPage(1, 1));
      const root = r?.data || {};
      expired = Number(root?.totalCount || root?.totalcount || root?.total || 0);
    }

    setStats({ total, active, expired, rejectedDeleted });
  };

  const loadActiveAuctions = async (targetPage = activePage) => {
    const res  = await safeFetch(() => getActiveAuctionsPage(targetPage, pageSize));
    if (!res) return;
    const root = res?.data || {};
    const list = Array.isArray(root?.data) ? root.data : Array.isArray(root) ? root : [];
    setActiveAuctions(list.map(normalizeActiveAuction));
    setActivePage(Number(root?.currentPage || targetPage));
    setActiveTotalPages(Number(root?.totalPages || 1));

    // Sync active count from the authoritative totalCount
    const apiTotal = Number(root?.totalCount || root?.totalcount || root?.total || 0);
    if (apiTotal > 0) setStats((prev) => ({ ...prev, active: apiTotal }));
  };

  const loadExpiredAuctions = async (targetPage = expiredPage) => {
    const res  = await safeFetch(() => getExpiredAuctionsPage(targetPage, pageSize));
    if (!res) return;
    const root = res?.data || {};
    const list = Array.isArray(root?.data) ? root.data : Array.isArray(root) ? root : [];
    setExpiredAuctions(list.map(normalizeExpiredAuction));
    setExpiredPage(Number(root?.currentPage || targetPage));
    setExpiredTotalPages(Number(root?.totalPages || 1));

    const apiTotal = Number(root?.totalCount || root?.totalcount || root?.total || 0);
    if (apiTotal > 0) setStats((prev) => ({ ...prev, expired: apiTotal }));
  };

  const loadRejectedAuctions = async (targetPage = rejectedPage) => {
    const res  = await safeFetch(() => getRejectedDeletedAuctionsPage(targetPage, pageSize));
    if (!res) return;
    const root = res?.data || {};
    const list = Array.isArray(root?.data) ? root.data : Array.isArray(root) ? root : [];
    setRejectedAuctions(list.map(normalizeExpiredAuction));
    setRejectedPage(Number(root?.currentPage || targetPage));
    setRejectedTotalPages(Number(root?.totalPages || 1));

    const apiTotal = Number(root?.totalCount || root?.totalcount || root?.total || 0);
    if (apiTotal > 0) setStats((prev) => ({ ...prev, rejectedDeleted: apiTotal }));
  };

  /* ── loadAll ── uses allSettled so one 404 never kills the rest ── */
  const loadAll = async () => {
    try {
      setLoading(true); setSectionLoading(true); setError("");
      await Promise.allSettled([
        loadStats(),
        loadActiveAuctions(1),
        loadExpiredAuctions(1),
        loadRejectedAuctions(1),
      ]);
    } catch (err) {
      const status = Number(err?.response?.status || 0);
      if (status !== 404 && status !== 405) {
        setError(
          err?.response?.data?.message ||
          err?.response?.data?.Message ||
          err?.message ||
          t("failedLoadAuctions", "Failed to load auctions.")
        );
      }
    } finally {
      setLoading(false); setSectionLoading(false);
    }
  };

  useEffect(() => { loadAll(); }, []); // eslint-disable-line

  const openConfirm  = (auction, action) => { setSelectedAuction(auction); setActionType(action); setConfirmBox(true); };
  const closeConfirm = () => { setConfirmBox(false); setSelectedAuction(null); setActionType(""); };

  const confirmAction = async () => {
    if (!selectedAuction?.id) return;
    try {
      if (actionType === "expire") await forceExpireAuction(selectedAuction.id);
      if (actionType === "delete") await deleteAuction(selectedAuction.id);
      await Promise.allSettled([
        loadStats(),
        loadActiveAuctions(activePage),
        loadExpiredAuctions(expiredPage),
        loadRejectedAuctions(rejectedPage),
      ]);
      closeConfirm();
    } catch (err) {
      alert(
        err?.response?.data?.message ||
        err?.response?.data?.Message ||
        err?.message ||
        t("failedUpdateAuction", "Failed to update auction.")
      );
    }
  };

  /* ── Chart data ── */
  const monthKeys   = ["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"];
  const monthLabels = monthKeys.map((k) => t(k));

  const auctionsChartData = useMemo(
    () => buildMonthlyData(stats.active, stats.expired, stats.rejectedDeleted, monthLabels),
    [stats.active, stats.expired, stats.rejectedDeleted, i18n.language] // eslint-disable-line
  );

  const realChartValues = useMemo(
    () => ({ active: stats.active, expired: stats.expired, rejectedDeleted: stats.rejectedDeleted }),
    [stats.active, stats.expired, stats.rejectedDeleted]
  );

  const auctionsAnalysis = useMemo(
    () => [
      { name: t("active",          "Active"),             value: stats.active          },
      { name: t("expired",         "Expired"),            value: stats.expired         },
      { name: t("rejectedDeleted", "Rejected / Deleted"), value: stats.rejectedDeleted },
    ],
    [stats.active, stats.expired, stats.rejectedDeleted, i18n.language] // eslint-disable-line
  );

  const donutColors = useMemo(() => ["#2d6a4f", "#e63946", "#ffb703"], []);

  /* ══════════════════════════════════════════════════════════════
     RENDER
  ══════════════════════════════════════════════════════════════ */
  return (
    <div className={`admin-layout ${darkModeActive ? "dark-admin" : ""}`} dir={isArabic ? "rtl" : "ltr"}>

      {/* ── NAVBAR ── */}
      <header className="admin-navbar">
        <div className="left">
          <button className="toggle-btn" onClick={toggleSidebar}><i className="fa fa-bars" /></button>
          <div className="brand"><i className="fa fa-gavel" /><span>Safqa Admin</span></div>
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

      {/* ── SIDEBAR ── */}
      <aside className={`admin-sidebar ${sidebarShrinked ? "shrinked" : ""}`}>
        <ul>
          <li><Link to="/admin" className={isActive("/admin")}><i className="fa fa-dashboard" /><span>{t("dashboard","Dashboard")}</span></Link></li>
          <li><Link to="/admin_users"><i className="fa fa-users" /><span>{t("allUsers","All Users")}</span></Link></li>
          <li><Link to="/admin_sellers"><i className="fa fa-user-secret" /><span>{t("allSellers","All Sellers")}</span></Link></li>
          <li><Link className={isActive("/admin_auctions")} to="/admin_auctions"><i className="fa fa-gavel" /><span>{t("allAuctions","All Auctions")}</span></Link></li>
          <li><Link to="/admin_payments"><i className="fa fa-credit-card" /><span>{t("paymentLogs","Payment Logs")}</span></Link></li>
          <li><Link className={isActive("/admin_track_chats")} to="/admin_track_chats"><i className="fa fa-comments" /><span>{t("trackChats","Track Chats")}</span></Link></li>
          <li><Link to="/admin_announcements"><i className="fa fa-bullhorn" /><span>{t("announcements","Announcements")}</span></Link></li>
        </ul>
      </aside>

      {/* ── MAIN ── */}
      <main className={`admin-content ${sidebarShrinked ? "active" : ""}`}>
        <div className="dashboard-wrapper">
          <h2 className="page-title">{t("auctionsManagement","Auctions Management")}</h2>

          {error && <div className="alert alert-danger">{error}</div>}

          {/* Stats + Charts */}
          <section className="dashboard-section">
            <h4>{t("auctionsAnalytics","Auctions Analytics")}</h4>
            {loading ? (
              <><StatsSkeleton /><ChartsSkeleton /></>
            ) : (
              <>
                <div className="grid">
                  <Card title={t("totalAuctions",   "Total Auctions")}    value={stats.total}           icon="gavel"        />
                  <Card title={t("activeAuctions",  "Active Auctions")}   value={stats.active}          icon="check-circle" />
                  <Card title={t("expiredAuctions", "Expired Auctions")}  value={stats.expired}         icon="clock"        />
                  <Card title={t("rejectedDeleted", "Rejected / Deleted")} value={stats.rejectedDeleted} icon="trash"        />
                </div>

                <div className="admin-analysis-row">
                  <div className="admin-chart-scroll">
                    {chartJSReady
                      ? <LineChartJS data={auctionsChartData} realValues={realChartValues} />
                      : <div style={{ color: "#94a3b8", padding: 20 }}>{t("loadingChart","Loading chart...")}</div>
                    }
                  </div>
                  <div className="admin-pie-scroll">
                    {chartJSReady
                      ? <DonutChartJS data={auctionsAnalysis} colors={donutColors} />
                      : <div style={{ color: "#94a3b8", padding: 20 }}>{t("loadingChart","Loading chart...")}</div>
                    }
                  </div>
                </div>

                <div style={{ marginTop: 18, fontWeight: 600, color: darkModeActive ? "#fff" : "#023E8A" }}>
                  {t("globalDeadline","Global Active Deadline Countdown")}: {formatTime(timeLeft)}
                </div>
              </>
            )}
          </section>

          {/* Pending */}
          <h3 className="section-title">{t("pendingAuctionRequests","Pending Auction Requests")}</h3>
          <div className="auction-cards-grid">
            {pendingAuctions.length === 0 ? (
              <p>{t("noPendingAuctionApi","No pending auction API endpoint provided.")}</p>
            ) : (
              pendingAuctions.map((a) => (
                <AuctionCard key={a.id} auction={a} openConfirm={openConfirm} t={t} />
              ))
            )}
          </div>

          <hr className="big-divider" />

          {/* Active */}
          <h3 className="section-title">{t("activeAuctions","Active Auctions")}</h3>
          <div className="auction-cards-grid">
            {sectionLoading ? (
              <p>{t("loading","Loading...")}</p>
            ) : activeAuctions.length === 0 ? (
              <p>{t("noActiveAuctions","No active auctions found.")}</p>
            ) : (
              activeAuctions.map((a) => (
                <AuctionCard key={a.id} auction={a} active openConfirm={openConfirm} t={t} />
              ))
            )}
          </div>
          <Pagination
            page={activePage} totalPages={activeTotalPages} loading={sectionLoading}
            onPrev={() => loadActiveAuctions(activePage - 1)}
            onNext={() => loadActiveAuctions(activePage + 1)} t={t}
          />

          <hr className="big-divider" />

          {/* Expired */}
          <h3 className="section-title">{t("expiredAuctions","Expired Auctions")}</h3>
          <div className="auction-cards-grid">
            {sectionLoading ? (
              <p>{t("loading","Loading...")}</p>
            ) : expiredAuctions.length === 0 ? (
              <p>{t("noExpiredAuctions","No expired auctions found.")}</p>
            ) : (
              expiredAuctions.map((a) => (
                <AuctionCard key={a.id} auction={a} expired openConfirm={openConfirm} t={t} />
              ))
            )}
          </div>
          <Pagination
            page={expiredPage} totalPages={expiredTotalPages} loading={sectionLoading}
            onPrev={() => loadExpiredAuctions(expiredPage - 1)}
            onNext={() => loadExpiredAuctions(expiredPage + 1)} t={t}
          />

          <hr className="big-divider" />

          {/* Rejected / Deleted */}
          <h3 className="section-title">{t("rejectedDeletedAuctions","Rejected / Deleted Auctions")}</h3>
          <div className="auction-cards-grid">
            {sectionLoading ? (
              <p>{t("loading","Loading...")}</p>
            ) : rejectedAuctions.length === 0 ? (
              <p>{t("noRejectedAuctions","No rejected/deleted auctions found.")}</p>
            ) : (
              rejectedAuctions.map((a) => (
                <AuctionCard key={a.id} auction={a} rejected openConfirm={openConfirm} t={t} />
              ))
            )}
          </div>
          <Pagination
            page={rejectedPage} totalPages={rejectedTotalPages} loading={sectionLoading}
            onPrev={() => loadRejectedAuctions(rejectedPage - 1)}
            onNext={() => loadRejectedAuctions(rejectedPage + 1)} t={t}
          />
        </div>
      </main>

      {/* Confirm Modal */}
      {confirmBox && (
        <div className="confirm-overlay">
          <div className="confirm-modal">
            <h3>{t("confirmAction","Confirm Action")}</h3>
            <p>
              {t("areYouSure","Are you sure you want to")}{" "}
              <span className={actionType === "expire" ? "success" : "danger"}>
                {actionType === "delete"
                  ? t("delete","delete")
                  : t("forceExpire","force expire")}
              </span>{" "}
              <strong>{selectedAuction?.title}</strong>?
            </p>
            <div className="confirm-actions">
              <button className="btn cancel" onClick={closeConfirm}>{t("cancel","Cancel")}</button>
              <button
                className={`btn ${actionType === "expire" ? "success" : "danger"}`}
                onClick={confirmAction}
              >
                {t("confirm","Confirm")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   SUB-COMPONENTS
══════════════════════════════════════════════════════════════════ */

function Pagination({ page, totalPages, loading, onPrev, onNext, t }) {
  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 12, marginTop: 16 }}>
      <button className="action-btn view" disabled={page <= 1 || loading} onClick={onPrev}>{t("previous","Previous")}</button>
      <strong>{t("page","Page")} {page} {t("of","of")} {totalPages}</strong>
      <button className="action-btn view" disabled={page >= totalPages || loading} onClick={onNext}>{t("next","Next")}</button>
    </div>
  );
}

function AuctionCard({ auction, openConfirm, active, expired, rejected, t }) {
  return (
    <div className={`auction-card ${expired ? "expired" : ""} ${rejected ? "rejected" : ""}`}>
      <div className="auction-img-wrap">
        <img src={auction.img} alt={auction.title} />
      </div>
      <div className="auction-info">
        <h4>{auction.title}</h4>
        <p className="desc">{auction.desc}</p>
        <p className="price">${Number(auction.price || 0).toLocaleString()}</p>
        <span className="deadline">{t("deadline","Deadline")}: {auction.deadline}</span>
      </div>
      <div className="auction-actions">
        {active && (
          <button className="action-btn suspend" onClick={() => openConfirm(auction, "expire")}>
            {t("forceExpire","Force Expire")}
          </button>
        )}
        {expired && (
          <button className="action-btn suspend" onClick={() => openConfirm(auction, "delete")}>
            {t("delete","Delete")}
          </button>
        )}
        {/* rejected section intentionally has no action button */}
      </div>
    </div>
  );
}

function Card({ title, value, icon }) {
  return (
    <div className="dashboard-card">
      <i className={`fa fa-${icon}`} />
      <div><p>{title}</p><h3>{value}</h3></div>
    </div>
  );
}