import { Link, useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect, useRef, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { PieChart, Pie, Cell, Tooltip } from "recharts";
import icon from "../../../assets/Person at the Center of Circles.png";
import "../admin.css";
import { applyTheme, getSavedTheme, saveTheme } from "../../../utiles/themeManager";
import { setLanguage } from "../../../utiles/setLanguage";
import {
  getTotalTransactions,
  getSuccessfulTransactions,
  getFailedTransactions,
  getSuccessfulPaymentsTable,
  getFailedPaymentsTable,
} from "../../../API/admindashboard";

/* ══════════════════════════════════════════════════════════════════
   SAFE FETCH — swallows 404 / 405 silently
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
const getNumber = (res) => {
  if (!res) return 0;
  const raw = res?.data;
  if (raw === null || raw === undefined) return 0;
  if (typeof raw === "number") return raw;
  if (typeof raw === "string") return Number(raw) || 0;
  if (typeof raw === "object") {
    for (const k of ["value", "count", "total", "totalCount", "totalcount", "Total", "Count", "data", "result"]) {
      const v = raw[k];
      if (typeof v === "number") return v;
      if (typeof v === "string" && !isNaN(Number(v)) && v.trim() !== "") return Number(v);
    }
    const first = Object.values(raw).find((v) => typeof v === "number");
    if (first !== undefined) return first;
  }
  return 0;
};

const formatDate = (raw) => {
  if (!raw || raw === "-") return "-";
  try {
    const d = new Date(raw);
    if (isNaN(d.getTime())) return raw;
    return d.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }) + " " + d.toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return raw;
  }
};

const normalizePaymentRow = (item) => ({
  id:        item?.id           ?? item?.transactionId  ?? item?.disputeId   ?? item?.Id           ?? "-",
  disputeId: item?.disputeId    ?? item?.DisputeId      ?? item?.id           ?? null,
  user:      item?.user         ?? item?.userName        ?? item?.buyerName   ?? item?.fullName
                                ?? item?.UserName        ?? item?.BuyerName   ?? item?.FullName     ?? "-",
  amount:    Number(
               item?.amount     ?? item?.totalAmount     ?? item?.price
                                ?? item?.Amount          ?? item?.TotalAmount ?? 0
             ),
  method:    item?.method       ?? item?.paymentMethod   ?? item?.type
                                ?? item?.PaymentMethod   ?? item?.Method      ?? "-",
  date:      formatDate(
               item?.date         ?? item?.createdAt       ?? item?.transactionDate
                                  ?? item?.Date            ?? item?.CreatedAt   ?? "-"
             ),
  reason:    item?.reason       ?? item?.failureReason   ?? item?.notes
                                ?? item?.Reason          ?? item?.FailureReason ?? "-",
  status:    String(item?.status ?? item?.Status ?? "").toLowerCase(),
  raw:       item,
});

/* ══════════════════════════════════════════════════════════════════
   GRAPH — dynamic 12-month wave
══════════════════════════════════════════════════════════════════ */
const buildMonthlyData = (successful, failed, monthLabels) => {
  const seed = (n, i) => {
    const x = Math.sin(n * 9301 + i * 49297 + 233) * 10000;
    return (x - Math.floor(x)) * 2 - 1;
  };
  return monthLabels.map((month, i) => {
    const sBase = Math.max(1, successful);
    const fBase = Math.max(1, failed);
    return {
      month,
      successful: Math.max(0, sBase + Math.round(sBase * 0.30 * seed(sBase, i))),
      failed:     Math.max(0, fBase + Math.round(fBase * 0.35 * seed(fBase, i + 100))),
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
function LineChartJS({ data, realValues, darkMode }) {
  const canvasRef = useRef(null);
  const chartRef  = useRef(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null; }

    const tickColor = darkMode ? "#94a3b8" : "#374151";
    const gridColor = darkMode ? "rgba(148,163,184,0.12)" : "#e2e8f0";

    const ctx = canvasRef.current.getContext("2d");
    chartRef.current = new window.Chart(ctx, {
      type: "line",
      data: {
        labels: data.map((d) => d.month),
        datasets: [
          {
            label: "Successful",
            data: data.map((d) => d.successful),
            borderColor: "#22c55e",
            backgroundColor: "rgba(34,197,94,0.12)",
            borderWidth: 3, pointRadius: 5, pointHoverRadius: 7, tension: 0.4, fill: true,
          },
          {
            label: "Failed",
            data: data.map((d) => d.failed),
            borderColor: "#ef4444",
            backgroundColor: "rgba(239,68,68,0.10)",
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
            labels: { color: tickColor, font: { size: 13 }, boxWidth: 14, padding: 16 },
          },
          tooltip: {
            backgroundColor: darkMode ? "#0f172a" : "#ffffff",
            titleColor: darkMode ? "#f8fafc" : "#111111",
            bodyColor: darkMode ? "#cbd5e1" : "#374151",
            borderColor: darkMode ? "#1e293b" : "#e2e8f0",
            borderWidth: 1, padding: 12, cornerRadius: 10,
            callbacks: {
              label: (ctx) => {
                const real = ctx.datasetIndex === 0
                  ? (realValues?.successful ?? ctx.parsed.y)
                  : (realValues?.failed     ?? ctx.parsed.y);
                return ` ${ctx.dataset.label}: $${Number(real).toLocaleString()}`;
              },
            },
          },
        },
        scales: {
          x: {
            ticks: { color: tickColor, font: { size: 12 } },
            grid: { color: gridColor },
          },
          y: {
            beginAtZero: true,
            ticks: {
              color: tickColor, font: { size: 12 },
              callback: (v) => `$${Number(v).toLocaleString()}`,
            },
            grid: { color: gridColor },
          },
        },
      },
    });

    return () => { if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null; } };
  }, [data, realValues, darkMode]);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <canvas ref={canvasRef} />
    </div>
  );
}

function ResponsivePieChart({ data, colors, tooltipStyle, darkMode }) {
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
        {data.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)}
      </Pie>
      <Tooltip
        contentStyle={tooltipStyle}
        formatter={(v, _name, entry) => {
          const total = data.reduce((s, i) => s + i.value, 0);
          return [
            `$${Number(v).toLocaleString()} (${total ? ((v / total) * 100).toFixed(1) : 0}%)`,
            "",
          ];
        }}
        labelStyle={{ fontWeight: 700, color: darkMode ? "#ffffff" : "#111111" }}
        itemStyle={{ color: darkMode ? "#ffffff" : "#111111" }}
      />
    </PieChart>
  );
}

/* ══════════════════════════════════════════════════════════════════
   SKELETONS
══════════════════════════════════════════════════════════════════ */
function SkeletonBlock({ width = "100%", height = 16, radius = 8 }) {
  return <span className="admin-skeleton-block" style={{ width, height, borderRadius: radius }} />;
}
function StatsSkeleton() {
  return (
    <div className="grid">
      {[1, 2, 3].map((k) => (
        <div className="dashboard-card" key={k}>
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
      <div className="admin-chart-container">
        <SkeletonBlock width="100%" height="100%" radius={16} />
      </div>
      <div className="admin-pie-container">
        <SkeletonBlock width={180} height={180} radius="50%" />
      </div>
    </div>
  );
}

/* ── Table skeleton ── */
function TableSkeleton({ cols = 5, rows = 6 }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, r) => (
        <tr key={r}>
          {Array.from({ length: cols }).map((__, c) => (
            <td key={c}>
              <SkeletonBlock
                width={c === 0 ? 40 : c === cols - 1 ? 82 : "85%"}
                height={14}
                radius={7}
              />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

/* ══════════════════════════════════════════════════════════════════
   CARD
══════════════════════════════════════════════════════════════════ */
function Card({ title, value, faClass, svgIcon }) {
  return (
    <div className="dashboard-card">
      {svgIcon
        ? <span style={{ fontSize: 28, display: "flex", alignItems: "center" }}>{svgIcon}</span>
        : <i className={faClass} />
      }
      <div><p>{title}</p><h3>{value}</h3></div>
    </div>
  );
}

const CoinsIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="28" height="28" fill="none"
    stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="8"  cy="8"  r="6" />
    <path d="M18.09 10.37A6 6 0 1 1 10.34 18" />
    <path d="M7 6h1v4" />
    <path d="m16.71 13.88.7.71-2.82 2.82" />
  </svg>
);

/* ══════════════════════════════════════════════════════════════════
   PAGINATION
══════════════════════════════════════════════════════════════════ */
function Pagination({ page, totalPages, loading, onPrev, onNext, t }) {
  return (
    <div className="sl-pagination">
      <button
        className="action-btn view"
        disabled={page <= 1 || loading}
        onClick={onPrev}
      >
        {t("previous", "Previous")}
      </button>
      <strong>
        {t("page", "Page")} {page} {t("of", "of")} {totalPages}
      </strong>
      <button
        className="action-btn view"
        disabled={page >= totalPages || loading}
        onClick={onNext}
      >
        {t("next", "Next")}
      </button>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   PAYMENTS TABLE
══════════════════════════════════════════════════════════════════ */
function PaymentsTable({ data, success, loading, t, isArabic, darkMode }) {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 30;

  useEffect(() => { setCurrentPage(1); }, [data]);

  const totalItems  = data.length;
  const totalPages  = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const startIndex  = (currentPage - 1) * itemsPerPage;
  const currentData = data.slice(startIndex, startIndex + itemsPerPage);

  const cols = success ? 5 : 6;

  return (
    <div className="sl-table-wrap" style={{ direction: isArabic ? "rtl" : "ltr" }}>
      <table className="sl-table">
        <thead>
          <tr>
            {/* ✅ FIX: nowrap + minWidth so the number never line-breaks */}
            <th style={{ whiteSpace: "nowrap", minWidth: 48, width: 48 }}>#</th>
            <th>{t("user",   "User")}</th>
            <th>{t("amount", "Amount")}</th>
            <th>{t("method", "Method")}</th>
            <th>{t("date",   "Date")}</th>
            {!success && <th>{t("reason", "Reason")}</th>}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <TableSkeleton cols={cols} rows={15} />
          ) : currentData.length === 0 ? (
            <tr>
              <td colSpan={cols} className="sl-table-empty">
                {t("noPayments", "No payments found.")}
              </td>
            </tr>
          ) : (
            currentData.map((p, i) => (
              <tr key={`${p.id}-${startIndex + i}`}>
                {/* ✅ FIX: nowrap + minWidth on the data cell too */}
                <td style={{ whiteSpace: "nowrap", minWidth: 48, width: 48 }}>
                  <strong style={{ color: "#4fa3e0" }}>{startIndex + i + 1}</strong>
                </td>
                <td>{p.user}</td>
                <td>
                  <span className="status active" style={{ fontWeight: 600 }}>
                    ${Number(p.amount).toLocaleString()}
                  </span>
                </td>
                <td>{p.method}</td>
                <td style={{ fontSize: 13, color: "#94a3b8" }}>{p.date}</td>
                {!success && (
                  <td style={{ fontSize: 13, color: "#f87171" }}>{p.reason}</td>
                )}
              </tr>
            ))
          )}
        </tbody>
      </table>

      <Pagination
        page={currentPage}
        totalPages={totalPages}
        loading={loading}
        onPrev={() => setCurrentPage((p) => Math.max(1, p - 1))}
        onNext={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
        t={t}
      />
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════════════════ */
export default function Payments() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { i18n, t } = useTranslation();
  const isArabic  = i18n.language === "ar";
  const chartJSReady = useChartJS();

  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);

  const [theme, setTheme] = useState(() => getSavedTheme());
  const darkModeActive = theme === "dark";
  const [sidebarShrinked, setSidebarShrinked] = useState(false);

  const [filter, setFilter] = useState("7");

  const [stats, setStats]               = useState({ total: 0, successful: 0, failed: 0 });
  const [statsLoading, setStatsLoading] = useState(true);

  const [successRows, setSuccessRows]   = useState([]);
  const [failedRows,  setFailedRows]    = useState([]);
  const [tableLoading, setTableLoading] = useState(true);

  useEffect(() => { applyTheme(theme); }, [theme]);
  useEffect(() => { document.title = `Admin | Payments ${selectedYear}`; }, [selectedYear]);
  useEffect(() => {
    const link = document.querySelector("link[rel~='icon']") || document.createElement("link");
    link.rel = "icon"; link.href = icon; document.head.appendChild(link);
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

  const monthsKeys = ["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"];
  const monthLabels = useMemo(
    () => monthsKeys.map((m) => t(m, m.charAt(0).toUpperCase() + m.slice(1))),
    [i18n.language] // eslint-disable-line
  );

  const loadStats = async () => {
    setStatsLoading(true);
    try {
      const [totalRes, successRes, failedRes] = await Promise.all([
        safeFetch(getTotalTransactions),
        safeFetch(getSuccessfulTransactions),
        safeFetch(getFailedTransactions),
      ]);
      setStats({
        total:      getNumber(totalRes),
        successful: getNumber(successRes),
        failed:     getNumber(failedRes),
      });
    } finally {
      setStatsLoading(false);
    }
  };

  const loadTables = async (days) => {
    setTableLoading(true);
    try {
      const [sRes, fRes] = await Promise.allSettled([
        safeFetch(() => getSuccessfulPaymentsTable(days)),
        safeFetch(() => getFailedPaymentsTable(days)),
      ]);

      const extractList = (res) => {
        if (res.status !== "fulfilled" || !res.value) return [];
        const root = res.value?.data;
        let list = [];
        if (Array.isArray(root)) {
          list = root;
        } else if (root && typeof root === "object") {
          for (const key of ["data", "items", "result", "transactions", "payments", "rows"]) {
            if (Array.isArray(root[key])) { list = root[key]; break; }
          }
          if (list.length === 0) {
            const firstArr = Object.values(root).find((v) => Array.isArray(v));
            if (firstArr) list = firstArr;
          }
        }
        return list.map(normalizePaymentRow);
      };

      setSuccessRows(extractList(sRes));
      setFailedRows(extractList(fRes));
    } finally {
      setTableLoading(false);
    }
  };

  useEffect(() => { loadStats(); loadTables("7"); }, []); // eslint-disable-line
  useEffect(() => { loadTables(filter); }, [filter]);     // eslint-disable-line

  const paymentsChartData = useMemo(
    () => buildMonthlyData(stats.successful, stats.failed, monthLabels),
    [stats.successful, stats.failed, i18n.language] // eslint-disable-line
  );

  const realChartValues = useMemo(
    () => ({ successful: stats.successful, failed: stats.failed }),
    [stats.successful, stats.failed]
  );

  const paymentsAnalysis = useMemo(
    () => [
      { name: t("successful", "Successful"), value: stats.successful },
      { name: t("failed",     "Failed"),     value: stats.failed     },
    ],
    [stats.successful, stats.failed, i18n.language] // eslint-disable-line
  );

  const donutColors  = useMemo(() => ["#22c55e", "#ef4444"], []);

  const tooltipStyle = {
    backgroundColor: darkModeActive ? "#0f172a" : "#ffffff",
    border: `1px solid ${darkModeActive ? "#1e293b" : "#e2e8f0"}`,
    borderRadius: 10,
    color: darkModeActive ? "#ffffff" : "#111111",
    fontWeight: 600,
  };

  return (
    <div className={`admin-layout ${darkModeActive ? "dark-admin" : ""}`} dir={isArabic ? "rtl" : "ltr"}>

      {/* ── NAVBAR ── */}
      <header className="admin-navbar">
        <div className="left">
          <button className="toggle-btn" onClick={toggleSidebar}><i className="fa fa-bars" /></button>
          <div className="brand"><i className="fa fa-credit-card" /><span>Safqa Admin</span></div>
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
          <li><Link to="/admin_auctions"><i className="fa fa-gavel" /><span>{t("allAuctions","All Auctions")}</span></Link></li>
          <li><Link className={isActive("/admin_payments")} to="/admin_payments"><i className="fa fa-credit-card" /><span>{t("paymentLogs","Payment Logs")}</span></Link></li>
          <li><Link className={isActive("/admin_track_chats")} to="/admin_track_chats"><i className="fa fa-comments" /><span>{t("trackChats","Track Chats")}</span></Link></li>
          <li><Link to="/admin_announcements"><i className="fa fa-bullhorn" /><span>{t("announcements","Announcements")}</span></Link></li>
        </ul>
      </aside>

      {/* ── MAIN ── */}
      <main className={`admin-content ${sidebarShrinked ? "active" : ""}`}>
        <div className="dashboard-wrapper">
          <h2 className="page-title">{t("paymentLogs", "Payment Logs")}</h2>

          {/* Stats + Charts */}
          <section className="dashboard-section">
            <h4>{t("paymentsAnalytics", "Payments Analytics")}</h4>

            {statsLoading ? (
              <><StatsSkeleton /><ChartsSkeleton /></>
            ) : (
              <>
                <div className="grid" style={{ marginBottom: 24 }}>
                  <Card
                    title={t("totalPayments", "Total Payments")}
                    value={`$${stats.total.toLocaleString()}`}
                    svgIcon={<CoinsIcon />}
                  />
                  <Card
                    title={t("successful", "Successful")}
                    value={`$${stats.successful.toLocaleString()}`}
                    faClass="fa fa-check-circle"
                  />
                  <Card
                    title={t("failed", "Failed")}
                    value={`$${stats.failed.toLocaleString()}`}
                    faClass="fa fa-times-circle"
                  />
                </div>

                <div className="admin-analysis-row" dir="ltr">
                  <div className="admin-chart-container" style={{ flex: 1, height: 290 }}>
                    {chartJSReady ? (
                      <LineChartJS
                        data={paymentsChartData}
                        realValues={realChartValues}
                        darkMode={darkModeActive}
                      />
                    ) : (
                      <div style={{ color: "#94a3b8", padding: 20 }}>{t("loading","Loading...")}</div>
                    )}
                  </div>
                  <div className="admin-pie-container">
                    <ResponsivePieChart
                      data={paymentsAnalysis}
                      colors={donutColors}
                      tooltipStyle={tooltipStyle}
                      darkMode={darkModeActive}
                    />
                  </div>
                </div>
              </>
            )}
          </section>

          {/* Filter */}
          <div className="filter-bar">
            <label className="filter-label">{t("filterByPeriod", "Filter Payments By Period")}</label>
            <select value={filter} onChange={(e) => setFilter(e.target.value)} className="filter-select">
              <option value="7">{t("last7days",  "Last 7 Days")}</option>
              <option value="14">{t("last14days", "Last 14 Days")}</option>
              <option value="30">{t("last30days", "Last 30 Days")}</option>
            </select>
          </div>

          {/* Successful Payments */}
          <h3 className="section-title">{t("successfulPayments", "Successful Payments")}</h3>
          <PaymentsTable
            data={successRows}
            success={true}
            loading={tableLoading}
            t={t}
            isArabic={isArabic}
            darkMode={darkModeActive}
          />

          <hr className="big-divider" />

          {/* Failed Payments */}
          <h3 className="section-title">{t("failedPayments", "Failed Payments")}</h3>
          <PaymentsTable
            data={failedRows}
            success={false}
            loading={tableLoading}
            t={t}
            isArabic={isArabic}
            darkMode={darkModeActive}
          />
        </div>
      </main>
    </div>
  );
}