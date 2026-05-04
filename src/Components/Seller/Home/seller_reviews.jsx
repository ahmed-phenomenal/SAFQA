import React, { useEffect, useState } from "react";
import icon from "../../../assets/2.png";
import avatar from "../../../assets/1.png";
import "../seller.css";
import { getSellerReviews } from "../../../API/review";

const getStoredSellerId = () => {
  const keys = ["sellerId", "userId", "id"];

  for (const key of keys) {
    const value = localStorage.getItem(key) || sessionStorage.getItem(key);
    if (value && Number(value)) return Number(value);
  }

  const objects = ["seller", "user", "currentUser", "authUser"];

  for (const key of objects) {
    try {
      const raw = localStorage.getItem(key) || sessionStorage.getItem(key);
      if (!raw) continue;

      const parsed = JSON.parse(raw);
      const id = parsed?.sellerId || parsed?.SellerId || parsed?.userId || parsed?.id;
      if (id && Number(id)) return Number(id);
    } catch {
      // ignore invalid storage
    }
  }

  return 0;
};

export default function SellerReviews() {
  const [summary, setSummary] = useState({
    averageRating: 0,
    totalReviews: 0,
    reviews: [],
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const sellerId = getStoredSellerId();

  useEffect(() => {
    document.title = "Seller Reviews";

    const link = document.querySelector("link[rel~='icon']");
    if (link) link.href = icon;
  }, []);

  useEffect(() => {
    const loadSellerReviews = async () => {
      try {
        setLoading(true);
        setError("");

        if (!sellerId) {
          throw new Error("Seller ID is missing. Please login again.");
        }

        const data = await getSellerReviews(sellerId);
        setSummary(data);
      } catch (err) {
        setError(err?.message || "Failed to load seller reviews.");
      } finally {
        setLoading(false);
      }
    };

    loadSellerReviews();
  }, [sellerId]);

  const renderStars = (rating) => {
    const fullStars = Math.round(Number(rating || 0));

    return (
      <div className="seller-stars">
        {Array.from({ length: 5 }).map((_, i) => (
          <span
            key={i}
            className={
              i < fullStars
                ? "seller-star seller-star-filled"
                : "seller-star seller-star-empty"
            }
          >
            ★
          </span>
        ))}
      </div>
    );
  };

  const formatDate = (value) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "--";

    return date.toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="seller-profile">
      <div className="seller-profile-container">
        <h1 className="seller-profile-title py-5">MY REVIEWS</h1>

        <div className="seller-profile-card" style={{ marginBottom: 18 }}>
          <h4 style={{ margin: 0, color: "#023E8A", fontWeight: 900 }}>
            Average Rating: {summary.averageRating || 0} / 5
          </h4>
          <p style={{ margin: "8px 0 0", fontWeight: 800 }}>
            Total Reviews: {summary.totalReviews || 0}
          </p>
        </div>

        {error ? (
          <div className="seller-profile-card" style={{ color: "#cf1322", fontWeight: 800 }}>
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className="seller-profile-card" style={{ fontWeight: 800 }}>
            Loading reviews...
          </div>
        ) : summary.reviews.length ? (
          summary.reviews.map((item, index) => (
            <div
              className="seller-profile-card seller-profile-review-card"
              key={`${item.userName || "user"}-${index}`}
            >
              <div className="seller-profile-review-left">
                {item.userImage ? (
                  <img
                    src={item.userImage}
                    alt={item.userName || "user"}
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: "50%",
                      objectFit: "cover",
                      background: "#eef4ff",
                    }}
                  />
                ) : (
                  <img
                    src={avatar}
                    alt={item.userName || "user"}
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: "50%",
                      objectFit: "cover",
                      background: "#eef4ff",
                    }}
                  />
                )}

                <div>
                  <h4>{item.userName || "User"}</h4>
                  <p className="seller-profile-review-date">{formatDate(item.date)}</p>
                  <p className="seller-profile-review-text">{item.comment || "--"}</p>
                </div>
              </div>

              <div className="seller-profile-review-rating-box">
                {renderStars(item.rating)}
                <span>Rating: {item.rating || 0}</span>
              </div>
            </div>
          ))
        ) : (
          <div className="seller-profile-card" style={{ fontWeight: 800 }}>
            No reviews yet.
          </div>
        )}
      </div>
    </div>
  );
}