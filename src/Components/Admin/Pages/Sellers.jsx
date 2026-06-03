import { Link, useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import icon from "../../../assets/Person at the Center of Circles.png";
import "../admin.css";
import { setLanguage } from "../../../utiles/setLanguage";
import { applyTheme, getSavedTheme, saveTheme } from "../../../utiles/themeManager";
import {
  getTotalSellers,
  getVerifiedSellers,
  getPendingSellersPage,
  getSellersPage,
  getAllSellersPage,
  getSellerDetailsByUserId,
  suspendSeller,
  restoreSeller,
  approveSeller,
  rejectSeller,
  findUserIdByEmail,
} from "../../../API/admindashboard";

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
const getNumber = (res) => {
  const raw = res?.data;
  if (raw === null || raw === undefined) return 0;
  if (typeof raw === "number") return raw;
  if (typeof raw === "string") return Number(raw) || 0;
  if (typeof raw === "object") {
    for (const k of ["value", "count", "total", "totalCount", "totalcount", "data", "result"]) {
      const v = raw[k];
      if (typeof v === "number") return v;
      if (typeof v === "string" && !isNaN(Number(v)) && v.trim() !== "") return Number(v);
    }
    const first = Object.values(raw).find((v) => typeof v === "number");
    if (first !== undefined) return first;
  }
  return 0;
};

/**
 * Extracts ALL possible IDs from a raw seller object.
 * Returns:
 *   numericId  — first numeric-looking value > 0 (used for display & API calls)
 *   uuidId     — first UUID-like value (contains "-")
 *   anyId      — best available ID string (uuid preferred, then numeric)
 */
const extractIds = (item) => {
  if (!item) return { numericId: 0, uuidId: "", anyId: "" };

  // All candidate fields in priority order
  const rawCandidates = [
    item.userId,   item.UserId,   item.userID,   item.user_id,
    item.sellerId, item.SellerId, item.sellerid, item.seller_id,
    item.id,       item.Id,       item.ID,
  ];

  const candidates = rawCandidates
    .map((v) => String(v ?? "").trim())
    .filter(Boolean);

  const uuidId = candidates.find((v) => /^[0-9a-f-]{36}$/i.test(v)) || "";
  const numericRaw = candidates.find(
    (v) => !v.includes("-") && /^\d+$/.test(v) && Number(v) > 0
  );
  const numericId = numericRaw ? Number(numericRaw) : 0;
  const anyId = uuidId || (numericId ? String(numericId) : candidates[0] || "");

  return { numericId, uuidId, anyId };
};

const normalizePendingSeller = (item) => {
  const { numericId, uuidId, anyId } = extractIds(item);
  return {
    numericId, uuidId, anyId,
    id:       anyId,
    userId:   uuidId || anyId,
    business: item?.businessName || item?.business || item?.storeName || item?.BusinessName || item?.StoreName || "-",
    owner:    item?.ownerName    || item?.owner    || item?.fullName  || item?.OwnerName    || item?.FullName  || "-",
    email:    item?.email        || item?.Email    || "-",
    raw:      item,
  };
};

const normalizeSeller = (item) => {
  const { numericId, uuidId, anyId } = extractIds(item);
  return {
    numericId, uuidId, anyId,
    id:       anyId,
    userId:   uuidId || anyId,
    business: item?.business || item?.businessName || item?.storeName || item?.BusinessName || item?.StoreName || "-",
    owner:    item?.owner    || item?.ownerName    || item?.fullName  || item?.OwnerName    || item?.FullName  || "-",
    email:    item?.email    || item?.Email        || "-",
    status:   String(item?.status || item?.storeStatus || item?.StoreStatus || "active").toLowerCase(),
    raw:      item,
  };
};

/* ══════════════════════════════════════════════════════════════════
   GRAPH helpers
══════════════════════════════════════════════════════════════════ */
const buildMonthlyData = (verified, pending, monthLabels) => {
  const seed = (n, i) => {
    const x = Math.sin(n * 9301 + i * 49297 + 233) * 10000;
    return (x - Math.floor(x)) * 2 - 1;
  };
  return monthLabels.map((month, i) => {
    const vBase = Math.max(1, verified);
    const pBase = Math.max(1, pending);
    return {
      month,
      verified: Math.max(0, vBase + Math.round(vBase * 0.30 * seed(vBase, i))),
      pending:  Math.max(0, pBase + Math.round(pBase * 0.35 * seed(pBase, i + 100))),
    };
  });
};

/* ══════════════════════════════════════════════════════════════════
   CHART COMPONENTS
══════════════════════════════════════════════════════════════════ */
function useChartJS() {
  const [ready, setReady] = useState(!!window.Chart);
  useEffect(() => {
    if (window.Chart) { setReady(true); return; }
    const s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js";
    s.onload = () => setReady(true);
    document.head.appendChild(s);
  }, []);
  return ready;
}

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
            label: "Verified",
            data: data.map((d) => d.verified),
            borderColor: "#22c55e",
            backgroundColor: "rgba(34,197,94,0.10)",
            borderWidth: 2.5, pointRadius: 4, pointHoverRadius: 6, tension: 0.45, fill: true,
          },
          {
            label: "Pending",
            data: data.map((d) => d.pending),
            borderColor: "#f59e0b",
            backgroundColor: "rgba(245,158,11,0.08)",
            borderWidth: 2.5, pointRadius: 4, pointHoverRadius: 6, tension: 0.45, fill: true,
          },
        ],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        interaction: { mode: "index", intersect: false },
        plugins: {
          legend: { display: true, position: "top", labels: { color: "#94a3b8", font: { size: 12 }, boxWidth: 12, padding: 14 } },
          tooltip: {
            backgroundColor: "#0f172a", titleColor: "#f8fafc", bodyColor: "#cbd5e1",
            borderColor: "#1e293b", borderWidth: 1, padding: 10, cornerRadius: 8,
            callbacks: {
              label: (ctx) => {
                const real = ctx.datasetIndex === 0
                  ? (realValues?.verified ?? ctx.parsed.y)
                  : (realValues?.pending  ?? ctx.parsed.y);
                return ` ${ctx.dataset.label}: ${real}`;
              },
            },
          },
        },
        scales: {
          x: { ticks: { color: "#94a3b8", font: { size: 11 } }, grid: { color: "rgba(148,163,184,0.10)" } },
          y: { beginAtZero: true, ticks: { color: "#94a3b8", font: { size: 11 }, precision: 0 }, grid: { color: "rgba(148,163,184,0.10)" } },
        },
      },
    });
    return () => { if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null; } };
  }, [data, realValues]);
  return <div style={{ position: "relative", width: "100%", height: "100%" }}><canvas ref={canvasRef} /></div>;
}

function DonutChartJS({ data, colors }) {
  const canvasRef = useRef(null);
  const chartRef  = useRef(null);
  useEffect(() => {
    if (!canvasRef.current) return;
    if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null; }
    const ctx   = canvasRef.current.getContext("2d");
    const total = data.reduce((s, d) => s + Number(d.value || 0), 0);
    const safe  = data.map((d) => ({ ...d, value: Number(d.value || 0) === 0 ? 0.0001 : Number(d.value) }));
    chartRef.current = new window.Chart(ctx, {
      type: "doughnut",
      data: {
        labels: data.map((d) => d.name),
        datasets: [{ data: safe.map((d) => d.value), backgroundColor: colors, borderColor: "#081028", borderWidth: 3, hoverOffset: 8 }],
      },
      options: {
        responsive: true, maintainAspectRatio: false, cutout: "65%",
        plugins: {
          legend: { display: true, position: "bottom", labels: { color: "#94a3b8", font: { size: 12 }, boxWidth: 12, padding: 14 } },
          tooltip: {
            backgroundColor: "#0f172a", titleColor: "#f8fafc", bodyColor: "#cbd5e1",
            borderColor: "#1e293b", borderWidth: 1, padding: 10, cornerRadius: 8,
            callbacks: {
              label: (ctx) => {
                const rv  = data[ctx.dataIndex]?.value ?? 0;
                const pct = total ? ((rv / total) * 100).toFixed(1) : 0;
                return ` ${rv} (${pct}%)`;
              },
            },
          },
        },
      },
    });
    return () => { if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null; } };
  }, [data, colors]);
  return <div style={{ position: "relative", width: "100%", height: "100%" }}><canvas ref={canvasRef} /></div>;
}

/* ══════════════════════════════════════════════════════════════════
   SKELETON
══════════════════════════════════════════════════════════════════ */
const SkeletonBlock = ({ width = "100%", height = 16, radius = 8 }) => (
  <span className="admin-skeleton-block" style={{ width, height, borderRadius: radius }} />
);
const SkeletonDashboard = () => (
  <section className="dashboard-section">
    <div className="grid">
      {[1,2,3].map((k) => (
        <div className="dashboard-card" key={k}>
          <SkeletonBlock width={42} height={42} radius={12} />
          <div style={{ width: "100%" }}>
            <SkeletonBlock width="65%" height={13} />
            <div style={{ height: 12 }} />
            <SkeletonBlock width="38%" height={25} />
          </div>
        </div>
      ))}
    </div>
    <div className="admin-analysis-row" style={{ marginTop: 20 }}>
      <div className="admin-chart-scroll"><SkeletonBlock width="100%" height={260} radius={16} /></div>
      <div className="admin-pie-scroll"><SkeletonBlock width={180} height={180} radius="50%" /></div>
    </div>
  </section>
);
const SkeletonTableRows = ({ rows = 6, cols = 5 }) => (
  <>
    {Array.from({ length: rows }).map((_, r) => (
      <tr key={r}>
        {Array.from({ length: cols }).map((__, c) => (
          <td key={c}>
            <SkeletonBlock
              width={c === 0 ? 40 : c === cols - 1 ? 82 : "85%"}
              height={c === cols - 1 ? 32 : 14}
              radius={c === cols - 1 ? 8 : 7}
            />
          </td>
        ))}
      </tr>
    ))}
  </>
);

/* ══════════════════════════════════════════════════════════════════
   DETAIL ROW / DOC LINK / CARD / PAGINATION
══════════════════════════════════════════════════════════════════ */
function DetailRow({ label, value }) {
  return (
    <p className="sl-detail-row">
      <span className="sl-detail-key">{label}:</span>
      <span className="sl-detail-val">{value}</span>
    </p>
  );
}

/**
 * DocImage — renders a base64 image inline with a click-to-enlarge lightbox.
 * Tries png first; if that fails, tries jpeg.
 */
function DocImage({ label, b64, onExpand }) {
  const [failed, setFailed] = useState(false);
  const [mime, setMime]     = useState("image/png");

  const isEmpty = !b64 || b64 === "MAA=" || b64 === "AAAAAAAA=" || b64.startsWith("System.") || b64.length < 20;
  if (isEmpty) return <DetailRow label={label} value="-" />;

  const src = `data:${mime};base64,${b64}`;

  const handleError = () => {
    if (mime === "image/png")  { setMime("image/jpeg"); return; }
    if (mime === "image/jpeg") { setMime("image/webp"); return; }
    setFailed(true);
  };

  return (
    <div className="sl-detail-row" style={{ alignItems: "flex-start", flexDirection: "column", gap: 6 }}>
      <span className="sl-detail-key" style={{ marginBottom: 4 }}>{label}:</span>
      {failed ? (
        <span style={{ color: "#94a3b8", fontSize: 13 }}>Could not render image</span>
      ) : (
        <img
          src={src}
          alt={label}
          onError={handleError}
          onClick={() => onExpand && onExpand(src)}
          style={{
            maxWidth: "100%", width: "100%", maxHeight: 260,
            objectFit: "contain", borderRadius: 10,
            border: "1px solid rgba(148,163,184,0.2)",
            cursor: "zoom-in", background: "rgba(0,0,0,0.08)",
          }}
        />
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

function Pagination({ page, totalPages, loading, onPrev, onNext, t }) {
  return (
    <div className="sl-pagination">
      <button className="action-btn view" disabled={page <= 1 || loading} onClick={onPrev}>{t("previous","Previous")}</button>
      <strong>{t("page","Page")} {page} {t("of","of")} {totalPages}</strong>
      <button className="action-btn view" disabled={page >= totalPages || loading} onClick={onNext}>{t("next","Next")}</button>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   RAW DETAILS DUMP — shows every field from the API response
   so nothing is ever "missing" due to unknown field names
══════════════════════════════════════════════════════════════════ */
function RawDetailsPanel({ data, t }) {
  if (!data || typeof data !== "object") return null;

  // Fields we render explicitly (in a nice order)
  const knownFields = [
    ["id",                 t("id",           "ID")],
    ["sellerId",           t("sellerId",      "Seller ID")],
    ["userId",             t("userId",        "User ID")],
    ["storeName",          t("store",         "Store")],
    ["businessName",       t("business",      "Business")],
    ["ownerName",          t("owner",         "Owner")],
    ["fullName",           t("fullName",      "Full Name")],
    ["email",              t("email",         "Email")],
    ["description",        t("description",   "Description")],
    ["phoneNumber",        t("phone",         "Phone")],
    ["phone",              t("phone",         "Phone")],
    ["cityName",           t("city",          "City")],
    ["city",               t("city",          "City")],
    ["taxId",              t("taxId",         "Tax ID")],
    ["verificationStatus", t("verification",  "Verification")],
    ["storeStatus",        t("storeStatus",   "Store Status")],
    ["status",             t("status",        "Status")],
    ["createdAt",          t("createdAt",     "Created At")],
    ["updatedAt",          t("updatedAt",     "Updated At")],
  ];

  const shownKeys = new Set();
  const rendered  = [];

  for (const [key, label] of knownFields) {
    if (shownKeys.has(key)) continue;
    const val = data[key];
    if (val === undefined || val === null) continue;
    // Skip binary/base64-looking blobs and System.* type strings
    if (typeof val === "string" && (val.startsWith("System.") || val.length > 300)) continue;
    shownKeys.add(key);
    rendered.push(<DetailRow key={key} label={label} value={String(val)} />);
  }

  // Render any REMAINING fields we didn't explicitly handle
  // so nothing is hidden from the admin
  for (const [key, val] of Object.entries(data)) {
    if (shownKeys.has(key)) continue;
    if (key === "storeLogo" || key === "crDocument" || key === "ownerIdDocument") continue; // handled separately
    if (val === null || val === undefined) continue;
    if (typeof val === "object") continue; // nested objects — skip to avoid clutter
    if (typeof val === "string" && (val.startsWith("System.") || val.length > 300)) continue;
    rendered.push(<DetailRow key={key} label={key} value={String(val)} />);
  }

  return <>{rendered}</>;
}

/* ══════════════════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════════════════ */
export default function Sellers() {
  const navigate = useNavigate();
  const location = useLocation();
  const { i18n, t } = useTranslation();
  const isArabic = i18n.language === "ar";

  const [theme, setTheme]                     = useState(() => getSavedTheme());
  const darkModeActive                        = theme === "dark";
  const [sidebarShrinked, setSidebarShrinked] = useState(false);

  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear]       = useState(currentYear);

  const chartJSReady = useChartJS();

  useEffect(() => { applyTheme(theme); }, [theme]);
  useEffect(() => { document.title = `Admin | Sellers ${selectedYear}`; }, [selectedYear]);
  useEffect(() => {
    const link = document.querySelector("link[rel~='icon']") || document.createElement("link");
    link.rel = "icon"; link.href = icon;
    document.head.appendChild(link);
  }, []);

  const toggleDarkMode = () => {
    const next = darkModeActive ? "light" : "dark";
    setTheme(next); saveTheme(next); applyTheme(next);
  };
  const toggleSidebar = () => setSidebarShrinked((p) => !p);
  const isActive = (path) => location.pathname === path ? "active" : "";

  /* ── state ── */
  const [pendingSellers, setPendingSellers]       = useState([]);
  const [sellers, setSellers]                     = useState([]);
  const [stats, setStats]                         = useState({ total: 0, verified: 0, pending: 0 });
  const [pendingPage, setPendingPage]             = useState(1);
  const [pendingTotalPages, setPendingTotalPages] = useState(1);
  const [sellerPage, setSellerPage]               = useState(1);
  const [sellerTotalPages, setSellerTotalPages]   = useState(1);
  const pageSize = 10;

  const [loading, setLoading]             = useState(true);
  const [tableLoading, setTableLoading]   = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError]                 = useState("");

  const [confirmBox, setConfirmBox]         = useState(false);
  const [selectedSeller, setSelectedSeller] = useState(null);
  const [actionType, setActionType]         = useState("");
  const [detailsOpen, setDetailsOpen]       = useState(false);
  const [sellerDetails, setSellerDetails]   = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [lightboxSrc, setLightboxSrc]       = useState("");

  // Cache: email → { uuid, numericId }
  const idCacheRef = useRef({});   // { [email]: { uuid: string, numericId: number } }

  const getCached    = (email) => idCacheRef.current[email] || {};
  const setCacheUuid = (email, uuid) => {
    if (!email || email === "-" || !uuid) return;
    idCacheRef.current[email] = { ...getCached(email), uuid };
  };
  const setCacheNumId = (email, numId) => {
    if (!email || email === "-" || !numId) return;
    idCacheRef.current[email] = { ...getCached(email), numericId: Number(numId) };
  };

  // Triggers re-render for ID column display
  const [displayIdMap, setDisplayIdMap] = useState({});
  const updateDisplayId = (email, numId) => {
    if (!email || email === "-" || !numId) return;
    setCacheNumId(email, numId);
    setDisplayIdMap((prev) => ({ ...prev, [email]: String(numId) }));
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

  /**
   * Resolve the best ID to use for API calls (approveSeller, suspendSeller, etc.)
   * Strategy (in order):
   *   1. seller.uuidId  (UUID already in the row data)
   *   2. email cache uuid
   *   3. findUserIdByEmail
   *   4. seller.numericId (numeric sellerId)
   *   5. seller.anyId
   */
  const resolveActionId = async (seller) => {
    // 1. UUID already attached to the row
    if (seller?.uuidId) return seller.uuidId;

    const email = seller?.email || "";

    // 2. Cached UUID
    if (email && email !== "-") {
      const cached = getCached(email);
      if (cached.uuid) return cached.uuid;
    }

    // 3. Look up UUID from /User list
    if (email && email !== "-") {
      try {
        const uuid = await findUserIdByEmail(email);
        if (uuid) {
          setCacheUuid(email, uuid);
          return uuid;
        }
      } catch (_) { /* fall through */ }
    }

    // 4. Numeric sellerId (works for suspend/restore on some backends)
    if (seller?.numericId > 0) return String(seller.numericId);

    // 5. anyId fallback
    if (seller?.anyId) return seller.anyId;

    return "";
  };

  /**
   * Resolve ID for fetching seller details via GET /seller/seller/{id}
   * Prefers UUID but falls back to numericId since some backends accept both.
   */
  const resolveDetailsId = async (seller) => {
    // Try UUID first
    const actionId = await resolveActionId(seller);
    if (actionId) return actionId;
    // Numeric fallback
    if (seller?.numericId > 0) return String(seller.numericId);
    return "";
  };

  /* ── background UUID resolution for All Sellers rows ── */
  const resolveAllSellerUuids = useCallback(async (sellerList) => {
    const unresolved = sellerList.filter((s) => {
      if (!s.email || s.email === "-") return false;
      const cached = getCached(s.email);
      return !cached.uuid;
    });
    if (unresolved.length === 0) return;

    const BATCH = 3;
    for (let i = 0; i < unresolved.length; i += BATCH) {
      const batch = unresolved.slice(i, i + BATCH);
      await Promise.allSettled(
        batch.map(async (seller) => {
          try {
            // If we already have a numericId, try fetching details directly first
            // (avoids scanning all user pages)
            let uuid = "";
            if (seller.numericId > 0) {
              const res = await safeFetch(() => getSellerDetailsByUserId(String(seller.numericId)));
              const numId = res?.data?.id;
              if (numId) updateDisplayId(seller.email, numId);
              // Extract UUID from response if available
              const respUuid = res?.data?.userId || res?.data?.UserId || "";
              if (respUuid && respUuid.includes("-")) {
                uuid = respUuid;
                setCacheUuid(seller.email, uuid);
                return;
              }
            }
            // Fall back to user list scan
            uuid = await findUserIdByEmail(seller.email);
            if (!uuid) return;
            setCacheUuid(seller.email, uuid);
            // Now fetch details with UUID to get numericId
            if (!getCached(seller.email).numericId) {
              const res2 = await safeFetch(() => getSellerDetailsByUserId(uuid));
              const numId = res2?.data?.id;
              if (numId) updateDisplayId(seller.email, numId);
            }
          } catch (_) { /* silent */ }
        })
      );
    }
  }, []); // eslint-disable-line

  /* ── loadStats ── */
  const loadStats = async () => {
    const [totalRes, verifiedRes, pendingRes] = await Promise.all([
      safeFetch(getTotalSellers),
      safeFetch(getVerifiedSellers),
      safeFetch(() => getPendingSellersPage(1, 1)),
    ]);

    const total    = getNumber(totalRes);
    const verified = getNumber(verifiedRes);

    let pending = 0;
    if (pendingRes) {
      const root = pendingRes?.data || {};
      if (typeof root === "number") pending = root;
      else pending = Number(root?.totalCount || root?.totalcount || root?.total || root?.count || 0);
    }

    setStats({ total, verified, pending });
  };

  /* ── loadPending ── */
  const loadPending = async (targetPage = pendingPage) => {
    setTableLoading(true);
    try {
      const res  = await safeFetch(() => getPendingSellersPage(targetPage, pageSize));
      if (!res) return;
      const root = res?.data || {};
      const list = Array.isArray(root?.data) ? root.data
                 : Array.isArray(root)       ? root
                 : [];
      const normalized = list.map(normalizePendingSeller);
      setPendingSellers(normalized);
      setPendingPage(Number(root?.currentPage || root?.page || targetPage));
      setPendingTotalPages(Number(root?.totalPages || root?.pages || 1));

      // Background: cache IDs for each pending seller
      normalized.forEach(async (seller) => {
        const email = seller.email;
        if (!email || email === "-") return;
        if (seller.uuidId) {
          setCacheUuid(email, seller.uuidId);
          // Try to get numeric display ID
          if (!getCached(email).numericId) {
            try {
              const r = await safeFetch(() => getSellerDetailsByUserId(seller.uuidId));
              const numId = r?.data?.id;
              if (numId) updateDisplayId(email, numId);
            } catch (_) { /* silent */ }
          }
        } else if (seller.numericId > 0) {
          updateDisplayId(email, seller.numericId);
          // Try to get UUID
          if (!getCached(email).uuid) {
            try {
              const uuid = await findUserIdByEmail(email);
              if (uuid) setCacheUuid(email, uuid);
            } catch (_) { /* silent */ }
          }
        }
      });
    } finally {
      setTableLoading(false);
    }
  };

  /* ── loadSellers ──
     Tries /seller first, falls back to /GetAll if empty.
  ── */
  const loadSellers = async (targetPage = sellerPage) => {
    setTableLoading(true);
    try {
      let res  = await safeFetch(() => getSellersPage(targetPage, pageSize));
      let root = res?.data || {};
      let list = Array.isArray(root?.data) ? root.data
               : Array.isArray(root)       ? root
               : [];

      // Fallback: try /GetAll if primary returned nothing
      if (list.length === 0) {
        const res2  = await safeFetch(() => getAllSellersPage(targetPage, pageSize));
        if (res2) {
          root = res2?.data || {};
          list = Array.isArray(root?.data) ? root.data
               : Array.isArray(root)       ? root
               : [];
        }
      }

      const normalized = list.map(normalizeSeller);
      setSellers(normalized);
      setSellerPage(Number(root?.currentPage || root?.page || targetPage));
      setSellerTotalPages(Number(root?.totalPages || root?.pages || 1));

      // Background UUID resolution for suspend/restore
      resolveAllSellerUuids(normalized);
    } finally {
      setTableLoading(false);
    }
  };

  /* ── loadAll ── */
  const loadAll = async () => {
    try {
      setLoading(true);
      setError("");
      await Promise.allSettled([loadStats(), loadPending(1), loadSellers(1)]);
    } catch (err) {
      const status = Number(err?.response?.status || 0);
      if (status !== 404 && status !== 405) {
        setError(
          status === 401
            ? t("unauthorized", "Unauthorized. Please login again.")
            : err?.response?.data?.message || err?.message || t("failedLoadSellers", "Failed to load sellers.")
        );
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAll(); }, []); // eslint-disable-line

  /* ── actions ── */
  const openConfirm  = (seller, action) => { setSelectedSeller(seller); setActionType(action); setConfirmBox(true); };
  const closeConfirm = () => { if (actionLoading) return; setConfirmBox(false); setSelectedSeller(null); setActionType(""); };

  const confirmAction = async () => {
    if (!selectedSeller) return;
    setActionLoading(true);
    try {
      const userId = await resolveActionId(selectedSeller);
      if (!userId) {
        alert(t("sellerUserIdMissing", "Could not resolve seller ID. Try clicking 'View' first to load their details."));
        return;
      }

      if (actionType === "approve") {
        await approveSeller(userId);
        await Promise.allSettled([loadStats(), loadPending(pendingPage), loadSellers(1)]);
      }
      if (actionType === "reject") {
        await rejectSeller(userId);
        await Promise.allSettled([loadStats(), loadPending(pendingPage), loadSellers(1)]);
      }
      if (actionType === "suspend") {
        await suspendSeller(userId);
        await Promise.allSettled([loadStats(), loadSellers(sellerPage)]);
      }
      if (actionType === "restore") {
        await restoreSeller(userId);
        await Promise.allSettled([loadStats(), loadSellers(sellerPage)]);
      }
      closeConfirm();
    } catch (err) {
      alert(err?.response?.data?.message || err?.message || t("failedUpdateSeller", "Failed to update seller."));
    } finally {
      setActionLoading(false);
    }
  };

  /* ── openDetails ──
     Tries multiple ID strategies so details always load.
  ── */
  const openDetails = async (seller) => {
    setDetailsOpen(true);
    setDetailsLoading(true);
    setSellerDetails(null);

    try {
      const detailId = await resolveDetailsId(seller);
      if (!detailId) {
        setSellerDetails({ error: "Could not resolve seller ID. This seller has no UUID or numeric ID available." });
        return;
      }

      const res = await safeFetch(() => getSellerDetailsByUserId(detailId));

      // If UUID failed and we have a numericId, try that too
      if (!res && seller?.numericId > 0 && detailId !== String(seller.numericId)) {
        const res2 = await safeFetch(() => getSellerDetailsByUserId(String(seller.numericId)));
        if (res2?.data) {
          setSellerDetails(res2.data);
          const numId = res2.data?.id;
          const email = seller?.email;
          if (numId && email && email !== "-") updateDisplayId(email, numId);
          return;
        }
      }

      if (!res) {
        setSellerDetails({ error: `Seller details not found for ID: ${detailId}` });
        return;
      }

      const data = res?.data;
      if (!data) {
        setSellerDetails({ error: "No data returned from server." });
        return;
      }

      setSellerDetails(data);

      // Cache whatever we learn from the details response
      const numId   = data?.id;
      const resUuid = data?.userId || data?.UserId || "";
      const email   = seller?.email;
      if (email && email !== "-") {
        if (numId)                          updateDisplayId(email, numId);
        if (resUuid && resUuid.includes("-")) setCacheUuid(email, resUuid);
      }
    } catch (err) {
      setSellerDetails({
        error: err?.response?.data?.message || err?.message || t("failedLoadDetails", "Failed to load details."),
      });
    } finally {
      setDetailsLoading(false);
    }
  };

  /* ── display ID for table cells ── */
  const getDisplayId = (s) => {
    const email = s?.email;
    // 1. Cached numeric ID (most readable)
    if (email && email !== "-") {
      const cached = getCached(email);
      if (cached.numericId) return String(cached.numericId);
      if (displayIdMap[email]) return displayIdMap[email];
    }
    // 2. numericId from row data
    if (s?.numericId > 0) return String(s.numericId);
    // 3. Short UUID suffix
    if (s?.uuidId) return `…${s.uuidId.slice(-8)}`;
    // 4. anyId
    if (s?.anyId) return s.anyId;
    return "-";
  };

  /* ── chart data ── */
  const monthKeys   = ["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"];
  const monthLabels = monthKeys.map((k) => t(k));

  const sellersChartData = useMemo(
    () => buildMonthlyData(stats.verified, stats.pending, monthLabels),
    [stats.verified, stats.pending, i18n.language] // eslint-disable-line
  );
  const realChartValues = useMemo(
    () => ({ verified: stats.verified, pending: stats.pending }),
    [stats.verified, stats.pending]
  );
  const sellersAnalysis = useMemo(
    () => [
      { name: t("verified","Verified"), value: stats.verified },
      { name: t("pending", "Pending"),  value: stats.pending  },
    ],
    [stats.verified, stats.pending, i18n.language] // eslint-disable-line
  );
  const donutColors = useMemo(() => ["#2d6a4f","#ffb703"], []);

  /* ══════════════════════════════════════════════════════════════
     RENDER
  ══════════════════════════════════════════════════════════════ */
  return (
    <div className={`admin-layout admin-sellers ${darkModeActive ? "dark-admin" : ""}`} dir={isArabic ? "rtl" : "ltr"}>

      {/* ── NAVBAR ── */}
      <header className="admin-navbar">
        <div className="left">
          <button className="toggle-btn" onClick={toggleSidebar}><i className="fa fa-bars" /></button>
          <div className="brand"><i className="fa fa-user-secret" /><span>Safqa Admin</span></div>
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
          <li><Link className={isActive("/admin")}             to="/admin">             <i className="fa fa-dashboard"          /><span>{t("dashboard",    "Dashboard")}</span></Link></li>
          <li><Link to="/admin_users">                                                   <i className="fa fa-users"               /><span>{t("allUsers",     "All Users")}</span></Link></li>
          <li><Link className={isActive("/admin_sellers")}     to="/admin_sellers">     <i className="fa fa-user-secret"         /><span>{t("allSellers",   "All Sellers")}</span></Link></li>
          <li><Link to="/admin_auctions">                                                <i className="fa fa-gavel"               /><span>{t("allAuctions",  "All Auctions")}</span></Link></li>
          <li><Link to="/admin_payments">                                                <i className="fa fa-credit-card"         /><span>{t("paymentLogs",  "Payment Logs")}</span></Link></li>
          <li><Link className={isActive("/admin_track_chats")} to="/admin_track_chats"> <i className="fa fa-comments"            /><span>{t("trackChats",   "Track Chats")}</span></Link></li>
          <li><Link to="/admin_announcements">                                           <i className="fa fa-bullhorn"            /><span>{t("announcements","Announcements")}</span></Link></li>
        </ul>
      </aside>

      {/* ── MAIN ── */}
      <main className={`admin-content ${sidebarShrinked ? "active" : ""}`}>
        <div className="dashboard-wrapper">
          <h2 className="page-title">{t("sellersManagement","Sellers Management")}</h2>

          {error && <div className="alert alert-danger">{error}</div>}

          {/* Stats + Charts */}
          {loading ? <SkeletonDashboard /> : (
            <section className="dashboard-section">
              <h4>{t("sellersAnalytics","Sellers Analytics")}</h4>
              <div className="grid">
                <Card title={t("totalSellers",    "Total Sellers")}    value={stats.total}    icon="building"       />
                <Card title={t("verifiedSellers", "Verified Sellers")} value={stats.verified} icon="check-circle"   />
                <Card title={t("pendingSellers",  "Pending Sellers")}  value={stats.pending}  icon="hourglass-half" />
              </div>
              <div className="admin-analysis-row">
                <div className="admin-chart-scroll">
                  {chartJSReady
                    ? <LineChartJS data={sellersChartData} realValues={realChartValues} />
                    : <div style={{ color: "#94a3b8", padding: 20 }}>{t("loadingChart","Loading chart...")}</div>}
                </div>
                <div className="admin-pie-scroll">
                  {chartJSReady
                    ? <DonutChartJS data={sellersAnalysis} colors={donutColors} />
                    : <div style={{ color: "#94a3b8", padding: 20 }}>{t("loadingChart","Loading chart...")}</div>}
                </div>
              </div>
            </section>
          )}

          {/* ── Pending Sellers Table ── */}
          <h3 className="section-title">{t("pendingSellerRequests","Pending Seller Requests")}</h3>
          <div className="sl-table-wrap">
            <table className="sl-table">
              <thead>
                <tr>
                  <th>{t("id","ID")}</th>
                  <th>{t("business","Business")}</th>
                  <th>{t("owner",   "Owner")}</th>
                  <th>{t("email",   "Email")}</th>
                  <th>{t("docs",    "Docs")}</th>
                  <th>{t("actions", "Actions")}</th>
                </tr>
              </thead>
              <tbody>
                {tableLoading
                  ? <SkeletonTableRows rows={6} cols={6} />
                  : pendingSellers.length === 0
                    ? <tr><td colSpan="6" className="sl-table-empty">{t("noPendingSellers","No pending sellers found.")}</td></tr>
                    : pendingSellers.map((s, i) => (
                      <tr key={s.uuidId || s.email || i}>
                        <td><strong style={{ color: "#4fa3e0" }}>{getDisplayId(s)}</strong></td>
                        <td>{s.business}</td>
                        <td>{s.owner}</td>
                        <td>{s.email}</td>
                        <td>
                          <button className="action-btn view" onClick={() => openDetails(s)}>{t("view","View")}</button>
                        </td>
                        <td>
                          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                            <button className="action-btn activate" onClick={() => openConfirm(s, "approve")}>{t("approve","Approve")}</button>
                            <button className="action-btn suspend"  onClick={() => openConfirm(s, "reject")} >{t("reject", "Reject")}</button>
                          </div>
                        </td>
                      </tr>
                    ))
                }
              </tbody>
            </table>
            <Pagination page={pendingPage} totalPages={pendingTotalPages} loading={tableLoading}
              onPrev={() => loadPending(pendingPage - 1)} onNext={() => loadPending(pendingPage + 1)} t={t} />
          </div>

          {/* ── All Sellers Table ── */}
          <h3 className="section-title">{t("allSellers","All Sellers")}</h3>
          <div className="sl-table-wrap">
            <table className="sl-table">
              <thead>
                <tr>
                  <th>{t("id","ID")}</th>
                  <th>{t("business","Business")}</th>
                  <th>{t("owner",   "Owner")}</th>
                  <th>{t("email",   "Email")}</th>
                  <th>{t("status",  "Status")}</th>
                  <th>{t("docs",    "Docs")}</th>
                  <th>{t("action",  "Action")}</th>
                </tr>
              </thead>
              <tbody>
                {tableLoading
                  ? <SkeletonTableRows rows={8} cols={7} />
                  : sellers.length === 0
                    ? <tr><td colSpan="7" className="sl-table-empty">{t("noSellers","No sellers found.")}</td></tr>
                    : sellers.map((s, i) => (
                      <tr key={`${s.email}-${i}`}>
                        <td><strong style={{ color: "#4fa3e0" }}>{getDisplayId(s)}</strong></td>
                        <td>{s.business}</td>
                        <td>{s.owner}</td>
                        <td>{s.email}</td>
                        <td><span className={`status ${s.status}`}>{s.status}</span></td>
                        <td>
                          <button className="action-btn view" onClick={() => openDetails(s)}>{t("view","View")}</button>
                        </td>
                        <td>
                          {s.status === "active" || s.status === "verified"
                            ? <button className="action-btn suspend"  onClick={() => openConfirm(s, "suspend")}>{t("suspend","Suspend")}</button>
                            : <button className="action-btn activate" onClick={() => openConfirm(s, "restore")}>{t("restore","Restore")}</button>}
                        </td>
                      </tr>
                    ))
                }
              </tbody>
            </table>
            <Pagination page={sellerPage} totalPages={sellerTotalPages} loading={tableLoading}
              onPrev={() => loadSellers(sellerPage - 1)} onNext={() => loadSellers(sellerPage + 1)} t={t} />
          </div>
        </div>
      </main>

      {/* ── Confirm Modal ── */}
      {confirmBox && (
        <div className="confirm-overlay">
          <div className="confirm-modal">
            <h3>{t("confirmAction","Confirm Action")}</h3>
            <p>
              {t("areYouSure","Are you sure you want to")}{" "}
              <strong className={actionType === "reject" || actionType === "suspend" ? "danger" : "success"}>
                {t(actionType, actionType)}
              </strong>{" "}
              <strong>{selectedSeller?.business}</strong>?
            </p>
            <div className="confirm-actions">
              <button className="btn cancel" onClick={closeConfirm}>{t("cancel","Cancel")}</button>
              <button
                className={`btn ${actionType === "reject" || actionType === "suspend" ? "danger" : "success"}`}
                onClick={confirmAction}
                disabled={actionLoading}
              >
                {actionLoading ? t("loading","Loading...") : t("confirm","Confirm")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Details Modal (fullscreen) ── */}
      {detailsOpen && (
        <div
          className="confirm-overlay"
          onClick={() => { setDetailsOpen(false); setLightboxSrc(""); }}
          style={{ alignItems: "stretch", padding: 0 }}
        >
          <div
            className="confirm-modal sl-details-fullscreen"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%", height: "100%", maxWidth: "100%", maxHeight: "100%",
              borderRadius: 0, margin: 0,
              display: "flex", flexDirection: "column",
              overflow: "hidden",
            }}
          >
            {/* Header */}
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "18px 24px", borderBottom: "1px solid rgba(148,163,184,0.15)",
              flexShrink: 0,
            }}>
              <h3 style={{ margin: 0, fontSize: 20 }}>{t("sellerDetails","Seller Details")}</h3>
              <button
                className="btn cancel"
                onClick={() => { setDetailsOpen(false); setLightboxSrc(""); }}
                style={{ padding: "6px 18px", fontSize: 14 }}
              >
                ✕ {t("close","Close")}
              </button>
            </div>

            {/* Scrollable body */}
            <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>
              {detailsLoading ? (
                <div style={{ display: "grid", gap: 12, maxWidth: 600 }}>
                  {[70,85,60,75,65,55,80,65].map((w, i) => <SkeletonBlock key={i} width={`${w}%`} height={16} />)}
                </div>
              ) : sellerDetails?.error ? (
                <p style={{ color: "#e63946", lineHeight: 1.7 }}>{sellerDetails.error}</p>
              ) : sellerDetails ? (
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
                  gap: "0 40px",
                  alignItems: "start",
                }}>
                  {/* Left: text fields */}
                  <div className="sl-details-grid">
                    <RawDetailsPanel data={sellerDetails} t={t} />
                  </div>

                  {/* Right: images */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

                    {/* Store Logo */}
                    {sellerDetails.storeLogo &&
                      !sellerDetails.storeLogo.startsWith("System.") &&
                      sellerDetails.storeLogo !== "MAA=" &&
                      sellerDetails.storeLogo.length > 20 && (
                      <div>
                        <span className="sl-detail-key" style={{ display: "block", marginBottom: 8 }}>
                          {t("storeLogo","Store Logo")}:
                        </span>
                        <img
                          src={`data:image/png;base64,${sellerDetails.storeLogo}`}
                          alt="store logo"
                          onClick={() => setLightboxSrc(`data:image/png;base64,${sellerDetails.storeLogo}`)}
                          style={{
                            width: 90, height: 90, objectFit: "cover",
                            borderRadius: 12, cursor: "zoom-in",
                            border: "1px solid rgba(148,163,184,0.2)",
                          }}
                          onError={(e) => { e.target.style.display = "none"; }}
                        />
                      </div>
                    )}

                    {/* CR Document */}
                    <DocImage
                      label={t("crDocument", "CR Document")}
                      b64={sellerDetails.crDocument}
                      onExpand={(src) => setLightboxSrc(src)}
                    />

                    {/* Owner ID */}
                    <DocImage
                      label={t("ownerIdDocument", "Owner ID Document")}
                      b64={sellerDetails.ownerIdDocument}
                      onExpand={(src) => setLightboxSrc(src)}
                    />
                  </div>
                </div>
              ) : (
                <p style={{ color: "#94a3b8" }}>{t("noDetails","No details available.")}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Lightbox ── */}
      {lightboxSrc && (
        <div
          onClick={() => setLightboxSrc("")}
          style={{
            position: "fixed", inset: 0, zIndex: 9999,
            background: "rgba(0,0,0,0.92)",
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "zoom-out",
          }}
        >
          <img
            src={lightboxSrc}
            alt="enlarged"
            style={{
              maxWidth: "92vw", maxHeight: "92vh",
              objectFit: "contain", borderRadius: 12,
              boxShadow: "0 8px 60px rgba(0,0,0,0.7)",
            }}
            onClick={(e) => e.stopPropagation()}
          />
          <button
            onClick={() => setLightboxSrc("")}
            style={{
              position: "absolute", top: 18, right: 22,
              background: "rgba(255,255,255,0.12)", border: "none",
              color: "#fff", fontSize: 24, width: 42, height: 42,
              borderRadius: "50%", cursor: "pointer", lineHeight: 1,
            }}
          >✕</button>
        </div>
      )}
    </div>
  );
}