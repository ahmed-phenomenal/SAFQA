import api from "./axios";

export const createDispute = async ({
  auctionId,
  description,
  resolutionType,
  evidences = [],
}) => {
  const body = {
    auctionId: Number(auctionId || 0),
    description: String(description || "").trim(),
    resolutionType: Number(resolutionType || 1),
    evidences: Array.isArray(evidences) ? evidences : [],
  };

  if (!body.auctionId) throw new Error("Invalid auction ID.");
  if (!body.description) throw new Error("Description is required.");

  const res = await api.post("/Dispute/create", body);
  return res.data;
};

export const getMyDisputeReports = async () => {
  const res = await api.get("/Dispute/my-reports");
  return res.data;
};

export const getDisputeTracking = async (disputeId) => {
  const id = Number(disputeId || 0);

  if (!id) throw new Error("Invalid dispute ID.");

  const res = await api.get(`/Dispute/tracking/${id}`);
  return res.data;
};

export const cancelDispute = async (disputeId) => {
  const id = Number(disputeId || 0);

  if (!id) throw new Error("Invalid dispute ID.");

  const res = await api.delete(`/Dispute/cancel/${id}`);
  return res.data;
};