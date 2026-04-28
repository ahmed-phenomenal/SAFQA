import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import icon from "../../../assets/2.png";
import "../seller.css";

const OTP_WINDOW_MS = 10 * 60 * 1000;

const pad6 = (value) => String(value).padStart(6, "0").slice(-6);

const getOtpWindowStart = () =>
  Math.floor(Date.now() / OTP_WINDOW_MS) * OTP_WINDOW_MS;

const hashStringTo6Digits = (input) => {
  let hash = 0;
  const str = String(input || "");

  for (let i = 0; i < str.length; i += 1) {
    hash = (hash * 31 + str.charCodeAt(i)) % 1000000;
  }

  return pad6(Math.abs(hash));
};

const getOrderAccessKey = (order) => {
  return hashStringTo6Digits(
    `${order.id}|${order.customerEmail}|${order.item}|access`
  );
};

const getOrderOtp = (order, windowStart) => {
  return hashStringTo6Digits(
    `${order.id}|${order.customerEmail}|${order.item}|${windowStart}|otp`
  );
};

const getRemainingMs = () => {
  const now = Date.now();
  const nextWindow = Math.ceil(now / OTP_WINDOW_MS) * OTP_WINDOW_MS;
  return Math.max(0, nextWindow - now);
};

const formatTime = (ms) => {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(
    2,
    "0"
  )}`;
};

const TimerCircle = ({ remainingMs, t }) => {
  const progress = remainingMs / OTP_WINDOW_MS;
  const radius = 26;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - progress);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        marginTop: 16,
        flexWrap: "wrap",
      }}
    >
      <div
        style={{
          position: "relative",
          width: 64,
          height: 64,
          flexShrink: 0,
        }}
      >
        <svg width="64" height="64" viewBox="0 0 64 64">
          <circle
            cx="32"
            cy="32"
            r={radius}
            fill="none"
            stroke="#e6edf8"
            strokeWidth="6"
          />
          <circle
            cx="32"
            cy="32"
            r={radius}
            fill="none"
            stroke="#0b4aa2"
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            transform="rotate(-90 32 32)"
          />
        </svg>

        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 11,
            fontWeight: 800,
            color: "#0b4aa2",
          }}
        >
          {formatTime(remainingMs)}
        </div>
      </div>

      <div>
        <div
          style={{
            fontSize: 13,
            fontWeight: 800,
            color: "#0b4aa2",
            marginBottom: 4,
          }}
        >
          {t("deliveryOtpRefreshTimer")}
        </div>
        <div
          style={{
            fontSize: 13,
            color: "#6b7280",
            lineHeight: 1.6,
          }}
        >
          {t("currentOtpValidText")}
        </div>
      </div>
    </div>
  );
};

export default function Seller_Shipping_Orders() {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === "ar";

  const [remainingMs, setRemainingMs] = useState(getRemainingMs());

  const [orders] = useState([
    {
      id: "#SH-1024",
      customerName: "Mona Adel",
      customerPhone: "+20 100 234 5678",
      customerEmail: "monaadel@email.com",
      item: "Vintage Camera",
      quantity: 1,
      price: "$220",
      paymentMethod: "Cash on Delivery",
      city: "Cairo",
      area: "Nasr City",
      address: "Building 12, Street 15, Nasr City, Cairo",
      orderDate: "12 May 2025",
      shippingDate: "13 May 2025",
      status: "Ready to ship",
      notes: "Please call before delivery.",
    },
    {
      id: "#SH-1025",
      customerName: "Karim Nabil",
      customerPhone: "+20 109 876 5432",
      customerEmail: "karimnabil@email.com",
      item: "Gaming Headset",
      quantity: 2,
      price: "$140",
      paymentMethod: "Visa",
      city: "Giza",
      area: "Dokki",
      address: "22 Tahrir Street, Dokki, Giza",
      orderDate: "13 May 2025",
      shippingDate: "14 May 2025",
      status: "Packed",
      notes: "Fragile item, handle carefully.",
    },
    {
      id: "#SH-1026",
      customerName: "Salma Hany",
      customerPhone: "+20 111 456 7812",
      customerEmail: "salmahany@email.com",
      item: "Smart Watch",
      quantity: 1,
      price: "$175",
      paymentMethod: "Wallet",
      city: "Alexandria",
      area: "Smouha",
      address: "8 Ibrahimia Road, Smouha, Alexandria",
      orderDate: "14 May 2025",
      shippingDate: "15 May 2025",
      status: "Waiting courier pickup",
      notes: "Customer prefers evening delivery.",
    },
  ]);

  useEffect(() => {
    document.title = t("sellerShippingOrdersDocTitle");
  }, [t]);

  useEffect(() => {
    const link = document.querySelector("link[rel~='icon']");
    if (link) link.href = icon;
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setRemainingMs(getRemainingMs());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const ordersWithCodes = useMemo(() => {
    const windowStart = getOtpWindowStart();

    return orders.map((order) => {
      const accessKey = getOrderAccessKey(order);
      const otp = getOrderOtp(order, windowStart);

      const payload = {
        ...order,
        accessKey,
        otp,
        windowStart,
      };

      localStorage.setItem(
        `delivery_order_${accessKey}`,
        JSON.stringify(payload)
      );

      return payload;
    });
  }, [orders, remainingMs]);

  return (
    <div className="seller-profile" dir={isArabic ? "rtl" : "ltr"}>
      <div className="seller-profile-container">
        <h1 className="seller-profile-title">{t("shippingOrdersTitle")}</h1>

        <Link to="/seller-profile" className="seller-profile-link-card">
          <div className="seller-profile-card seller-shipping-back-card">
            <span>
              <i
                className={`fa-solid ${
                  isArabic ? "fa-arrow-right" : "fa-arrow-left"
                }`}
                style={{ marginInlineEnd: 10 }}
              ></i>
              {t("backToProfile")}
            </span>
          </div>
        </Link>

        {ordersWithCodes.map((order) => (
          <div
            className="seller-profile-card seller-shipping-order-full-card"
            key={order.id}
          >
            <div className="seller-shipping-order-top">
              <h3>{order.id}</h3>
              <span className="seller-shipping-status">{order.status}</span>
            </div>

            <div className="seller-shipping-grid">
              <div className="seller-shipping-info-box">
                <h4>{t("clientDetails")}</h4>
                <p>
                  <span>{t("name")}:</span> {order.customerName}
                </p>
                <p>
                  <span>{t("phone")}:</span> {order.customerPhone}
                </p>
                <p>
                  <span>{t("email")}:</span> {order.customerEmail}
                </p>
              </div>

              <div className="seller-shipping-info-box">
                <h4>{t("orderDetails")}</h4>
                <p>
                  <span>{t("item")}:</span> {order.item}
                </p>
                <p>
                  <span>{t("quantity")}:</span> {order.quantity}
                </p>
                <p>
                  <span>{t("totalPrice")}:</span> {order.price}
                </p>
                <p>
                  <span>{t("payment")}:</span> {order.paymentMethod}
                </p>
              </div>

              <div className="seller-shipping-info-box">
                <h4>{t("shippingDetails")}</h4>
                <p>
                  <span>{t("city")}:</span> {order.city}
                </p>
                <p>
                  <span>{t("area")}:</span> {order.area}
                </p>
                <p>
                  <span>{t("address")}:</span> {order.address}
                </p>
              </div>

              <div className="seller-shipping-info-box">
                <h4>{t("datesNotes")}</h4>
                <p>
                  <span>{t("orderDate")}:</span> {order.orderDate}
                </p>
                <p>
                  <span>{t("shippingDate")}:</span> {order.shippingDate}
                </p>
                <p>
                  <span>{t("notes")}:</span> {order.notes}
                </p>
              </div>
            </div>

            <div
              style={{
                marginTop: 18,
                padding: 16,
                borderRadius: 14,
                background: "#f7faff",
                border: "1px solid #d9e6fb",
              }}
            >
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 800,
                  color: "#0b4aa2",
                  marginBottom: 10,
                }}
              >
                {t("deliveryAccess")}
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                  gap: 10,
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: 12,
                      color: "#6b7280",
                      marginBottom: 4,
                    }}
                  >
                    {t("route")}
                  </div>
                  <div style={{ fontWeight: 800, color: "#111827" }}>
                    {`${window.location.origin}/delivery${order.accessKey}`}
                  </div>
                </div>

                <div>
                  <div
                    style={{
                      fontSize: 12,
                      color: "#6b7280",
                      marginBottom: 4,
                    }}
                  >
                    {t("otp")}
                  </div>
                  <div
                    style={{
                      fontWeight: 900,
                      color: "#0b4aa2",
                      fontSize: 20,
                    }}
                  >
                    {order.otp}
                  </div>
                </div>
              </div>

              <TimerCircle remainingMs={remainingMs} t={t} />
            </div>

            <div className="seller-shipping-actions">
              <button className="seller-profile-btn-light">
                {t("viewDetails")}
              </button>
              <button className="seller-profile-btn-main">
                {t("markShipped")}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}