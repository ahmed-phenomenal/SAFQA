import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import icon from "../../../assets/2.png";
import { getSellerDisplayProfile } from "../../../API/seller";

const toImageSrc = (value) => {
  const raw = String(value || "").trim();

  if (!raw || raw === " ") return "";
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
  if (raw.startsWith("data:image/")) return raw;

  const cleaned = raw.replace(/\s/g, "");

  const looksLikeBase64 =
    /^[A-Za-z0-9+/=]+$/.test(cleaned) &&
    cleaned.length > 80 &&
    !cleaned.includes("{") &&
    !cleaned.includes("}");

  if (!looksLikeBase64) return "";

  return `data:image/png;base64,${cleaned}`;
};

const skeletonPulse = {
  animation: "sellerAccountSkeletonPulse 1.4s ease-in-out infinite",
  background: "linear-gradient(90deg, #ececec 25%, #f5f5f5 37%, #ececec 63%)",
  backgroundSize: "400% 100%",
};

export default function SellerAccount() {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === "ar";

  const [favicon] = useState(icon);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [sellerData, setSellerData] = useState({
    name: "",
    email: "",
    image: "",
    storeName: "",
    phoneNumber: "",
    city: "",
    country: "",
    description: "",
    sellerRating: "",
    followers: "",
    auctionsCount: "",
    upgradeType: "",
    verificationStatus: "",
  });

  const normalizeStatusLabel = (value) => {
    const raw = String(value || "").trim().toLowerCase();

    if (!raw) return t("notVerified");
    if (raw === "pending") return t("underReview");
    if (raw === "verified") return t("verified");
    if (raw === "rejected") return t("rejected");

    return t("notVerified");
  };

  useEffect(() => {
    document.title = t("sellerAccountDocTitle");
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

  useEffect(() => {
    let mounted = true;

    const loadData = async () => {
      try {
        setLoading(true);
        setError("");

        const data = await getSellerDisplayProfile();

        if (!mounted) return;

        setSellerData({
          name: data?.name || "",
          email: data?.email || "",
          image: data?.image || "",
          storeName: data?.storeName || "",
          phoneNumber: data?.phoneNumber || "",
          city: data?.city || "",
          country: data?.country || "",
          description: data?.description || "",
          sellerRating: data?.sellerRating ?? "",
          followers: data?.followers ?? "",
          auctionsCount: data?.auctionsCount ?? "",
          upgradeType: data?.upgradeType || "",
          verificationStatus: data?.verificationStatus || "",
        });
      } catch (err) {
        if (!mounted) return;
        setError(
          err?.response?.data?.message ||
            err?.message ||
            t("failedToLoadSellerAccount")
        );
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadData();

    return () => {
      mounted = false;
    };
  }, [t]);

  const seller = useMemo(() => {
    return {
      name: sellerData.name || "",
      email: sellerData.email || "",
      phoneNumber: sellerData.phoneNumber || "",
      city: sellerData.city || "",
      country: sellerData.country || "",
      description: sellerData.description || "",
      sellerRating: sellerData.sellerRating,
      followers: sellerData.followers,
      auctionsCount: sellerData.auctionsCount,
      upgradeType: sellerData.upgradeType || "",
      image: sellerData.image || "",
      storeName: sellerData.storeName || "",
      verificationStatus:
        sellerData.verificationStatus ||
        (sessionStorage.getItem("seller_verification_submitted") === "true" ||
        localStorage.getItem("seller_verification_submitted") === "true"
          ? "pending"
          : ""),
    };
  }, [sellerData]);

  if (error) {
    return (
      <div className="seller-account-page" dir={isArabic ? "rtl" : "ltr"}>
        <style>{`
          .seller-account-page {
            min-height: 100vh;
            background: var(--seller-account-bg, #f5f6fa);
            padding: 36px 0 70px;
            font-family: Arial, Helvetica, sans-serif;
          }
          [data-theme="dark"] .seller-account-page,
          body.dark .seller-account-page {
            --seller-account-bg: #000;
          }
        `}</style>

        <div className="container">
          <h1>{t("sellerAccountTitle")}</h1>
          <div className="alert alert-danger">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="seller-account-page" dir={isArabic ? "rtl" : "ltr"}>
      <style>{`
        @keyframes sellerAccountSkeletonPulse {
          0% { background-position: 100% 50%; }
          100% { background-position: 0 50%; }
        }

        .seller-account-page {
          min-height: 100vh;
          background: var(--seller-account-bg, #f5f6fa);
          padding: 36px 0 70px;
          font-family: Arial, Helvetica, sans-serif;
          color: var(--seller-account-text, #1f2937);
        }

        .seller-account-page * {
          box-sizing: border-box;
        }

        .seller-account-container {
          width: min(760px, 94%);
          margin: 0 auto;
        }

        .seller-account-title {
          margin: 0 0 24px;
          text-align: center;
          color: var(--seller-account-primary, #023E8A);
          font-size: 34px;
          font-weight: 900;
          letter-spacing: 0.5px;
          text-transform: uppercase;
        }

        .seller-account-avatar-box {
          width: 132px;
          height: 132px;
          margin: 0 auto 26px;
          border-radius: 50%;
          overflow: hidden;
          background: var(--seller-account-avatar-bg, #eef2f7);
          border: 4px solid var(--seller-account-avatar-border, #ffffff);
          box-shadow: 0 10px 26px rgba(0,0,0,0.14);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .seller-account-avatar-box img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
          border-radius: 50%;
        }

        .seller-account-card {
          background: var(--seller-account-card, #ffffff);
          border: 1px solid var(--seller-account-border, #e5e7eb);
          border-radius: 22px;
          padding: 18px 22px;
          box-shadow: 0 8px 24px rgba(0,0,0,0.06);
        }

        .seller-account-row {
          min-height: 54px;
          display: flex;
          align-items: center;
          gap: 10px;
          color: var(--seller-account-text, #1f2937);
          font-size: 16px;
          font-weight: 700;
          line-height: 1.6;
          word-break: break-word;
        }

        .seller-account-row i {
          width: 26px;
          min-width: 26px;
          text-align: center;
          font-size: 20px;
        }

        .seller-account-line {
          height: 1px;
          background: var(--seller-account-line, #e5e7eb);
        }

        [data-theme="dark"] .seller-account-page,
        body.dark .seller-account-page {
          --seller-account-bg: #000;
          --seller-account-card: #000;
          --seller-account-border: #222;
          --seller-account-line: #222;
          --seller-account-text: #fff;
          --seller-account-primary: #4da3ff;
          --seller-account-avatar-bg: #111;
          --seller-account-avatar-border: #111;
        }

        @media (max-width: 600px) {
          .seller-account-title {
            font-size: 28px;
          }

          .seller-account-avatar-box {
            width: 118px;
            height: 118px;
          }

          .seller-account-card {
            padding: 14px 16px;
          }

          .seller-account-row {
            font-size: 15px;
          }
        }
      `}</style>

      <div className="seller-account-container">
        <h1 className="seller-account-title">{t("sellerAccountTitle")}</h1>

        <div className="seller-account-avatar-box">
          {loading ? (
            <div
              style={{
                width: "100%",
                height: "100%",
                ...skeletonPulse,
              }}
            />
          ) : toImageSrc(seller.image) ? (
            <img src={toImageSrc(seller.image)} alt={t("sellerAvatar")} />
          ) : (
            <i
              className="fa-regular fa-user"
              style={{
                color: "#8a94a6",
                fontSize: 38,
              }}
            ></i>
          )}
        </div>

        <div className="seller-account-card">
          {loading ? (
            <>
              {Array.from({ length: 11 }).map((_, index) => (
                <div key={index}>
                  <div className="seller-account-row">
                    <div
                      style={{
                        width: "70%",
                        height: 18,
                        borderRadius: 8,
                        ...skeletonPulse,
                      }}
                    />
                  </div>
                  {index !== 10 && <div className="seller-account-line"></div>}
                </div>
              ))}
            </>
          ) : (
            <>
              <div className="seller-account-row">
                <i className="fa-regular fa-user" style={{ color: "#2c7be5" }}></i>
                <span>{seller.name || "-"}</span>
              </div>
              <div className="seller-account-line"></div>

              <div className="seller-account-row">
                <i className="fa-regular fa-envelope" style={{ color: "#2c7be5" }}></i>
                <span>{seller.email || "-"}</span>
              </div>
              <div className="seller-account-line"></div>

              <div className="seller-account-row">
                <i className="fa-solid fa-store" style={{ color: "#2c7be5" }}></i>
                <span>{seller.storeName || "-"}</span>
              </div>
              <div className="seller-account-line"></div>

              <div className="seller-account-row">
                <i className="fa-solid fa-phone" style={{ color: "#2c7be5" }}></i>
                <span>{seller.phoneNumber || "-"}</span>
              </div>
              <div className="seller-account-line"></div>

              <div className="seller-account-row">
                <i className="fa-solid fa-location-dot" style={{ color: "#2c7be5" }}></i>
                <span>
                  {seller.city || "-"}
                  {seller.country ? `, ${seller.country}` : ""}
                </span>
              </div>
              <div className="seller-account-line"></div>

              <div className="seller-account-row" style={{ alignItems: "flex-start" }}>
                <i className="fa-solid fa-align-left" style={{ color: "#2c7be5", marginTop: 4 }}></i>
                <span>{seller.description || "-"}</span>
              </div>
              <div className="seller-account-line"></div>

              <div className="seller-account-row">
                <i className="fa-solid fa-star" style={{ color: "#f6c000" }}></i>
                <span>
                  {seller.sellerRating !== "" ? seller.sellerRating : "-"} {t("rating")}
                </span>
              </div>
              <div className="seller-account-line"></div>

              <div className="seller-account-row">
                <i className="fa-solid fa-gavel" style={{ color: "#2c7be5" }}></i>
                <span>
                  {seller.auctionsCount !== "" ? seller.auctionsCount : "-"} {t("auctions")}
                </span>
              </div>
              <div className="seller-account-line"></div>

              <div className="seller-account-row">
                <i className="fa-solid fa-users" style={{ color: "#2c7be5" }}></i>
                <span>
                  {seller.followers !== "" ? seller.followers : "-"} {t("followers")}
                </span>
              </div>
              <div className="seller-account-line"></div>

              <div className="seller-account-row">
                <i className="fa-solid fa-crown" style={{ color: "#28a745" }}></i>
                <span>
                  {t("upgrade")}: {seller.upgradeType || "-"}
                </span>
              </div>
              <div className="seller-account-line"></div>

              <div className="seller-account-row">
                <i className="fa-solid fa-shield-halved" style={{ color: "#17a2b8" }}></i>
                <span>
                  {t("verificationStatus")}:{" "}
                  {normalizeStatusLabel(seller.verificationStatus)}
                </span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}