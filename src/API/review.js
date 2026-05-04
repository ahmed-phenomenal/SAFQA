import api from "./axios";

const getErrorMessage = (error, fallback) => {
  const data = error?.response?.data;

  console.error("Review API error:", {
    status: error?.response?.status,
    data,
    message: error?.message,
  });

  if (!data) {
    return error?.message || fallback;
  }

  if (typeof data === "string") {
    return data;
  }

  if (Array.isArray(data)) {
    return data.join(" | ");
  }

  if (data?.errors && typeof data.errors === "object") {
    return Object.entries(data.errors)
      .map(([key, value]) => {
        if (Array.isArray(value)) {
          return `${key}: ${value.join(" ")}`;
        }

        return `${key}: ${value}`;
      })
      .join(" | ");
  }

  return (
    data?.error ||
    data?.Error ||
    data?.message ||
    data?.Message ||
    data?.title ||
    data?.Title ||
    fallback
  );
};

export const addReview = async ({ auctionId, rating, comment }) => {
  const body = {
    auctionId: Number(auctionId),
    rating: Number(rating),
    comment: String(comment || "").trim(),
  };

  if (!Number.isInteger(body.auctionId) || body.auctionId <= 0) {
    throw new Error("Invalid auction ID.");
  }

  if (!Number.isInteger(body.rating) || body.rating < 1 || body.rating > 5) {
    throw new Error("Rating must be between 1 and 5.");
  }

  if (!body.comment) {
    throw new Error("Comment is required.");
  }

  console.log("Sending review body:", body);

  try {
    const res = await api.post("/Review/add", body, {
      headers: {
        "Content-Type": "application/json",
      },
    });

    return res.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Failed to add review."));
  }
};

export const getSellerReviews = async (sellerId) => {
  const id = Number(sellerId);

  if (!Number.isInteger(id) || id <= 0) {
    throw new Error("Invalid seller ID.");
  }

  try {
    const res = await api.get(`/Review/${id}`);

    const root = res.data || {};

    const reviews = Array.isArray(root.reviews)
      ? root.reviews
      : Array.isArray(root.Reviews)
      ? root.Reviews
      : [];

    return {
      sellerId: Number(root.sellerId || root.SellerId || id),
      averageRating: Number(root.averageRating || root.AverageRating || 0),
      totalReviews: Number(root.totalReviews || root.TotalReviews || reviews.length || 0),
      reviews,
    };
  } catch (error) {
    throw new Error(getErrorMessage(error, "Failed to load reviews."));
  }
};