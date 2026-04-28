import api from "./axios";

const normalizeAuctionItem = (item, index = 0) => ({
  auctionId: Number(item?.auctionId || item?.id || 0),
  title: String(item?.title || "").trim(),
  displayPrice: Number(
    item?.displayPrice || item?.currentPrice || item?.price || 0
  ),
  displayDate: item?.displayDate || item?.endDate || item?.startDate || "",
  totalBids: Number(item?.totalBids || item?.bidsCount || 0),
  status: Number(item?.status || 0),
  image: item?.image || null,
  cityId: Number(item?.cityId || item?.CityId || 0),
  categoryId: Number(item?.categoryId || item?.CategoryId || 0),
  _fallbackIndex: index,
});

const normalizeSearchResponse = (root = {}) => {
  const responseInfo = root?.item1 || root?.Item1 || {};

  const data = Array.isArray(root?.data)
    ? root.data
    : Array.isArray(root?.Data)
    ? root.Data
    : [];

  return {
    isSuccess: !!responseInfo?.isSuccess || !!responseInfo?.IsSuccess,
    message: responseInfo?.message || responseInfo?.Message || "",
    data: data.map(normalizeAuctionItem),
  };
};

export const AUCTION_STATUS = {
  UPCOMING: 1,
  ACTIVE: 2,
  ENDING_SOON: 3,
  FINISHED: 4,
};

export const AUCTION_SORT_BY = {
  MOST_BIDS: 1,
  NEAREST: 2,
  PRICE_HIGH_TO_LOW: 3,
  PRICE_LOW_TO_HIGH: 4,
};

export const AUCTION_CITY_IDS = {
  cairo: 1,
  alexandria: 2,
  giza: 3,
};

export const DEFAULT_SEARCH_QUERY = "a";

export const searchAuctions = async (query = DEFAULT_SEARCH_QUERY) => {
  const safeQuery = String(query || "").trim() || DEFAULT_SEARCH_QUERY;

  const url = `/Auction/search?query=${encodeURIComponent(safeQuery)}`;

  console.log("[Auction Search API] GET:", url);
  console.log("[Auction Search API] query:", safeQuery);

  try {
    const res = await api.get(url);

    console.log("[Auction Search API] success raw response:", res?.data);

    const normalized = normalizeSearchResponse(res?.data || {});

    console.log("[Auction Search API] normalized response:", normalized);

    return normalized;
  } catch (err) {
    console.error("[Auction Search API] failed:", err);
    console.error("[Auction Search API] status:", err?.response?.status);
    console.error("[Auction Search API] response:", err?.response?.data);
    throw err;
  }
};

export const getCategoryAuctions = async (categoryId = 1, filters = {}) => {
  return searchAuctions(filters?.query || DEFAULT_SEARCH_QUERY);
};

export const getFavoriteAuctions = async () => {
  const res = await api.get("/Auction/favorites");
  const root = res?.data || {};
  const data = Array.isArray(root?.data) ? root.data : [];

  return {
    isSuccess: !!root?.item1?.isSuccess,
    message: root?.item1?.message || "",
    data: data.map(normalizeAuctionItem),
    pageNumber: 1,
    pageSize: data.length,
    totalCount: data.length,
    totalPages: 1,
  };
};