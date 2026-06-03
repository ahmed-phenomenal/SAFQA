import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import icon from "../../../assets/2.png";
import { getSellerDisplayProfile } from "../../../API/seller";

const DELIVERY_APP_URL = "https://safqa-navy.vercel.app/delivery";

export default function SellerDelivery() {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === "ar";

  const [sellerEmail, setSellerEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState("");
  const [error, setError] = useState("");

  const deliveryLink = useMemo(() => DELIVERY_APP_URL, []);

  useEffect(() => {
    document.title = t("deliveryApp", { defaultValue: "Delivery App" });

    const link = document.querySelector("link[rel~='icon']");
    if (link) {
      link.href = icon;
    }
  }, [t]);

  useEffect(() => {
    let mounted = true;

    const loadProfile = async () => {
      try {
        setLoading(true);
        setError("");

        const data = await getSellerDisplayProfile();

        if (!mounted) return;

        setSellerEmail(data?.email || "");
      } catch {
        if (!mounted) return;
        setSellerEmail("");
        setError(
          t("failedToLoadSellerProfile", {
            defaultValue: "Failed to load seller profile.",
          })
        );
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadProfile();

    return () => {
      mounted = false;
    };
  }, [t]);

  useEffect(() => {
    if (!copied && !error) return;

    const timer = setTimeout(() => {
      setCopied("");
      setError("");
    }, 15000);

    return () => clearTimeout(timer);
  }, [copied, error]);

  const copyText = async (text, label) => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = text;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }

      setCopied(label);
      setError("");
    } catch {
      setCopied("");
      setError(
        t("copyFailed", {
          defaultValue: "Copy failed. Please copy manually.",
        })
      );
    }
  };

  return (
    <div className="seller-delivery-page" dir={isArabic ? "rtl" : "ltr"}>
      <style>{`
        .seller-delivery-page {
          min-height: 100vh;
          background: #f5f6fa;
          padding: 36px 0 70px;
          font-family: Arial, Helvetica, sans-serif;
        }

        .seller-delivery-container {
          width: min(900px, 94%);
          margin: 0 auto;
        }

        .seller-delivery-header {
          background: #fff;
          border-radius: 22px;
          padding: 26px;
          box-shadow: 0 8px 24px rgba(0,0,0,0.06);
          margin-bottom: 20px;
          text-align: center;
        }

        .seller-delivery-title {
          margin: 0 0 10px;
          color: #023E8A;
          font-size: 34px;
          font-weight: 900;
        }

        .seller-delivery-subtitle {
          margin: 0;
          color: #64748b;
          font-size: 16px;
          line-height: 1.7;
          font-weight: 700;
        }

        .seller-delivery-card {
          background: #fff;
          border-radius: 22px;
          padding: 24px;
          box-shadow: 0 8px 24px rgba(0,0,0,0.06);
          border: 1px solid #eef2f7;
          margin-bottom: 18px;
        }

        .seller-delivery-note {
          background: #eaf2ff;
          color: #023E8A;
          border: 1px solid #c9ddff;
          border-radius: 16px;
          padding: 16px;
          line-height: 1.8;
          font-size: 15px;
          font-weight: 800;
          margin-bottom: 18px;
        }

        .seller-delivery-label {
          color: #94a3b8;
          font-size: 13px;
          font-weight: 900;
          text-transform: uppercase;
          margin-bottom: 8px;
        }

        .seller-delivery-value-row {
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 10px;
          align-items: center;
          margin-bottom: 16px;
        }

        .seller-delivery-value {
          min-height: 50px;
          border-radius: 14px;
          background: #f8fafc;
          border: 1px solid #e5e7eb;
          color: #111827;
          padding: 14px;
          font-size: 15px;
          font-weight: 800;
          word-break: break-all;
          display: flex;
          align-items: center;
        }

        .seller-delivery-copy-btn,
        .seller-delivery-open-btn,
        .seller-delivery-back-btn {
          min-height: 50px;
          border: none;
          border-radius: 14px;
          padding: 0 18px;
          font-size: 15px;
          font-weight: 900;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          text-decoration: none;
        }

        .seller-delivery-copy-btn,
        .seller-delivery-open-btn {
          background: #023E8A;
          color: #fff;
        }

        .seller-delivery-back-btn {
          background: #eef2ff;
          color: #023E8A;
        }

        .seller-delivery-actions {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          margin-top: 10px;
        }

        .seller-delivery-success {
          background: #f6ffed;
          color: #237804;
          border: 1px solid #b7eb8f;
          border-radius: 14px;
          padding: 14px 16px;
          font-size: 15px;
          font-weight: 800;
          margin-bottom: 16px;
        }

        .seller-delivery-error {
          background: #fff1f0;
          color: #cf1322;
          border: 1px solid #ffa39e;
          border-radius: 14px;
          padding: 14px 16px;
          font-size: 15px;
          font-weight: 800;
          margin-bottom: 16px;
        }

        @media (max-width: 700px) {
          .seller-delivery-value-row {
            grid-template-columns: 1fr;
          }

          .seller-delivery-title {
            font-size: 28px;
          }

          .seller-delivery-copy-btn,
          .seller-delivery-open-btn,
          .seller-delivery-back-btn {
            width: 100%;
          }
        }
      `}</style>

      <div className="seller-delivery-container">
        <div className="seller-delivery-header">
          <h1 className="seller-delivery-title">
            {t("deliveryApp", { defaultValue: "Delivery App" })}
          </h1>

          <p className="seller-delivery-subtitle">
            {t("deliveryAppSubtitle", {
              defaultValue:
                "Share this delivery app link with the delivery person.",
            })}
          </p>
        </div>

        {copied ? (
          <div className="seller-delivery-success">
            {copied} {t("copied", { defaultValue: "copied successfully." })}
          </div>
        ) : null}

        {error ? <div className="seller-delivery-error">{error}</div> : null}

        <div className="seller-delivery-card">
          <div className="seller-delivery-note">
            {t("deliveryAppNote", {
              defaultValue:
                "Note: The delivery person will open this link, enter the seller email, request OTP, then the OTP will be sent to the seller. The seller gives the OTP to the delivery person so they can login successfully and view deliverables.",
            })}
          </div>

          <div className="seller-delivery-label">
            {t("sellerEmail", { defaultValue: "Seller Email" })}
          </div>

          <div className="seller-delivery-value-row">
            <div className="seller-delivery-value">
              {loading
                ? t("loading", { defaultValue: "Loading..." })
                : sellerEmail || "-"}
            </div>

            <button
              type="button"
              className="seller-delivery-copy-btn"
              onClick={() => copyText(sellerEmail, "Seller email")}
              disabled={!sellerEmail}
            >
              <i className="fa-regular fa-copy"></i>
              {t("copy", { defaultValue: "Copy" })}
            </button>
          </div>

          <div className="seller-delivery-label">
            {t("deliveryLink", { defaultValue: "Delivery Link" })}
          </div>

          <div className="seller-delivery-value-row">
            <div className="seller-delivery-value">{deliveryLink}</div>

            <button
              type="button"
              className="seller-delivery-copy-btn"
              onClick={() => copyText(deliveryLink, "Delivery link")}
            >
              <i className="fa-regular fa-copy"></i>
              {t("copy", { defaultValue: "Copy" })}
            </button>
          </div>

          <div className="seller-delivery-actions">
            <a
              href={deliveryLink}
              target="_blank"
              rel="noreferrer"
              className="seller-delivery-open-btn"
            >
              <i className="fa-solid fa-arrow-up-right-from-square"></i>
              {t("openDeliveryApp", { defaultValue: "Open Delivery App" })}
            </a>

            <Link to="/seller-profile" className="seller-delivery-back-btn">
              {t("back", { defaultValue: "Back" })}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}