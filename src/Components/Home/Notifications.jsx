import { useState, useEffect } from "react";
import icon from "../../assets/2.png";
import Navbar from "../Sign-in/Navbar";
import { useTranslation } from "react-i18next";

export default function Notifications() {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === "ar";

  const tr = (key, fallback) => {
    const value = t(key);
    return value === key ? fallback : value;
  };

  const [title] = useState("Notifications");
  const [favicon] = useState(icon);

  useEffect(() => {
    document.title = tr("notificationsDocTitle", title);
  }, [i18n.language, title]);

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

  const notifications = [
    {
      id: 1,
      time: tr("notificationTime5", "5 min ago"),
      title: tr("auctionReminder", "Auction Reminder"),
      description: tr(
        "auctionReminderDesc",
        "Your auction is ending soon. Check the latest bidding activity before it ends."
      ),
      iconClass: "fa-solid fa-check",
    },
    {
      id: 2,
      time: tr("notificationTime10", "10 min ago"),
      title: tr("newAuctions", "New Auctions"),
      description: tr(
        "newAuctionsDesc",
        "New auctions are available now. Explore the latest deals and start bidding."
      ),
      iconClass: "fa-solid fa-gavel",
    },
    {
      id: 3,
      time: tr("notificationTime15", "15 min ago"),
      title: tr("auctionReminder", "Auction Reminder"),
      description: tr(
        "auctionReminderDesc",
        "Your auction is ending soon. Check the latest bidding activity before it ends."
      ),
      iconClass: "fa-solid fa-calendar",
    },
    {
      id: 4,
      time: tr("notificationTime25", "25 min ago"),
      title: tr("orderOnTheWay", "Your order is on the way"),
      description: tr(
        "orderOnTheWayDesc",
        "Your order has been shipped and is currently on the way to you."
      ),
      iconClass: "fa-solid fa-truck",
    },
    {
      id: 5,
      time: tr("notificationTime30", "30 min ago"),
      title: tr("newAuctions", "New Auctions"),
      description: tr(
        "newAuctionsDesc",
        "New auctions are available now. Explore the latest deals and start bidding."
      ),
      iconClass: "fa-solid fa-gavel",
    },
    {
      id: 6,
      time: tr("notificationTime45", "45 min ago"),
      title: tr("auctionReminder", "Auction Reminder"),
      description: tr(
        "auctionReminderDesc",
        "Your auction is ending soon. Check the latest bidding activity before it ends."
      ),
      iconClass: "fa-solid fa-bell",
    },
    {
      id: 7,
      time: tr("notificationTime1h", "1 hour ago"),
      title: tr("orderUpdate", "Order Update"),
      description: tr(
        "orderUpdateDesc",
        "There is a new update on your order. Open your orders page for more details."
      ),
      iconClass: "fa-solid fa-box",
    },
  ];

  return (
    <>
      <Navbar />

      <div className="notifications" dir={isArabic ? "rtl" : "ltr"}>
        <div className="container">
          <h1>{tr("notificationsTitle", "Notifications")}</h1>

          {notifications.map((item) => (
            <div className="notification-card" key={item.id}>
              <span className="notification-time">{item.time}</span>

              <div className="notification-icon">
                <i className={item.iconClass}></i>
              </div>

              <div className="notification-content">
                <h4>{item.title}</h4>
                <p>{item.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}