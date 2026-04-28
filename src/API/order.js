import api from "./axios";

const normalizeList = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.Data)) return data.Data;
  if (Array.isArray(data?.result)) return data.result;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.item2)) return data.item2;
  return [];
};

const normalizeOrderItem = (item) => ({
  auctionId: Number(item?.auctionId || 0),
  deliveredAt: item?.deliveredAt || "",
  expectedDeliveryDate: item?.expectedDeliveryDate || "",
  images: Array.isArray(item?.images) ? item.images : [],
});

export const getDeliveredOrders = async () => {
  const res = await api.get("/Order/delivered");
  return normalizeList(res.data).map(normalizeOrderItem);
};

export const getInProgressOrders = async () => {
  const res = await api.get("/Order/in-progress");
  return normalizeList(res.data).map(normalizeOrderItem);
};