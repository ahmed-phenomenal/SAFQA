import React, { useEffect, useState } from "react";
import icon from "../../../assets/wallet.png";
import { useTranslation } from "react-i18next";
import "../seller.css";

export default function Transactions() {
  const { i18n, t } = useTranslation();
  const isArabic = i18n.language === "ar";

  const [transactions] = useState([
    {
      id: "TX-1001",
      titleKey: "cashWithdrawal",
      date: "13 Apr, 2025",
      time: "10:30 AM",
      methodKey: "visa",
      statusKey: "completed",
      amount: "- $20,129",
      type: "negative",
    },
    {
      id: "TX-1002",
      titleKey: "cashDeposit",
      date: "13 Apr, 2025",
      time: "01:15 PM",
      methodKey: "walletTopUp",
      statusKey: "completed",
      amount: "+ $20,129",
      type: "positive",
    },
    {
      id: "TX-1003",
      titleKey: "auctionDeposit",
      date: "13 Apr, 2025",
      time: "04:20 PM",
      methodKey: "masterCard",
      statusKey: "pending",
      amount: "- $20,129",
      type: "negative",
    },
    {
      id: "TX-1004",
      titleKey: "refund",
      date: "14 Apr, 2025",
      time: "11:00 AM",
      methodKey: "walletRefund",
      statusKey: "completed",
      amount: "+ $5,000",
      type: "positive",
    },
  ]);

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

  return (
    <div className="transactions-page" dir={isArabic ? "rtl" : "ltr"}>
      <div className="container">
        <h1 className="transactions-title">{t("transactionsTitle")}</h1>

        <div className="transactions-date-group">
          {isArabic ? "13 أبريل 2025" : "13 April 2025"}
        </div>

        <div className="transactions-list">
          {transactions.map((item) => (
            <div className="transactions-card" key={item.id}>
              <div className="transactions-card-top">
                <div className="transactions-left">
                  <div className="transactions-icon-box">
                    <i
                      className={`fa-solid ${
                        item.type === "positive" ? "fa-arrow-down" : "fa-arrow-up"
                      }`}
                    ></i>
                  </div>

                  <div className="transactions-info">
                    <h3>{t(item.titleKey)}</h3>
                    <p>{item.date}</p>
                  </div>
                </div>

                <div
                  className={`transactions-amount ${
                    item.type === "positive"
                      ? "transactions-amount-positive"
                      : "transactions-amount-negative"
                  }`}
                >
                  {item.amount}
                </div>
              </div>

              <div className="transactions-details-grid">
                <div className="transactions-detail-box">
                  <span>ID</span>
                  <strong>{item.id}</strong>
                </div>

                <div className="transactions-detail-box">
                  <span>{t("time")}</span>
                  <strong>{item.time}</strong>
                </div>

                <div className="transactions-detail-box">
                  <span>{t("method")}</span>
                  <strong>{t(item.methodKey, { defaultValue: item.methodKey })}</strong>
                </div>

                <div className="transactions-detail-box">
                  <span>{t("status")}</span>
                  <strong
                    className={
                      item.statusKey === "completed"
                        ? "transactions-status-completed"
                        : "transactions-status-pending"
                    }
                  >
                    {t(item.statusKey)}
                  </strong>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}