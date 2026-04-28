import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import icon from "../../assets/2.png";

export default function Tracking() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === "ar";

  const tr = (key, fallback) => {
    const value = t(key);
    return value === key ? fallback : value;
  };

  const TOTAL_SECONDS = 10;

  const [timeLeft, setTimeLeft] = useState(TOTAL_SECONDS);
  const [popupType, setPopupType] = useState("");

  const steps = [
    {
      key: "waiting",
      label: tr("trackingWaitingSeller", "Waiting for seller"),
      colorClass: "yellow",
    },
    {
      key: "negotiation",
      label: tr("trackingNegotiation", "Negotiation"),
      colorClass: "orange",
    },
    {
      key: "admin",
      label: tr("trackingAdminReview", "Admin Review"),
      colorClass: "red",
    },
    {
      key: "resolved",
      label: tr("trackingResolved", "Resolved"),
      colorClass: "green",
    },
  ];

  useEffect(() => {
    document.title = tr("trackingDocTitle", "Track Status");
  }, [i18n.language]);

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
    if (timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }

        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft]);

  const formatTime = (seconds) => {
    const d = Math.floor(seconds / (24 * 60 * 60));
    const h = Math.floor((seconds % (24 * 60 * 60)) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);

    return `${String(d).padStart(2, "0")}${tr("dayShort", "d")} : ${String(
      h
    ).padStart(2, "0")}${tr("hourShort", "h")} : ${String(m).padStart(
      2,
      "0"
    )}${tr("minuteShort", "m")} : ${String(s).padStart(2, "0")}${tr(
      "secondShort",
      "s"
    )}`;
  };

  const trackingData = useMemo(() => {
    const elapsed = TOTAL_SECONDS - timeLeft;
    const progressPercent = (elapsed / TOTAL_SECONDS) * 100;

    let activeStep = 0;
    let message = tr("sellerStillNeedsReply", "Seller still needs to reply.");

    if (timeLeft === 0) {
      activeStep = 3;
      message = tr("caseResolved", "Case resolved.");
    } else if (progressPercent < 33.3333) {
      activeStep = 0;
      message = tr("sellerStillNeedsReply", "Seller still needs to reply.");
    } else if (progressPercent < 66.6666) {
      activeStep = 1;
      message = tr("negotiationInProgress", "Negotiation is in progress.");
    } else {
      activeStep = 2;
      message = tr("adminReviewInProgress", "Admin review is in progress.");
    }

    return {
      activeStep,
      message,
      progressPercent: Math.min(progressPercent, 100),
      countdown: formatTime(timeLeft),
      isResolved: timeLeft === 0,
    };
  }, [timeLeft, i18n.language]);

  const closePopup = () => {
    setPopupType("");
  };

  const isCancelPopup =
    popupType === "cancel" || popupType === "success-cancel";

  return (
    <div className="dispute-tracking-page" dir={isArabic ? "rtl" : "ltr"}>
      <style>{`
        .dispute-tracking-page {
          min-height: 100vh;
          background: #f4f7fb;
          padding: 44px 16px;
          font-family: Arial, Helvetica, sans-serif;
          display: flex;
          justify-content: center;
          align-items: flex-start;
        }

        .dispute-tracking-page * {
          box-sizing: border-box;
        }

        .dispute-tracking-card {
          width: 90%;
          max-width: 1180px;
          min-height: 520px;
          background: #ffffff;
          border-radius: 24px;
          padding: 48px 56px 42px;
          border: 1px solid #e4eaf3;
          box-shadow: 0 18px 48px rgba(15, 23, 42, 0.08);
        }

        .dispute-tracking-header {
          display: flex;
          align-items: center;
          gap: 22px;
          margin-bottom: 56px;
        }

        .dispute-tracking-back {
          width: 44px;
          height: 44px;
          border: none;
          background: transparent;
          color: #0b3a82;
          cursor: pointer;
          font-size: 34px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          padding: 0;
        }

        .dispute-tracking-title {
          margin: 0;
          color: #0b3a82;
          font-size: 42px;
          font-weight: 900;
          letter-spacing: 0.7px;
          text-transform: uppercase;
          font-family: Georgia, "Times New Roman", serif;
        }

        .dispute-progress-wrap {
          margin: 0 auto 64px;
          width: 100%;
          max-width: 980px;
        }

        .dispute-progress-labels {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 18px;
          margin-bottom: 24px;
        }

        .dispute-progress-label {
          font-size: 17px;
          font-weight: 900;
          line-height: 1.3;
          text-align: center;
          color: #a5acb8;
          white-space: nowrap;
        }

        .dispute-progress-label.active,
        .dispute-progress-label.done {
          color: #111827;
        }

        .dispute-progress-line-area {
          position: relative;
          height: 54px;
        }

        .dispute-progress-line-base {
          position: absolute;
          left: 38px;
          right: 38px;
          top: 25px;
          height: 5px;
          background: #d7dce5;
          border-radius: 999px;
        }

        .dispute-progress-line-fill {
          position: absolute;
          left: 38px;
          top: 25px;
          height: 5px;
          width: 0;
          background: linear-gradient(90deg, #f3c948 0%, #ff9433 45%, #ef4444 85%);
          border-radius: 999px;
          transition: width 0.4s ease;
        }

        .dispute-progress-line-fill.resolved {
          background: linear-gradient(90deg, #f3c948 0%, #ff9433 35%, #ef4444 65%, #22c55e 100%);
        }

        .dispute-progress-dots {
          position: absolute;
          left: 0;
          right: 0;
          top: 9px;
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          align-items: center;
          justify-items: center;
        }

        .dispute-progress-dot {
          width: 34px;
          height: 34px;
          border-radius: 50%;
          border: 4px solid #fff;
          box-shadow: 0 3px 12px rgba(0, 0, 0, 0.18);
          background: #d1d5db;
          transition: transform 0.3s ease, background 0.3s ease;
        }

        .dispute-progress-dot.done,
        .dispute-progress-dot.active {
          transform: scale(1.05);
        }

        .dispute-progress-dot.yellow.done,
        .dispute-progress-dot.yellow.active {
          background: #f3c948;
        }

        .dispute-progress-dot.orange.done,
        .dispute-progress-dot.orange.active {
          background: #ff9433;
        }

        .dispute-progress-dot.red.done,
        .dispute-progress-dot.red.active {
          background: #ef4444;
        }

        .dispute-progress-dot.green.done,
        .dispute-progress-dot.green.active,
        .dispute-progress-dot.resolved {
          background: #22c55e;
        }

        .dispute-status-box {
          text-align: center;
          margin-bottom: 54px;
        }

        .dispute-status-text {
          margin: 0 0 20px;
          color: #6b7280;
          font-size: 26px;
          font-weight: 800;
        }

        .dispute-countdown {
          margin: 0;
          color: #020617;
          font-size: 46px;
          font-weight: 900;
          letter-spacing: 1px;
        }

        .dispute-actions {
          width: 100%;
          max-width: 980px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .dispute-chat-btn {
          width: 100%;
          border: none;
          background: #0b4aa2;
          color: #fff;
          text-decoration: none;
          padding: 20px 22px;
          border-radius: 12px;
          font-size: 18px;
          font-weight: 900;
          cursor: pointer;
          transition: 0.25s ease;
        }

        .dispute-chat-btn:hover {
          background: #083b82;
        }

        .dispute-bottom-actions {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 22px;
        }

        .dispute-escalate-btn,
        .dispute-cancel-btn {
          border: none;
          padding: 20px 20px;
          border-radius: 12px;
          font-size: 18px;
          font-weight: 900;
          cursor: pointer;
          transition: 0.25s ease;
        }

        .dispute-escalate-btn {
          background: #eaf2ff;
          color: #0b4aa2;
        }

        .dispute-escalate-btn:hover {
          background: #d8e7ff;
        }

        .dispute-cancel-btn {
          background: #c81e1e;
          color: #fff;
        }

        .dispute-cancel-btn:hover {
          background: #a91515;
        }

        .dispute-popup-overlay {
          position: fixed;
          inset: 0;
          background: rgba(15, 23, 42, 0.45);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          z-index: 9999;
        }

        .dispute-popup-box {
          width: 100%;
          max-width: 520px;
          background: #fff;
          border-radius: 20px;
          padding: 34px 28px 28px;
          position: relative;
          box-shadow: 0 16px 40px rgba(0, 0, 0, 0.2);
        }

        .dispute-popup-close {
          position: absolute;
          top: 12px;
          right: 14px;
          width: 38px;
          height: 38px;
          border: none;
          border-radius: 50%;
          background: transparent;
          font-size: 30px;
          cursor: pointer;
          line-height: 1;
        }

        .dispute-popup-title {
          margin: 0 0 14px;
          font-size: 26px;
          font-weight: 900;
          text-align: center;
          color: #111827;
        }

        .dispute-popup-text {
          margin: 0;
          font-size: 17px;
          line-height: 1.7;
          color: #4b5563;
          text-align: center;
        }

        .dispute-popup-actions {
          display: flex;
          justify-content: center;
          gap: 14px;
          margin-top: 26px;
          flex-wrap: wrap;
        }

        .dispute-popup-actions-center {
          justify-content: center;
        }

        .dispute-popup-btn {
          min-width: 130px;
          border: none;
          border-radius: 12px;
          padding: 14px 20px;
          font-size: 15px;
          font-weight: 900;
          cursor: pointer;
        }

        .dispute-popup-btn.no {
          background: #eef2f7;
          color: #374151;
        }

        .dispute-popup-btn.yes-cancel {
          background: #c81e1e;
          color: #fff;
        }

        .dispute-popup-btn.yes-escalate {
          background: #0b4aa2;
          color: #fff;
        }

        .dispute-success-icon {
          width: 78px;
          height: 78px;
          border-radius: 50%;
          margin: 0 auto 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 38px;
          font-weight: 900;
          color: #fff;
        }

        .dispute-success-icon.cancel {
          background: #c81e1e;
        }

        .dispute-success-icon.escalate {
          background: #0b4aa2;
        }

        @media (max-width: 900px) {
          .dispute-tracking-card {
            width: 94%;
            padding: 36px 28px 34px;
          }

          .dispute-tracking-title {
            font-size: 34px;
          }

          .dispute-progress-label {
            font-size: 14px;
          }

          .dispute-status-text {
            font-size: 21px;
          }

          .dispute-countdown {
            font-size: 36px;
          }
        }

        @media (max-width: 640px) {
          .dispute-tracking-page {
            padding: 18px 12px 30px;
            background: #ffffff;
          }

          .dispute-tracking-card {
            width: 100%;
            min-height: auto;
            padding: 18px 14px 18px;
            border-radius: 14px;
            box-shadow: none;
            border: 1px solid #eef2f7;
          }

          .dispute-tracking-header {
            margin-bottom: 22px;
            gap: 12px;
          }

          .dispute-tracking-back {
            width: 28px;
            height: 28px;
            font-size: 18px;
          }

          .dispute-tracking-title {
            font-size: 20px;
          }

          .dispute-progress-wrap {
            margin-bottom: 28px;
          }

          .dispute-progress-label {
            font-size: 10px;
            white-space: normal;
          }

          .dispute-progress-line-base {
            left: 16px;
            right: 16px;
          }

          .dispute-progress-line-fill {
            left: 16px;
          }

          .dispute-progress-dot {
            width: 22px;
            height: 22px;
            border-width: 3px;
          }

          .dispute-status-text {
            font-size: 14px;
            margin-bottom: 10px;
          }

          .dispute-countdown {
            font-size: 20px;
          }

          .dispute-actions {
            gap: 12px;
          }

          .dispute-chat-btn,
          .dispute-escalate-btn,
          .dispute-cancel-btn {
            font-size: 13px;
            padding: 12px;
            border-radius: 8px;
          }

          .dispute-bottom-actions {
            gap: 8px;
          }
        }
      `}</style>

      <div className="dispute-tracking-card">
        <div className="dispute-tracking-header">
          <button
            type="button"
            className="dispute-tracking-back"
            onClick={() => navigate(-1)}
            aria-label={tr("back", "Back")}
          >
            <i
              className={`fa-solid ${
                isArabic ? "fa-angle-right" : "fa-angle-left"
              }`}
            ></i>
          </button>

          <h2 className="dispute-tracking-title">
            {tr("trackStatus", "Track Status")}
          </h2>
        </div>

        <div className="dispute-progress-wrap">
          <div className="dispute-progress-labels">
            {steps.map((step, index) => (
              <div
                key={step.key}
                className={`dispute-progress-label ${
                  trackingData.activeStep === index ? "active" : ""
                } ${
                  trackingData.activeStep > index || trackingData.isResolved
                    ? "done"
                    : ""
                }`}
              >
                {step.label}
              </div>
            ))}
          </div>

          <div className="dispute-progress-line-area">
            <div className="dispute-progress-line-base"></div>

            <div
              className={`dispute-progress-line-fill ${
                trackingData.isResolved ? "resolved" : ""
              }`}
              style={{ width: `${trackingData.progressPercent}%` }}
            ></div>

            <div className="dispute-progress-dots">
              {steps.map((step, index) => {
                const isDone = trackingData.activeStep > index;
                const isActive = trackingData.activeStep === index;

                return (
                  <div
                    key={step.key}
                    className={`dispute-progress-dot ${step.colorClass} ${
                      isDone ? "done" : ""
                    } ${isActive ? "active" : ""} ${
                      trackingData.isResolved && index === 3 ? "resolved" : ""
                    }`}
                    title={step.label}
                  ></div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="dispute-status-box">
          <p className="dispute-status-text">{trackingData.message}</p>
          <h3 className="dispute-countdown">{trackingData.countdown}</h3>
        </div>

        <div className="dispute-actions">
          <button type="button" className="dispute-chat-btn">
            {tr("chatWithSeller", "Chat with seller")}
          </button>

          <div className="dispute-bottom-actions">
            <button
              type="button"
              className="dispute-escalate-btn"
              onClick={() => setPopupType("escalate")}
            >
              {tr("escalate", "Escalate")}
            </button>

            <button
              type="button"
              className="dispute-cancel-btn"
              onClick={() => setPopupType("cancel")}
            >
              {tr("cancelDispute", "Cancel dispute")}
            </button>
          </div>
        </div>
      </div>

      {(popupType === "cancel" || popupType === "escalate") && (
        <div className="dispute-popup-overlay" onClick={closePopup}>
          <div
            className="dispute-popup-box"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="dispute-popup-close"
              onClick={closePopup}
            >
              ×
            </button>

            <h3 className="dispute-popup-title">
              {popupType === "cancel"
                ? tr("cancelDispute", "Cancel dispute")
                : tr("escalateCase", "Escalate case")}
            </h3>

            <p className="dispute-popup-text">
              {popupType === "cancel"
                ? tr(
                    "cancelDisputeConfirm",
                    "Are you sure you want to cancel this dispute?"
                  )
                : tr(
                    "escalateCaseConfirm",
                    "Are you sure you want to escalate this case?"
                  )}
            </p>

            <div className="dispute-popup-actions">
              <button
                type="button"
                className="dispute-popup-btn no"
                onClick={closePopup}
              >
                {tr("no", "No")}
              </button>

              <button
                type="button"
                className={`dispute-popup-btn ${
                  popupType === "cancel" ? "yes-cancel" : "yes-escalate"
                }`}
                onClick={() =>
                  setPopupType(
                    popupType === "cancel"
                      ? "success-cancel"
                      : "success-escalate"
                  )
                }
              >
                {tr("yes", "Yes")}
              </button>
            </div>
          </div>
        </div>
      )}

      {(popupType === "success-cancel" ||
        popupType === "success-escalate") && (
        <div className="dispute-popup-overlay" onClick={closePopup}>
          <div
            className="dispute-popup-box"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="dispute-popup-close"
              onClick={closePopup}
            >
              ×
            </button>

            <div
              className={`dispute-success-icon ${
                isCancelPopup ? "cancel" : "escalate"
              }`}
            >
              ✓
            </div>

            <h3 className="dispute-popup-title">
              {popupType === "success-cancel"
                ? tr("disputeCancelled", "Dispute cancelled")
                : tr("caseEscalated", "Case escalated")}
            </h3>

            <p className="dispute-popup-text">
              {popupType === "success-cancel"
                ? tr(
                    "disputeCancelledSuccess",
                    "Your dispute has been cancelled successfully."
                  )
                : tr(
                    "caseEscalatedSuccess",
                    "Your case has been escalated successfully."
                  )}
            </p>

            <div className="dispute-popup-actions dispute-popup-actions-center">
              <button
                type="button"
                className={`dispute-popup-btn ${
                  isCancelPopup ? "yes-cancel" : "yes-escalate"
                }`}
                onClick={closePopup}
              >
                {tr("ok", "OK")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}