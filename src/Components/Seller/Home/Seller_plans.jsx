import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import icon from "../../../assets/2.png";
import hammerImg from "../../../IMG/Seller/4.png";
import "../seller.css";
import { upgradeSeller, getSellerDisplayProfile } from "../../../API/seller";

export default function Seller_plans() {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === "ar";

  const [loadingPlan, setLoadingPlan] = useState("");
  const [message, setMessage] = useState("");
  const [currentUpgrade, setCurrentUpgrade] = useState("");

  useEffect(() => {
    document.title = t("sellerPlansDocTitle");
  }, [t]);

  useEffect(() => {
    const link = document.querySelector("link[rel~='icon']");
    if (link) link.href = icon;
  }, []);

  useEffect(() => {
    let mounted = true;

    const loadProfile = async () => {
      try {
        const data = await getSellerDisplayProfile();
        if (!mounted) return;
        setCurrentUpgrade(String(data?.upgradeType || "").toLowerCase());
      } catch {
        if (!mounted) return;
      }
    };

    loadProfile();

    return () => {
      mounted = false;
    };
  }, []);

  const plans = useMemo(
    () => [
      {
        id: 1,
        type: "basic",
        title: t("basicPlan"),
        price: "99$",
        button: t("boostNow"),
        features: [
          t("basicPlanFeature1"),
          t("basicPlanFeature2"),
          t("basicPlanFeature3"),
        ],
      },
      {
        id: 2,
        type: "premium",
        title: t("premiumPlan"),
        price: "499$",
        button: t("upgradeToPremium"),
        features: [
          t("premiumPlanFeature1"),
          t("premiumPlanFeature2"),
          t("premiumPlanFeature3"),
          t("premiumPlanFeature4"),
        ],
      },
      {
        id: 3,
        type: "elite",
        title: t("elitePlan"),
        price: "999$",
        button: t("goElite"),
        features: [
          t("elitePlanFeature1"),
          t("elitePlanFeature2"),
          t("elitePlanFeature3"),
          t("elitePlanFeature4"),
        ],
      },
    ],
    [t]
  );

  const normalizeUpgrade = (value) => {
    const raw = String(value || "").trim().toLowerCase();

    if (raw.includes("basic")) return "basic";
    if (raw.includes("premium")) return "premium";
    if (raw.includes("elite")) return "elite";

    return raw;
  };

  const handleUpgrade = async (planId) => {
    try {
      setLoadingPlan(String(planId));
      setMessage("");

      const res = await upgradeSeller(planId);
      setMessage(res?.message || t("upgradeSuccessful"));

      const selectedPlan = plans.find((p) => p.id === planId);
      setCurrentUpgrade(selectedPlan?.type || "");
    } catch (err) {
      setMessage(
        err?.response?.data?.message ||
          err?.message ||
          t("failedToUpgradeSeller")
      );
    } finally {
      setLoadingPlan("");
    }
  };

  return (
    <div className="seller-plans" dir={isArabic ? "rtl" : "ltr"}>
      <div className="seller-plans-container">
        <h1 className="seller-plans-title">{t("sellerPlansTitle")}</h1>

        <p className="seller-plans-subtitle">
          {t("sellerPlansSubtitle")}
        </p>

        {message ? (
          <div
            className="alert"
            style={{
              marginBottom: 20,
              background: "#eef6ff",
              border: "1px solid #cfe2ff",
              color: "#0b3a86",
              padding: "12px 16px",
              borderRadius: 10,
            }}
          >
            {message}
          </div>
        ) : null}

        <div className="seller-plans-grid">
          {plans.map((plan) => {
            const isActive = normalizeUpgrade(currentUpgrade) === plan.type;

            return (
              <div
                key={plan.id}
                className={`seller-plan-card ${isActive ? "active" : ""}`}
              >
                <h3>{plan.title}</h3>

                <div className="seller-plan-hammer">
                  <img src={hammerImg} alt={t("hammer")} />
                </div>

                <h2>{plan.price}</h2>

                <div className="seller-plan-features">
                  {plan.features.map((feature, i) => (
                    <p key={i}>✓ {feature}</p>
                  ))}
                </div>

                <button
                  className="seller-plan-btn"
                  type="button"
                  onClick={() => handleUpgrade(plan.id)}
                  disabled={loadingPlan === String(plan.id)}
                >
                  {loadingPlan === String(plan.id)
                    ? t("loading")
                    : isActive
                    ? t("currentPlan")
                    : plan.button}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}