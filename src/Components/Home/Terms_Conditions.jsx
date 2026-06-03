import { useTranslation } from "react-i18next";
import { useEffect } from "react";
import icon from "../../assets/2.png";

export default function Terms_Conditions() {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === "ar";

  useEffect(() => {
    document.title = t("terms.title", "Terms & Conditions");
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
        <div className="container terms-page" dir={isArabic ? "rtl" : "ltr"}>
      <h1 className="terms-title">{t("terms.title", "Terms & Conditions")}</h1>

      <div className="forms terms-card">
        <p className="terms-paragraph">{t("terms.intro.usingPlatform")}</p>
        <p className="terms-paragraph">{t("terms.intro.accurateInfo")}</p>
        <p className="terms-paragraph">{t("terms.intro.rightToSuspend")}</p>
        <p className="terms-paragraph">{t("terms.intro.monitoring")}</p>

        <hr className="terms-divider" />

        <h2 className="terms-section-title">{t("terms.buyer.title")}</h2>

        <h3 className="terms-subtitle">{t("terms.buyer.accountUsage.title")}</h3>

        <ul className="terms-list">
          <li>{t("terms.buyer.accountUsage.li1")}</li>
          <li>{t("terms.buyer.accountUsage.li2")}</li>
          <li>{t("terms.buyer.accountUsage.li3")}</li>
        </ul>

        <h3 className="terms-subtitle">{t("terms.buyer.biddingRules.title")}</h3>

        <ul className="terms-list">
          <li>{t("terms.buyer.biddingRules.li1")}</li>
          <li>{t("terms.buyer.biddingRules.li2")}</li>
          <li>{t("terms.buyer.biddingRules.li3")}</li>
          <li>{t("terms.buyer.biddingRules.li4")}</li>
        </ul>

        <h3 className="terms-subtitle">{t("terms.buyer.paymentsRefunds.title")}</h3>

        <ul className="terms-list">
          <li>{t("terms.buyer.paymentsRefunds.li1")}</li>
          <li>{t("terms.buyer.paymentsRefunds.li2")}</li>
          <li>{t("terms.buyer.paymentsRefunds.li3")}</li>
        </ul>

        <h3 className="terms-subtitle">{t("terms.buyer.disputes.title")}</h3>

        <ul className="terms-list">
          <li>{t("terms.buyer.disputes.li1")}</li>
          <li>{t("terms.buyer.disputes.li2")}</li>
        </ul>

        <hr className="terms-divider" />

        <h2 className="terms-section-title">{t("terms.seller.title")}</h2>

        <h3 className="terms-subtitle">{t("terms.seller.registration.title")}</h3>

        <ul className="terms-list">
          <li>{t("terms.seller.registration.li1")}</li>
          <li>{t("terms.seller.registration.li2")}</li>
          <li>{t("terms.seller.registration.li3")}</li>
        </ul>

        <h3 className="terms-subtitle">{t("terms.seller.auctionManagement.title")}</h3>

        <ul className="terms-list">
          <li>{t("terms.seller.auctionManagement.li1")}</li>
          <li>{t("terms.seller.auctionManagement.li2")}</li>
          <li>{t("terms.seller.auctionManagement.li3")}</li>
        </ul>

        <h3 className="terms-subtitle">{t("terms.seller.deliveryFulfillment.title")}</h3>

        <ul className="terms-list">
          <li>{t("terms.seller.deliveryFulfillment.li1")}</li>
          <li>{t("terms.seller.deliveryFulfillment.li2")}</li>
          <li>{t("terms.seller.deliveryFulfillment.li3")}</li>
        </ul>

        <h3 className="terms-subtitle">{t("terms.seller.feesEarnings.title")}</h3>

        <ul className="terms-list">
          <li>{t("terms.seller.feesEarnings.li1")}</li>
          <li>{t("terms.seller.feesEarnings.li2")}</li>
        </ul>

        <hr className="terms-divider" />

        <h2 className="terms-section-title">{t("terms.policies.title")}</h2>

        <h3 className="terms-subtitle">{t("terms.policies.notifications.title")}</h3>

        <ul className="terms-list">
          <li>{t("terms.policies.notifications.li1")}</li>
          <li>{t("terms.policies.notifications.li2")}</li>
          <li>{t("terms.policies.notifications.li3")}</li>
        </ul>

        <h3 className="terms-subtitle">{t("terms.policies.privacy.title")}</h3>

        <ul className="terms-list">
          <li>{t("terms.policies.privacy.li1")}</li>
          <li>{t("terms.policies.privacy.li2")}</li>
          <li>{t("terms.policies.privacy.li3")}</li>
        </ul>

        <h3 className="terms-subtitle">{t("terms.policies.liability.title")}</h3>

        <ul className="terms-list">
          <li>{t("terms.policies.liability.li1")}</li>
          <li>{t("terms.policies.liability.li2")}</li>
          <li>{t("terms.policies.liability.li3")}</li>
        </ul>

        <h3 className="terms-subtitle">{t("terms.policies.changes.title")}</h3>

        <p className="terms-paragraph">{t("terms.policies.changes.desc")}</p>
      </div>
    </div>
    </div>
    
  );
}