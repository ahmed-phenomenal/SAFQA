import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import icon from "../../assets/2.png";

import avatar1 from "../../assets/1.png";
import avatar2 from "../../assets/1.png";
import avatar3 from "../../assets/1.png";

export default function SellerReview() {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === "ar";

  useEffect(() => {
    document.title = t("reviewsDocTitle") || "Review & Ratings";
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

  const initialReviews = useMemo(
    () => [
      {
        id: "r3",
        name: "Ahmed Tamer",
        avatar: avatar1,
        ratingSeller: 5,
        ratingDelivery: 4,
        comment:
          t("demoReview1") ||
          "Very fast response and the item was exactly as described.",
        createdAt: new Date("2026-03-02T12:30:00").getTime(),
      },
      {
        id: "r2",
        name: "Omar Ali",
        avatar: avatar2,
        ratingSeller: 4,
        ratingDelivery: 3,
        comment:
          t("demoReview2") ||
          "Good seller. Delivery was a bit late but overall okay.",
        createdAt: new Date("2026-02-18T09:10:00").getTime(),
      },
      {
        id: "r1",
        name: "Sara Mohamed",
        avatar: avatar3,
        ratingSeller: 5,
        ratingDelivery: 5,
        comment: t("demoReview3") || "Excellent experience. Highly recommended!",
        createdAt: new Date("2026-01-30T21:05:00").getTime(),
      },
    ],
    [t]
  );

  const [reviews, setReviews] = useState(() => initialReviews);
  const [showModal, setShowModal] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [formError, setFormError] = useState("");

  const [comment, setComment] = useState("");
  const [sellerRate, setSellerRate] = useState(0);
  const [deliveryRate, setDeliveryRate] = useState(0);

  const wordCount = useMemo(() => {
    const trimmed = comment.trim();
    if (!trimmed) return 0;
    return trimmed.split(/\s+/).length;
  }, [comment]);

  const overLimit = wordCount > 100;

  const formatDate = (ms) => {
    try {
      return new Date(ms).toLocaleString(isArabic ? "ar-EG" : "en-GB");
    } catch {
      return "";
    }
  };

  const Stars = ({ value, onChange, size = 18, readOnly = false }) => {
    const stars = [1, 2, 3, 4, 5];

    return (
      <div className="sr-stars" aria-label="stars">
        {stars.map((s) => (
          <button
            key={s}
            type="button"
            className={`sr-star-btn ${s <= value ? "active" : ""} ${
              readOnly ? "readonly" : ""
            }`}
            onClick={() => {
              if (!readOnly) onChange?.(s);
            }}
            style={{ fontSize: size }}
            aria-label={`${s} ${t("star") || "star"}`}
          >
            ★
          </button>
        ))}
      </div>
    );
  };

  const openModal = () => {
    setShowModal(true);
    setShowConfirm(false);
    setFormError("");
    setComment("");
    setSellerRate(0);
    setDeliveryRate(0);
  };

  const closeModal = () => {
    setShowModal(false);
    setShowConfirm(false);
    setFormError("");
  };

  const onSubmitClick = () => {
    setFormError("");

    if (!comment.trim()) {
      setFormError(t("pleaseWriteReview") || "Please write a review.");
      return;
    }

    if (overLimit) {
      setFormError(t("max100Words") || "Max 100 words.");
      return;
    }

    if (sellerRate === 0) {
      setFormError(t("pleaseSelectSellerRate") || "Please select Seller rate.");
      return;
    }

    if (deliveryRate === 0) {
      setFormError(t("pleaseSelectDeliveryRate") || "Please select Delivery rate.");
      return;
    }

    setShowConfirm(true);
  };

  const submitReview = () => {
    const newReview = {
      id: `r_${Date.now()}`,
      name: t("you") || "You",
      avatar: avatar1,
      ratingSeller: sellerRate,
      ratingDelivery: deliveryRate,
      comment: comment.trim(),
      createdAt: Date.now(),
    };

    setReviews((prev) => [newReview, ...prev]);
    setShowConfirm(false);
    setShowModal(false);
  };

  return (
    <div className="seller-review-page" dir={isArabic ? "rtl" : "ltr"}>
      <div className="container">
        <div className="sr-header">
          <h2 className="sr-title">{t("reviewsRatings") || "Reviews & Ratings"}</h2>
          <p className="sr-subtitle">
            {t("newestReviewsFirst") || "Newest reviews appear first."}
          </p>
        </div>

        <div className="sr-list">
          {reviews.map((r) => (
            <div key={r.id} className="sr-card">
              <div className="sr-top">
                <img className="sr-avatar" src={r.avatar} alt="client" />

                <div className="sr-meta">
                  <div className="sr-name">{r.name}</div>

                  <div className="sr-rates">
                    <div className="sr-rate-row">
                      <span className="sr-rate-label">{t("seller") || "Seller"}:</span>
                      <Stars value={r.ratingSeller} readOnly />
                    </div>

                    <div className="sr-rate-row">
                      <span className="sr-rate-label">{t("delivery") || "Delivery"}:</span>
                      <Stars value={r.ratingDelivery} readOnly />
                    </div>
                  </div>

                  <div className="sr-date">{formatDate(r.createdAt)}</div>
                </div>
              </div>

              <div className="sr-comment">{r.comment}</div>
            </div>
          ))}

          {reviews.length === 0 && (
            <div className="sr-empty">{t("noReviewsYet") || "No reviews yet."}</div>
          )}
        </div>

        <div className="sr-bottom-spacer" />
      </div>

      <div className="sr-sticky">
        <div className="container sr-sticky-inner">
          <button className="btn btn-primary sr-sticky-btn" onClick={openModal} type="button">
            {t("addReview") || "Add Review"}
          </button>
        </div>
      </div>

      {showModal && (
        <div className="sr-modal-backdrop" onMouseDown={closeModal}>
          <div className="sr-modal" onMouseDown={(e) => e.stopPropagation()}>
            <div className="sr-modal-header">
              <h3 className="sr-modal-title">{t("addAReview") || "Add a review"}</h3>

              <button className="sr-close" type="button" onClick={closeModal} aria-label="close">
                ✕
              </button>
            </div>

            <div className="sr-field">
              <div className="sr-field-row">
                <div className="sr-field-label">{t("yourReview") || "Your review"}</div>

                <div className={`sr-counter ${overLimit ? "danger" : ""}`}>
                  {wordCount}/100 {t("words") || "words"}
                </div>
              </div>

              <textarea
                className={`form-control sr-textarea ${overLimit ? "is-invalid" : ""}`}
                rows={4}
                placeholder={t("writeYourReview") || "Write your review..."}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />

              {overLimit && <div className="sr-error">{t("max100Words") || "Max 100 words."}</div>}
            </div>

            <div className="sr-field">
              <div className="sr-field-label">{t("sellerRate") || "Seller rate"}</div>
              <Stars value={sellerRate} onChange={setSellerRate} size={22} />
            </div>

            <div className="sr-field">
              <div className="sr-field-label">{t("deliveryRate") || "Delivery rate"}</div>
              <Stars value={deliveryRate} onChange={setDeliveryRate} size={22} />
            </div>

            {formError && <div className="sr-error">{formError}</div>}

            <div className="sr-modal-actions">
              <button className="btn btn-light" type="button" onClick={closeModal}>
                {t("cancel") || "Cancel"}
              </button>

              <button className="btn btn-primary" type="button" onClick={onSubmitClick}>
                {t("submit") || "Submit"}
              </button>
            </div>

            {showConfirm && (
              <div className="sr-modal-backdrop" onMouseDown={() => setShowConfirm(false)}>
                <div className="sr-modal" onMouseDown={(e) => e.stopPropagation()}>
                  <div className="sr-modal-header">
                    <h3 className="sr-modal-title">
                      {t("submitReviewQuestion") || "Submit review?"}
                    </h3>

                    <button
                      className="sr-close"
                      type="button"
                      onClick={() => setShowConfirm(false)}
                      aria-label="close"
                    >
                      ✕
                    </button>
                  </div>

                  <p className="mb-0">
                    {t("submitReviewConfirm") || "Are you sure you want to submit this review?"}
                  </p>

                  <div className="sr-modal-actions">
                    <button
                      className="btn btn-light"
                      type="button"
                      onClick={() => setShowConfirm(false)}
                    >
                      {t("no") || "No"}
                    </button>

                    <button className="btn btn-primary" type="button" onClick={submitReview}>
                      {t("yesSubmit") || "Yes, Submit"}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}