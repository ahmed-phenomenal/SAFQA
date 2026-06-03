import { useEffect } from "react";
import icon from "../../assets/2.png";
import { useTranslation } from "react-i18next";

export default function Privacy_Policy() {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === "ar";

  useEffect(() => {
    document.title = t("privacyPageTitle") || "Privacy Policy";
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

  return (
    <div className="container legal-wrapper">
      <div className="legal-page" dir={isArabic ? "rtl" : "ltr"}>
        <div className="legal-container">
          <h1 className="legal-title" dir="auto">
            {t("privacyPageTitle") || "Privacy Policy"}
          </h1>

          <div className="legal-card">
            <h2 dir="auto">
              {t("privacyS1Title") || "Information We Collect"}
            </h2>
            <p dir="auto">
              {t("privacyS1Desc") ||
                "We collect account details, contact information, auction activity, payment-related information, and app usage data needed to operate the platform."}
            </p>
          </div>

          <div className="legal-card">
            <h2 dir="auto">
              {t("privacyS2Title") || "How We Use Your Information"}
            </h2>
            <p dir="auto">
              {t("privacyS2Desc") ||
                "We use your information to provide services, process transactions, manage auctions, improve safety, send notifications, and support customer service."}
            </p>
          </div>

          <div className="legal-card">
            <h2 dir="auto">
              {t("privacyS3Title") || "Sharing Information"}
            </h2>
            <p dir="auto">
              {t("privacyS3Desc") ||
                "We may share necessary information with sellers, buyers, delivery partners, payment providers, and legal authorities when required."}
            </p>
          </div>

          <div className="legal-card">
            <h2 dir="auto">
              {t("privacyS4Title") || "Data Security"}
            </h2>
            <p dir="auto">
              {t("privacyS4Desc") ||
                "We use reasonable safeguards to protect your data, but no online system can guarantee complete security."}
            </p>
          </div>

          <div className="legal-card">
            <h2 dir="auto">{t("privacyS5Title") || "Your Choices"}</h2>
            <p dir="auto">
              {t("privacyS5Desc") ||
                "You can update account information, manage notifications, and request account changes according to platform policies."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}