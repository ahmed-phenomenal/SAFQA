import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { setLanguage } from "../../../utiles/setLanguage";
import { applyTheme, getSavedTheme, saveTheme } from "../../../utiles/themeManager";
import icon from "../../../assets/Person at the Center of Circles.png";
import "../admin.css";
import {
  getEscalatedDisputeCards,
  getDisputeChat,
  getDisputeDetails,
  cancelDispute,
} from "../../../API/admindashboard";

/* ─────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────── */

/** Normalise a dispute card from the API into a consistent shape */
const normalizeCard = (item) => ({
  id:         item?.id          ?? item?.disputeId   ?? item?.Id         ?? null,
  product:    item?.product     ?? item?.productName  ?? item?.auctionTitle ?? item?.title ?? "-",
  business:   item?.business    ?? item?.sellerName   ?? item?.seller     ?? "-",
  customer:   item?.customer    ?? item?.buyerName    ?? item?.buyer      ?? item?.userName ?? "-",
  status:     item?.status      ?? item?.Status       ?? "escalated",
  reason:     item?.reason      ?? item?.description  ?? item?.Reason     ?? "-",
  createdAt:  item?.createdAt   ?? item?.date         ?? item?.CreatedAt  ?? "-",
  raw:        item,
});

/** Normalise a single chat message */
const normalizeMsg = (m) => ({
  sender: (m?.senderRole ?? m?.sender ?? m?.role ?? "").toLowerCase().includes("seller")
    ? "business"
    : "customer",
  senderName: m?.senderName ?? m?.sender ?? m?.userName ?? "-",
  text:    m?.message      ?? m?.text    ?? m?.content  ?? m?.body ?? "",
  time:    m?.sentAt       ?? m?.createdAt ?? m?.time   ?? "",
});

/* ─────────────────────────────────────────────
   SKELETON
───────────────────────────────────────────── */

function SkeletonBlock({ width = "100%", height = 16, radius = 8, style = {} }) {
  return (
    <span
      className="admin-skeleton-block"
      style={{ width, height, borderRadius: radius, display: "block", ...style }}
    />
  );
}

function CardSkeleton() {
  return (
    <div className="admin-chat-card" style={{ gap: 10 }}>
      <SkeletonBlock width="70%" height={18} radius={6} />
      <SkeletonBlock width="55%" height={13} radius={5} />
      <SkeletonBlock width="45%" height={13} radius={5} />
      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        <SkeletonBlock width={90} height={32} radius={8} />
        <SkeletonBlock width={90} height={32} radius={8} />
        <SkeletonBlock width={90} height={32} radius={8} />
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   CHAT MODAL
───────────────────────────────────────────── */

function ChatModal({ disputeId, card, onClose, t }) {
  const [messages, setMessages] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState("");

  useEffect(() => {
    if (!disputeId) return;
    setLoading(true);
    setError("");
    getDisputeChat(disputeId)
      .then((res) => {
        const raw = res?.data;
        let list = [];
        if (Array.isArray(raw)) list = raw;
        else if (Array.isArray(raw?.messages)) list = raw.messages;
        else if (Array.isArray(raw?.data))     list = raw.data;
        else if (raw && typeof raw === "object") {
          const firstArr = Object.values(raw).find((v) => Array.isArray(v));
          if (firstArr) list = firstArr;
        }
        setMessages(list.map(normalizeMsg));
      })
      .catch((err) => {
        console.error("[Chat] load error:", err);
        setError(t("failedToLoadChat", "Failed to load chat messages."));
      })
      .finally(() => setLoading(false));
  }, [disputeId]); // eslint-disable-line

  const avatar = "https://i.pravatar.cc/40";

  return (
    <div className="admin-chat-overlay">
      <div className="admin-chat-modal">
        <div className="admin-chat-modal-header">
          <h3>{card?.product}</h3>
          <button className="admin-chat-close-btn" onClick={onClose}>
            <i className="fa fa-times" />
          </button>
        </div>

        <div className="admin-chat-modal-meta">
          <span><b>{t("business", "Business")}:</b> {card?.business}</span>
          <span><b>{t("customer", "Customer")}:</b> {card?.customer}</span>
          <span style={{ marginLeft: "auto", fontSize: 12, color: "#94a3b8" }}>
            {t("disputeId", "Dispute")} #{disputeId}
          </span>
        </div>

        <div className="admin-chat-messages">
          {loading && (
            <div style={{ padding: 20 }}>
              {[1, 2, 3].map((k) => (
                <div key={k} style={{ display: "flex", gap: 10, marginBottom: 14,
                  justifyContent: k % 2 === 0 ? "flex-end" : "flex-start" }}>
                  {k % 2 !== 0 && <SkeletonBlock width={36} height={36} radius="50%" />}
                  <SkeletonBlock width="55%" height={40} radius={12} />
                  {k % 2 === 0 && <SkeletonBlock width={36} height={36} radius="50%" />}
                </div>
              ))}
            </div>
          )}

          {!loading && error && (
            <p style={{ color: "#ef4444", textAlign: "center", padding: 24 }}>{error}</p>
          )}

          {!loading && !error && messages.length === 0 && (
            <p style={{ color: "#94a3b8", textAlign: "center", padding: 24 }}>
              {t("noMessages", "No messages found.")}
            </p>
          )}

          {!loading && !error && messages.map((m, i) => {
            const isBusiness = m.sender === "business";
            return (
              <div
                key={i}
                className={`admin-chat-msg-row ${isBusiness ? "admin-chat-msg-row--right" : "admin-chat-msg-row--left"}`}
              >
                {!isBusiness && <img src={avatar} alt="avatar" className="admin-chat-avatar" />}
                <div>
                  <div className={`admin-chat-bubble ${isBusiness ? "admin-chat-bubble--biz" : "admin-chat-bubble--cust"}`}>
                    {m.text}
                  </div>
                  {m.time && (
                    <div style={{
                      fontSize: 10, color: "#64748b", marginTop: 3,
                      textAlign: isBusiness ? "right" : "left",
                    }}>
                      {m.senderName} · {m.time}
                    </div>
                  )}
                </div>
                {isBusiness && <img src={avatar} alt="avatar" className="admin-chat-avatar" />}
              </div>
            );
          })}
        </div>

        <div className="admin-chat-modal-footer">
          <button className="admin-chat-btn admin-chat-btn--cancel" onClick={onClose}>
            {t("close", "Close")}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   EVIDENCE / DETAILS MODAL
───────────────────────────────────────────── */

function DetailsModal({ disputeId, card, onClose, t }) {
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");

  useEffect(() => {
    if (!disputeId) return;
    setLoading(true);
    setError("");
    getDisputeDetails(disputeId)
      .then((res) => {
        const raw = res?.data;
        setDetails(raw?.data ?? raw ?? null);
      })
      .catch((err) => {
        console.error("[Details] load error:", err);
        setError(t("failedToLoadDetails", "Failed to load dispute details."));
      })
      .finally(() => setLoading(false));
  }, [disputeId]); // eslint-disable-line

  /* Normalise evidence list from any shape */
  const evidenceList = (() => {
    if (!details) return [];
    if (Array.isArray(details?.evidence))  return details.evidence;
    if (Array.isArray(details?.evidences)) return details.evidences;
    if (Array.isArray(details?.files))     return details.files;
    if (Array.isArray(details?.attachments)) return details.attachments;
    return [];
  })();

  return (
    <div className="admin-chat-overlay">
      <div className="admin-chat-modal" style={{ maxWidth: 580 }}>
        <div className="admin-chat-modal-header">
          <h3>{t("disputeDetails", "Dispute Details & Evidence")}</h3>
          <button className="admin-chat-close-btn" onClick={onClose}>
            <i className="fa fa-times" />
          </button>
        </div>

        {loading && (
          <div style={{ padding: 24, display: "grid", gap: 12 }}>
            {[1, 2, 3, 4].map((k) => <SkeletonBlock key={k} width={k % 2 === 0 ? "60%" : "85%"} height={14} />)}
          </div>
        )}

        {!loading && error && (
          <p style={{ color: "#ef4444", padding: 24 }}>{error}</p>
        )}

        {!loading && !error && details && (
          <div style={{ padding: "0 20px 20px", overflowY: "auto", maxHeight: "60vh" }}>

            {/* Meta info */}
            <div style={{
              display: "grid", gap: 10, padding: "14px 0",
              borderBottom: "1px solid rgba(255,255,255,0.08)",
            }}>
              {[
                [t("disputeId",  "Dispute ID"),  details?.id ?? details?.disputeId ?? disputeId],
                [t("product",    "Product"),      details?.product ?? details?.auctionTitle ?? card?.product],
                [t("buyer",      "Buyer"),         details?.buyer   ?? details?.buyerName   ?? card?.customer],
                [t("seller",     "Seller"),        details?.seller  ?? details?.sellerName  ?? card?.business],
                [t("status",     "Status"),        details?.status  ?? "-"],
                [t("reason",     "Reason"),        details?.reason  ?? details?.description ?? card?.reason],
                [t("createdAt",  "Created At"),    details?.createdAt ?? card?.createdAt],
              ].map(([label, val]) => val && val !== "-" ? (
                <div key={label} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                  <span style={{ color: "#94a3b8", fontSize: 13, minWidth: 100 }}>{label}:</span>
                  <span style={{ fontSize: 13, fontWeight: 600, wordBreak: "break-word" }}>{String(val)}</span>
                </div>
              ) : null)}
            </div>

            {/* Evidence */}
            <div style={{ marginTop: 16 }}>
              <h4 style={{ fontSize: 14, color: "#4fa3e0", marginBottom: 10 }}>
                {t("evidence", "Evidence")} ({evidenceList.length})
              </h4>

              {evidenceList.length === 0 && (
                <p style={{ color: "#94a3b8", fontSize: 13 }}>
                  {t("noEvidence", "No evidence attached.")}
                </p>
              )}

              <div style={{ display: "grid", gap: 10 }}>
                {evidenceList.map((ev, i) => {
                  const url  = ev?.url ?? ev?.fileUrl ?? ev?.path ?? ev?.link ?? ev?.evidence ?? "";
                  const name = ev?.name ?? ev?.fileName ?? ev?.title ?? `Evidence ${i + 1}`;
                  const type = (ev?.type ?? ev?.fileType ?? ev?.mimeType ?? "").toLowerCase();
                  const isImage = type.includes("image") || /\.(jpg|jpeg|png|gif|webp)$/i.test(url);

                  return (
                    <div key={i} style={{
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      borderRadius: 10, padding: 12,
                    }}>
                      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: "#e2e8f0" }}>
                        {name}
                      </div>
                      {isImage && url ? (
                        <img
                          src={url}
                          alt={name}
                          style={{ maxWidth: "100%", borderRadius: 8, maxHeight: 200, objectFit: "contain" }}
                          onError={(e) => { e.target.style.display = "none"; }}
                        />
                      ) : url ? (
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: "#4fa3e0", fontSize: 13, wordBreak: "break-all" }}
                        >
                          <i className="fa fa-external-link" style={{ marginRight: 6 }} />
                          {t("viewFile", "View File")}
                        </a>
                      ) : (
                        <span style={{ color: "#64748b", fontSize: 12 }}>
                          {t("noLink", "No link available")}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        <div className="admin-chat-modal-footer">
          <button className="admin-chat-btn admin-chat-btn--cancel" onClick={onClose}>
            {t("close", "Close")}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   CANCEL CONFIRM MODAL
───────────────────────────────────────────── */

function CancelConfirmModal({ card, onClose, onConfirm, loading, t }) {
  return (
    <div className="admin-chat-overlay">
      <div className="admin-chat-confirm-modal">
        <h3>{t("cancelDispute", "Cancel Dispute")}</h3>
        <p>
          {t("cancelDisputeConfirm", "Cancel dispute for")}{" "}
          <strong>{card?.product}</strong>{" "}
          {t("between", "between")}{" "}
          <strong>{card?.business}</strong>{" "}
          {t("and", "and")}{" "}
          <strong>{card?.customer}</strong>?
        </p>
        <p style={{ color: "#94a3b8", fontSize: 13, marginTop: 6 }}>
          {t("cancelDisputeWarning", "This action cannot be undone.")}
        </p>
        <div className="admin-chat-confirm-actions">
          <button className="admin-chat-btn admin-chat-btn--cancel" onClick={onClose} disabled={loading}>
            {t("cancel", "Cancel")}
          </button>
          <button className="admin-chat-btn admin-chat-btn--danger" onClick={onConfirm} disabled={loading}>
            {loading ? t("loading", "Loading...") : t("confirm", "Confirm")}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   DISPUTE CARD
───────────────────────────────────────────── */

function DisputeCard({ card, onViewChat, onViewDetails, onCancel, t }) {
  return (
    <div className="admin-chat-card">
      <h4 className="admin-chat-card-title">{card.product}</h4>
      {card.reason && card.reason !== "-" && (
        <p className="admin-chat-card-row" style={{ color: "#f59e0b", fontSize: 12 }}>
          <i className="fa fa-exclamation-circle" style={{ marginRight: 4 }} />
          {card.reason}
        </p>
      )}
      <p className="admin-chat-card-row">
        <span className="admin-chat-card-key">{t("business", "Business")}:</span> {card.business}
      </p>
      <p className="admin-chat-card-row">
        <span className="admin-chat-card-key">{t("customer", "Customer")}:</span> {card.customer}
      </p>
      {card.createdAt && card.createdAt !== "-" && (
        <p className="admin-chat-card-row" style={{ fontSize: 11, color: "#64748b" }}>
          {card.createdAt}
        </p>
      )}
      <div className="admin-chat-card-actions" style={{ flexWrap: "wrap" }}>
        <button className="admin-chat-btn admin-chat-btn--open" onClick={() => onViewChat(card)}>
          <i className="fa fa-comments" style={{ marginRight: 5 }} />
          {t("viewChat", "View Chat")}
        </button>
        <button
          className="admin-chat-btn"
          style={{ background: "rgba(79,163,224,0.15)", color: "#4fa3e0", border: "1px solid rgba(79,163,224,0.3)" }}
          onClick={() => onViewDetails(card)}
        >
          <i className="fa fa-file-text-o" style={{ marginRight: 5 }} />
          {t("showEvidence", "Show Evidence")}
        </button>
        <button className="admin-chat-btn admin-chat-btn--danger" onClick={() => onCancel(card)}>
          <i className="fa fa-ban" style={{ marginRight: 5 }} />
          {t("cancelDispute", "Cancel")}
        </button>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   STAT CARD
───────────────────────────────────────────── */

function ChatStatCard({ label, value, icon, loading }) {
  return (
    <div className="admin-chat-stat-card">
      <i className={`fa fa-${icon} admin-chat-stat-icon`} />
      <div>
        <p className="admin-chat-stat-label">{label}</p>
        <h3 className="admin-chat-stat-value">
          {loading ? <SkeletonBlock width={40} height={22} radius={6} /> : value}
        </h3>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────── */

export default function AdminTrackChats() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { i18n, t } = useTranslation();
  const isArabic  = i18n.language === "ar";

  /* ── theme ── */
  const [theme, setTheme] = useState(() => getSavedTheme());
  const darkModeActive = theme === "dark";
  useEffect(() => { applyTheme(theme); }, [theme]);
  const toggleDarkMode = () => {
    const next = darkModeActive ? "light" : "dark";
    setTheme(next); saveTheme(next); applyTheme(next);
  };

  /* ── sidebar ── */
  const [sidebarShrinked, setSidebarShrinked] = useState(false);
  const toggleSidebar = () => setSidebarShrinked((p) => !p);
  const isActive = (path) => location.pathname === path ? "active" : "";

  /* ── year ── */
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const years = [];
  for (let y = 2025; y <= currentYear; y++) years.push(y);

  useEffect(() => { document.title = `Admin | Track Disputes ${selectedYear}`; }, [selectedYear]);
  useEffect(() => {
    const link = document.querySelector("link[rel~='icon']") || document.createElement("link");
    link.rel = "icon"; link.href = icon; document.head.appendChild(link);
  }, []);

  /* ── data ── */
  const [disputes,       setDisputes]       = useState([]);
  const [dataLoading,    setDataLoading]    = useState(true);
  const [dataError,      setDataError]      = useState("");

  /* ── modals ── */
  const [chatCard,       setChatCard]       = useState(null); // open chat modal
  const [detailsCard,    setDetailsCard]    = useState(null); // open details modal
  const [cancelCard,     setCancelCard]     = useState(null); // open cancel confirm
  const [cancelLoading,  setCancelLoading]  = useState(false);

  /* ── fetch escalated dispute cards ── */
  const loadDisputes = useCallback(async () => {
    setDataLoading(true);
    setDataError("");
    try {
      const res  = await getEscalatedDisputeCards();
      const raw  = res?.data;
      let list   = [];
      if (Array.isArray(raw)) list = raw;
      else if (Array.isArray(raw?.data))    list = raw.data;
      else if (Array.isArray(raw?.items))   list = raw.items;
      else if (Array.isArray(raw?.result))  list = raw.result;
      else if (raw && typeof raw === "object") {
        const firstArr = Object.values(raw).find((v) => Array.isArray(v));
        if (firstArr) list = firstArr;
      }
      setDisputes(list.map(normalizeCard));
    } catch (err) {
      const status = err?.response?.status;
      // 404 / 204 = endpoint not ready yet or truly empty — show zeros, no error banner
      if (status === 404 || status === 204 || status === 204) {
        setDisputes([]);
      } else {
        console.error("[TrackChats] loadDisputes error:", err);
        setDataError(t("failedToLoadDisputes", "Failed to load disputes. Please try again."));
      }
    } finally {
      setDataLoading(false);
    }
  }, []); // eslint-disable-line

  useEffect(() => { loadDisputes(); }, [loadDisputes]);

  /* ── cancel dispute ── */
  const handleCancelDispute = async () => {
    if (!cancelCard?.id) return;
    try {
      setCancelLoading(true);
      await cancelDispute(cancelCard.id);
      alert(t("disputeCancelledSuccess", "Dispute cancelled successfully."));
      setCancelCard(null);
      loadDisputes(); // refresh list
    } catch (err) {
      console.error("[TrackChats] cancelDispute error:", err);
      alert(err?.response?.data?.message || err?.message || t("cancelFailed", "Cancel failed."));
    } finally {
      setCancelLoading(false);
    }
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

  /* ─────────────────────────────────────────────
     RENDER
  ───────────────────────────────────────────── */
  return (
    <div
      className={`admin-layout admin-chat ${darkModeActive ? "dark-admin" : ""}`}
      dir={isArabic ? "rtl" : "ltr"}
    >
      {/* ── NAVBAR ── */}
      <header className="admin-navbar">
        <div className="left">
          <button className="toggle-btn" onClick={toggleSidebar}>
            <i className="fa fa-bars" />
          </button>
          <div className="brand">
            <i className="fa fa-comments" />
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

      {/* ── SIDEBAR ── */}
      <aside className={`admin-sidebar ${sidebarShrinked ? "shrinked" : ""}`}>
        <ul>
          <li><Link to="/admin" className={isActive("/admin")}><i className="fa fa-dashboard" /><span>{t("dashboard", "Dashboard")}</span></Link></li>
          <li><Link to="/admin_users"><i className="fa fa-users" /><span>{t("allUsers", "All Users")}</span></Link></li>
          <li><Link to="/admin_sellers"><i className="fa fa-user-secret" /><span>{t("allSellers", "All Sellers")}</span></Link></li>
          <li><Link to="/admin_auctions"><i className="fa fa-gavel" /><span>{t("allAuctions", "All Auctions")}</span></Link></li>
          <li><Link to="/admin_payments"><i className="fa fa-credit-card" /><span>{t("paymentLogs", "Payment Logs")}</span></Link></li>
          <li><Link to="/admin_delivery"><i className="fa fa-truck" /><span>{t("adminDelivery", "Admin Delivery")}</span></Link></li>
          <li><Link className={isActive("/admin_track_chats")} to="/admin_track_chats"><i className="fa fa-comments" /><span>{t("trackChats", "Track Chats")}</span></Link></li>
          <li><Link to="/admin_reports"><i className="fa-solid fa-clipboard-list" /><span>{t("reports", "Reports")}</span></Link></li>
          <li><Link to="/admin_announcements"><i className="fa fa-bullhorn" /><span>{t("announcements", "Announcements")}</span></Link></li>
        </ul>
      </aside>

      {/* ── MAIN ── */}
      <main className={`admin-content ${sidebarShrinked ? "active" : ""}`}>
        <div className="admin-chat-page">

          <h2 className="admin-chat-page-title">
            {t("escalatedDisputes", "Escalated Disputes")}
          </h2>

          {/* ── STAT CARDS ── */}
          <div className="admin-chat-stats-grid">
            <ChatStatCard
              label={t("totalDisputes", "Total Disputes")}
              value={disputes.length}
              icon="exclamation-triangle"
              loading={dataLoading}
            />
            <ChatStatCard
              label={t("escalated", "Escalated")}
              value={disputes.filter((d) => String(d.status).toLowerCase().includes("escalat")).length || disputes.length}
              icon="flag"
              loading={dataLoading}
            />
            <ChatStatCard
              label={t("resolved", "Resolved")}
              value={disputes.filter((d) => String(d.status).toLowerCase().includes("resolv")).length}
              icon="check-circle"
              loading={dataLoading}
            />
          </div>

          {/* ── ERROR ── */}
          {dataError && !dataLoading && (
            <div style={{
              background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)",
              borderRadius: 10, padding: "14px 18px", color: "#ef4444",
              display: "flex", alignItems: "center", gap: 10, marginBottom: 20,
            }}>
              <i className="fa fa-exclamation-circle" />
              {dataError}
              <button
                onClick={loadDisputes}
                style={{ marginLeft: "auto", background: "none", border: "none",
                  color: "#4fa3e0", cursor: "pointer", textDecoration: "underline", fontSize: 13 }}
              >
                {t("retry", "Retry")}
              </button>
            </div>
          )}

          {/* ── DISPUTE CARDS GRID ── */}
          <h3 className="admin-chat-section-title">
            {t("escalatedDisputes", "Escalated Disputes")}
            {!dataLoading && (
              <span style={{ marginLeft: 10, fontSize: 13, color: "#94a3b8", fontWeight: 400 }}>
                ({disputes.length})
              </span>
            )}
          </h3>

          <div className="admin-chat-cards-grid">
            {dataLoading
              ? [1, 2, 3, 4].map((k) => <CardSkeleton key={k} />)
              : disputes.length === 0 && !dataError
                ? (
                  <div style={{
                    gridColumn: "1 / -1", textAlign: "center",
                    padding: "40px 0", color: "#94a3b8",
                  }}>
                    <i className="fa fa-check-circle" style={{ fontSize: 40, color: "#22c55e", marginBottom: 12, display: "block" }} />
                    {t("noEscalatedDisputes", "No escalated disputes at the moment.")}
                  </div>
                )
                : disputes.map((card) => (
                  <DisputeCard
                    key={card.id}
                    card={card}
                    onViewChat={setChatCard}
                    onViewDetails={setDetailsCard}
                    onCancel={setCancelCard}
                    t={t}
                  />
                ))
            }
          </div>

        </div>
      </main>

      {/* ── CHAT MODAL ── */}
      {chatCard && (
        <ChatModal
          disputeId={chatCard.id}
          card={chatCard}
          onClose={() => setChatCard(null)}
          t={t}
        />
      )}

      {/* ── DETAILS / EVIDENCE MODAL ── */}
      {detailsCard && (
        <DetailsModal
          disputeId={detailsCard.id}
          card={detailsCard}
          onClose={() => setDetailsCard(null)}
          t={t}
        />
      )}

      {/* ── CANCEL CONFIRM MODAL ── */}
      {cancelCard && (
        <CancelConfirmModal
          card={cancelCard}
          loading={cancelLoading}
          onClose={() => setCancelCard(null)}
          onConfirm={handleCancelDispute}
          t={t}
        />
      )}
    </div>
  );
}