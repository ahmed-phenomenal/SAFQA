import React, { useEffect, useState } from "react";
import icon from "../../assets/2.png";
import { getUserAccount } from "../../API/userProfile";
import { useTranslation } from "react-i18next";

export default function Account() {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === "ar";

  const [accountData, setAccountData] = useState({
    fullName: "",
    email: "",
    phoneNumber: "",
    gender: "",
    birthDateDisplay: "",
    location: "",
    imageSrc: "",
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = t("accountDocTitle", "Account");
  }, [t]);

  useEffect(() => {
    const link = document.querySelector("link[rel~='icon']");
    if (!link) {
      const newLink = document.createElement("link");
      newLink.rel = "icon";
      newLink.href = icon;
      document.head.appendChild(newLink);
    } else {
      link.href = icon;
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    const loadAccount = async () => {
      try {
        setLoading(true);
        const data = await getUserAccount();

        if (!mounted) return;

        setAccountData({
          fullName: data?.fullName || "",
          email: data?.email || "",
          phoneNumber: data?.phoneNumber || "",
          gender: data?.gender || "",
          birthDateDisplay: data?.birthDateDisplay || "",
          location: data?.location || "",
          imageSrc: data?.imageSrc || "",
        });
      } catch {
        if (!mounted) return;

        setAccountData({
          fullName: "",
          email: "",
          phoneNumber: "",
          gender: "",
          birthDateDisplay: "",
          location: "",
          imageSrc: "",
        });
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadAccount();

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="account py-3" dir={isArabic ? "rtl" : "ltr"}>
      <div className="container">
        <h1>{t("accountTitle", "Account")}</h1>

        {loading ? (
          <div className="alert alert-info">{t("loading", "Loading...")}</div>
        ) : (
          <>
            <div className="my-3">
              <div className="image">
                {accountData.imageSrc ? (
                  <img src={accountData.imageSrc} alt={t("avatar", "avatar")} />
                ) : (
                  <div
                    style={{
                      width: 110,
                      height: 110,
                      borderRadius: "50%",
                      margin: "0 auto",
                      background: "#eef2f7",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#8a94a6",
                      fontSize: 32,
                    }}
                  >
                    <i className="fa-regular fa-user"></i>
                  </div>
                )}
              </div>
            </div>

            <div className="info-box">
              <div className="info-row">
                <p className="value">
                  <i className="fa-regular fa-user"></i>{" "}
                  {accountData.fullName || "-"}
                </p>
              </div>
              <div className="gray-line"></div>

              <div className="info-row">
                <p className="value">
                  <i className="fa-regular fa-envelope"></i>{" "}
                  {accountData.email || "-"}
                </p>
              </div>
              <div className="gray-line"></div>

              <div className="info-row">
                <p className="value">
                  <i className="fa-solid fa-phone"></i>{" "}
                  {accountData.phoneNumber || "-"}
                </p>
              </div>
              <div className="gray-line"></div>

              <div className="info-row">
                <p className="value">
                  <i className="fa-solid fa-venus-mars"></i>{" "}
                  {accountData.gender || "-"}
                </p>
              </div>
              <div className="gray-line"></div>

              <div className="info-row">
                <p className="value">
                  <i className="fa-regular fa-calendar"></i>{" "}
                  {accountData.birthDateDisplay || "-"}
                </p>
              </div>
              <div className="gray-line"></div>

              <div className="info-row">
                <p className="value">
                  <i className="fa-solid fa-location-dot"></i>{" "}
                  {accountData.location || "-"}
                </p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}