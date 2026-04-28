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
      <div className="account" dir={isArabic ? "rtl" : "ltr"}>
        <div className="container">
          <h1>{t("sellerAccountTitle")}</h1>
          <div className="alert alert-danger">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="account" dir={isArabic ? "rtl" : "ltr"}>
      <style>
        {`
          @keyframes sellerAccountSkeletonPulse {
            0% { background-position: 100% 50%; }
            100% { background-position: 0 50%; }
          }
        `}
      </style>

      <div className="container">
        <h1>{t("sellerAccountTitle")}</h1>

        <div className="my-3">
          <div className="image">
            {loading ? (
              <div
                style={{
                  width: 120,
                  height: 120,
                  borderRadius: "50%",
                  margin: "0 auto",
                  ...skeletonPulse,
                }}
              />
            ) : toImageSrc(seller.image) ? (
              <img
                src={toImageSrc(seller.image)}
                alt={t("sellerAvatar")}
                style={{
                  width: 120,
                  height: 120,
                  borderRadius: "50%",
                  objectFit: "cover",
                  display: "block",
                  margin: "0 auto",
                }}
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
            ) : (
              <div
                style={{
                  width: 120,
                  height: 120,
                  borderRadius: "50%",
                  margin: "0 auto",
                  background: "#eef2f7",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#8a94a6",
                  fontSize: 36,
                }}
              >
                <i className="fa-regular fa-user"></i>
              </div>
            )}
          </div>
        </div>

        <div className="info-box">
          {loading ? (
            <>
              {Array.from({ length: 11 }).map((_, index) => (
                <div key={index}>
                  <div className="info-row">
                    <div
                      style={{
                        width: "70%",
                        height: 18,
                        borderRadius: 8,
                        ...skeletonPulse,
                      }}
                    />
                  </div>
                  {index !== 10 && <div className="gray-line"></div>}
                </div>
              ))}
            </>
          ) : (
            <>
              <div className="info-row">
                <p className="value_seller">
                  <i
                    className="fa-regular fa-user"
                    style={{ color: "#2c7be5", marginInlineEnd: "8px" }}
                  ></i>
                  {seller.name || "-"}
                </p>
              </div>
              <div className="gray-line"></div>

              <div className="info-row">
                <p className="value_seller">
                  <i
                    className="fa-regular fa-envelope"
                    style={{ color: "#000", marginInlineEnd: "8px" }}
                  ></i>
                  {seller.email || "-"}
                </p>
              </div>
              <div className="gray-line"></div>

              <div className="info-row">
                <p className="value_seller">
                  <i
                    className="fa-solid fa-store"
                    style={{ color: "#2c7be5", marginInlineEnd: "8px" }}
                  ></i>
                  {seller.storeName || "-"}
                </p>
              </div>
              <div className="gray-line"></div>

              <div className="info-row">
                <p className="value_seller">
                  <i
                    className="fa-solid fa-phone"
                    style={{ color: "#000", marginInlineEnd: "8px" }}
                  ></i>
                  {seller.phoneNumber || "-"}
                </p>
              </div>
              <div className="gray-line"></div>

              <div className="info-row">
                <p className="value_seller">
                  <i
                    className="fa-solid fa-location-dot"
                    style={{ color: "#000", marginInlineEnd: "8px" }}
                  ></i>
                  {seller.city || "-"}
                  {seller.country ? `, ${seller.country}` : ""}
                </p>
              </div>
              <div className="gray-line"></div>

              <div className="info-row" style={{ alignItems: "flex-start" }}>
                <p className="value_seller" style={{ margin: 0 }}>
                  <i
                    className="fa-solid fa-align-left"
                    style={{ color: "#000", marginInlineEnd: "8px" }}
                  ></i>
                  {seller.description || "-"}
                </p>
              </div>
              <div className="gray-line"></div>

              <div className="info-row">
                <p className="value_seller">
                  <i
                    className="fa-solid fa-star"
                    style={{ color: "#f6c000", marginInlineEnd: "8px" }}
                  ></i>
                  {seller.sellerRating !== "" ? seller.sellerRating : "-"}{" "}
                  {t("rating")}
                </p>
              </div>
              <div className="gray-line"></div>

              <div className="info-row">
                <p className="value_seller">
                  <i
                    className="fa-solid fa-gavel"
                    style={{ color: "#444", marginInlineEnd: "8px" }}
                  ></i>
                  {seller.auctionsCount !== "" ? seller.auctionsCount : "-"}{" "}
                  {t("auctions")}
                </p>
              </div>
              <div className="gray-line"></div>

              <div className="info-row">
                <p className="value_seller">
                  <i
                    className="fa-solid fa-users"
                    style={{ color: "#444", marginInlineEnd: "8px" }}
                  ></i>
                  {seller.followers !== "" ? seller.followers : "-"}{" "}
                  {t("followers")}
                </p>
              </div>
              <div className="gray-line"></div>

              <div className="info-row">
                <p className="value_seller">
                  <i
                    className="fa-solid fa-crown"
                    style={{ color: "#28a745", marginInlineEnd: "8px" }}
                  ></i>
                  {t("upgrade")}: {seller.upgradeType || "-"}
                </p>
              </div>

              <div className="gray-line"></div>

              <div className="info-row">
                <p className="value_seller">
                  <i
                    className="fa-solid fa-shield-halved"
                    style={{ color: "#17a2b8", marginInlineEnd: "8px" }}
                  ></i>
                  {t("verificationStatus")}:{" "}
                  {normalizeStatusLabel(seller.verificationStatus)}
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}