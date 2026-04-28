import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import icon from "../../../assets/2.png";
import "../seller.css";

export default function SellerReviews() {
  const [reviews] = useState([
    {
      id: 1,
      name: "Mariam Hassan",
      date: "2 days ago",
      rating: 5,
      review:
        "Amazing seller. Fast shipping and product exactly as described.",
      item: "Vintage Camera",
      orderId: "#SH-1024",
    },
    {
      id: 2,
      name: "Youssef Ali",
      date: "5 days ago",
      rating: 4.8,
      review: "Great communication and very professional packaging.",
      item: "Gaming Headset",
      orderId: "#SH-1025",
    },
    {
      id: 3,
      name: "Nour Ahmed",
      date: "1 week ago",
      rating: 4.5,
      review: "Product quality is very good and delivery was on time.",
      item: "Smart Watch",
      orderId: "#SH-1026",
    },
    {
      id: 4,
      name: "Omar Khaled",
      date: "8 days ago",
      rating: 5,
      review: "Excellent seller and respectful dealing. Highly recommended.",
      item: "Bluetooth Speaker",
      orderId: "#SH-1027",
    },
  ]);

  useEffect(() => {
    document.title = "Seller Reviews";
  }, []);

  useEffect(() => {
    const link = document.querySelector("link[rel~='icon']");
    if (link) link.href = icon;
  }, []);

  const renderStars = (rating) => {
    const fullStars = Math.round(rating);

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

  return (
    <div className="seller-profile">
      <div className="seller-profile-container">
        <h1 className="seller-profile-title py-5">MY REVIEWS</h1>

        {reviews.map((item) => (
          <div className="seller-profile-card seller-profile-review-card" key={item.id}>
            <div className="seller-profile-review-left">
              <div className="seller-profile-review-user-icon">👤</div>

              <div>
                <h4>{item.name}</h4>
                <p className="seller-profile-review-date">{item.date}</p>
                <p className="seller-profile-review-text">{item.review}</p>
                <p className="seller-review-extra">
                  <span>Item:</span> {item.item}
                </p>
                <p className="seller-review-extra">
                  <span>Order ID:</span> {item.orderId}
                </p>
              </div>
            </div>

            <div className="seller-profile-review-rating-box">
              {renderStars(item.rating)}
              <span>Rating: {item.rating}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}