import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import icon from "../../assets/credit-card.png";
import {
  addUserCard,
  deleteUserSavedCard,
  getUserSavedCards,
} from "../../API/userWallet";

export default function Saved_Cards() {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === "ar";

  useEffect(() => {
    document.title = t("savedCards") || "Saved Cards";
  }, [t]);

  useEffect(() => {
    const link = document.querySelector("link[rel~='icon']");
    if (link) link.href = icon;
  }, []);

  const [showAddCard, setShowAddCard] = useState(false);
  const [cards, setCards] = useState([]);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [pageMessage, setPageMessage] = useState("");
  const [cardsLoading, setCardsLoading] = useState(true);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [selectedDeleteCard, setSelectedDeleteCard] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    let mounted = true;

    const loadCards = async () => {
      try {
        setCardsLoading(true);
        const data = await getUserSavedCards();

        if (!mounted) return;

        setCards(Array.isArray(data) ? data : []);
      } catch (err) {
        if (!mounted) return;

        setPageMessage(
          err?.response?.data?.message ||
            err?.message ||
            t("failedToLoadSavedCards") ||
            "Failed to load saved cards"
        );

        setCards([]);
      } finally {
        if (mounted) setCardsLoading(false);
      }
    };

    loadCards();

    return () => {
      mounted = false;
    };
  }, [t]);

  const [formData, setFormData] = useState({
    cardNumber: "",
    expiryDate: "",
    cvv: "",
    holderName: "",
    cardLabel: "",
  });

  const [touched, setTouched] = useState({
    cardNumber: false,
    expiryDate: false,
    cvv: false,
    holderName: false,
    cardLabel: false,
  });

  const getCardBrand = (cardNumber) => {
    const cleaned = String(cardNumber || "").replace(/\D/g, "");

    if (/^4/.test(cleaned)) return t("visa") || "Visa";

    if (/^5[1-5]/.test(cleaned) || /^2(2[2-9]|[3-6]|7[01]|720)/.test(cleaned)) {
      return t("masterCard") || "Master Card";
    }

    return t("card") || "Card";
  };

  const formatCardNumber = (value) => {
    const digits = value.replace(/\D/g, "").slice(0, 16);
    const groups = [];

    for (let i = 0; i < 4; i += 1) {
      const start = i * 4;
      const typedPart = digits.slice(start, start + 4);
      const maskedPart = (typedPart + "xxxx").slice(0, 4);
      groups.push(maskedPart);
    }

    return groups.join("-");
  };

  const formatExpiryDate = (value) => {
    const digits = value.replace(/\D/g, "").slice(0, 4);

    if (digits.length === 0) return "";
    if (digits.length <= 2) return digits;

    return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  };

  const getRawCardDigits = (value) =>
    String(value || "").replace(/\D/g, "").slice(0, 16);

  const getRawExpiryDigits = (value) =>
    String(value || "").replace(/\D/g, "").slice(0, 4);

  const validateCardNumber = (value) => {
    const digits = getRawCardDigits(value);

    if (!digits) return t("cardNumberRequired") || "Card number is required";
    if (digits.length !== 16) return t("cardNumber16") || "Card number must be 16 numbers";

    return "";
  };

  const validateExpiryDate = (value) => {
    const digits = getRawExpiryDigits(value);

    if (digits.length < 4) {
      return t("expiryMonthYear") || "Expiry date must be month then year";
    }

    const month = Number(digits.slice(0, 2));
    const year = Number(digits.slice(2, 4));

    if (month < 1 || month > 12) {
      return t("expiryMonthRange") || "Expiry month must be between 01 and 12";
    }

    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear() % 100;

    if (year < currentYear) {
      return t("cardExpired") || "Card is already expired";
    }

    if (year === currentYear && month < currentMonth) {
      return t("cardExpired") || "Card is already expired";
    }

    return "";
  };

  const validateCvv = (value) => {
    const digits = String(value || "").replace(/\D/g, "");

    if (!digits) return t("cvvRequired") || "CVV is required";
    if (digits.length !== 3) return t("cvv3") || "CVV must be 3 numbers";

    return "";
  };

  const validateHolderName = (value) => {
    const name = String(value || "").trim();

    if (!name) return t("cardholderRequired") || "Cardholder name is required";
    if (name.length < 4) {
      return t("cardholderMin") || "Cardholder name should exceed 3 characters";
    }

    return "";
  };

  const errors = {
    cardNumber: validateCardNumber(formData.cardNumber),
    expiryDate: validateExpiryDate(formData.expiryDate),
    cvv: validateCvv(formData.cvv),
    holderName: validateHolderName(formData.holderName),
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === "cardNumber") {
      setFormData((prev) => ({
        ...prev,
        [name]: formatCardNumber(value),
      }));
      return;
    }

    if (name === "expiryDate") {
      setFormData((prev) => ({
        ...prev,
        [name]: formatExpiryDate(value),
      }));
      return;
    }

    if (name === "cvv") {
      setFormData((prev) => ({
        ...prev,
        [name]: value.replace(/\D/g, "").slice(0, 3),
      }));
      return;
    }

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleBlur = (e) => {
    const { name } = e.target;

    setTouched((prev) => ({
      ...prev,
      [name]: true,
    }));
  };

  const handleAddCard = async (e) => {
    e.preventDefault();

    setTouched({
      cardNumber: true,
      expiryDate: true,
      cvv: true,
      holderName: true,
      cardLabel: true,
    });

    if (errors.cardNumber || errors.expiryDate || errors.cvv || errors.holderName) {
      return;
    }

    try {
      setSubmitLoading(true);
      setPageMessage("");

      const cleanNumber = getRawCardDigits(formData.cardNumber);

      const res = await addUserCard({
        cardNumber: cleanNumber,
        expiryDate: formData.expiryDate,
        cvv: formData.cvv,
        holderName: formData.holderName.trim(),
        cardLabel: formData.cardLabel.trim(),
      });

      const addedCard = res?.localCard || {
        id: Date.now(),
        brand: getCardBrand(formData.cardNumber),
        last4: cleanNumber.slice(-4),
        expiry: formData.expiryDate,
        holderName: formData.holderName.trim(),
        label: formData.cardLabel.trim(),
      };

      setCards((prev) => [addedCard, ...prev]);

      setFormData({
        cardNumber: "",
        expiryDate: "",
        cvv: "",
        holderName: "",
        cardLabel: "",
      });

      setTouched({
        cardNumber: false,
        expiryDate: false,
        cvv: false,
        holderName: false,
        cardLabel: false,
      });

      setPageMessage(res?.message || t("cardAddedSuccessfully") || "Card added successfully");
      setShowAddCard(false);
    } catch (err) {
      setPageMessage(
        err?.response?.data?.message ||
          err?.message ||
          t("failedToAddCard") ||
          "Failed to add card"
      );
    } finally {
      setSubmitLoading(false);
    }
  };

  const openDeleteConfirm = (card) => {
    setSelectedDeleteCard(card);
    setConfirmOpen(true);
  };

  const closeDeleteConfirm = () => {
    if (deleteLoading) return;

    setConfirmOpen(false);
    setSelectedDeleteCard(null);
  };

  const onConfirmDelete = async () => {
    if (!selectedDeleteCard) return;

    try {
      setDeleteLoading(true);
      setPageMessage("");

      const res = await deleteUserSavedCard(selectedDeleteCard.id);

      setCards((prev) =>
        prev.filter((item) => String(item.id) !== String(res?.deletedId || selectedDeleteCard.id))
      );

      setPageMessage(res?.message || t("cardDeletedSuccessfully") || "Card deleted successfully");
      closeDeleteConfirm();
    } catch (err) {
      setPageMessage(
        err?.response?.data?.message ||
          err?.message ||
          t("failedToDeleteCard") ||
          "Failed to delete card"
      );

      setDeleteLoading(false);
    }
  };

  return (
    <>
      <div className="cards-page" dir={isArabic ? "rtl" : "ltr"}>
        <div className="cards-shell">
          {!showAddCard ? (
            <section className="cards-panel">
              <div className="cards-header">
                <h2>{t("savedCards") || "Saved Cards"}</h2>

                <button
                  type="button"
                  className="icon-btn add-btn"
                  onClick={() => setShowAddCard(true)}
                  aria-label={t("addCard") || "Add card"}
                >
                  +
                </button>
              </div>

              {pageMessage ? (
                <div
                  style={{
                    marginBottom: 14,
                    background: "#eef6ff",
                    border: "1px solid #cfe2ff",
                    color: "#0b3a86",
                    padding: "10px 14px",
                    borderRadius: 10,
                  }}
                >
                  {pageMessage}
                </div>
              ) : null}

              <div className="cards-list">
                {cardsLoading ? (
                  <div className="empty-state">
                    <p>{t("loadingCards") || "Loading cards..."}</p>
                  </div>
                ) : cards.length > 0 ? (
                  cards.map((card) => (
                    <div className="saved-card-item" key={card.id}>
                      <button
                        type="button"
                        className="menu-btn"
                        onClick={() => openDeleteConfirm(card)}
                        aria-label={t("deleteCard") || "Delete card"}
                        title={t("deleteCard") || "Delete card"}
                        style={{
                          marginRight: isArabic ? 0 : 12,
                          marginLeft: isArabic ? 12 : 0,
                          color: "#d11a2a",
                          background: "transparent",
                          border: "none",
                          cursor: "pointer",
                          fontSize: 18,
                        }}
                      >
                        <i className="fa-solid fa-trash"></i>
                      </button>

                      <div className="card-left">
                        <div className="brand-dots">
                          <span className="dot red"></span>
                          <span className="dot yellow"></span>
                        </div>

                        <div className="card-info">
                          <h4>{card.brand}</h4>
                          <p className="masked-number">•••• •••• •••• {card.last4}</p>
                          <span className="holder-line">
                            {card.holderName}
                            {card.label ? ` • ${card.label}` : ""}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="empty-state">
                    <p>{t("noSavedCardsYet") || "No saved cards yet."}</p>
                  </div>
                )}
              </div>
            </section>
          ) : (
            <section className="cards-panel">
              <div className="cards-header">
                <h2>{t("addCard") || "Add Card"}</h2>
              </div>

              <form className="add-card-form" onSubmit={handleAddCard}>
                <p className="form-subtitle">
                  {t("enterCardInformation") || "Enter your card information"}
                </p>

                <div className="input-wrap">
                  <input
                    type="text"
                    name="cardNumber"
                    placeholder="xxxx-xxxx-xxxx-xxxx"
                    value={formData.cardNumber}
                    onChange={handleChange}
                    onBlur={handleBlur}
                  />

                  {touched.cardNumber && errors.cardNumber ? (
                    <small className="field-error">{errors.cardNumber}</small>
                  ) : null}
                </div>

                <div className="row-fields">
                  <div className="input-wrap">
                    <input
                      type="text"
                      name="expiryDate"
                      placeholder="MM/YY"
                      value={formData.expiryDate}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      inputMode="numeric"
                      maxLength={5}
                    />

                    {touched.expiryDate && errors.expiryDate ? (
                      <small className="field-error">{errors.expiryDate}</small>
                    ) : null}
                  </div>

                  <div className="input-wrap">
                    <input
                      type="text"
                      name="cvv"
                      placeholder="CVV"
                      value={formData.cvv}
                      onChange={handleChange}
                      onBlur={handleBlur}
                    />

                    {touched.cvv && errors.cvv ? (
                      <small className="field-error">{errors.cvv}</small>
                    ) : null}
                  </div>
                </div>

                <div className="input-wrap">
                  <input
                    type="text"
                    name="holderName"
                    placeholder={t("cardholderName") || "Cardholder Name"}
                    value={formData.holderName}
                    onChange={handleChange}
                    onBlur={handleBlur}
                  />

                  {touched.holderName && errors.holderName ? (
                    <small className="field-error">{errors.holderName}</small>
                  ) : null}
                </div>

                <div className="input-wrap">
                  <input
                    type="text"
                    name="cardLabel"
                    placeholder={t("cardLabelOptional") || "Card Label (Optional)"}
                    value={formData.cardLabel}
                    onChange={handleChange}
                    onBlur={handleBlur}
                  />
                </div>

                <div className="form-actions">
                  <button type="submit" className="submit-btn" disabled={submitLoading}>
                    {submitLoading ? t("adding") || "Adding..." : t("add") || "Add"}
                  </button>

                  <button
                    type="button"
                    className="back-text-btn"
                    onClick={() => {
                      setShowAddCard(false);
                      setTouched({
                        cardNumber: false,
                        expiryDate: false,
                        cvv: false,
                        holderName: false,
                        cardLabel: false,
                      });
                    }}
                  >
                    {t("backToSavedCards") || "Back to saved cards"}
                  </button>
                </div>
              </form>
            </section>
          )}
        </div>
      </div>

      {confirmOpen && (
        <div
          onClick={closeDeleteConfirm}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 99999,
            padding: 16,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: 340,
              maxWidth: "95vw",
              background: "#fff",
              borderRadius: 14,
              boxShadow: "0 20px 50px rgba(0,0,0,0.25)",
              overflow: "hidden",
              direction: isArabic ? "rtl" : "ltr",
            }}
          >
            <div style={{ padding: "14px 16px 8px" }}>
              <div
                style={{
                  color: "#d11a2a",
                  fontWeight: 800,
                  fontSize: 16,
                  marginBottom: 6,
                  textAlign: "center",
                }}
              >
                {t("deleteCardQuestion") || "Delete card?"}
              </div>

              <div
                style={{
                  fontSize: 13,
                  color: "#6b7280",
                  textAlign: "center",
                  paddingBottom: 10,
                  borderBottom: "1px solid #eee",
                }}
              >
                {t("deleteCardConfirm") || "Are you sure you want to delete this saved card?"}
              </div>
            </div>

            <div
              style={{
                display: "flex",
                gap: 10,
                padding: 12,
                justifyContent: "center",
              }}
            >
              <button
                type="button"
                onClick={onConfirmDelete}
                disabled={deleteLoading}
                style={{
                  minWidth: 120,
                  padding: "10px 14px",
                  borderRadius: 10,
                  border: "none",
                  background: "#d11a2a",
                  color: "#fff",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                {deleteLoading ? t("deleting") || "Deleting..." : t("yes") || "Yes"}
              </button>

              <button
                type="button"
                onClick={closeDeleteConfirm}
                disabled={deleteLoading}
                style={{
                  minWidth: 120,
                  padding: "10px 14px",
                  borderRadius: 10,
                  border: "1px solid #cbd5e1",
                  background: "#fff",
                  color: "#0b3a86",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                {t("no") || "No"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}