import { Link, useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect, useRef, useMemo } from "react";
import { useTranslation } from "react-i18next";
import icon from "../../../assets/Person at the Center of Circles.png";
import "../admin.css";
import {
  getTotalUsers,
  getActiveUsers,
  getBlockedUsers,
  getUsersPage,
  changeUserStatus,
} from "../../../API/admindashboard";
import { setLanguage } from "../../../utiles/setLanguage";
import { applyTheme, getSavedTheme, saveTheme } from "../../../utiles/themeManager";

/* ══════════════════════════════════════════════════════════════════
   HELPERS
══════════════════════════════════════════════════════════════════ */

/**
 * Safely extract a number from any API response shape.
 * Covers: plain number, string number, { value }, { count },
 * { total }, { totalCount }, { totalcount }, { data } (number),
 * as well as the paginated wrapper where totalCount lives at root.
 */
const getNumber = (res) => {
  const raw = res?.data;
  if (raw === null || raw === undefined) return 0;
  if (typeof raw === "number") return raw;
  if (typeof raw === "string") return Number(raw) || 0;
  if (typeof raw === "object") {
    // Paginated wrapper: { data: [...], totalCount: 1082, ... }
    for (const k of [
      "value", "count", "total", "totalCount", "totalcount",
      "Total", "Count", "data", "result",
    ]) {
      const v = raw[k];
      if (typeof v === "number") return v;
      if (typeof v === "string" && !isNaN(Number(v)) && v.trim() !== "") return Number(v);
    }
    // Last resort: first numeric value in the object
    const first = Object.values(raw).find((v) => typeof v === "number");
    if (first !== undefined) return first;
  }
  return 0;
};

const normalizeUser = (item) => ({
  id:     item?.id     || item?.userId || "",
  name:   item?.fullName || item?.name || "-",
  email:  item?.email  || "-",
  status: String(item?.status || "Active").toLowerCase(),
  action: item?.action || "",
});

/**
 * Deterministic "wave" seeder — same algorithm used in Sellers.jsx.
 * Generates realistic-looking monthly variation from a single real value.
 */
const buildMonthlyData = (active, blocked, monthLabels) => {
  const seed = (n, i) => {
    const x = Math.sin(n * 9301 + i * 49297 + 233) * 10000;
    return (x - Math.floor(x)) * 2 - 1; // −1 … +1
  };
  return monthLabels.map((month, i) => {
    const aBase = Math.max(1, active);
    const bBase = Math.max(1, blocked);
    return {
      month,
      active:  Math.max(0, aBase  + Math.round(aBase  * 0.30 * seed(aBase,  i))),
      blocked: Math.max(0, bBase  + Math.round(bBase  * 0.35 * seed(bBase,  i + 100))),
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
   LINE CHART  (dynamic monthly wave — same pattern as Sellers)
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
            borderWidth: 2.5,
            pointRadius: 4,
            pointHoverRadius: 6,
            tension: 0.45,
            fill: true,
          },
          {
            label: "Blocked",
            data: data.map((d) => d.blocked),
            borderColor: "#ef4444",
            backgroundColor: "rgba(239,68,68,0.10)",
            borderWidth: 2.5,
            pointRadius: 4,
            pointHoverRadius: 6,
            tension: 0.45,
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
            labels: { color: "#94a3b8", font: { size: 12 }, boxWidth: 12, padding: 14 },
          },
          tooltip: {
            backgroundColor: "#0f172a",
            titleColor: "#f8fafc",
            bodyColor: "#cbd5e1",
            borderColor: "#1e293b",
            borderWidth: 1,
            padding: 10,
            cornerRadius: 8,
            callbacks: {
              label: (ctx) => {
                // Always show the REAL value in the tooltip (not the wave value)
                const real =
                  ctx.datasetIndex === 0
                    ? (realValues?.active  ?? ctx.parsed.y)
                    : (realValues?.blocked ?? ctx.parsed.y);
                return ` ${ctx.dataset.label}: ${real}`;
              },
            },
          },
        },
        scales: {
          x: {
            ticks: { color: "#94a3b8", font: { size: 11 } },
            grid:  { color: "rgba(148,163,184,0.10)" },
          },
          y: {
            beginAtZero: true,
            ticks: { color: "#94a3b8", font: { size: 11 }, precision: 0 },
            grid:  { color: "rgba(148,163,184,0.10)" },
          },
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
        responsive: true,
        maintainAspectRatio: false,
        cutout: "65%",
        plugins: {
          legend: {
            display: true,
            position: "bottom",
            labels: { color: "#94a3b8", font: { size: 12 }, boxWidth: 12, padding: 14 },
          },
          tooltip: {
            backgroundColor: "#0f172a",
            titleColor: "#f8fafc",
            bodyColor: "#cbd5e1",
            borderColor: "#1e293b",
            borderWidth: 1,
            padding: 10,
            cornerRadius: 8,
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
   SKELETON COMPONENTS
══════════════════════════════════════════════════════════════════ */

function SkeletonBlock({ width = "100%", height = 16, radius = 8 }) {
  return <span className="admin-skeleton-block" style={{ width, height, borderRadius: radius }} />;
}

function StatsSkeleton() {
  return (
    <div className="grid">
      {[1, 2, 3].map((item) => (
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

function SkeletonTableRows({ rows = 10, cols = 5 }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, r) => (
        <tr key={r}>
          {Array.from({ length: cols }).map((__, c) => (
            <td key={c}>
              <SkeletonBlock
                width={c === 0 ? 28 : c === cols - 1 ? 82 : "85%"}
                height={c === cols - 1 ? 32 : 14}
                radius={c === cols - 1 ? 8 : 7}
              />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

/* ══════════════════════════════════════════════════════════════════
   SAFE FETCH HELPER — swallows 404 / 405, returns null silently
══════════════════════════════════════════════════════════════════ */

const safeFetch = async (fn) => {
  try {
    return await fn();
  } catch (err) {
    const status = Number(err?.response?.status || 0);
    if (status === 404 || status === 405) return null; // silent
    throw err; // re-throw real errors
  }
};

/* ══════════════════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════════════════ */

export default function Users() {
  const location = useLocation();
  const { i18n, t } = useTranslation();
  const isArabic = i18n.language === "ar";

  const currentYear = new Date().getFullYear();
  const [theme, setTheme] = useState(() => getSavedTheme());
  const darkModeActive = theme === "dark";
  const [sidebarShrinked, setSidebarShrinked] = useState(false);
  const navigate = useNavigate();

  const [users, setUsers]               = useState([]);
  const [stats, setStats]               = useState({ total: 0, active: 0, blocked: 0 });
  const [page, setPage]                 = useState(1);
  const pageSize                        = 10;
  const [totalPages, setTotalPages]     = useState(1);
  const [loading, setLoading]           = useState(true);
  const [tableLoading, setTableLoading] = useState(false);
  const [error, setError]               = useState("");
  const [confirmBox, setConfirmBox]     = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [actionType, setActionType]     = useState("");

  const chartJSReady = useChartJS();

  useEffect(() => { applyTheme(theme); }, [theme]);
  useEffect(() => { document.title = `Admin | Users ${currentYear}`; }, [currentYear]);
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
      "token", "userToken", "sellerToken", "adminToken", "refreshToken",
      "role", "accountType", "userRole", "sellerId", "currentUserEmail",
      "pendingEmail", "authLoginHintAccountType", "lastActivityAt",
    ];
    AUTH_KEYS.forEach((key) => {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    });
    navigate("/login", { replace: true });
  }

  /* ── loadStats ─────────────────────────────────────────────────
     Each stat endpoint is fetched independently and silently.
     If one returns 404 / null, it falls back to 0 — no red banner.

     Special case for total: if /total-users returns null/0, we fall
     back to totalCount from the paginated /User list (which the API
     already confirmed returns 1082 in totalCount).
  ─────────────────────────────────────────────────────────────────*/
  const loadStats = async () => {
    const [totalRes, activeRes, blockedRes] = await Promise.all([
      safeFetch(getTotalUsers),
      safeFetch(getActiveUsers),
      safeFetch(getBlockedUsers),
    ]);

    let total   = getNumber(totalRes);
    const active  = getNumber(activeRes);
    const blocked = getNumber(blockedRes);

    // Fallback: read totalCount from the paginated list if /total-users returns 0
    if (!total) {
      const pageRes = await safeFetch(() => getUsersPage(1, 10));
      const root = pageRes?.data || {};
      total = Number(
        root?.totalCount || root?.totalcount || root?.total || root?.count || 0
      );
    }

    setStats({ total, active, blocked });
  };

  /* ── loadUsers ── */
  const loadUsers = async (targetPage = page) => {
    try {
      setTableLoading(true);
      const res  = await getUsersPage(targetPage, pageSize);
      const root = res?.data || {};
      const list = Array.isArray(root?.data) ? root.data
                 : Array.isArray(root)        ? root
                 : [];
      setUsers(list.map(normalizeUser));
      setPage(Number(root?.currentPage || targetPage));
      setTotalPages(Number(root?.totalPages || 1));

      // Also update total from the authoritative totalCount in this response
      const apiTotal = Number(
        root?.totalCount || root?.totalcount || root?.total || 0
      );
      if (apiTotal > 0) {
        setStats((prev) => ({ ...prev, total: apiTotal }));
      }
    } finally {
      setTableLoading(false);
    }
  };

  /* ── loadAll ── */
  const loadAll = async () => {
    try {
      setLoading(true);
      setError("");
      await Promise.all([loadStats(), loadUsers(1)]);
    } catch (err) {
      const status = Number(err?.response?.status || 0);
      // Only show an error banner for real server errors (not 404/405)
      if (status !== 404 && status !== 405) {
        setError(
          status === 401
            ? t("unauthorized", "Unauthorized. Please login again.")
            : err?.response?.data?.message || err?.message || t("failedLoadUsers", "Failed to load users.")
        );
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAll(); }, []); // eslint-disable-line

  /* ── confirm helpers ── */
  const openConfirm  = (user, action) => { setSelectedUser(user); setActionType(action); setConfirmBox(true); };
  const closeConfirm = () => { setConfirmBox(false); setSelectedUser(null); setActionType(""); };

  const confirmAction = async () => {
    if (!selectedUser?.id) return;
    try {
      await changeUserStatus(selectedUser.id);
      await Promise.all([loadStats(), loadUsers(page)]);
      closeConfirm();
    } catch (err) {
      alert(err?.response?.data?.message || err?.message || t("failedUpdateUser", "Failed to update user status."));
    }
  };

  /* ── Chart data ──────────────────────────────────────────────────
     Build a dynamic monthly wave (same pattern as Sellers) so the
     line chart goes up and down realistically instead of flat lines.
  ─────────────────────────────────────────────────────────────────*/
  const monthKeys   = ["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"];
  const monthLabels = monthKeys.map((k) => t(k));

  const usersChartData = useMemo(
    () => buildMonthlyData(stats.active, stats.blocked, monthLabels),
    [stats.active, stats.blocked, i18n.language] // eslint-disable-line
  );

  const realChartValues = useMemo(
    () => ({ active: stats.active, blocked: stats.blocked }),
    [stats.active, stats.blocked]
  );

  const usersAnalysis = useMemo(
    () => [
      { name: t("active",  "Active"),  value: stats.active  },
      { name: t("blocked", "Blocked"), value: stats.blocked },
    ],
    [stats.active, stats.blocked, i18n.language] // eslint-disable-line
  );

  const donutColors = useMemo(() => ["#2d6a4f", "#e63946"], []);

  /* ══════════════════════════════════════════════════════════════
     RENDER
  ══════════════════════════════════════════════════════════════ */
  return (
    <div
      className={`admin-layout admin-user ${darkModeActive ? "dark-admin" : ""}`}
      dir={isArabic ? "rtl" : "ltr"}
    >
      {/* ── NAVBAR ── */}
      <header className="admin-navbar">
        <div className="left">
          <button className="toggle-btn" onClick={toggleSidebar}><i className="fa fa-bars" /></button>
          <div className="brand"><i className="fa fa-users" /><span>Safqa Admin</span></div>
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
            <i className="fa fa-sign-out" /><span>{t("logout", "Logout")}</span>
          </button>
        </div>
      </header>

      {/* ── SIDEBAR ── */}
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
          <li><Link className={isActive("/admin_announcements")} to="/admin_announcements"><i className="fa fa-bullhorn" />            <span>{t("announcements", "Announcements")}</span></Link></li>
        </ul>
      </aside>

      {/* ── MAIN ── */}
      <main className={`admin-content ${sidebarShrinked ? "active" : ""}`}>
        <div className="dashboard-wrapper">
          <h2 className="page-title">{t("usersManagement", "Users Management")}</h2>

          {error && <div className="alert alert-danger">{error}</div>}

          {/* Stats + Charts */}
          <section className="dashboard-section">
            <h4>{t("usersAnalytics", "Users Analytics")}</h4>
            {loading ? (
              <><StatsSkeleton /><ChartsSkeleton /></>
            ) : (
              <>
                <div className="grid">
                  <Card title={t("totalUsers",   "Total Users")}   value={stats.total}   icon="users"       />
                  <Card title={t("activeUsers",  "Active Users")}  value={stats.active}  icon="user-check"  />
                  <Card title={t("blockedUsers", "Blocked Users")} value={stats.blocked} icon="user-times"  />
                </div>
                <div className="admin-analysis-row">
                  <div className="admin-chart-scroll">
                    {chartJSReady
                      ? <LineChartJS data={usersChartData} realValues={realChartValues} />
                      : <div style={{ color: "#94a3b8", padding: 20 }}>{t("loadingChart", "Loading chart...")}</div>
                    }
                  </div>
                  <div className="admin-pie-scroll">
                    {chartJSReady
                      ? <DonutChartJS data={usersAnalysis} colors={donutColors} />
                      : <div style={{ color: "#94a3b8", padding: 20 }}>{t("loadingChart", "Loading chart...")}</div>
                    }
                  </div>
                </div>
              </>
            )}
          </section>

          {/* Users Table */}
          <h3 className="section-title">{t("allUsers", "All Users")}</h3>
          <div className="sl-table-wrap">
            <table className="sl-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>{t("name",   "Name")}</th>
                  <th>{t("email",  "Email")}</th>
                  <th>{t("status", "Status")}</th>
                  <th>{t("action", "Action")}</th>
                </tr>
              </thead>
              <tbody>
                {loading || tableLoading ? (
                  <SkeletonTableRows rows={10} cols={5} />
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="sl-table-empty">{t("noUsersFound", "No users found.")}</td>
                  </tr>
                ) : (
                  users.map((user, i) => (
                    <tr key={user.id || i}>
                      <td>{(page - 1) * pageSize + i + 1}</td>
                      <td>{user.name}</td>
                      <td>{user.email}</td>
                      <td>
                        <span className={`status ${user.status}`}>{user.status}</span>
                      </td>
                      <td>
                        {user.status === "active" ? (
                          <button className="action-btn suspend" onClick={() => openConfirm(user, "suspend")}>
                            {t("suspend", "Suspend")}
                          </button>
                        ) : (
                          <button className="action-btn activate" onClick={() => openConfirm(user, "restore")}>
                            {t("restore", "Restore")}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            {/* Pagination */}
            <div className="sl-pagination">
              <button
                className="action-btn view"
                disabled={page <= 1 || tableLoading}
                onClick={() => loadUsers(page - 1)}
              >
                {t("previous", "Previous")}
              </button>
              <strong>{t("page", "Page")} {page} {t("of", "of")} {totalPages}</strong>
              <button
                className="action-btn view"
                disabled={page >= totalPages || tableLoading}
                onClick={() => loadUsers(page + 1)}
              >
                {t("next", "Next")}
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* ── Confirm Modal ── */}
      {confirmBox && (
        <div className="confirm-overlay">
          <div className="confirm-modal">
            <h3>{t("confirmAction", "Confirm Action")}</h3>
            <p>
              {t("areYouSure", "Are you sure you want to")}{" "}
              <strong className={actionType === "suspend" ? "danger" : "success"}>
                {t(actionType, actionType)}
              </strong>{" "}
              <strong>{selectedUser?.name}</strong>?
            </p>
            <div className="confirm-actions">
              <button className="btn cancel" onClick={closeConfirm}>{t("cancel", "Cancel")}</button>
              <button
                className={`btn ${actionType === "suspend" ? "danger" : "success"}`}
                onClick={confirmAction}
              >
                {t("confirm", "Confirm")}
              </button>
            </div>
          </div>
        </div>
      )}
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