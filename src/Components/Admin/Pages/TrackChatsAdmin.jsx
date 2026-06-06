import { useState, useEffect, useCallback, useRef } from "react";
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
} from "../../../API/admindashboard";
import api from "../../../API/axios";

/* ─────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────── */

const normalizeCard = (item) => ({
  id:        item?.id          ?? item?.disputeId   ?? item?.Id         ?? null,
  product:   item?.product     ?? item?.productName  ?? item?.auctionTitle ?? item?.title ?? "-",
  business:  item?.business    ?? item?.sellerName   ?? item?.seller     ?? "-",
  customer:  item?.customer    ?? item?.buyerName    ?? item?.buyer      ?? item?.userName ?? "-",
  status:    item?.status      ?? item?.Status       ?? "escalated",
  reason:    item?.reason      ?? item?.description  ?? item?.Reason     ?? "-",
  createdAt: item?.createdAt   ?? item?.date         ?? item?.CreatedAt  ?? "-",
  raw:       item,
});

const normalizeMsg = (m) => ({
  sender: (m?.senderRole ?? m?.sender ?? m?.role ?? "").toLowerCase().includes("seller")
    ? "business"
    : "customer",
  senderName: m?.senderName ?? m?.sender ?? m?.userName ?? "-",
  text:   m?.message      ?? m?.text    ?? m?.content  ?? m?.body ?? "",
  time:   m?.sentAt       ?? m?.createdAt ?? m?.time   ?? "",
});

const extractEvidenceUrl = (ev) => {
  if (!ev) return "";
  if (typeof ev === "string") return ev;
  return (
    ev.url        ?? ev.Url        ??
    ev.fileUrl    ?? ev.FileUrl    ??
    ev.imagePath  ?? ev.ImagePath  ??
    ev.imageUrl   ?? ev.ImageUrl   ??
    ev.path       ?? ev.Path       ??
    ev.link       ?? ev.Link       ??
    ev.evidence   ?? ev.Evidence   ??
    ev.filePath   ?? ev.FilePath   ??
    ev.image      ?? ev.Image      ??
    ""
  );
};

const resolveUrl = (url) => {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("blob:")) {
    return url;
  }
  const base = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");
  return `${base}${url.startsWith("/") ? "" : "/"}${url}`;
};

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
   EVIDENCE IMAGE
───────────────────────────────────────────── */

function EvidenceImage({ rawUrl, name, darkMode }) {
  const [blobUrl, setBlobUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [failed,  setFailed]  = useState(false);
  const revokeRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    setBlobUrl(null);
    setFailed(false);
    setLoading(true);

    const resolved = resolveUrl(rawUrl);
    if (!resolved) { setLoading(false); setFailed(true); return; }

    api
      .get(resolved, { responseType: "blob" })
      .then((res) => {
        if (cancelled) return;
        const url = URL.createObjectURL(res.data);
        revokeRef.current = url;
        setBlobUrl(url);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
      if (revokeRef.current) {
        URL.revokeObjectURL(revokeRef.current);
        revokeRef.current = null;
      }
    };
  }, [rawUrl]);

  if (loading) {
    return (
      <div style={{
        width: "100%", height: 180, borderRadius: 8,
        background: "rgba(100,116,139,0.1)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <i className="fa fa-spinner fa-spin" style={{ fontSize: 24, color: "#64748b" }} />
      </div>
    );
  }

  if (failed || !blobUrl) {
    return (
      <div style={{
        width: "100%",
        padding: "10px 0",
        fontSize: 13,
        color: darkMode ? "#ffffff" : "#111111",
      }}>
        No image
      </div>
    );
  }

  return (
    <img
      src={blobUrl}
      alt={name}
      style={{
        display: "block",
        width: "100%",
        maxHeight: 280,
        borderRadius: 8,
        objectFit: "contain",
        background: "rgba(0,0,0,0.05)",
      }}
    />
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
        if (Array.isArray(raw))                list = raw;
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
        setError("Conversation not found");
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
                <div
                  key={k}
                  style={{
                    display: "flex", gap: 10, marginBottom: 14,
                    justifyContent: k % 2 === 0 ? "flex-end" : "flex-start",
                  }}
                >
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
   DETAILS / EVIDENCE MODAL
───────────────────────────────────────────── */

function DetailsModal({ disputeId, card, onClose, t, darkMode }) {
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

  const evidenceList = (() => {
    if (!details) return [];
    let list = [];
    if      (Array.isArray(details?.evidence))    list = details.evidence;
    else if (Array.isArray(details?.evidences))   list = details.evidences;
    else if (Array.isArray(details?.files))       list = details.files;
    else if (Array.isArray(details?.attachments)) list = details.attachments;
    else if (Array.isArray(details?.images))      list = details.images;
    else if (Array.isArray(details))              list = details;

    return list.map((ev, i) => ({
      rawUrl: extractEvidenceUrl(ev),
      name: (typeof ev === "object" && ev !== null)
        ? (ev.name ?? ev.Name ?? ev.fileName ?? ev.FileName ?? ev.title ?? `Evidence ${i + 1}`)
        : `Evidence ${i + 1}`,
    }));
  })();

  return (
    <div className="admin-chat-overlay">
      <div className="admin-chat-modal admin-details-modal" style={{ maxWidth: 580 }}>

        <div className="admin-chat-modal-header">
          <h3>{t("disputeDetails", "Dispute Details & Evidence")}</h3>
          <button className="admin-chat-close-btn" onClick={onClose}>
            <i className="fa fa-times" />
          </button>
        </div>

        {loading && (
          <div style={{ padding: 24, display: "grid", gap: 12 }}>
            {[1, 2, 3, 4].map((k) => (
              <SkeletonBlock key={k} width={k % 2 === 0 ? "60%" : "85%"} height={14} />
            ))}
            <SkeletonBlock width="100%" height={180} radius={8} style={{ marginTop: 8 }} />
          </div>
        )}

        {!loading && error && (
          <p style={{ color: "#ef4444", padding: 24 }}>{error}</p>
        )}

        {!loading && !error && details && (
          <div className="admin-details-body">
            <div className="admin-details-meta">
              {[
                [t("disputeId", "Dispute ID"),  details?.id ?? details?.disputeId ?? disputeId],
                [t("product",   "Product"),     details?.product ?? details?.auctionTitle ?? card?.product],
                [t("buyer",     "Buyer"),        details?.buyer   ?? details?.buyerName   ?? card?.customer],
                [t("seller",    "Seller"),       details?.seller  ?? details?.sellerName  ?? card?.business],
                [t("status",    "Status"),       details?.status  ?? "-"],
                [t("reason",    "Reason"),       details?.reason  ?? details?.description ?? card?.reason],
                [t("createdAt", "Created At"),   details?.createdAt ?? card?.createdAt],
              ].map(([label, val]) =>
                val && val !== "-" ? (
                  <div key={label} className="admin-details-row">
                    <span className="admin-details-label">{label}:</span>
                    <span className="admin-details-value">{String(val)}</span>
                  </div>
                ) : null
              )}
            </div>

            <div style={{ marginTop: 20 }}>
              <h4 className="admin-details-evidence-title">
                {t("evidence", "Evidence")} ({evidenceList.length})
              </h4>

              {evidenceList.length === 0 ? (
                <p className="admin-details-no-evidence">
                  {t("noEvidence", "No evidence attached.")}
                </p>
              ) : (
                <div style={{ display: "grid", gap: 16 }}>
                  {evidenceList.map((ev, i) => (
                    <div key={i} className="admin-details-evidence-card">
                      <div className="admin-details-evidence-name">{ev.name}</div>
                      <EvidenceImage rawUrl={ev.rawUrl} name={ev.name} darkMode={darkMode} />
                    </div>
                  ))}
                </div>
              )}
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
          <button
            className="admin-chat-btn admin-chat-btn--cancel"
            onClick={onClose}
            disabled={loading}
          >
            {t("cancel", "Cancel")}
          </button>
          <button
            className="admin-chat-btn admin-chat-btn--danger"
            onClick={onConfirm}
            disabled={loading}
          >
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
        <button
          className="admin-chat-btn admin-chat-btn--open"
          onClick={() => onViewChat(card)}
        >
          <i className="fa fa-comments" style={{ marginRight: 5 }} />
          {t("viewChat", "View Chat")}
        </button>
        <button
          className="admin-chat-btn admin-chat-btn--evidence"
          onClick={() => onViewDetails(card)}
        >
          <i className="fa fa-file-text-o" style={{ marginRight: 5 }} />
          {t("showEvidence", "Show Evidence")}
        </button>
        <button
          className="admin-chat-btn admin-chat-btn--danger"
          onClick={() => onCancel(card)}
        >
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
  const navigate     = useNavigate();
  const location     = useLocation();
  const { i18n, t } = useTranslation();
  const isArabic     = i18n.language === "ar";

  const [theme, setTheme] = useState(() => getSavedTheme());
  const darkModeActive    = theme === "dark";
  useEffect(() => { applyTheme(theme); }, [theme]);
  const toggleDarkMode = () => {
    const next = darkModeActive ? "light" : "dark";
    setTheme(next); saveTheme(next); applyTheme(next);
  };

  const [sidebarShrinked, setSidebarShrinked] = useState(false);
  const toggleSidebar = () => setSidebarShrinked((p) => !p);
  const isActive = (path) => location.pathname === path ? "active" : "";

  useEffect(() => { document.title = "Admin | Track Disputes"; }, []);
  useEffect(() => {
    const link = document.querySelector("link[rel~='icon']") || document.createElement("link");
    link.rel = "icon"; link.href = icon; document.head.appendChild(link);
  }, []);

  const [disputes,    setDisputes]    = useState([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [dataError,   setDataError]   = useState("");

  const [chatCard,      setChatCard]      = useState(null);
  const [detailsCard,   setDetailsCard]   = useState(null);
  const [cancelCard,    setCancelCard]    = useState(null);
  const [cancelLoading, setCancelLoading] = useState(false);

  const loadDisputes = useCallback(async () => {
    setDataLoading(true);
    setDataError("");
    try {
      const res = await getEscalatedDisputeCards();
      const raw = res?.data;
      let list  = [];
      if      (Array.isArray(raw))           list = raw;
      else if (Array.isArray(raw?.data))     list = raw.data;
      else if (Array.isArray(raw?.items))    list = raw.items;
      else if (Array.isArray(raw?.result))   list = raw.result;
      else if (raw && typeof raw === "object") {
        const firstArr = Object.values(raw).find((v) => Array.isArray(v));
        if (firstArr) list = firstArr;
      }
      setDisputes(list.map(normalizeCard));
    } catch (err) {
      const status = err?.response?.status;
      if (status === 404 || status === 204) {
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

  const handleCancelDispute = async () => {
    if (!cancelCard?.id) return;
    try {
      setCancelLoading(true);
      await api.delete(`/Dispute/cancel/For-Admin/${cancelCard.id}`);
      alert(t("disputeCancelledSuccess", "Dispute cancelled successfully."));
      setCancelCard(null);
      loadDisputes();
    } catch (err) {
      console.error("[TrackChats] cancelDispute error:", err);
      if (err?.response?.status === 404) {
        alert(t("disputeAlreadyFinished", "Already Finished"));
        setDisputes((prev) => prev.filter((d) => d.id !== cancelCard.id));
        setCancelCard(null);
      } else {
        alert(err?.response?.data?.message || err?.message || t("cancelFailed", "Cancel failed."));
      }
    } finally {
      setCancelLoading(false);
    }
  };

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

  return (
    <div
      className={`admin-layout admin-chat ${darkModeActive ? "dark-admin" : ""}`}
      dir={isArabic ? "rtl" : "ltr"}
    >
      {/* NAVBAR */}
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
          <button className="admin-nav-icon-btn" onClick={() => setLanguage(isArabic ? "en" : "ar")}>
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

      {/* SIDEBAR */}
      <aside className={`admin-sidebar ${sidebarShrinked ? "shrinked" : ""}`}>
        <ul>
          <li>
            <Link to="/admin" className={isActive("/admin")}>
              <i className="fa fa-dashboard" /><span>{t("dashboard", "Dashboard")}</span>
            </Link>
          </li>
          <li>
            <Link to="/admin_users">
              <i className="fa fa-users" /><span>{t("allUsers", "All Users")}</span>
            </Link>
          </li>
          <li>
            <Link to="/admin_sellers">
              <i className="fa fa-user-secret" /><span>{t("allSellers", "All Sellers")}</span>
            </Link>
          </li>
          <li>
            <Link to="/admin_auctions">
              <i className="fa fa-gavel" /><span>{t("allAuctions", "All Auctions")}</span>
            </Link>
          </li>
          <li>
            <Link to="/admin_payments">
              <i className="fa fa-credit-card" /><span>{t("paymentLogs", "Payment Logs")}</span>
            </Link>
          </li>
          <li>
            <Link className={isActive("/admin_track_chats")} to="/admin_track_chats">
              <i className="fa fa-comments" /><span>{t("trackChats", "Track Chats")}</span>
            </Link>
          </li>
          <li>
            <Link to="/admin_announcements">
              <i className="fa fa-bullhorn" /><span>{t("announcements", "Announcements")}</span>
            </Link>
          </li>
        </ul>
      </aside>

      {/* MAIN */}
      <main className={`admin-content ${sidebarShrinked ? "active" : ""}`}>
        <div className="admin-chat-page">

          <h2 className="admin-chat-page-title">
            {t("escalatedDisputes", "Escalated Disputes")}
          </h2>

          <div className="admin-chat-stats-grid">
            <ChatStatCard
              label={t("totalDisputes", "Total Disputes")}
              value={disputes.length}
              icon="exclamation-triangle"
              loading={dataLoading}
            />
            <ChatStatCard
              label={t("escalated", "Escalated")}
              value={
                disputes.filter((d) =>
                  String(d.status).toLowerCase().includes("escalat")
                ).length || disputes.length
              }
              icon="flag"
              loading={dataLoading}
            />
            <ChatStatCard
              label={t("resolved", "Resolved")}
              value={disputes.filter((d) =>
                String(d.status).toLowerCase().includes("resolv")
              ).length}
              icon="check-circle"
              loading={dataLoading}
            />
          </div>

          {dataError && !dataLoading && (
            <div style={{
              background: "rgba(239,68,68,0.1)",
              border: "1px solid rgba(239,68,68,0.3)",
              borderRadius: 10, padding: "14px 18px", color: "#ef4444",
              display: "flex", alignItems: "center", gap: 10, marginBottom: 20,
            }}>
              <i className="fa fa-exclamation-circle" />
              {dataError}
              <button
                onClick={loadDisputes}
                style={{
                  marginLeft: "auto", background: "none", border: "none",
                  color: "#4fa3e0", cursor: "pointer", textDecoration: "underline", fontSize: 13,
                }}
              >
                {t("retry", "Retry")}
              </button>
            </div>
          )}

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
                    <i className="fa fa-check-circle" style={{
                      fontSize: 40, color: "#22c55e",
                      marginBottom: 12, display: "block",
                    }} />
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

      {chatCard && (
        <ChatModal
          disputeId={chatCard.id}
          card={chatCard}
          onClose={() => setChatCard(null)}
          t={t}
        />
      )}

      {detailsCard && (
        <DetailsModal
          disputeId={detailsCard.id}
          card={detailsCard}
          onClose={() => setDetailsCard(null)}
          t={t}
          darkMode={darkModeActive}
        />
      )}

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