import api from "./axios";

// Seller products
export const getSellerProducts = async (sellerId) => {
  const res = await api.get(`/Item/seller-products/${sellerId}`);
  return res.data;
};

// Products by category
// Backend appears to require categoryName
export const getProductsByCategory = async (categoryName) => {
  const res = await api.get(`/Item/products-by-category`, {
    params: { categoryName },
  });
  return res.data;
};

// Most popular products
export const getMostPopularProducts = async (sellerId) => {
  const res = await api.get(`/Item/most-popular-products/${sellerId}`);
  return res.data;
};

// Pending transactions
export const getPendingTransactions = async (sellerId) => {
  const res = await api.get(`/Transaction/pending/${sellerId}`);
  return res.data;
};

// All transactions
export const getAllTransactions = async (sellerId) => {
  const res = await api.get(`/Transaction/all/${sellerId}`);
  return res.data;
};

// Revenue
export const getRevenue = async (sellerId) => {
  const res = await api.get(`/Transaction/revenue/${sellerId}`);
  return res.data;
};

// Seller bids
export const getSellerBids = async (sellerId) => {
  const res = await api.get(`/Bid/seller/${sellerId}`);
  return res.data;
};

// Bids by category
export const getBidsByCategory = async (sellerId, categoryId) => {
  const res = await api.get(`/Bid/category/${sellerId}/${categoryId}`);
  return res.data;
};

/* ===========================
   ADDED ONLY - seller dashboard backend APIs
   =========================== */

// Active auctions count for seller
export const getActiveAuctionsCount = async (sellerId) => {
  const res = await api.get(`/Auction/Total_active/${sellerId}`);
  return res.data;
};

// Total auctions count for seller
export const getTotalAuctionsCount = async (sellerId) => {
  const res = await api.get(`/Auction/total/${sellerId}`);
  return res.data;
};

// Seller products by sellerId + categoryName
export const getSellerProductsByCategory = async (sellerId, categoryName) => {
  const res = await api.get(`/Item/products-by-category`, {
    params: { sellerId, categoryName },
  });
  return res.data;
};

// Total bids count for seller
export const getTotalBidsCountForSeller = async (sellerId) => {
  const res = await api.get(`/TotalBid/seller/${sellerId}`);
  return res.data;
};

// Total bids count for seller in specific category
export const getTotalBidsCountByCategory = async (sellerId, categoryId) => {
  const res = await api.get(`/TotalBid/category/${sellerId}/${categoryId}`);
  return res.data;
};

// Top auctions by bids
export const getTop4AuctionsByBids = async (sellerId) => {
  const res = await api.get(`/Auction/auctions-bids/${sellerId}`);
  return res.data;
};

// Pending transactions count/value for seller
export const getPendingTransactionsSummary = async (sellerId) => {
  const res = await api.get(`/Transaction/pending/${sellerId}`);
  return res.data;
};

// Revenue for seller
export const getSellerRevenue = async (sellerId) => {
  const res = await api.get(`/Transaction/revenue/${sellerId}`);
  return res.data;
};

// Monthly revenue for seller
export const getMonthlyRevenue = async (sellerId) => {
  const res = await api.get(`/Transaction/MonthlyRevenue/${sellerId}`);
  return res.data;
};

// Category percentages for seller auctions
export const getAuctionCategoryPercentages = async (sellerId) => {
  const res = await api.get(`/Auction/${sellerId}/category-percentages`);
  return res.data;
};

// Monthly earnings by seller + category
export const getMonthlyEarningsByCategory = async (sellerId, categoryId) => {
  const res = await api.get(
    `/Auction/seller/${sellerId}/category/${categoryId}/monthly-earnings`
  );
  return res.data;
};

// Top customers for seller
export const getTopCustomers = async (sellerId) => {
  const res = await api.get(`/Auction/${sellerId}/Top customers`);
  return res.data;
};

// Winners in seller auctions
export const getAuctionWinners = async (sellerId) => {
  const res = await api.get(`/Auction/winners/${sellerId}`);
  return res.data;
};

// Most popular products for seller
export const getMostPopularProductsForSeller = async (sellerId, topCount = 5) => {
  const res = await api.get(`/Auction/MostPopularProducts/${sellerId}`, {
    params: { topCount },
  });
  return res.data;
};