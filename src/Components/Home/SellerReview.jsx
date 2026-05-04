import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";

import icon from "../../assets/2.png";
import avatar from "../../assets/1.png";
import { addReview, getSellerReviews } from "../../API/review";

export default function SellerReview() {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === "ar";
  const location = useLocation();

  const params = new URLSearchParams(location.search);

  const sellerId = Number(params.get("sellerId") || 0);
  const auctionId = Number(params.get("auctionId") || 0);

  const [summary, setSummary] = useState({
    averageRating: 0,
    totalReviews: 0,
    reviews: [],
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [comment, setComment] = useState("");
  const [rating, setRating] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    document.title = t("reviewsDocTitle") || "Review & Ratings";

    const link = document.querySelector("link[rel~='icon']");
    if (link) link.href = icon;
  }, [t]);

  const loadReviews = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      if (!sellerId || sellerId <= 0) {
        throw new Error("Seller ID is missing or invalid.");
      }

      const data = await getSellerReviews(sellerId);
      setSummary(data);
    } catch (err) {
      setError(err?.message || "Failed to load reviews.");
    } finally {
      setLoading(false);
    }
  }, [sellerId]);

  useEffect(() => {
    loadReviews();
  }, [loadReviews]);

  const wordCount = useMemo(() => {
    const trimmed = comment.trim();
    return trimmed ? trimmed.split(/\s+/).filter(Boolean).length : 0;
  }, [comment]);

  const Stars = ({ value, onChange, readOnly = false, size = 22 }) => (
    <div className="sr-stars">
      {[1, 2, 3, 4, 5].map((s) => (
        <button
          key={s}
          type="button"
          className={`sr-star-btn ${s <= Number(value || 0) ? "active" : ""}`}
          style={{ fontSize: size }}
          disabled={readOnly}
          aria-label={`${s} star`}
          onClick={() => {
            if (!readOnly) onChange?.(s);
          }}
        >
          ★
        </button>
      ))}
    </div>
  );

  const openModal = () => {
    setError("");
    setSuccess("");

    if (!auctionId || auctionId <= 0) {
      setError("Auction ID is missing. Open this page from auction details with ?auctionId=ID.");
      return;
    }

    setComment("");
    setRating(0);
    setShowModal(true);
  };

  const submitReview = async () => {
    if (submitting) return;

    try {
      setError("");
      setSuccess("");

      const cleanComment = comment.trim();

      if (!auctionId || auctionId <= 0) {
        throw new Error("Auction ID is missing or invalid.");
      }

      if (!rating || rating < 1 || rating > 5) {
        throw new Error("Please select a rating from 1 to 5.");
      }

      if (!cleanComment) {
        throw new Error("Please write a review.");
      }

      if (wordCount > 100) {
        throw new Error("Max 100 words.");
      }

      setSubmitting(true);

      const res = await addReview({
        auctionId,
        rating,
        comment: cleanComment,
      });

      setSuccess(res?.message || res?.Message || "Review added successfully.");
      setShowModal(false);
      setComment("");
      setRating(0);

      await loadReviews();
    } catch (err) {
      // Keep modal open so user can fix the issue.
      setError(err?.message || "You are not allowed to review this auction.");
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (value) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "--";
    return date.toLocaleString(isArabic ? "ar-EG" : "en-GB");
  };

  const reviews = Array.isArray(summary.reviews) ? summary.reviews : [];

  return (
    <div className="seller-review-page" dir={isArabic ? "rtl" : "ltr"}>
      <style>{`
        .seller-review-page {
          min-height: 100vh;
          background: #f5f6fa;
          padding: 36px 0 100px;
          font-family: Arial, Helvetica, sans-serif;
        }

        .sr-container {
          width: min(1000px, 94%);
          margin: 0 auto;
        }

        .sr-header {
          background: #fff;
          border-radius: 22px;
          padding: 24px;
          box-shadow: 0 8px 24px rgba(0,0,0,0.06);
          margin-bottom: 20px;
          text-align: center;
        }

        .sr-title {
          margin: 0 0 8px;
          color: #023E8A;
          font-size: 34px;
          font-weight: 900;
        }

        .sr-summary {
          color: #334155;
          font-size: 16px;
          font-weight: 800;
        }

        .sr-card {
          background: #fff;
          border-radius: 20px;
          padding: 20px;
          box-shadow: 0 6px 20px rgba(0,0,0,0.06);
          border: 1px solid #eef2f7;
          margin-bottom: 16px;
        }

        .sr-top {
          display: flex;
          gap: 14px;
          align-items: flex-start;
        }

        .sr-avatar {
          width: 58px;
          height: 58px;
          border-radius: 50%;
          object-fit: cover;
          background: #eef4ff;
        }

        .sr-name {
          color: #111827;
          font-size: 18px;
          font-weight: 900;
          margin-bottom: 6px;
        }

        .sr-date {
          color: #64748b;
          font-size: 13px;
          font-weight: 700;
          margin-top: 6px;
        }

        .sr-comment {
          margin-top: 14px;
          color: #334155;
          line-height: 1.7;
          font-size: 15px;
          overflow-wrap: anywhere;
        }

        .sr-stars {
          display: flex;
          gap: 3px;
        }

        .sr-star-btn {
          border: none;
          background: transparent;
          color: #cbd5e1;
          cursor: pointer;
          padding: 0;
          line-height: 1;
        }

        .sr-star-btn.active {
          color: #f59e0b;
        }

        .sr-star-btn:disabled {
          cursor: default;
        }

        .sr-error {
          background: #fff1f0;
          color: #cf1322;
          border: 1px solid #ffa39e;
          border-radius: 12px;
          padding: 12px 14px;
          margin-bottom: 14px;
          font-weight: 700;
          overflow-wrap: anywhere;
        }

        .sr-success {
          background: #f6ffed;
          color: #237804;
          border: 1px solid #b7eb8f;
          border-radius: 12px;
          padding: 12px 14px;
          margin-bottom: 14px;
          font-weight: 700;
        }

        .sr-empty {
          background: #fff;
          border-radius: 18px;
          padding: 30px;
          text-align: center;
          color: #64748b;
          font-weight: 800;
        }

        .sr-sticky {
          position: fixed;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(255,255,255,0.92);
          border-top: 1px solid #e5e7eb;
          padding: 14px;
          backdrop-filter: blur(8px);
          z-index: 1000;
        }

        .sr-add-btn,
        .sr-submit-btn,
        .sr-cancel-btn {
          border: none;
          border-radius: 12px;
          min-height: 48px;
          padding: 0 20px;
          font-weight: 900;
          cursor: pointer;
        }

        .sr-add-btn,
        .sr-submit-btn {
          background: #023E8A;
          color: #fff;
        }

        .sr-submit-btn:disabled {
          opacity: 0.65;
          cursor: not-allowed;
        }

        .sr-cancel-btn {
          background: #eef2ff;
          color: #023E8A;
        }

        .sr-modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.55);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 99999;
          padding: 16px;
        }

        .sr-modal {
          width: min(520px, 100%);
          background: #fff;
          border-radius: 20px;
          padding: 22px;
          box-shadow: 0 24px 70px rgba(0,0,0,0.35);
        }

        .sr-modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }

        .sr-modal-title {
          margin: 0;
          color: #023E8A;
          font-size: 22px;
          font-weight: 900;
        }

        .sr-close {
          border: none;
          background: transparent;
          color: #ef4444;
          font-size: 26px;
          cursor: pointer;
        }

        .sr-textarea {
          width: 100%;
          min-height: 120px;
          border: 1px solid #d1d5db;
          border-radius: 14px;
          padding: 14px;
          resize: vertical;
          outline: none;
          margin: 14px 0 6px;
          box-sizing: border-box;
        }

        .sr-counter {
          color: #64748b;
          font-size: 13px;
          font-weight: 700;
          margin-bottom: 12px;
        }

        .sr-counter.danger {
          color: #cf1322;
        }

        .sr-actions {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          margin-top: 18px;
        }
      `}</style>

      <div className="sr-container">
        <div className="sr-header">
          <h2 className="sr-title">Reviews & Ratings</h2>
          <div className="sr-summary">
            Average: {Number(summary.averageRating || 0).toFixed(1)} / 5 — Total:{" "}
            {summary.totalReviews || 0}
          </div>
        </div>

        {error ? <div className="sr-error">{error}</div> : null}
        {success ? <div className="sr-success">{success}</div> : null}

        {loading ? (
          <div className="sr-empty">Loading reviews...</div>
        ) : reviews.length ? (
          reviews.map((r, index) => (
            <div className="sr-card" key={`${r.id || r.reviewId || r.userName || "user"}-${index}`}>
              <div className="sr-top">
                <img
                  className="sr-avatar"
                  src={r.userImage || r.UserImage || avatar}
                  alt={r.userName || r.UserName || "user"}
                />

                <div>
                  <div className="sr-name">{r.userName || r.UserName || "User"}</div>
                  <Stars value={Number(r.rating || r.Rating || 0)} readOnly />
                  <div className="sr-date">{formatDate(r.date || r.Date || r.createdAt || r.CreatedAt)}</div>
                </div>
              </div>

              <div className="sr-comment">{r.comment || r.Comment || "--"}</div>
            </div>
          ))
        ) : (
          <div className="sr-empty">No reviews yet.</div>
        )}
      </div>

      <div className="sr-sticky">
        <div className="sr-container">
          <button type="button" className="sr-add-btn" onClick={openModal}>
            Add Review
          </button>
        </div>
      </div>

      {showModal && (
        <div className="sr-modal-backdrop" onMouseDown={() => setShowModal(false)}>
          <div className="sr-modal" onMouseDown={(e) => e.stopPropagation()}>
            <div className="sr-modal-header">
              <h3 className="sr-modal-title">Add Review</h3>
              <button type="button" className="sr-close" onClick={() => setShowModal(false)}>
                ×
              </button>
            </div>

            <Stars value={rating} onChange={setRating} size={30} />

            <textarea
              className="sr-textarea"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Write your review..."
              maxLength={1000}
            />

            <div className={`sr-counter ${wordCount > 100 ? "danger" : ""}`}>
              {wordCount}/100 words
            </div>

            <div className="sr-actions">
              <button type="button" className="sr-cancel-btn" onClick={() => setShowModal(false)}>
                Cancel
              </button>

              <button
                type="button"
                className="sr-submit-btn"
                onClick={submitReview}
                disabled={submitting}
              >
                {submitting ? "Submitting..." : "Submit"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}