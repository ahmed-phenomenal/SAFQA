import api from "./axios";

/* ================= ADMIN AUTH HELPERS ================= */

const readStorage = (key) => {
  const fromSession =
    typeof window !== "undefined" ? sessionStorage.getItem(key) : null;

  if (fromSession) return fromSession;

  const fromLocal =
    typeof window !== "undefined" ? localStorage.getItem(key) : null;

  return fromLocal;
};

const cleanToken = (value) => {
  let token = String(value || "").trim();

  if (!token) return "";

  try {
    const parsed = JSON.parse(token);
    if (typeof parsed === "string") token = parsed.trim();
    if (parsed?.token) token = String(parsed.token).trim();
    if (parsed?.accessToken) token = String(parsed.accessToken).trim();
    if (parsed?.adminToken) token = String(parsed.adminToken).trim();
  } catch {
    // keep raw token
  }

  if (token.toLowerCase().startsWith("bearer ")) {
    token = token.slice(7).trim();
  }

  return token;
};

const getAdminToken = () => {
  return (
    cleanToken(readStorage("adminToken")) ||
    cleanToken(readStorage("token")) ||
    cleanToken(readStorage("userToken")) ||
    cleanToken(readStorage("sellerToken"))
  );
};

const adminConfig = () => {
  const token = getAdminToken();

  return {
    headers: token
      ? {
          Authorization: `Bearer ${token}`,
        }
      : {},
  };
};

/* ================= SAFE ACTION HELPERS ================= */

const putThenPost = async (url) => {
  try {
    return await api.put(url, null, adminConfig());
  } catch (err) {
    if (err?.response?.status === 405 || err?.response?.status === 404) {
      return api.post(url, null, adminConfig());
    }

    throw err;
  }
};

const postThenPut = async (url) => {
  try {
    return await api.post(url, null, adminConfig());
  } catch (err) {
    if (err?.response?.status === 405 || err?.response?.status === 404) {
      return api.put(url, null, adminConfig());
    }

    throw err;
  }
};

const deleteThenPost = async (url) => {
  try {
    return await api.delete(url, adminConfig());
  } catch (err) {
    if (err?.response?.status === 405 || err?.response?.status === 404) {
      return api.post(url, null, adminConfig());
    }

    throw err;
  }
};

/* ================= USERS ================= */

export const getTotalUsers = () => api.get("/User/total-users", adminConfig());

export const getActiveUsers = () => api.get("/User/active-count", adminConfig());

export const getBlockedUsers = () =>
  api.get("/User/blocked-count", adminConfig());

export const getUsersPage = (page = 1, pageSize = 10) =>
  api.get("/User", {
    ...adminConfig(),
    params: {
      page,
      pageSize,
    },
  });

export const changeUserStatus = (userId) =>
  api.post(`/User/${userId}/change-status`, null, adminConfig());

export const findUserIdByEmail = async (email, maxPages = 120) => {
  const targetEmail = String(email || "").trim().toLowerCase();

  if (!targetEmail) return "";

  for (let page = 1; page <= maxPages; page += 1) {
    const res = await getUsersPage(page, 10);
    const root = res?.data || {};

    const list = Array.isArray(root?.data)
      ? root.data
      : Array.isArray(root)
      ? root
      : [];

    const found = list.find(
      (item) => String(item?.email || "").trim().toLowerCase() === targetEmail
    );

    if (found?.id || found?.userId) {
      return found.id || found.userId;
    }

    const totalPages = Number(root?.totalPages || 1);
    const hasNextPage = Boolean(root?.hasNextPage);

    if (!hasNextPage && page >= totalPages) break;
  }

  return "";
};

/* ================= SELLERS ================= */

export const getTotalSellers = () =>
  api.get("/seller/total-sellers", adminConfig());

export const getVerifiedSellers = () =>
  api.get("/seller/verified-sellers", adminConfig());

export const getPendingSellersCount = () =>
  api.get("/seller/pending-sellers", adminConfig());

export const getPendingSellersPage = (page = 1, pageSize = 10) =>
  api.get("/seller/pending", {
    ...adminConfig(),
    params: {
      page,
      pageSize,
    },
  });

export const getSellersPage = (page = 1, pageSize = 10) =>
  api.get("/seller", {
    ...adminConfig(),
    params: {
      page,
      pageSize,
    },
  });

export const getSellerDetailsByUserId = (userId) =>
  api.get(`/seller/seller/${userId}`, adminConfig());

export const approveSeller = (userId) =>
  api.post(`/seller/approve/${userId}`, null, adminConfig());

export const rejectSeller = (userId) =>
  api.post(`/seller/reject/${userId}`, null, adminConfig());

export const suspendSeller = (userId) =>
  putThenPost(`/seller/suspend/${userId}`);

export const restoreSeller = (userId) =>
  putThenPost(`/seller/restore/${userId}`);

/* ================= AUCTIONS ================= */

export const getTotalAuctions = () =>
  api.get("/Auction/total-auctions", adminConfig());

export const getActiveAuctions = () =>
  api.get("/Auction/active-auctions", adminConfig());

export const getExpiredAuctions = () =>
  api.get("/Auction/expired-auctions", adminConfig());

export const getUpcomingAuctions = () =>
  api.get("/Auction/upcoming-auctions", adminConfig());

export const getActiveAuctionsPage = (page = 1, pageSize = 10) =>
  api.get("/Auction/active", {
    ...adminConfig(),
    params: {
      page,
      pageSize,
    },
  });

export const getExpiredAuctionsPage = (page = 1, pageSize = 10) =>
  api.get("/Auction/expired", {
    ...adminConfig(),
    params: {
      page,
      pageSize,
    },
  });

export const getRejectedDeletedAuctionsPage = (page = 1, pageSize = 10) =>
  api.get("/Auction/rejected-deleted", {
    ...adminConfig(),
    params: {
      page,
      pageSize,
    },
  });

export const forceExpireAuction = (auctionId) =>
  postThenPut(`/Auction/force-expire/${auctionId}`);

export const deleteAuction = (auctionId) =>
  deleteThenPost(`/Auction/${auctionId}`);

export const permanentDeleteAuction = (auctionId) =>
  deleteThenPost(`/Auction/permanent/${auctionId}`);

/* ================= TRANSACTIONS ================= */

export const getTotalTransactions = () =>
  api.get("/Transaction/Total-Transactions", adminConfig());

export const getSuccessfulTransactions = () =>
  api.get("/Transaction/successful", adminConfig());

export const getFailedTransactions = () =>
  api.get("/Transaction/failed", adminConfig());