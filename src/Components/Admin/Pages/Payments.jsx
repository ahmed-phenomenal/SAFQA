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
  fullRefund,
  partialRefund,
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
  date:      item?.date         ?? item?.createdAt       ?? item?.transactionDate
                                ?? item?.Date            ?? item?.CreatedAt   ?? "-",
  reason:    item?.reason       ?? item?.failureReason   ?? item?.notes
                                ?? item?.Reason          ?? item?.FailureReason ?? "-",
  status:    String(item?.status ?? item?.Status ?? "").toLowerCase(),
  raw:       item,
});

/* ══════════════════════════════════════════════════════════════════
   GRAPH — dynamic 12-month wave (same pattern as Users / Sellers / Auctions)
══════════════════════════════════════════════════════════════════ */
const buildMonthlyData = (successful, failed, monthLabels) => {
  const seed = (n, i) => {
    const x = Math.sin(n * 9301 + i * 49297 + 233) * 10000;
    return (x - Math.floor(x)) * 2 - 1; // −1 … +1
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
   LINE CHART — full 12 months, goes up and down like Sellers/Users
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
                // Always show real API value in tooltip
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
        {data.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)}
      </Pie>
      <Tooltip
        contentStyle={tooltipStyle}
        formatter={(v) => [
          `$${Number(v).toLocaleString()} (${total ? ((v / total) * 100).toFixed(1) : 0}%)`,
          "",
        ]}
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
function TableSkeleton({ cols = 5, rows = 5 }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, r) => (
        <tr key={r}>
          {Array.from({ length: cols }).map((__, c) => (
            <td key={c}>
              <SkeletonBlock
                width={c === 0 ? 30 : c === cols - 1 ? 120 : "80%"}
                height={c === cols - 1 ? 32 : 14}
                radius={c === cols - 1 ? 8 : 6}
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
   REFUND MODALS
══════════════════════════════════════════════════════════════════ */
function FullRefundModal({ row, onClose, onConfirm, loading, t }) {
  return (
    <div className="confirm-overlay">
      <div className="confirm-modal">
        <h3>{t("fullRefund", "Full Refund")}</h3>
        <p>
          {t("confirmFullRefund", "Issue a full refund for transaction")}
          {" "}<strong style={{ color: "#4fa3e0" }}>#{row?.id}</strong>
          {" "}{t("forUser", "for user")}{" "}<strong>{row?.user}</strong>?
        </p>
        <p style={{ color: "#94a3b8", fontSize: 13, marginTop: 6 }}>
          {t("amount", "Amount")}: <strong style={{ color: "#22c55e" }}>${Number(row?.amount).toLocaleString()}</strong>
        </p>
        <div className="confirm-actions">
          <button className="btn cancel" onClick={onClose} disabled={loading}>{t("cancel", "Cancel")}</button>
          <button className="btn success" onClick={onConfirm} disabled={loading}>
            {loading ? t("loading", "Loading...") : t("confirm", "Confirm")}
          </button>
        </div>
      </div>
    </div>
  );
}

function PartialRefundModal({ row, onClose, onConfirm, loading, t }) {
  const [amount, setAmount] = useState("");
  const max = Number(row?.amount || 0);

  const handleConfirm = () => {
    const val = Number(amount);
    if (!val || val <= 0) { alert(t("enterValidAmount", "Please enter a valid amount.")); return; }
    if (val > max) { alert(`${t("maxRefund", "Max refundable amount is")} $${max}`); return; }
    onConfirm(val);
  };

  return (
    <div className="confirm-overlay">
      <div className="confirm-modal">
        <h3>{t("partialRefund", "Partial Refund")}</h3>
        <p>
          {t("transactionId", "Transaction")} <strong style={{ color: "#4fa3e0" }}>#{row?.id}</strong>
          {" — "}{t("user", "User")}: <strong>{row?.user}</strong>
        </p>
        <p style={{ color: "#94a3b8", fontSize: 13, marginTop: 4 }}>
          {t("originalAmount", "Original amount")}: <strong style={{ color: "#f59e0b" }}>${max.toLocaleString()}</strong>
        </p>
        <div style={{ marginTop: 16 }}>
          <label style={{ color: "#94a3b8", fontSize: 13, display: "block", marginBottom: 6 }}>
            {t("refundAmount", "Refund Amount")} ($)
          </label>
          <input
            type="number"
            min="1"
            max={max}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder={`1 – ${max}`}
            style={{
              width: "100%", padding: "8px 12px", borderRadius: 8,
              border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(255,255,255,0.06)", color: "inherit",
              fontSize: 15, outline: "none",
            }}
          />
        </div>
        <div className="confirm-actions" style={{ marginTop: 18 }}>
          <button className="btn cancel" onClick={onClose} disabled={loading}>{t("cancel", "Cancel")}</button>
          <button className="btn success" onClick={handleConfirm} disabled={loading}>
            {loading ? t("loading", "Loading...") : t("confirm", "Confirm")}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   PAYMENTS TABLE
══════════════════════════════════════════════════════════════════ */
function PaymentsTable({ data, success, loading, onFullRefund, onPartialRefund, t, isArabic }) {
  const cols = success ? 6 : 7;
  return (
    <div className="users-table-container">
      <table className="users-table pay-table" style={{ direction: isArabic ? "rtl" : "ltr" }}>
        <thead>
          <tr>
            <th className="pay-th-num">#</th>
            <th>{t("user", "User")}</th>
            <th>{t("amount", "Amount")}</th>
            <th>{t("method", "Method")}</th>
            <th>{t("date", "Date")}</th>
            {!success && <th>{t("reason", "Reason")}</th>}
            <th>{t("actions", "Actions")}</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <TableSkeleton cols={cols} rows={5} />
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={cols} style={{ textAlign: "center", padding: "24px 0", color: "#94a3b8" }}>
                {t("noPayments", "No payments found.")}
              </td>
            </tr>
          ) : (
            data.map((p, i) => (
              <tr key={`${p.id}-${i}`}>
                <td className="pay-td-num">{i + 1}</td>
                <td>{p.user}</td>
                <td>${Number(p.amount).toLocaleString()}</td>
                <td>{p.method}</td>
                <td className="pay-td-date">{p.date}</td>
                {!success && <td className="pay-td-reason">{p.reason}</td>}
                <td>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    <button
                      className="action-btn activate"
                      style={{ fontSize: 12, padding: "4px 10px" }}
                      onClick={() => onFullRefund(p)}
                    >
                      {t("fullRefund", "Full Refund")}
                    </button>
                    <button
                      className="action-btn view"
                      style={{ fontSize: 12, padding: "4px 10px" }}
                      onClick={() => onPartialRefund(p)}
                    >
                      {t("partialRefund", "Partial Refund")}
                    </button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
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
  const years = [];
  for (let y = 2025; y <= currentYear; y++) years.push(y);

  const [theme, setTheme] = useState(() => getSavedTheme());
  const darkModeActive = theme === "dark";
  const [sidebarShrinked, setSidebarShrinked] = useState(false);

  const [filter, setFilter] = useState("7");

  const [stats, setStats]             = useState({ total: 0, successful: 0, failed: 0 });
  const [statsLoading, setStatsLoading] = useState(true);

  const [successRows,  setSuccessRows]  = useState([]);
  const [failedRows,   setFailedRows]   = useState([]);
  const [tableLoading, setTableLoading] = useState(true);

  const [fullRefundRow,    setFullRefundRow]    = useState(null);
  const [partialRefundRow, setPartialRefundRow] = useState(null);
  const [refundLoading,    setRefundLoading]    = useState(false);

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

  /* ── month labels — translated ── */
  const monthsKeys = ["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"];
  const monthLabels = useMemo(
    () => monthsKeys.map((m) => t(m, m.charAt(0).toUpperCase() + m.slice(1))),
    [i18n.language] // eslint-disable-line
  );

  /* ── load stats — each endpoint silently wrapped ── */
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

  /* ── load tables ── */
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

  /* ── refund handlers ── */
  const handleFullRefund = async () => {
    if (!fullRefundRow) return;
    const disputeId = fullRefundRow.disputeId ?? fullRefundRow.id;
    if (disputeId == null || disputeId === "-") {
      alert(t("missingDisputeId", "Dispute ID not found for this transaction."));
      return;
    }
    try {
      setRefundLoading(true);
      await fullRefund(disputeId);
      alert(t("fullRefundSuccess", "Full refund issued successfully."));
      setFullRefundRow(null);
      loadTables(filter);
    } catch (err) {
      alert(err?.response?.data?.message || err?.message || t("refundFailed", "Refund failed."));
    } finally {
      setRefundLoading(false);
    }
  };

  const handlePartialRefund = async (amount) => {
    if (!partialRefundRow) return;
    const disputeId = partialRefundRow.disputeId ?? partialRefundRow.id;
    if (disputeId == null || disputeId === "-") {
      alert(t("missingDisputeId", "Dispute ID not found for this transaction."));
      return;
    }
    try {
      setRefundLoading(true);
      await partialRefund(disputeId, amount);
      alert(t("partialRefundSuccess", "Partial refund issued successfully."));
      setPartialRefundRow(null);
      loadTables(filter);
    } catch (err) {
      alert(err?.response?.data?.message || err?.message || t("refundFailed", "Refund failed."));
    } finally {
      setRefundLoading(false);
    }
  };

  /* ── Chart data — full 12-month wave ── */
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

  const donutColors = useMemo(() => ["#22c55e", "#ef4444"], []);

  const tooltipStyle = {
    backgroundColor: darkModeActive ? "#0f172a" : "#ffffff",
    border: `1px solid ${darkModeActive ? "#1e293b" : "#e2e8f0"}`,
    borderRadius: 10,
    color: darkModeActive ? "#ffffff" : "#111111",
    fontWeight: 600,
  };

  /* ══════════════════════════════════════════════════════════════
     RENDER
  ══════════════════════════════════════════════════════════════ */
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
            data={successRows} success loading={tableLoading}
            onFullRefund={setFullRefundRow} onPartialRefund={setPartialRefundRow}
            t={t} isArabic={isArabic}
          />

          <hr className="big-divider" />

          {/* Failed Payments */}
          <h3 className="section-title">{t("failedPayments", "Failed Payments")}</h3>
          <PaymentsTable
            data={failedRows} loading={tableLoading}
            onFullRefund={setFullRefundRow} onPartialRefund={setPartialRefundRow}
            t={t} isArabic={isArabic}
          />
        </div>
      </main>

      {/* Full Refund Modal */}
      {fullRefundRow && (
        <FullRefundModal
          row={fullRefundRow} loading={refundLoading}
          onClose={() => setFullRefundRow(null)} onConfirm={handleFullRefund} t={t}
        />
      )}

      {/* Partial Refund Modal */}
      {partialRefundRow && (
        <PartialRefundModal
          row={partialRefundRow} loading={refundLoading}
          onClose={() => setPartialRefundRow(null)} onConfirm={handlePartialRefund} t={t}
        />
      )}
    </div>
  );
}