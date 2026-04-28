import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import icon from "../../../assets/wallet.png";
import { getSellerSavedCards, withdrawFromWallet } from "../../../API/seller";

export default function SellerWithdraw() {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === "ar";

  const [amount, setAmount] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [cards, setCards] = useState([]);
  const [selectedCardId, setSelectedCardId] = useState("");

  const quickAmounts = ["EGP 100", "EGP 200", "EGP 500", "EGP 1000"];

  useEffect(() => {
    document.title = t("withdrawDocTitle");
  }, [t]);

  useEffect(() => {
    const link = document.querySelector("link[rel~='icon']");
    if (link) link.href = icon;
  }, []);

  useEffect(() => {
    let mounted = true;

    const loadCards = async () => {
      try {
        const cardsData = await getSellerSavedCards();
        if (!mounted) return;
        setCards(Array.isArray(cardsData) ? cardsData : []);
        if (cardsData?.length) {
          setSelectedCardId(String(cardsData[0].backendId || cardsData[0].id));
        }
      } catch {
        if (!mounted) return;
      }
    };

    loadCards();

    return () => {
      mounted = false;
    };
  }, []);

  const handleAmountChange = (e) => {
    const value = e.target.value.replace(/[^\d]/g, "");
    setAmount(value);

    if (value && Number(value) < 100) {
      setError(t("amountMin100"));
    } else {
      setError("");
    }
  };

  const handleQuickAmount = (item) => {
    const value = item.replace("EGP ", "");
    setAmount(value);

    if (Number(value) < 100) {
      setError(t("amountMin100"));
    } else {
      setError("");
    }
  };

  const handleSubmit = async () => {
    const numericAmount = Number(amount || 0);

    if (numericAmount < 100) {
      setError(t("amountMin100"));
      return;
    }

    if (!selectedCardId) {
      setError(t("pleaseChooseCard"));
      return;
    }

    setError("");
    setMessage("");
    setLoading(true);

    try {
      const res = await withdrawFromWallet({
        amount: numericAmount,
        cardId: selectedCardId,
      });

      setMessage(res?.message || t("withdrawSuccessful"));
      setAmount("");
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || t("withdrawFailed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="deposit-page" dir={isArabic ? "rtl" : "ltr"}>
      <div className="deposit-container">
        <h1 style={{ fontWeight: "bold" }}>{t("withdrawTitle")}</h1>

        <div className="deposit-top">
          <div className="deposit-label">{t("enterAmount")}</div>
          <div className="deposit-amount-display">EGP {amount || "200"}</div>
        </div>

        <input
          type="text"
          className="deposit-input"
          placeholder={t("enterAmount")}
          value={amount}
          onChange={handleAmountChange}
        />

        {error && (
          <p
            style={{
              color: "red",
              fontSize: "14px",
              marginTop: "-6px",
              marginBottom: "12px",
            }}
          >
            {error}
          </p>
        )}

        {message && (
          <p
            style={{
              color: "green",
              fontSize: "14px",
              marginTop: "-6px",
              marginBottom: "12px",
            }}
          >
            {message}
          </p>
        )}

        <div className="deposit-section">
          <div className="deposit-section-title">{t("quickWithdraw")}</div>
          <div className="deposit-quick-list">
            {quickAmounts.map((item) => (
              <button
                key={item}
                type="button"
                className={`deposit-quick-btn ${
                  (amount && `EGP ${amount}` === item) ||
                  (!amount && item === "EGP 200")
                    ? "active"
                    : ""
                }`}
                onClick={() => handleQuickAmount(item)}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        <div className="deposit-section">
          <div className="deposit-section-title">{t("chooseYourCard")}</div>

          {cards.length > 0 ? (
            cards.map((card) => {
              const currentId = String(card.backendId || card.id);
              const isActive = String(selectedCardId) === currentId;

              return (
                <div
                  key={card.id}
                  className={`deposit-card ${isActive ? "active" : ""}`}
                  onClick={() => setSelectedCardId(currentId)}
                  style={{ cursor: "pointer", marginBottom: 12 }}
                >
                  <div className="deposit-card-left">
                    <div className="deposit-mastercard-icon">
                      <span className="circle red"></span>
                      <span className="circle orange"></span>
                    </div>

                    <div className="deposit-card-info">
                      <div className="deposit-card-name">
                        {card.brand || t("card")}
                      </div>
                      <div className="deposit-card-number">
                        •••• •••• •••• {card.last4}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="deposit-card active">
              <div className="deposit-card-left">
                <div className="deposit-card-info">
                  <div className="deposit-card-name">{t("noSavedCardsFound")}</div>
                  <div className="deposit-card-number">{t("pleaseAddCardFirst")}</div>
                </div>
              </div>
            </div>
          )}
        </div>

        <button
          type="button"
          className="deposit-submit-btn"
          onClick={handleSubmit}
          disabled={loading}
        >
          {loading ? <span className="btn-spinner"></span> : t("withdrawTitle")}
        </button>
      </div>
    </div>
  );
}