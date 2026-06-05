import { useState, useEffect, useCallback } from "react";
import icon from "../../assets/2.png";
import Navbar from "../Sign-in/Navbar";
import { useTranslation } from "react-i18next";
import api from "../../API/axios";

const formatTimeAgo = (dateStr) => {
  if (!dateStr) return "";
  const now = new Date();
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  const diffMs = now - date;
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60)   return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60)   return `${diffMin} min ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24)    return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7)    return `${diffDay}d ago`;
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
};

const resolveType = (item) => {
  const combined = `${item?.type || ""} ${item?.title || ""} ${item?.message || ""}`.toLowerCase().trim();
  if (combined.includes("admin") || combined.includes("shield")) return "Admin";
  if (combined.includes("order")) return "Order";
  if (combined.includes("auction") || combined.includes("bid") || combined.includes("gavel")) return "Auction";
  if (combined.includes("payment") || combined.includes("wallet") || combined.includes("credit")) return "Payment";
  if (combined.includes("shipping") || combined.includes("delivery") || combined.includes("truck")) return "Shipping";
  if (combined.includes("system") || combined.includes("gear")) return "System";
  return item?.type || "default";
};

const TYPE_ICON = {
  Admin:    "fa-solid fa-shield-halved",
  Order:    "fa-solid fa-box",
  Auction:  "fa-solid fa-gavel",
  Payment:  "fa-solid fa-credit-card",
  Shipping: "fa-solid fa-truck",
  System:   "fa-solid fa-gear",
  default:  "fa-solid fa-bell",
};

const TYPE_COLOR = {
  Admin:    { color: "#1d4ed8", bg: "#dbeafe" },
  Order:    { color: "#023e8a", bg: "#e8f1ff" },
  Auction:  { color: "#a16207", bg: "#fef9c3" },
  Payment:  { color: "#2e7d32", bg: "#dcfce7" },
  Shipping: { color: "#6c757d", bg: "#f1f5f9" },
  System:   { color: "#475569", bg: "#f1f5f9" },
  default:  { color: "#023e8a", bg: "#e8f1ff" },
};

// Global unread count store so Navbar can access it
export const notifStore = { count: 0, listeners: [] };
export const setUnreadCount = (n) => {
  notifStore.count = n;
  notifStore.listeners.forEach((fn) => fn(n));
};

const skeletonRows = [1, 2, 3];

export default function Notifications() {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === "ar";

  const isDarkMode =
    document.body.classList.contains("dark") ||
    document.documentElement.classList.contains("dark");

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState("");
  const [selectedIds, setSelectedIds]     = useState([]);
  const [deleting, setDeleting]           = useState(false);

  /* favicon + title */
  useEffect(() => {
    document.title = "Notifications";
    const link = document.querySelector("link[rel~='icon']") || document.createElement("link");
    link.rel = "icon"; link.href = icon; document.head.appendChild(link);
  }, []);

  /* skeleton shimmer style */
  useEffect(() => {
    const styleId = "user-notifications-skeleton-style";
    if (document.getElementById(styleId)) return;
    const style = document.createElement("style");
    style.id = styleId;
    style.innerHTML = `
      @keyframes userNotifShimmer {
        0%   { background-position: 200% 0; }
        100% { background-position: -200% 0; }
      }
    `;
    document.head.appendChild(style);
    return () => { const n = document.getElementById(styleId); if (n) n.remove(); };
  }, []);

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true); setError("");
      const res = await api.get("/Notifications/Get-Notifications");
      const raw = res?.data;
      const list = Array.isArray(raw) ? raw
        : Array.isArray(raw?.data) ? raw.data
        : Array.isArray(raw?.Data) ? raw.Data
        : Array.isArray(raw?.notifications) ? raw.notifications
        : Array.isArray(raw?.Notifications) ? raw.Notifications
        : [];
      const sorted = [...list].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setNotifications(sorted);
      const unread = sorted.filter((n) => !n.isRead).length;
      setUnreadCount(unread);
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Failed to load notifications.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

  /* delete one */
  const handleDeleteOne = async (id) => {
    const confirmed = window.confirm("Delete this notification?");
    if (!confirmed) return;
    try {
      setDeleting(true); setError("");
      await api.delete("/Notifications/Delete-SelectedNotification", {
        data: { notificationIds: [id] },
      });
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      setSelectedIds((prev) => prev.filter((i) => i !== String(id)));
      setUnreadCount(notifications.filter((n) => !n.isRead && n.id !== id).length);
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Failed to delete.");
    } finally { setDeleting(false); }
  };

  /* bulk delete */
  const handleDeleteSelected = async () => {
    if (!selectedIds.length) return;
    const confirmed = window.confirm(`Delete ${selectedIds.length} notification(s)?`);
    if (!confirmed) return;
    try {
      setDeleting(true); setError("");
      await api.delete("/Notifications/Delete-SelectedNotification", {
        data: { notificationIds: selectedIds },
      });
      setNotifications((prev) => prev.filter((n) => !selectedIds.includes(String(n.id))));
      setSelectedIds([]);
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Failed to delete.");
    } finally { setDeleting(false); }
  };

  const toggleSelectOne = (id) => {
    const val = String(id);
    setSelectedIds((prev) => prev.includes(val) ? prev.filter((i) => i !== val) : [...prev, val]);
  };

  const allSelected = notifications.length > 0 && selectedIds.length === notifications.length;
  const toggleSelectAll = () => {
    if (allSelected) { setSelectedIds([]); return; }
    setSelectedIds(notifications.map((n) => String(n.id)));
  };

  const skeletonBlockStyle = {
    background: isDarkMode
      ? "linear-gradient(90deg, #1a1a1a 25%, #2a2a2a 37%, #1a1a1a 63%)"
      : "linear-gradient(90deg, #f1f1f1 25%, #e7e7e7 37%, #f1f1f1 63%)",
    backgroundSize: "400% 100%",
    animation: "userNotifShimmer 1.4s ease infinite",
    borderRadius: "10px",
  };

  const enriched = notifications.map((n) => {
    const uiType = resolveType(n);
    const typeStyle = TYPE_COLOR[uiType] || TYPE_COLOR.default;
    return { ...n, uiType, typeStyle, timeLabel: formatTimeAgo(n.createdAt), iconClass: TYPE_ICON[uiType] || TYPE_ICON.default };
  });

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="seller-notifications" dir={isArabic ? "rtl" : "ltr"} style={{ paddingTop: "100px" }}>
      <Navbar unreadCount={unreadCount} />

      <div className="container">
        {/* ── Header row ── */}
        <div style={{
          display: "flex", justifyContent: "space-between",
          alignItems: "center", gap: "12px", flexWrap: "wrap", marginBottom: "20px",
        }}>
          <h1 style={{ margin: 0, display: "flex", alignItems: "center", gap: 10 }}>
            Notifications
            {unreadCount > 0 && (
              <span style={{
                background: "#2563eb", color: "#fff", borderRadius: 999,
                fontSize: 12, fontWeight: 900, padding: "3px 10px",
              }}>
                {unreadCount}
              </span>
            )}
          </h1>

          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={fetchNotifications}
              disabled={loading || deleting}
              style={{
                border: "1px solid #ddd", background: "#fff",
                padding: "10px 14px", borderRadius: "8px",
                cursor: loading || deleting ? "not-allowed" : "pointer",
              }}
            >
              {loading ? "Refreshing..." : "Refresh"}
            </button>

            <button
              type="button"
              onClick={handleDeleteSelected}
              disabled={!selectedIds.length || deleting}
              style={{
                border: "none",
                background: selectedIds.length ? "#d32f2f" : "#ccc",
                color: "#fff", padding: "10px 14px", borderRadius: "8px",
                cursor: !selectedIds.length || deleting ? "not-allowed" : "pointer",
              }}
            >
              {deleting ? "Deleting..." : `Delete Selected (${selectedIds.length})`}
            </button>
          </div>
        </div>

        {/* ── Error ── */}
        {!loading && error && (
          <div style={{
            background: "#fdecea", color: "#b3261e",
            padding: "12px 14px", borderRadius: "10px", marginBottom: "18px",
          }}>
            {error}
          </div>
        )}

        {/* ── Select All ── */}
        {!loading && enriched.length > 0 && (
          <div style={{ marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
            <input
              id="select-all-user-notifications"
              type="checkbox"
              checked={allSelected}
              onChange={toggleSelectAll}
            />
            <label htmlFor="select-all-user-notifications">Select All</label>
          </div>
        )}

        {/* ── Skeleton ── */}
        {loading && (
          <div style={{ display: "grid", gap: "18px" }}>
            {skeletonRows.map((k) => (
              <div key={k} style={{
                display: "flex", alignItems: "center", gap: "16px",
                padding: "22px 18px", borderRadius: "18px",
                background: isDarkMode ? "#111" : "#fff",
                boxShadow: isDarkMode ? "0 6px 20px rgba(255,255,255,0.03)" : "0 6px 20px rgba(0,0,0,0.05)",
              }}>
                <div style={{ width: "18px", height: "18px", ...skeletonBlockStyle }} />
                <div style={{ width: "48px", height: "48px", borderRadius: "50%", ...skeletonBlockStyle }} />
                <div style={{ flex: 1 }}>
                  <div style={{ width: "220px", maxWidth: "60%", height: "20px", marginBottom: "12px", ...skeletonBlockStyle }} />
                  <div style={{ width: "380px", maxWidth: "90%", height: "16px", ...skeletonBlockStyle }} />
                </div>
                <div style={{ width: "120px", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "10px" }}>
                  <div style={{ width: "70px", height: "16px", ...skeletonBlockStyle }} />
                  <div style={{ width: "78px", height: "40px", borderRadius: "12px", ...skeletonBlockStyle }} />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Empty ── */}
        {!loading && !error && enriched.length === 0 && (
          <div style={{ padding: "24px 0", textAlign: "center", color: "#666" }}>
            No notifications found.
          </div>
        )}

        {/* ── List ── */}
        {!loading && !error && enriched.length > 0 && enriched.map((item) => (
          <div
            className="notification-card"
            key={item.id}
            style={{
              display: "flex", alignItems: "center", gap: "14px",
              position: "relative", padding: "18px", width: "100%",
              overflow: "hidden", flexWrap: "nowrap",
            }}
          >
            {/* Unread dot */}
            {!item.isRead && (
              <span style={{
                position: "absolute",
                top: "12px",
                left: isArabic ? "auto" : "12px",
                right: isArabic ? "12px" : "auto",
                width: "10px", height: "10px",
                borderRadius: "50%", background: "#f4c430",
                boxShadow: "0 0 0 2px #fff",
              }} />
            )}

            {/* Checkbox */}
            <div style={{ display: "flex", alignItems: "flex-start", paddingTop: "8px", flexShrink: 0 }}>
              <input
                type="checkbox"
                checked={selectedIds.includes(String(item.id))}
                onChange={() => toggleSelectOne(item.id)}
              />
            </div>

            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              gap: "16px", flex: 1, minWidth: 0,
            }}>
              <div style={{ display: "flex", gap: "14px", alignItems: "center", flex: 1, minWidth: 0, overflow: "hidden" }}>
                {/* Icon */}
                <div className="notification-icon" style={{ flexShrink: 0 }}>
                  <i className={item.iconClass} style={{ color: item.typeStyle.color }} />
                </div>

                {/* Content */}
                <div className="notification-content" style={{ flex: 1, minWidth: 0 }}>
                  <h4 style={{ marginBottom: "6px", overflowWrap: "break-word", wordBreak: "break-word" }}>
                    {item.title || "Notification"}
                  </h4>
                  <p style={{ marginBottom: 0, overflowWrap: "break-word", wordBreak: "break-word" }}>
                    {item.message || "No details available."}
                  </p>
                </div>
              </div>

              {/* Time + Delete */}
              <div style={{
                width: "95px", minWidth: "95px",
                display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center",
                gap: "8px", flexShrink: 0,
              }}>
                <span className="notification-time" style={{
                  fontSize: "12px", color: "#999", lineHeight: "1",
                  whiteSpace: "nowrap", direction: "ltr", textAlign: "center", display: "block",
                }}>
                  {item.timeLabel}
                </span>
                <button
                  type="button"
                  onClick={() => handleDeleteOne(item.id)}
                  disabled={deleting}
                  style={{
                    border: "1px solid #e0e0e0", background: "#fff",
                    color: "#d32f2f", padding: "10px 14px",
                    borderRadius: "10px",
                    cursor: deleting ? "not-allowed" : "pointer",
                    minWidth: "78px",
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}

        {/* Footer count */}
        {!loading && notifications.length > 0 && (
          <p style={{ textAlign: "center", color: "#999", fontSize: 12, fontWeight: 700, marginTop: 16 }}>
            {notifications.length} notifications total
            {selectedIds.length > 0 && ` · ${selectedIds.length} selected`}
          </p>
        )}
      </div>
    </div>
  );
}