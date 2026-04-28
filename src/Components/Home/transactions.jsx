import React, { useEffect, useState } from "react";
import icon from "../../assets/2.png";
import { useTranslation } from "react-i18next";
import { getUserWalletTransactionHistory } from "../../API/userWallet";

export default function Transactions() {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === "ar";

  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

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

  useEffect(() => {
    let mounted = true;

    const loadTransactions = async () => {
      try {
        setLoading(true);
        const data = await getUserWalletTransactionHistory();
        if (!mounted) return;
        setTransactions(Array.isArray(data) ? data : []);
      } catch {
        if (!mounted) return;
        setTransactions([]);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadTransactions();

    return () => {
      mounted = false;
    };
  }, []);

  const formatTransactionDate = (item) => {
    if (!item?.date) return "-";
    const d = new Date(item.date);
    if (Number.isNaN(d.getTime())) return "-";
    return d.toLocaleDateString(isArabic ? "ar-EG" : "en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatTransactionTime = (item) => {
    if (!item?.date) return "-";
    const d = new Date(item.date);
    if (Number.isNaN(d.getTime())) return "-";
    return d.toLocaleTimeString(isArabic ? "ar-EG" : undefined, {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatAmount = (item) => {
    const amount = Number(item?.amount || 0);
    const isDeposit = String(item?.type || "").toLowerCase() === "deposit";
    return `${isDeposit ? "+" : "-"} $${amount.toLocaleString()}`;
  };

  const getTransactionTypeLabel = (type) => {
    const value = String(type || "").toLowerCase();
    if (value === "deposit") return t("deposit");
    if (value === "withdraw" || value === "withdrawal") return t("withdrawTitle");
    return type || t("transaction");
  };

  const getStatusLabel = (status) => {
    const value = String(status || "").toLowerCase();
    if (value === "completed") return t("completed");
    if (value === "pending") return t("pending");
    return status || t("pending");
  };

  return (
    <div className="transactions-page" dir={isArabic ? "rtl" : "ltr"}>
      <div className="container">
        <h1 className="transactions-title">{t("transactionsTitle")}</h1>

        {loading ? (
          <div className="transactions-list">
            <div className="transactions-card">
              <div className="transactions-card-top">
                <div className="transactions-info">
                  <h3>{t("loadingTransactions")}</h3>
                </div>
              </div>
            </div>
          </div>
        ) : transactions.length > 0 ? (
          <div className="transactions-list">
            {transactions.map((item, index) => {
              const isPositive =
                String(item?.type || "").toLowerCase() === "deposit";

              return (
                <div className="transactions-card" key={item.id || index}>
                  <div className="transactions-card-top">
                    <div className="transactions-left">
                      <div className="transactions-icon-box">
                        <i
                          className={`fa-solid ${
                            isPositive ? "fa-arrow-down" : "fa-arrow-up"
                          }`}
                        ></i>
                      </div>

                      <div className="transactions-info">
                        <h3>{getTransactionTypeLabel(item?.type)}</h3>
                        <p>{formatTransactionDate(item)}</p>
                      </div>
                    </div>

                    <div
                      className={`transactions-amount ${
                        isPositive
                          ? "transactions-amount-positive"
                          : "transactions-amount-negative"
                      }`}
                    >
                      {formatAmount(item)}
                    </div>
                  </div>

                  <div className="transactions-details-grid">
                    <div className="transactions-detail-box">
                      <span>{t("id")}</span>
                      <strong>{item?.id || "-"}</strong>
                    </div>

                    <div className="transactions-detail-box">
                      <span>{t("time")}</span>
                      <strong>{formatTransactionTime(item)}</strong>
                    </div>

                    <div className="transactions-detail-box">
                      <span>{t("method")}</span>
                      <strong>{item?.method || "-"}</strong>
                    </div>

                    <div className="transactions-detail-box">
                      <span>{t("status")}</span>
                      <strong
                        className={
                          String(item?.status || "").toLowerCase() === "completed"
                            ? "transactions-status-completed"
                            : "transactions-status-pending"
                        }
                      >
                        {getStatusLabel(item?.status)}
                      </strong>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="transactions-list">
            <div className="transactions-card">
              <div className="transactions-card-top">
                <div className="transactions-info">
                  <h3>{t("noTransactionsYet")}</h3>
                  <p>-</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}