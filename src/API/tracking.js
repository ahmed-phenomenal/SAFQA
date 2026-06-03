import api from "./axios";

export const getTrackingByAuctionId = async (auctionId) => {
  const id = Number(auctionId || 0);

  if (!id) {
    throw new Error("Invalid auction ID.");
  }

  const res = await api.get(`/Tracking/${id}`);
  return res.data;
};