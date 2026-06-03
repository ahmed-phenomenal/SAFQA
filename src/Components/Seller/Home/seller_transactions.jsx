import React, { useEffect, useState, useCallback } from "react";
import icon from "../../../assets/wallet.png";
import { useTranslation } from "react-i18next";
import "../seller.css";
import { getWalletTransactionHistory } from "../../../API/seller";

export default function Transactions() {
  const { i18n, t } = useTranslation();
  const isArabic = i18n.language === "ar";

  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    document.title = t("transactionsDocTitle");
  }, [t]);

  useEffect(() => {
    const link = document.querySelector("link[rel~='icon']");
    if (link) {
      link.href = icon;
    } else {
      const newLink = document.createElement("link");
      newLink.rel = "icon";
      newLink.href = icon;
      document.head.appendChild(newLink);
    }
  }, []);

  const loadTransactions = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const data = await getWalletTransactionHistory();
      const list = Array.isArray(data)
        ? data
        : Array.isArray(data?.data)
        ? data.data
        : Array.isArray(data?.Data)
        ? data.Data
        : [];
      setTransactions(list);
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.Message ||
        err?.message ||
        t("failedToLoadTransactions", "Failed to load transactions.");
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  /* ── helpers ── */
  const formatDate = (item) => {
    if (!item?.date) return "-";
    const d = new Date(item.date);
    if (Number.isNaN(d.getTime())) return "-";
    return d.toLocaleDateString(isArabic ? "ar-EG" : "en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatTime = (item) => {
    if (item?.hour == null || item?.minute == null) {
      if (!item?.date) return "-";
      const d = new Date(item.date);
      if (Number.isNaN(d.getTime())) return "-";
      return d.toLocaleTimeString(isArabic ? "ar-EG" : "en-US", {
        hour: "2-digit",
        minute: "2-digit",
      });
    }
    const h = String(item.hour).padStart(2, "0");
    const m = String(item.minute).padStart(2, "0");
    const suffix = item.hour >= 12 ? "PM" : "AM";
    const h12 = item.hour % 12 || 12;
    return `${String(h12).padStart(2, "0")}:${m} ${suffix}`;
  };

  const isPositive = (item) => {
    const type = String(item?.type || "").toLowerCase();
    return (
      type === "deposit" ||
      type === "refund" ||
      type === "topup" ||
      type === "top_up" ||
      type === "credit"
    );
  };

  const formatAmount = (item) => {
    const amount = Number(item?.amount || 0);
    const sign = isPositive(item) ? "+" : "-";
    return `${sign} EGP ${amount.toLocaleString(isArabic ? "ar-EG" : "en-US")}`;
  };

  /* ── group by date ── */
  const grouped = transactions.reduce((acc, item) => {
    const key = formatDate(item);
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});

  /* ── skeleton ── */
  const SkeletonRow = () => (
    <div className="transactions-card" style={{ opacity: 0.6 }}>
      <div className="transactions-card-top">
        <div className="transactions-left">
          <div
            className="transactions-icon-box"
            style={{ background: "#e2e8f0" }}
          />
          <div className="transactions-info">
            <div
              style={{
                width: 120,
                height: 16,
                borderRadius: 6,
                background: "#e2e8f0",
                marginBottom: 6,
              }}
            />
            <div
              style={{
                width: 80,
                height: 12,
                borderRadius: 6,
                background: "#e2e8f0",
              }}
            />
          </div>
        </div>
        <div
          style={{
            width: 80,
            height: 18,
            borderRadius: 6,
            background: "#e2e8f0",
          }}
        />
      </div>
      <div className="transactions-details-grid">
        {[1, 2, 3, 4].map((k) => (
          <div className="transactions-detail-box" key={k}>
            <div
              style={{
                width: "60%",
                height: 12,
                borderRadius: 5,
                background: "#e2e8f0",
                marginBottom: 8,
              }}
            />
            <div
              style={{
                width: "80%",
                height: 14,
                borderRadius: 5,
                background: "#e2e8f0",
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="transactions-page" dir={isArabic ? "rtl" : "ltr"}>
      <div className="container">
        <h1 className="transactions-title">{t("transactionsTitle")}</h1>

        {/* ── Error ── */}
        {error && !loading && (
          <div
            style={{
              background: "#fdecea",
              color: "#b3261e",
              padding: "12px 16px",
              borderRadius: "10px",
              marginBottom: "18px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
            }}
          >
            <span>{error}</span>
            <button
              onClick={loadTransactions}
              style={{
                border: "none",
                background: "none",
                color: "#b3261e",
                fontWeight: 700,
                cursor: "pointer",
                textDecoration: "underline",
                fontSize: 13,
              }}
            >
              {t("retry", "Retry")}
            </button>
          </div>
        )}

        {/* ── Loading skeletons ── */}
        {loading && (
          <div className="transactions-list">
            {[1, 2, 3].map((k) => (
              <SkeletonRow key={k} />
            ))}
          </div>
        )}

        {/* ── Empty ── */}
        {!loading && !error && transactions.length === 0 && (
          <div
            style={{
              textAlign: "center",
              padding: "48px 0",
              color: "#94a3b8",
            }}
          >
            <i
              className="fa-solid fa-receipt"
              style={{ fontSize: 40, marginBottom: 12, display: "block" }}
            />
            {t("noTransactionsYet", "No transactions yet.")}
          </div>
        )}

        {/* ── Grouped transactions ── */}
        {!loading &&
          !error &&
          Object.entries(grouped).map(([date, items]) => (
            <div key={date}>
              <div className="transactions-date-group">{date}</div>
              <div className="transactions-list">
                {items.map((item, index) => {
                  const positive = isPositive(item);
                  return (
                    <div className="transactions-card" key={index}>
                      <div className="transactions-card-top">
                        <div className="transactions-left">
                          <div className="transactions-icon-box">
                            <i
                              className={`fa-solid ${
                                positive ? "fa-arrow-down" : "fa-arrow-up"
                              }`}
                            />
                          </div>
                          <div className="transactions-info">
                            <h3>{item.type || t("transaction", "Transaction")}</h3>
                            <p>{formatDate(item)}</p>
                          </div>
                        </div>
                        <div
                          className={`transactions-amount ${
                            positive
                              ? "transactions-amount-positive"
                              : "transactions-amount-negative"
                          }`}
                        >
                          {formatAmount(item)}
                        </div>
                      </div>

                      <div className="transactions-details-grid">
                        <div className="transactions-detail-box">
                          <span>{t("date", "Date")}</span>
                          <strong>{formatDate(item)}</strong>
                        </div>
                        <div className="transactions-detail-box">
                          <span>{t("time", "Time")}</span>
                          <strong>{formatTime(item)}</strong>
                        </div>
                        <div className="transactions-detail-box">
                          <span>{t("type", "Type")}</span>
                          <strong>{item.type || "-"}</strong>
                        </div>
                        <div className="transactions-detail-box">
                          <span>{t("amount", "Amount")}</span>
                          <strong
                            className={
                              positive
                                ? "transactions-status-completed"
                                : "transactions-status-pending"
                            }
                          >
                            {formatAmount(item)}
                          </strong>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}