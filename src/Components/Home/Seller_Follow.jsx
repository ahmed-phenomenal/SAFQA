import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import icon from "../../assets/2.png";
import api from "../../API/axios";

// ── helpers ────────────────────────────────────────────────────────────────────
const toImageSrc = (value, fallback = "") => {
  const raw = String(value || "").trim();
  if (!raw) return fallback;
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
  if (raw.startsWith("data:image/")) return raw;
  const cleaned = raw.replace(/\s/g, "");
  const ok =
    cleaned.length > 20 &&
    /^[A-Za-z0-9+/=]+$/.test(cleaned) &&
    !cleaned.includes("{");
  if (!ok) return fallback;
  return `data:image/png;base64,${cleaned}`;
};

const formatDate = (value) => {
  if (!value) return "--";
  const d = new Date(value);
  if (isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
};

const StarRow = ({ value, onChange, readonly = false, size = 28 }) => (
  <div style={{ display: "flex", gap: 4 }}>
    {[1, 2, 3, 4, 5].map((n) => (
      <button
        key={n}
        type="button"
        onClick={() => !readonly && onChange && onChange(n)}
        style={{
          border: "none", background: "transparent", padding: 0,
          cursor: readonly ? "default" : "pointer",
          fontSize: size, lineHeight: 1,
          color: n <= value ? "#f59e0b" : "#d1d5db",
          transition: "color 0.15s, transform 0.12s",
        }}
        onMouseEnter={(e) => { if (!readonly) e.currentTarget.style.transform = "scale(1.15)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
      >
        ★
      </button>
    ))}
  </div>
);

// ── normalise seller response ──────────────────────────────────────────────────
const normalizeSeller = (data) => {
  const d = data?.data || data || {};
  return {
    userId:      d.userId      || d.UserId      || "",
    sellerId:    d.sellerId    || d.SellerId    || d.id || "",
    storeName:   d.storeName   || d.StoreName   || d.name || "Store",
    description: d.description || d.Description || "",
    city:        d.city        || d.City        || "",
    country:     d.country     || d.Country     || "",
    phone:       d.phone       || d.Phone       || "",
    email:       d.email       || d.Email       || "",
    logo:        toImageSrc(d.logo || d.Logo || d.storeLogo || d.image || ""),
    rating:      Number(d.rating      || d.Rating      || 0),
    followers:   Number(d.followers   || d.Followers   || d.followersCount || 0),
    auctions:    Number(d.auctions    || d.Auctions    || d.auctionsCount  || 0),
    isFollowing: Boolean(d.isFollowing || d.IsFollowing || false),
    verificationStatus: d.verificationStatus || d.VerificationStatus || "",
  };
};

const normalizeReviews = (data) => {
  const list = Array.isArray(data) ? data
    : Array.isArray(data?.data) ? data.data
    : Array.isArray(data?.reviews) ? data.reviews
    : [];
  return list.map((r) => ({
    id:           r.id           || r.reviewId   || Math.random(),
    buyerName:    r.buyerName    || r.BuyerName   || r.userName || "Buyer",
    buyerImage:   toImageSrc(r.buyerImage || r.BuyerImage || r.userImage || ""),
    sellerRate:   Number(r.sellerRate   || r.SellerRate   || r.rating || 0),
    deliveryRate: Number(r.deliveryRate || r.DeliveryRate || 0),
    comment:      r.comment      || r.Comment     || r.review || "",
    createdAt:    r.createdAt    || r.CreatedAt   || "",
  }));
};

// ── component ─────────────────────────────────────────────────────────────────
export default function SellerFollow() {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === "ar";
  const location = useLocation();
  const navigate = useNavigate();

  const params   = new URLSearchParams(location.search);
  const sellerId = params.get("sellerId") || params.get("id");

  const [seller,        setSeller]        = useState(null);
  const [reviews,       setReviews]       = useState([]);
  const [loadingSeller, setLoadingSeller] = useState(true);
  const [loadingReview, setLoadingReview] = useState(true);
  const [errorSeller,   setErrorSeller]   = useState("");

  const [followLoading,  setFollowLoading]  = useState(false);
  const [isFollowing,    setIsFollowing]    = useState(false);

  const [reviewPopup,    setReviewPopup]    = useState(false);
  const [sellerRate,     setSellerRate]     = useState(0);
  const [deliveryRate,   setDeliveryRate]   = useState(0);
  const [reviewText,     setReviewText]     = useState("");
  const [reviewLoading,  setReviewLoading]  = useState(false);
  const [reviewError,    setReviewError]    = useState("");
  const [reviewSuccess,  setReviewSuccess]  = useState(false);

  const auctionId = Number(params.get("auctionId") || 0);

  useEffect(() => {
    document.title = "Seller Profile";
    const link = document.querySelector("link[rel~='icon']");
    if (link) link.href = icon;
  }, []);

  // ── fetch seller ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!sellerId) { setErrorSeller("Seller ID is missing."); setLoadingSeller(false); return; }
    const load = async () => {
      try {
        setLoadingSeller(true); setErrorSeller("");
        let res;
        try {
          res = await api.get(`/seller/business-account?sellerid=${sellerId}`);
        } catch {
          res = await api.get(`/seller/seller/${sellerId}`);
        }
        const s = normalizeSeller(res?.data);
        setSeller(s);
        setIsFollowing(s.isFollowing);
      } catch (err) {
        setErrorSeller(err?.response?.data?.message || err?.message || "Failed to load seller.");
      } finally { setLoadingSeller(false); }
    };
    load();
  }, [sellerId]);

  // ── fetch reviews ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!sellerId) return;
    const load = async () => {
      try {
        setLoadingReview(true);
        const res = await api.get(`/Review/${sellerId}`);
        setReviews(normalizeReviews(res?.data));
      } catch { setReviews([]); }
      finally { setLoadingReview(false); }
    };
    load();
  }, [sellerId]);

const handleFollow = async () => {
  if (!sellerId || followLoading) return;
  try {
    setFollowLoading(true);
    if (isFollowing) {
      await api.delete(`/User/Unfollow/${sellerId}`);
      setIsFollowing(false);
      setSeller((prev) => prev ? { ...prev, followers: Math.max(0, prev.followers - 1), isFollowing: false } : prev);
    } else {
      try {
        await api.post("/User/Follow", { sellerId: Number(sellerId) });
      } catch (err) {
        const msg = (err?.response?.data?.message || err?.message || "").toLowerCase();
        // ── If already following, just sync the UI without alerting ──
        if (msg.includes("already follow") || msg.includes("already following")) {
          setIsFollowing(true);
          setSeller((prev) => prev ? { ...prev, isFollowing: true } : prev);
          return;
        }
        throw err; // re-throw real errors
      }
      setIsFollowing(true);
      setSeller((prev) => prev ? { ...prev, followers: prev.followers + 1, isFollowing: true } : prev);
    }
  } catch (err) {
    alert(err?.response?.data?.message || err?.message || "Action failed.");
  } finally {
    setFollowLoading(false); 
  }
};

  // ── submit review ───────────────────────────────────────────────────────────
  const handleSubmitReview = async () => {
    if (!sellerRate)        { setReviewError(t("pleaseSelectSellerRate", "Please select a rating.")); return; }
    if (!reviewText.trim()) { setReviewError(t("pleaseWriteReview",      "Please write a review.")); return; }

    try {
      setReviewLoading(true);
      setReviewError("");

      await api.post("/Review/add", {
        auctionId: Number(auctionId),
        rating:    Number(sellerRate),
        comment:   reviewText.trim(),
      });

      setReviewSuccess(true);
      setSellerRate(0);
      setDeliveryRate(0);
      setReviewText("");

      const res = await api.get(`/Review/${sellerId}`);
      setReviews(normalizeReviews(res?.data));

      setTimeout(() => {
        setReviewSuccess(false);
        setReviewPopup(false);
      }, 1800);
    } catch (err) {
      const raw = err?.response?.data?.message ||
                  err?.response?.data?.error   ||
                  err?.message || "";

      const isNotWinner =
        raw.toLowerCase().includes("not allowed")   ||
        raw.toLowerCase().includes("not the winner")||
        raw.toLowerCase().includes("winner")        ||
        raw.toLowerCase().includes("unauthorized")  ||
        raw.toLowerCase().includes("forbidden")     ||
        String(err?.response?.status) === "403"     ||
        String(err?.response?.status) === "401";

      setReviewError(
        isNotWinner
          ? t("onlyWinnerCanReview", "Only the auction winner can leave a review for this auction.")
          : raw || t("failedToSubmitReview", "Failed to submit review. Please try again.")
      );
    } finally {
      setReviewLoading(false);
    }
  };

  const avgRating = reviews.length
    ? (reviews.reduce((s, r) => s + r.sellerRate, 0) / reviews.length).toFixed(1)
    : "—";

  // ── render ─────────────────────────────────────────────────────────────────
  return (
    <div className="sp-page" dir={isArabic ? "rtl" : "ltr"}>
      <style>{css(isArabic)}</style>

      {loadingSeller ? (
        <div className="sp-shell">
          <div className="sp-hero-skeleton">
            <div className="sp-sk sp-sk-avatar" />
            <div style={{ flex: 1 }}>
              <div className="sp-sk sp-sk-line" style={{ width: 180, marginBottom: 12 }} />
              <div className="sp-sk sp-sk-line" style={{ width: 120 }} />
            </div>
          </div>
        </div>
      ) : errorSeller ? (
        <div className="sp-shell">
          <div className="sp-error-card">{errorSeller}</div>
        </div>
      ) : seller ? (
        <div className="sp-shell">

          {/* ── HERO CARD ── */}
          <div className="sp-hero">
            <div className="sp-hero-bg" />
            <div className="sp-hero-body">
              <div className="sp-avatar-wrap">
                {seller.logo ? (
                  <img src={seller.logo} alt={seller.storeName} className="sp-avatar" />
                ) : (
                  <div className="sp-avatar sp-avatar-placeholder">
                    <i className="fa-solid fa-store" />
                  </div>
                )}
                {seller.verificationStatus === "Verified" || seller.verificationStatus === "verified" ? (
                  <span className="sp-verified-badge" title="Verified">
                    <i className="fa-solid fa-circle-check" />
                  </span>
                ) : null}
              </div>

              <div className="sp-hero-info">
                <h1 className="sp-store-name">{seller.storeName}</h1>
                {seller.description ? (
                  <p className="sp-store-desc">{seller.description}</p>
                ) : null}
                <div className="sp-meta-chips">
                  {seller.country ? (
                    <span className="sp-chip">
                      <i className="fa-solid fa-location-dot" /> {seller.country}{seller.city ? `, ${seller.city}` : ""}
                    </span>
                  ) : null}
                  {seller.phone ? (
                    <span className="sp-chip">
                      <i className="fa-solid fa-phone" /> {seller.phone}
                    </span>
                  ) : null}
                  {seller.email ? (
                    <span className="sp-chip">
                      <i className="fa-solid fa-envelope" /> {seller.email}
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="sp-hero-actions">
                <button
                  className={`sp-follow-btn ${isFollowing ? "sp-follow-btn--active" : ""}`}
                  onClick={handleFollow}
                  disabled={followLoading}
                >
                  {followLoading ? (
                    <span className="sp-btn-spinner" />
                  ) : (
                    <i className={`fa-${isFollowing ? "solid" : "regular"} fa-heart`} />
                  )}
                  {isFollowing ? t("unfollow", "Unfollow") : t("follow", "Follow")}
                </button>

                <button
                  className="sp-review-btn"
                  onClick={() => { setReviewPopup(true); setReviewError(""); setReviewSuccess(false); }}
                >
                  <i className="fa-solid fa-star" />
                  {t("addReview", "Add Review")}
                </button>
              </div>
            </div>

            <div className="sp-stats-bar">
              <div className="sp-stat">
                <strong>{seller.followers}</strong>
                <span>{t("followers", "Followers")}</span>
              </div>
              <div className="sp-stat-divider" />
              <div className="sp-stat">
                <strong>{seller.auctions}</strong>
                <span>{t("auctions", "Auctions")}</span>
              </div>
              <div className="sp-stat-divider" />
              <div className="sp-stat">
                <strong>{avgRating}</strong>
                <span>{t("rating", "Rating")}</span>
              </div>
              <div className="sp-stat-divider" />
              <div className="sp-stat">
                <strong>{reviews.length}</strong>
                <span>{t("reviewsRatings", "Reviews")}</span>
              </div>
            </div>
          </div>

          {/* ── REVIEWS ── */}
          <div className="sp-section">
            <h2 className="sp-section-title">
              <i className="fa-solid fa-star" /> {t("reviewsRatings", "Reviews & Ratings")}
            </h2>

            {loadingReview ? (
              <div className="sp-reviews-grid">
                {[1, 2, 3].map((n) => (
                  <div className="sp-review-card sp-review-skeleton" key={n}>
                    <div className="sp-sk sp-sk-avatar-sm" />
                    <div style={{ flex: 1 }}>
                      <div className="sp-sk sp-sk-line" style={{ width: "60%", marginBottom: 8 }} />
                      <div className="sp-sk sp-sk-line" style={{ width: "90%" }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : reviews.length === 0 ? (
              <div className="sp-empty">
                <i className="fa-regular fa-comment-dots" />
                <p>{t("noReviewsYet", "No reviews yet.")}</p>
              </div>
            ) : (
              <div className="sp-reviews-grid">
                {reviews.map((r) => (
                  <div className="sp-review-card" key={r.id}>
                    <div className="sp-review-top">
                      {r.buyerImage ? (
                        <img src={r.buyerImage} alt={r.buyerName} className="sp-reviewer-avatar" />
                      ) : (
                        <div className="sp-reviewer-avatar sp-reviewer-placeholder">
                          <i className="fa-regular fa-user" />
                        </div>
                      )}
                      <div className="sp-reviewer-info">
                        <p className="sp-reviewer-name">{r.buyerName}</p>
                        <p className="sp-review-date">{formatDate(r.createdAt)}</p>
                      </div>
                    </div>

                    <div className="sp-review-rates">
                      <div className="sp-rate-row">
                        <span className="sp-rate-label">{t("seller", "Seller")}</span>
                        <StarRow value={r.sellerRate} readonly size={16} />
                      </div>
                      {r.deliveryRate > 0 ? (
                        <div className="sp-rate-row">
                          <span className="sp-rate-label">{t("delivery", "Delivery")}</span>
                          <StarRow value={r.deliveryRate} readonly size={16} />
                        </div>
                      ) : null}
                    </div>

                    {r.comment ? (
                      <p className="sp-review-comment">"{r.comment}"</p>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : null}

      {/* ── REVIEW POPUP ── */}
      {reviewPopup && (
        <div className="sp-overlay" onClick={() => { if (!reviewLoading) setReviewPopup(false); }}>
          <div className="sp-popup" onClick={(e) => e.stopPropagation()}>
            <button
              className="sp-popup-close"
              onClick={() => setReviewPopup(false)}
              disabled={reviewLoading}
            >×</button>

            {reviewSuccess ? (
              <div className="sp-popup-success">
                <div className="sp-success-icon"><i className="fa-solid fa-check" /></div>
                <p>{t("reviewSentSuccessfully", "Your review has been sent successfully.")}</p>
              </div>
            ) : (
              <>
                <h3 className="sp-popup-title">
                  <i className="fa-solid fa-star" /> {t("addAReview", "Add a Review")}
                </h3>

                {/* ── Winner-only notice ── */}
                <div className="sp-winner-note">
                  🏆 {t("onlyWinnerCanReviewNote", "Only the auction winner can submit a review.")}
                </div>

                <div className="sp-popup-field">
                  <label className="sp-popup-label">{t("sellerRate", "Seller Rate")}</label>
                  <StarRow value={sellerRate} onChange={setSellerRate} size={32} />
                </div>

                <div className="sp-popup-field">
                  <label className="sp-popup-label">{t("deliveryRate", "Delivery Rate")}</label>
                  <StarRow value={deliveryRate} onChange={setDeliveryRate} size={32} />
                </div>

                <div className="sp-popup-field">
                  <label className="sp-popup-label">{t("yourReview", "Your Review")}</label>
                  <textarea
                    className="sp-popup-textarea"
                    placeholder={t("writeYourReview", "Write your review...")}
                    value={reviewText}
                    maxLength={500}
                    onChange={(e) => setReviewText(e.target.value)}
                  />
                  <div className="sp-popup-counter">
                    {reviewText.trim().split(/\s+/).filter(Boolean).length} {t("words", "words")}
                  </div>
                </div>

                {reviewError ? <p className="sp-popup-error">{reviewError}</p> : null}

                <button
                  className="sp-popup-submit"
                  disabled={reviewLoading}
                  onClick={handleSubmitReview}
                >
                  {reviewLoading ? <span className="sp-btn-spinner" /> : <i className="fa-solid fa-paper-plane" />}
                  {reviewLoading ? t("sending", "Sending...") : t("sendReview", "Send Review")}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── styles ────────────────────────────────────────────────────────────────────
const css = (isArabic) => `
  .sp-page {
    min-height: 100vh;
    padding-top: 30px;
    padding-bottom: 60px;
    background: var(--bg, #f4f7fb);
    color: var(--text, #111827);
    font-family: Arial, Helvetica, sans-serif;
    box-sizing: border-box;
  }

  .sp-page * { box-sizing: border-box; }

  .sp-back-row {
    width: min(94%, 1100px);
    margin: 0 auto 18px;
  }

  .sp-back-btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    border: none;
    background: transparent;
    color: #023E8A;
    font-size: 15px;
    font-weight: 800;
    cursor: pointer;
    padding: 8px 0;
    transition: opacity 0.2s;
  }

  .sp-back-btn:hover { opacity: 0.7; }

  .sp-shell {
    width: min(94%, 1100px);
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 24px;
  }

  .sp-hero {
    background: var(--card, #fff);
    border: 1px solid var(--border, #e5e7eb);
    border-radius: 24px;
    overflow: hidden;
    box-shadow: 0 12px 40px rgba(2,62,138,0.08);
  }

  .sp-hero-bg {
    height: 130px;
    background: linear-gradient(135deg, #023E8A 0%, #0466c8 50%, #0096c7 100%);
  }

  .sp-hero-body {
    display: grid;
    grid-template-columns: auto 1fr auto;
    gap: 20px;
    align-items: flex-start;
    padding: 0 28px 20px;
    margin-top: -52px;
  }

  .sp-avatar-wrap { position: relative; flex-shrink: 0; }

  .sp-avatar {
    width: 104px; height: 104px;
    border-radius: 20px; object-fit: cover;
    border: 4px solid var(--card, #fff);
    box-shadow: 0 8px 24px rgba(0,0,0,0.14);
    background: #e8f1ff;
  }

  .sp-avatar-placeholder {
    display: flex; align-items: center; justify-content: center;
    font-size: 40px; color: #023E8A; background: #e8f1ff !important;
  }

  .sp-verified-badge {
    position: absolute; bottom: -4px; right: -4px;
    width: 26px; height: 26px; border-radius: 50%;
    background: #fff; display: flex; align-items: center; justify-content: center;
    font-size: 18px; color: #16a34a; border: 2px solid #fff;
  }

  .sp-hero-info { padding-top: 58px; min-width: 0; }

  .sp-store-name {
    margin: 0 0 6px; font-size: 26px; font-weight: 900;
    color: var(--text, #111827); line-height: 1.2;
  }

  .sp-store-desc {
    margin: 0 0 12px; color: var(--text-soft, #6b7280);
    font-size: 14px; line-height: 1.6; max-width: 560px;
  }

  .sp-meta-chips { display: flex; flex-wrap: wrap; gap: 8px; }

  .sp-chip {
    display: inline-flex; align-items: center; gap: 6px;
    background: #e8f1ff; color: #023E8A;
    border-radius: 999px; padding: 5px 12px;
    font-size: 12px; font-weight: 700;
  }

  .sp-hero-actions {
    display: flex; flex-direction: column; gap: 10px;
    padding-top: 58px; min-width: 140px;
  }

  .sp-follow-btn, .sp-review-btn {
    display: inline-flex; align-items: center; justify-content: center;
    gap: 8px; border: none; border-radius: 12px;
    font-size: 14px; font-weight: 900; padding: 11px 18px;
    cursor: pointer;
    transition: transform 0.15s, opacity 0.15s, background 0.2s;
    white-space: nowrap;
  }

  .sp-follow-btn { background: #023E8A; color: #fff; }
  .sp-follow-btn--active { background: #fee2e2; color: #b91c1c; }
  .sp-follow-btn:hover { opacity: 0.88; transform: translateY(-1px); }
  .sp-follow-btn:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }

  .sp-review-btn { background: #f0fdf4; color: #16a34a; border: 1px solid #bbf7d0; }
  .sp-review-btn:hover { background: #dcfce7; transform: translateY(-1px); }

  .sp-stats-bar {
    display: flex; align-items: stretch;
    border-top: 1px solid var(--border, #e5e7eb);
    padding: 18px 28px; gap: 0;
  }

  .sp-stat { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 4px; text-align: center; }
  .sp-stat strong { font-size: 22px; font-weight: 900; color: #023E8A; }
  .sp-stat span { font-size: 12px; font-weight: 700; color: var(--text-soft, #6b7280); text-transform: uppercase; letter-spacing: 0.5px; }
  .sp-stat-divider { width: 1px; background: var(--border, #e5e7eb); margin: 0 8px; }

  .sp-section {
    background: var(--card, #fff);
    border: 1px solid var(--border, #e5e7eb);
    border-radius: 20px; padding: 24px;
    box-shadow: 0 8px 24px rgba(2,62,138,0.06);
  }

  .sp-section-title {
    margin: 0 0 20px; font-size: 20px; font-weight: 900;
    color: #023E8A; display: flex; align-items: center; gap: 10px;
  }

  .sp-reviews-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 16px;
  }

  .sp-review-card {
    background: var(--card-soft, #f8fafc);
    border: 1px solid var(--border, #e5e7eb);
    border-radius: 16px; padding: 16px;
    display: flex; flex-direction: column; gap: 12px;
    transition: transform 0.15s, box-shadow 0.15s;
  }

  .sp-review-card:hover { transform: translateY(-2px); box-shadow: 0 10px 28px rgba(2,62,138,0.08); }

  .sp-review-top { display: flex; align-items: center; gap: 12px; }

  .sp-reviewer-avatar {
    width: 44px; height: 44px; border-radius: 50%;
    object-fit: cover; flex-shrink: 0; border: 2px solid #e8f1ff;
  }

  .sp-reviewer-placeholder {
    background: #e8f1ff; display: flex; align-items: center;
    justify-content: center; font-size: 18px; color: #023E8A;
  }

  .sp-reviewer-name { margin: 0 0 3px; font-weight: 900; font-size: 15px; color: var(--text, #111827); }
  .sp-review-date { margin: 0; font-size: 12px; color: var(--text-soft, #6b7280); }

  .sp-review-rates { display: flex; flex-direction: column; gap: 6px; }
  .sp-rate-row { display: flex; align-items: center; gap: 10px; }
  .sp-rate-label { font-size: 12px; font-weight: 800; color: var(--text-soft, #6b7280); min-width: 56px; text-transform: uppercase; }

  .sp-review-comment {
    margin: 0; font-size: 13px; color: var(--text, #374151);
    line-height: 1.6; font-style: italic;
    border-left: 3px solid #e8f1ff; padding-left: 10px;
  }

  .sp-empty { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 40px 20px; color: var(--text-soft, #9ca3af); text-align: center; }
  .sp-empty i { font-size: 44px; color: #d1d5db; }
  .sp-empty p { margin: 0; font-size: 15px; font-weight: 700; }

  .sp-overlay {
    position: fixed; inset: 0; background: rgba(0,0,0,0.55);
    z-index: 99999; display: flex; align-items: center; justify-content: center; padding: 18px;
  }

  .sp-popup {
    width: min(100%, 460px); background: var(--card, #fff);
    border-radius: 20px; padding: 24px; position: relative;
    box-shadow: 0 28px 70px rgba(0,0,0,0.3);
    border: 1px solid var(--border, #e5e7eb);
  }

  .sp-popup-close {
    position: absolute; top: 14px;
    ${isArabic ? "left: 14px;" : "right: 14px;"}
    border: none; background: transparent; color: #ef4444;
    font-size: 28px; cursor: pointer; line-height: 1;
  }

  .sp-popup-title { margin: 0 0 14px; font-size: 20px; font-weight: 900; color: #023E8A; display: flex; align-items: center; gap: 10px; }

  /* ── winner note ── */
  .sp-winner-note {
    display: flex; align-items: center; gap: 8px;
    background: #fffbe6; color: #92400e;
    border: 1px solid #fcd34d; border-radius: 10px;
    padding: 10px 14px; margin-bottom: 18px;
    font-size: 13px; font-weight: 700;
  }

  .sp-popup-field { margin-bottom: 18px; display: flex; flex-direction: column; gap: 8px; }

  .sp-popup-label { font-size: 13px; font-weight: 900; color: var(--text-soft, #374151); text-transform: uppercase; letter-spacing: 0.4px; }

  .sp-popup-textarea {
    width: 100%; min-height: 110px;
    border: 1px solid var(--border, #d1d5db);
    border-radius: 12px; padding: 12px 14px;
    font-size: 14px; font-weight: 600; resize: vertical;
    outline: none; background: var(--card-soft, #f8fafc);
    color: var(--text, #111827); font-family: inherit;
    transition: border-color 0.2s;
  }

  .sp-popup-textarea:focus { border-color: #023E8A; }
  .sp-popup-counter { font-size: 12px; color: var(--text-soft, #9ca3af); text-align: end; }
  .sp-popup-error {
    color: #dc2626; font-size: 13px; font-weight: 800;
    margin: 0 0 12px; text-align: center;
    background: #fff1f0; border: 1px solid #fca5a5;
    border-radius: 8px; padding: 10px 12px;
  }

  .sp-popup-submit {
    width: 100%; min-height: 50px; border: none; border-radius: 12px;
    background: #023E8A; color: #fff; font-size: 16px; font-weight: 900;
    cursor: pointer; display: flex; align-items: center; justify-content: center;
    gap: 10px; transition: opacity 0.2s, transform 0.15s;
  }

  .sp-popup-submit:hover { opacity: 0.9; transform: translateY(-1px); }
  .sp-popup-submit:disabled { opacity: 0.65; cursor: not-allowed; transform: none; }

  .sp-popup-success { display: flex; flex-direction: column; align-items: center; gap: 16px; padding: 20px 0 10px; text-align: center; }

  .sp-success-icon {
    width: 58px; height: 58px; border-radius: 50%;
    background: #22c55e; color: #fff;
    display: flex; align-items: center; justify-content: center;
    font-size: 26px; font-weight: 900;
  }

  .sp-popup-success p { margin: 0; font-size: 16px; font-weight: 800; color: var(--text, #111827); }

  .sp-btn-spinner {
    width: 18px; height: 18px;
    border: 3px solid rgba(255,255,255,0.35); border-top-color: #fff;
    border-radius: 50%; animation: spSpin 0.7s linear infinite;
    display: inline-block; flex-shrink: 0;
  }

  @keyframes spSpin { to { transform: rotate(360deg); } }

  .sp-sk {
    background: linear-gradient(90deg, #eceff5 25%, #f7f8fb 37%, #eceff5 63%);
    background-size: 400% 100%;
    animation: spShimmer 1.4s ease infinite;
    border-radius: 8px;
  }

  @keyframes spShimmer { 0% { background-position: 100% 0; } 100% { background-position: -100% 0; } }

  .sp-sk-avatar    { width: 104px; height: 104px; border-radius: 20px; flex-shrink: 0; }
  .sp-sk-avatar-sm { width: 44px;  height: 44px;  border-radius: 50%; flex-shrink: 0; }
  .sp-sk-line      { height: 14px; border-radius: 999px; }

  .sp-hero-skeleton {
    display: flex; gap: 20px; align-items: center; padding: 28px;
    background: var(--card, #fff); border-radius: 24px;
    border: 1px solid var(--border, #e5e7eb);
  }

  .sp-review-skeleton { display: flex; gap: 12px; align-items: center; pointer-events: none; }

  .sp-error-card {
    background: #fff1f0; color: #b91c1c;
    border: 1px solid #fca5a5; border-radius: 16px;
    padding: 20px 24px; font-weight: 800;
  }

  [data-theme="dark"] .sp-page { background: #000; color: #f5f5f5; }
  [data-theme="dark"] .sp-hero,
  [data-theme="dark"] .sp-section,
  [data-theme="dark"] .sp-popup { background: #111 !important; border-color: #222 !important; }
  [data-theme="dark"] .sp-review-card { background: #0d0d0d !important; border-color: #222 !important; }
  [data-theme="dark"] .sp-popup-textarea { background: #000 !important; color: #fff !important; border-color: #333 !important; }
  [data-theme="dark"] .sp-chip { background: #1a2744; color: #7bb3ff; }
  [data-theme="dark"] .sp-sk { background: linear-gradient(90deg,#1c1c1c 25%,#2a2a2a 37%,#1c1c1c 63%); background-size:400% 100%; }
  [data-theme="dark"] .sp-store-name { color: #f5f5f5; }
  [data-theme="dark"] .sp-review-comment { border-left-color: #1a2744; }
  [data-theme="dark"] .sp-winner-note { background: #2a1f00; color: #fcd34d; border-color: #78350f; }

  @media (max-width: 860px) {
    .sp-hero-body { grid-template-columns: auto 1fr; }
    .sp-hero-actions { grid-column: 1 / -1; flex-direction: row; padding-top: 0; }
    .sp-follow-btn, .sp-review-btn { flex: 1; }
  }

  @media (max-width: 600px) {
    .sp-page { padding-top: 20px; }
    .sp-hero-body { grid-template-columns: 1fr; padding: 0 16px 16px; }
    .sp-hero-info { padding-top: 14px; }
    .sp-hero-actions { padding-top: 0; }
    .sp-avatar { width: 80px; height: 80px; border-radius: 16px; }
    .sp-stats-bar { padding: 14px 16px; gap: 0; }
    .sp-stat strong { font-size: 18px; }
    .sp-reviews-grid { grid-template-columns: 1fr; }
    .sp-section { padding: 16px; }
    .sp-store-name { font-size: 21px; }
  }
`;