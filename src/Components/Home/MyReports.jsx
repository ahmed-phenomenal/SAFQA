import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import icon from "../../assets/2.png";
import Navbar from "../Sign-in/Navbar";
import api from "../../API/axios";

const STATUS_LABELS = {
  1: { label: "Open",      color: "#d97706", bg: "#fef3c7" },
  2: { label: "In Review", color: "#2563eb", bg: "#dbeafe" },
  3: { label: "Resolved",  color: "#16a34a", bg: "#dcfce7" },
  4: { label: "Cancelled", color: "#6b7280", bg: "#f3f4f6" },
};

const getStatusStyle = (status) =>
  STATUS_LABELS[Number(status)] || {
    label: String(status || "Unknown"),
    color: "#6b7280",
    bg: "#f3f4f6",
  };

const formatDate = (value, isArabic) => {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString(isArabic ? "ar-EG" : "en-GB", {
    day: "numeric", month: "long", year: "numeric",
  });
};

const getTheme = () => {
  if (typeof window === "undefined") return "light";
  return (
    localStorage.getItem("theme") ||
    localStorage.getItem("colorTheme") ||
    document.documentElement.getAttribute("data-theme") ||
    (document.documentElement.classList.contains("dark") ? "dark" : "light")
  );
};

// Reads the stored token from all known keys across localStorage + sessionStorage
const getStoredToken = () =>
  localStorage.getItem("token") ||
  localStorage.getItem("userToken") ||
  localStorage.getItem("sellerToken") ||
  sessionStorage.getItem("token") ||
  sessionStorage.getItem("userToken") ||
  sessionStorage.getItem("sellerToken") ||
  null;

export default function MyReports() {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === "ar";

  const tr = (key, fallback) => {
    const v = t(key);
    return v === key ? fallback : v;
  };

  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");
  const [theme,   setTheme]   = useState(getTheme);

  useEffect(() => {
    const sync = () => setTheme(getTheme());
    window.addEventListener("storage", sync);
    const observer = new MutationObserver(sync);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme", "class"],
    });
    return () => {
      window.removeEventListener("storage", sync);
      observer.disconnect();
    };
  }, []);

  const dark = theme === "dark";

  useEffect(() => {
    document.title = tr("myReports", "My Reports");
    const link = document.querySelector("link[rel~='icon']");
    if (link) link.href = icon;
  }, [i18n.language]); // eslint-disable-line

useEffect(() => {
const load = async () => {
  try {
    setLoading(true);
    setError("");

    const token = getStoredToken();
    if (!token) { window.location.replace("/login"); return; }

    const raw = await fetch(`${import.meta.env.VITE_API_BASE_URL || "https://e-safqa.runasp.net/api"}/Dispute/my-reports`, {
      headers: {
        "Authorization": `Bearer ${token}`,
        "x-api-key": "abc123xyhgfhjgkiho3544351z",
        "DeviceId": localStorage.getItem("DeviceId") || "web-test",
        "Accept": "application/json",
      },
    });

    const data = await raw.json();

    // 400 + "No reports found" = empty list, not an error
    if (!raw.ok) {
      const msg = String(data?.message || "").toLowerCase();
      if (msg.includes("no reports") || msg.includes("not found") || msg.includes("no result")) {
        setReports([]);
        return;
      }
      if (raw.status === 401 || raw.status === 403) { window.location.replace("/login"); return; }
      setError(data?.message || tr("failedToLoadReports", "Failed to load reports."));
      return;
    }

    const list =
      Array.isArray(data?.reports)  ? data.reports  :
      Array.isArray(data?.data)     ? data.data      :
      Array.isArray(data?.disputes) ? data.disputes  :
      Array.isArray(data?.items)    ? data.items     :
      Array.isArray(data)           ? data           :
      (() => { const found = Object.values(data || {}).find(Array.isArray); return found || []; })();

    setReports(list);
  } catch (err) {
    setError(err?.message || tr("failedToLoadReports", "Failed to load reports."));
  } finally {
    setLoading(false);
  }
};
  load();
}, []); // eslint-disable-line

  const c = {
    pageBg:       dark ? "#0f1117"  : "#f4f7fb",
    cardBg:       dark ? "#161b27"  : "#ffffff",
    cardBorder:   dark ? "#2d3748"  : "#e5e7eb",
    cardShadow:   dark ? "0 8px 24px rgba(0,0,0,0.4)" : "0 8px 24px rgba(15,23,42,0.06)",
    title:        dark ? "#7bb3ff"  : "#063b78",
    chipBlue:     dark ? "#1a2744"  : "#e8f1ff",
    chipBlueTxt:  dark ? "#7bb3ff"  : "#063b78",
    chipGreen:    dark ? "#14301f"  : "#f0fdf4",
    chipGreenTxt: dark ? "#4ade80"  : "#16a34a",
    descBg:       dark ? "#1a1f2e"  : "#f8fafc",
    descBorder:   dark ? "#2d3748"  : "#edf1f6",
    descLabel:    dark ? "#64748b"  : "#6b7280",
    descText:     dark ? "#cbd5e1"  : "#374151",
    metaBg:       dark ? "#1e293b"  : "#f1f5f9",
    metaTxt:      dark ? "#94a3b8"  : "#374151",
    emptyTxt:     dark ? "#64748b"  : "#94a3b8",
    btnBg:        dark ? "#1d4ed8"  : "#063b78",
    spinnerRing:  dark ? "#1e3a5f"  : "#dbeafe",
    spinnerTop:   dark ? "#7bb3ff"  : "#063b78",
  };

  return (
    <>

      <main
        dir={isArabic ? "rtl" : "ltr"}
        style={{
          minHeight: "100vh",
          background: c.pageBg,
          padding: "30px 16px 70px",
          fontFamily: "Arial, Helvetica, sans-serif",
          boxSizing: "border-box",
          transition: "background 0.3s",
        }}
      >
        <style>{baseStyles}</style>

        <div className="mr-container">
          <h2 className="mr-title" style={{ color: c.title }}>
            {tr("myReports", "My Reports")}
          </h2>

          {/* LOADING */}
          {loading && (
            <div className="mr-card" style={{ background: c.cardBg, border: `1px solid ${c.cardBorder}`, boxShadow: c.cardShadow }}>
              <div className="mr-empty">
                <div className="mr-spinner" style={{ borderColor: c.spinnerRing, borderTopColor: c.spinnerTop }} />
                <p style={{ color: c.emptyTxt }}>{tr("loading", "Loading...")}</p>
              </div>
            </div>
          )}

          {/* ERROR */}
          {!loading && error && (
            <div className="mr-card" style={{ background: c.cardBg, border: `1px solid ${c.cardBorder}`, boxShadow: c.cardShadow }}>
              <div className="mr-empty">
                <i className="fa-solid fa-circle-exclamation" style={{ fontSize: 32, color: "#f87171" }} />
                <p style={{ color: "#f87171", fontWeight: 800 }}>{error}</p>
              </div>
            </div>
          )}

          {/* EMPTY */}
          {!loading && !error && reports.length === 0 && (
            <div className="mr-card" style={{ background: c.cardBg, border: `1px solid ${c.cardBorder}`, boxShadow: c.cardShadow }}>
              <div className="mr-empty">
                <i className="fa-regular fa-folder-open" style={{ fontSize: 48, color: c.emptyTxt }} />
                <p style={{ color: c.emptyTxt }}>{tr("noReportsFound", "No reports found.")}</p>
              </div>
            </div>
          )}

          {/* REPORT CARDS */}
          {!loading && !error && reports.map((report, index) => {
            const reportId     = Number(report?.id    || report?.Id    || report?.disputeId || 0);
            const auctionId    = Number(report?.auctionId || report?.AuctionId || 0);
            const status       = report?.status       ?? report?.Status      ?? 1;
            const statusStyle  = getStatusStyle(status);
            const resType      = Number(report?.resolutionType ?? report?.ResolutionType ?? 1);
            const title        = report?.title        || report?.Title        || "";
            const desc         = report?.description  || report?.Description  || report?.reason || "--";
            const createdAt    = report?.date         || report?.createdAt    || report?.CreatedAt || "";
            const auctionTitle = report?.auctionTitle || report?.AuctionTitle || "";

            return (
              <div
                className="mr-card"
                key={`${reportId}-${index}`}
                style={{ background: c.cardBg, border: `1px solid ${c.cardBorder}`, boxShadow: c.cardShadow }}
              >
                {/* TOP ROW */}
                <div className="mr-card-top">
                  <div className="mr-ids">
                    {reportId ? (
                      <span className="mr-chip" style={{ background: c.chipBlue, color: c.chipBlueTxt }}>
                        <i className="fa-solid fa-hashtag" />
                        {tr("report", "Report")} {reportId}{title ? ` — ${title}` : ""}
                      </span>
                    ) : null}
                    {auctionId ? (
                      <span className="mr-chip" style={{ background: c.chipGreen, color: c.chipGreenTxt }}>
                        <i className="fa-solid fa-gavel" />
                        {auctionTitle || `${tr("auction", "Auction")} #${auctionId}`}
                      </span>
                    ) : null}
                  </div>
                  <span
                    className="mr-badge"
                    style={{
                      color: statusStyle.color,
                      background: dark ? statusStyle.color + "22" : statusStyle.bg,
                      border: `1px solid ${statusStyle.color}55`,
                    }}
                  >
                    {statusStyle.label}
                  </span>
                </div>

                {/* DESCRIPTION */}
                <div style={{ background: c.descBg, border: `1px solid ${c.descBorder}`, borderRadius: 12, padding: 14 }}>
                  <p style={{ display: "flex", alignItems: "center", gap: 7, color: c.descLabel, fontSize: 12, fontWeight: 900, textTransform: "uppercase", margin: "0 0 8px" }}>
                    <i className="fa-regular fa-comment-dots" />
                    {tr("description", "Description")}
                  </p>
                  <p style={{ color: c.descText, fontSize: 14, fontWeight: 600, lineHeight: 1.7, margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                    {desc}
                  </p>
                </div>

                {/* FOOTER */}
                <div className="mr-card-footer">
                  <div className="mr-ids">
                    {createdAt ? (
                      <span className="mr-chip" style={{ background: c.metaBg, color: c.metaTxt }}>
                        <i className="fa-regular fa-calendar" />
                        {formatDate(createdAt, isArabic)}
                      </span>
                    ) : null}
                    <span className="mr-chip" style={{ background: c.metaBg, color: c.metaTxt }}>
                      <i className="fa-solid fa-scale-balanced" />
                      {resType === 2
                        ? tr("partialRefundKeepItem", "Partial refund")
                        : tr("fullRefundReturnItem", "Full refund")}
                    </span>
                  </div>

                  {reportId ? (
                    <Link
                      to={`/dispute-tracking?disputeId=${reportId}`}
                      state={{ disputeId: reportId }}
                      className="mr-track-btn"
                      style={{ background: c.btnBg }}
                    >
                      <i className="fa-solid fa-location-dot" />
                      {tr("trackStatus", "Track Status")}
                    </Link>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </>
  );
}

const baseStyles = `
  * { box-sizing: border-box; }

  .mr-container {
    width: min(100%, 900px);
    margin: 0 auto;
  }

  .mr-title {
    text-align: center;
    font-size: 36px;
    font-weight: 900;
    margin-bottom: 24px;
    font-family: Georgia, "Times New Roman", serif;
    text-transform: uppercase;
  }

  .mr-card {
    border-radius: 16px;
    padding: 20px;
    margin-bottom: 16px;
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .mr-card-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 10px;
  }

  .mr-ids {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .mr-chip {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    border-radius: 8px;
    padding: 6px 12px;
    font-size: 13px;
    font-weight: 900;
  }

  .mr-badge {
    padding: 6px 14px;
    border-radius: 999px;
    font-size: 13px;
    font-weight: 900;
    white-space: nowrap;
  }

  .mr-card-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 10px;
  }

  .mr-track-btn {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    color: #fff;
    border-radius: 10px;
    padding: 10px 18px;
    font-size: 14px;
    font-weight: 900;
    text-decoration: none;
    transition: opacity 0.2s;
  }

  .mr-track-btn:hover { opacity: 0.82; }

  .mr-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    padding: 40px 20px;
    font-size: 15px;
    font-weight: 700;
    text-align: center;
  }

  .mr-spinner {
    width: 40px;
    height: 40px;
    border-width: 4px;
    border-style: solid;
    border-radius: 50%;
    animation: mrSpin 0.8s linear infinite;
  }

  @keyframes mrSpin { to { transform: rotate(360deg); } }

  @media (max-width: 600px) {
    .mr-card-top,
    .mr-card-footer { flex-direction: column; align-items: flex-start; }
    .mr-track-btn { width: 100%; justify-content: center; }
    .mr-title { font-size: 26px; }
  }
`;