import api from "./axios";

const toPositiveNumber = (value, label) => {
  const num = Number(value || 0);

  if (!Number.isFinite(num) || num <= 0) {
    throw new Error(`${label} is required.`);
  }

  return num;
};

export const placeManualBid = async ({ auctionId, amount }) => {
  const body = {
    auctionId: toPositiveNumber(auctionId, "Auction ID"),
    amount: toPositiveNumber(amount, "Bid amount"),
  };

  const res = await api.post("/Bid/manual", body);
  return res.data;
};

export const activateProxyBid = async (auctionId) => {
  const id = toPositiveNumber(auctionId, "Auction ID");
  const res = await api.post(`/Bid/activate/${id}`);
  return res.data;
};

export const deactivateProxyBid = async (auctionId) => {
  const id = toPositiveNumber(auctionId, "Auction ID");
  const res = await api.post(`/Bid/deactivate/${id}`);
  return res.data;
};

export const createProxyBid = async ({ auctionId, max, step }) => {
  const body = {
    auctionId: toPositiveNumber(auctionId, "Auction ID"),
    max: toPositiveNumber(max, "Proxy max amount"),
    step: toPositiveNumber(step, "Proxy step"),
  };

  const res = await api.post("/Bid/create-Proxy", body);
  return res.data;
};

export const updateProxyBid = async ({ auctionId, max, step }) => {
  const body = {
    auctionId: toPositiveNumber(auctionId, "Auction ID"),
    max: toPositiveNumber(max, "Proxy max amount"),
    step: toPositiveNumber(step, "Proxy step"),
  };

  const res = await api.put("/Bid/update-Proxy", body);
  return res.data;
};