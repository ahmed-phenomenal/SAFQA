import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import icon from "../../../assets/2.png";
import { getAuctionHistory } from "../../../API/createAuction";

const STATUS_OPTIONS = [
  { labelKey: "all", value: "" },
  { labelKey: "draft", value: 1 },
  { labelKey: "pending", value: 2 },
  { labelKey: "published", value: 3 },
  { labelKey: "ended", value: 4 },
  { labelKey: "sold", value: 5 },
];

const toImageSrc = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
  if (raw.startsWith("data:image/")) return raw;
  return `data:image/png;base64,${raw}`;
};

export default function Seller_History() {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === "ar";
  const navigate = useNavigate();

  const [favicon] = useState(icon);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [historyData, setHistoryData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pageLoading, setPageLoading] = useState(false);
  const [error, setError] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [exporting, setExporting] = useState(false);

  const listRef = useRef(null);
  const isChangingPageRef = useRef(false);

  useEffect(() => {
    document.title = t("sellerHistoryDocTitle");
  }, [t]);

  useEffect(() => {
    const updateFavicon = (iconUrl) => {
      const link = document.querySelector("link[rel~='icon']");
      if (!link) {
        const newLink = document.createElement("link");
        newLink.rel = "icon";
        newLink.href = iconUrl;
        document.head.appendChild(newLink);
      } else {
        link.href = iconUrl;
      }
    };

    updateFavicon(favicon);
  }, [favicon]);

  const formatDate = (value) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "--";
    return date.toLocaleString(i18n.language);
  };

  const formatMoney = (value) => {
    const num = Number(value || 0);
    if (!Number.isFinite(num)) return "$0";
    return `$${num.toLocaleString(i18n.language)}`;
  };

  const getStatusLabel = (status) => {
    const s = String(status ?? "");
    if (s === "1") return t("draft");
    if (s === "2") return t("pending");
    if (s === "3") return t("published");
    if (s === "4") return t("ended");
    if (s === "5") return t("sold");
    return s || t("unknown");
  };

  const fetchHistoryPage = async (page, options = {}) => {
    const { keepPosition = "top" } = options;

    try {
      if (page === 1 && historyData.length === 0) {
        setLoading(true);
      } else {
        setPageLoading(true);
      }

      setError("");

      const data = await getAuctionHistory({
        status: statusFilter,
        page,
        pageSize: 10,
      });

      setHistoryData(Array.isArray(data?.items) ? data.items : []);
      setCurrentPage(Number(data?.currentPage || page || 1));
      setTotalPages(Number(data?.totalPages || 1));
      setHasNextPage(Boolean(data?.hasNextPage));

      requestAnimationFrame(() => {
        if (!listRef.current) return;

        if (keepPosition === "bottom") {
          listRef.current.scrollTop = 5;
        } else if (keepPosition === "top-from-prev") {
          listRef.current.scrollTop =
            listRef.current.scrollHeight - listRef.current.clientHeight - 5;
        } else {
          listRef.current.scrollTop = 0;
        }
      });
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          t("failedToLoadSellerHistory")
      );
    } finally {
      setLoading(false);
      setPageLoading(false);

      setTimeout(() => {
        isChangingPageRef.current = false;
      }, 250);
    }
  };

  useEffect(() => {
    fetchHistoryPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, t]);

  const filteredHistory = useMemo(() => {
    const term = search.trim().toLowerCase();

    return historyData.filter((item) => {
      if (!term) return true;

      return (
        String(item?.title || "").toLowerCase().includes(term) ||
        String(item?.description || "").toLowerCase().includes(term) ||
        String(item?.categoryName || "").toLowerCase().includes(term) ||
        String(getStatusLabel(item?.status)).toLowerCase().includes(term)
      );
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [historyData, search, i18n.language]);

  const handleScroll = async (e) => {
    const el = e.currentTarget;

    if (!el || loading || pageLoading || isChangingPageRef.current) return;

    const nearBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 20;
    const nearTop = el.scrollTop <= 20;

    if (nearBottom && hasNextPage && currentPage < totalPages) {
      isChangingPageRef.current = true;
      await fetchHistoryPage(currentPage + 1, { keepPosition: "bottom" });
      return;
    }

    if (nearTop && currentPage > 1) {
      isChangingPageRef.current = true;
      await fetchHistoryPage(currentPage - 1, {
        keepPosition: "top-from-prev",
      });
    }
  };

  const openAuction = (auctionId) => {
    navigate(`/seller-view-auction/${auctionId}`);
  };

  const exportViewedAuctionsPdf = () => {
    try {
      setExporting(true);

      const rows = filteredHistory
        .map(
          (item, index) => `
            <tr>
              <td>${index + 1}</td>
              <td>${item?.title || "-"}</td>
              <td>${item?.categoryName || "-"}</td>
              <td>${getStatusLabel(item?.status)}</td>
              <td>${formatDate(item?.startDate)}</td>
              <td>${formatDate(item?.endDate)}</td>
              <td>${formatMoney(item?.startingPrice)}</td>
              <td>${formatMoney(item?.currentPrice)}</td>
            </tr>
          `
        )
        .join("");

      const win = window.open("", "_blank", "width=1200,height=900");
      if (!win) {
        setExporting(false);
        return;
      }

      win.document.write(`
        <html dir="${isArabic ? "rtl" : "ltr"}" lang="${i18n.language}">
          <head>
            <title>${t("auctionsHistoryPdf")}</title>
            <style>
              body {
                font-family: Arial, Helvetica, sans-serif;
                padding: 30px;
                color: #1f2937;
              }
              h1 {
                color: #023E8A;
                margin-bottom: 8px;
              }
              .sub {
                color: #6b7280;
                margin-bottom: 24px;
              }
              table {
                width: 100%;
                border-collapse: collapse;
              }
              th, td {
                border: 1px solid #d1d5db;
                padding: 10px 12px;
                text-align: ${isArabic ? "right" : "left"};
                font-size: 13px;
              }
              th {
                background: #eef4ff;
                color: #023E8A;
              }
            </style>
          </head>
          <body>
            <h1>${t("sellerAuctionsHistory")}</h1>
            <div class="sub">${t("exportedViewedAuctionsCount", {
              count: filteredHistory.length,
            })}</div>
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>${t("title")}</th>
                  <th>${t("category")}</th>
                  <th>${t("status")}</th>
                  <th>${t("startDate")}</th>
                  <th>${t("endDate")}</th>
                  <th>${t("startingPrice")}</th>
                  <th>${t("currentPrice")}</th>
                </tr>
              </thead>
              <tbody>
                ${rows || `<tr><td colspan="8">${t("noAuctionsFound")}</td></tr>`}
              </tbody>
            </table>
          </body>
        </html>
      `);

      win.document.close();
      win.focus();

      setTimeout(() => {
        win.print();
        setExporting(false);
      }, 500);
    } catch {
      setExporting(false);
    }
  };

  return (
    <div className="seller-history" dir={isArabic ? "rtl" : "ltr"}>
      <style>{`
        .seller-history {
          width: 100%;
          min-height: 100vh;
          padding: 36px 0 60px;
          background: #f5f6fa;
          box-sizing: border-box;
          font-family: Arial, Helvetica, sans-serif;
        }

        .seller-history * {
          box-sizing: border-box;
        }

        .seller-history-container {
          width: min(1280px, 94%);
          margin: 0 auto;
        }

        .seller-history-title {
          text-align: center;
          font-size: 36px;
          font-weight: 800;
          color: #023E8A;
          margin: 0 0 26px;
        }

        .seller-history-top {
          width: 100%;
          background: #ffffff;
          padding: 22px;
          border-radius: 18px;
          margin-bottom: 24px;
          box-shadow: 0 6px 20px rgba(0, 0, 0, 0.06);
          display: grid;
          grid-template-columns: 1.2fr 220px 220px 180px;
          gap: 14px;
          align-items: center;
        }

        .seller-history-search,
        .seller-history-select {
          width: 100%;
          height: 52px;
          border: 1px solid #dcdcdc;
          border-radius: 12px;
          padding: 0 14px;
          font-size: 15px;
          outline: none;
          background: #fff;
        }

        .seller-history-search:focus,
        .seller-history-select:focus {
          border-color: #023E8A;
        }

        .seller-history-export {
          height: 52px;
          border: none;
          border-radius: 12px;
          background: #023E8A;
          color: #fff;
          font-size: 14px;
          font-weight: 800;
          cursor: pointer;
        }

        .seller-history-list {
          display: flex;
          flex-direction: column;
          gap: 20px;
          max-height: 74vh;
          overflow-y: auto;
          padding-right: ${isArabic ? "0" : "4px"};
          padding-left: ${isArabic ? "4px" : "0"};
        }

        .history-card {
          background: #fff;
          border-radius: 20px;
          padding: 20px;
          box-shadow: 0 6px 20px rgba(0, 0, 0, 0.06);
          border: 1px solid #eef2f7;
        }

        .history-card-top {
          display: grid;
          grid-template-columns: 170px 1fr auto;
          gap: 18px;
          align-items: center;
        }

        .history-card-image {
          width: 170px;
          height: 120px;
          border-radius: 16px;
          object-fit: cover;
          background: #eef2f7;
          border: 1px solid #e5e7eb;
        }

        .history-card-image-fallback {
          width: 170px;
          height: 120px;
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #eef2f7;
          border: 1px solid #e5e7eb;
          color: #94a3b8;
          font-size: 14px;
          font-weight: 700;
        }

        .history-card-body {
          min-width: 0;
        }

        .history-card-title {
          font-size: 24px;
          font-weight: 800;
          color: #1f2937;
          margin: 0 0 6px;
        }

        .history-card-desc {
          font-size: 14px;
          color: #6b7280;
          margin: 0 0 10px;
          line-height: 1.6;
        }

        .history-card-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-bottom: 12px;
        }

        .history-card-chip {
          padding: 8px 12px;
          border-radius: 999px;
          background: #f1f5f9;
          color: #334155;
          font-size: 13px;
          font-weight: 700;
        }

        .history-card-date-row {
          display: grid;
          grid-template-columns: repeat(2, minmax(180px, 1fr));
          gap: 12px;
        }

        .history-date-box {
          border: 1px solid #e5e7eb;
          border-radius: 14px;
          padding: 12px 14px;
          background: #fafafa;
        }

        .history-date-label {
          font-size: 12px;
          font-weight: 800;
          color: #94a3b8;
          margin-bottom: 4px;
          text-transform: uppercase;
        }

        .history-date-value {
          font-size: 14px;
          font-weight: 700;
          color: #1f2937;
        }

        .history-card-right {
          min-width: 220px;
          display: flex;
          flex-direction: column;
          gap: 14px;
          align-items: ${isArabic ? "flex-start" : "flex-end"};
        }

        .history-price-label {
          color: #94a3b8;
          font-size: 12px;
          font-weight: 800;
          text-transform: uppercase;
        }

        .history-price-value {
          color: #111827;
          font-size: 30px;
          font-weight: 900;
        }

        .history-view-btn {
          min-width: 160px;
          padding: 12px 18px;
          border-radius: 12px;
          border: none;
          background: #eaf2ff;
          color: #023E8A;
          font-size: 14px;
          font-weight: 800;
          cursor: pointer;
        }

        .seller-history-empty,
        .seller-history-page-loading,
        .seller-history-error {
          width: 100%;
          background: #ffffff;
          border-radius: 16px;
          padding: 36px 20px;
          text-align: center;
          color: #6c757d;
          font-size: 16px;
          box-shadow: 0 6px 20px rgba(0, 0, 0, 0.06);
        }

        .seller-history-error {
          color: #cf1322;
          border: 1px solid #ffa39e;
          background: #fff1f0;
        }

        @media (max-width: 1100px) {
          .seller-history-top {
            grid-template-columns: 1fr 1fr;
          }

          .history-card-top {
            grid-template-columns: 160px 1fr;
          }

          .history-card-right {
            grid-column: 1 / -1;
            align-items: flex-start;
            min-width: 0;
          }
        }

        @media (max-width: 760px) {
          .seller-history-top {
            grid-template-columns: 1fr;
          }

          .history-card-top {
            grid-template-columns: 1fr;
          }

          .history-card-image,
          .history-card-image-fallback {
            width: 100%;
            height: 220px;
          }

          .history-card-date-row {
            grid-template-columns: 1fr;
          }

          .history-price-value {
            font-size: 24px;
          }
        }
      `}</style>

      <div className="seller-history-container">
        <h2 className="seller-history-title">{t("sellerHistoryTitle")}</h2>

        <div className="seller-history-top">
          <input
            type="text"
            className="seller-history-search"
            placeholder={t("searchAuctions")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <select
            className="seller-history-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            {STATUS_OPTIONS.map((item) => (
              <option key={String(item.value)} value={item.value}>
                {t(item.labelKey)}
              </option>
            ))}
          </select>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              fontWeight: 700,
              color: "#6b7280",
              fontSize: 14,
              paddingInlineStart: 6,
            }}
          >
            {t("pageOf", { current: currentPage, total: totalPages })}
          </div>

          <button
            type="button"
            className="seller-history-export"
            onClick={exportViewedAuctionsPdf}
            disabled={exporting}
          >
            {exporting ? (
              t("exporting")
            ) : (
              <>
                <i className="fa-solid fa-arrow-up-from-bracket"></i>{" "}
                {t("export")}
              </>
            )}
          </button>
        </div>

        <div
          className="seller-history-list"
          ref={listRef}
          onScroll={handleScroll}
        >
          {loading ? (
            <div className="seller-history-empty">{t("loadingHistory")}</div>
          ) : error ? (
            <div className="seller-history-error">{error}</div>
          ) : filteredHistory.length > 0 ? (
            <>
              {filteredHistory.map((item) => (
                <div className="history-card" key={item.id}>
                  <div className="history-card-top">
                    {item.image ? (
                      <img
                        src={toImageSrc(item.image)}
                        alt={item.title}
                        className="history-card-image"
                      />
                    ) : (
                      <div className="history-card-image-fallback">
                        {t("noImage")}
                      </div>
                    )}

                    <div className="history-card-body">
                      <h3 className="history-card-title">{item.title}</h3>

                      <p className="history-card-desc">
                        {item.description || item.categoryName || t("auction")}
                      </p>

                      <div className="history-card-meta">
                        <span className="history-card-chip">
                          {item.categoryName || t("noCategory")}
                        </span>
                        <span className="history-card-chip">
                          {getStatusLabel(item.status)}
                        </span>
                        <span className="history-card-chip">
                          {t("itemsCount", { count: item.itemCount || 0 })}
                        </span>
                        <span className="history-card-chip">
                          {t("bidsCount", { count: item.totalBids || 0 })}
                        </span>
                      </div>

                      <div className="history-card-date-row">
                        <div className="history-date-box">
                          <div className="history-date-label">{t("startsIn")}</div>
                          <div className="history-date-value">
                            {formatDate(item.startDate)}
                          </div>
                        </div>

                        <div className="history-date-box">
                          <div className="history-date-label">{t("endsIn")}</div>
                          <div className="history-date-value">
                            {formatDate(item.endDate)}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="history-card-right">
                      <div>
                        <div className="history-price-label">
                          {t("startingPrice")}
                        </div>
                        <div className="history-price-value">
                          {formatMoney(item.startingPrice)}
                        </div>
                      </div>

                      <button
                        type="button"
                        className="history-view-btn"
                        onClick={() => openAuction(item.id)}
                      >
                        {t("viewAuction")}
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {pageLoading && (
                <div className="seller-history-page-loading">
                  {t("loadingPage")}
                </div>
              )}
            </>
          ) : (
            <div className="seller-history-empty">
              {t("noHistoryRecordsFound")}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}