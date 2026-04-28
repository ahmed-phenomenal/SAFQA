import api from "./axios";

const LOCAL_USER_SAVED_CARDS_KEY = "user_saved_cards_local";

const firstDefined = (...values) =>
  values.find((value) => value !== undefined && value !== null && value !== "");

const toStringValue = (value) => {
  if (value === undefined || value === null) return "";
  return String(value).trim();
};

const isPlainObject = (value) =>
  Object.prototype.toString.call(value) === "[object Object]";

const normalizeListResponse = (resData) => {
  if (Array.isArray(resData)) return resData;
  if (Array.isArray(resData?.data)) return resData.data;
  if (Array.isArray(resData?.Data)) return resData.Data;
  if (Array.isArray(resData?.result)) return resData.result;
  if (Array.isArray(resData?.items)) return resData.items;
  if (Array.isArray(resData?.value)) return resData.value;
  return [];
};

const safeJsonParse = (value, fallback = null) => {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

const getStoredSavedCards = () => {
  const parsed = safeJsonParse(
    localStorage.getItem(LOCAL_USER_SAVED_CARDS_KEY),
    []
  );
  return Array.isArray(parsed) ? parsed : [];
};

const setStoredSavedCards = (cards = []) => {
  localStorage.setItem(LOCAL_USER_SAVED_CARDS_KEY, JSON.stringify(cards));
};

const getCardBrand = (cardNumber) => {
  const cleaned = String(cardNumber || "").replace(/\D/g, "");
  if (/^4/.test(cleaned)) return "Visa";
  if (
    /^5[1-5]/.test(cleaned) ||
    /^2(2[2-9]|[3-6]|7[01]|720)/.test(cleaned)
  ) {
    return "Master Card";
  }
  return "Card";
};

const normalizeExpiryDate = (value) => {
  const digits = String(value || "").replace(/\D/g, "").slice(0, 4);
  if (digits.length < 4) return String(value || "").trim();
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}`;
};

export const validateCardExpiry = (value) => {
  const digits = String(value || "").replace(/\D/g, "").slice(0, 4);

  if (!digits) return "Expiry date is required";
  if (digits.length !== 4) return "Expiry date must be MM/YY";

  const month = Number(digits.slice(0, 2));
  const year = Number(digits.slice(2, 4));

  if (month < 1 || month > 12) return "Expiry month must be between 01 and 12";

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear() % 100;

  if (year < currentYear) return "Card year is expired";
  if (year === currentYear && month < currentMonth) {
    return "Card month is expired";
  }

  return "";
};

const normalizeSavedCardItem = (item) => {
  const id = Number(
    firstDefined(item?.id, item?.cardId, item?.savedCardId, item?.Id) || 0
  );

  const rawCardNumber = toStringValue(
    firstDefined(
      item?.cardNumber,
      item?.CardNumber,
      item?.maskedCardNumber,
      item?.MaskedCardNumber,
      item?.number,
      item?.Number
    )
  );

  const digits = rawCardNumber.replace(/\D/g, "");
  const last4 = digits ? digits.slice(-4) : "****";

  const holderName = toStringValue(
    firstDefined(
      item?.cardholderName,
      item?.cardHolderName,
      item?.CardholderName,
      item?.CardHolderName,
      item?.holderName,
      item?.HolderName,
      ""
    )
  );

  const expiry = toStringValue(
    firstDefined(item?.expiryDate, item?.ExpiryDate, item?.expiry, item?.Expiry, "")
  );

  const label = toStringValue(
    firstDefined(item?.cardLabel, item?.CardLabel, item?.label, item?.Label, "")
  );

  return {
    id: id || Date.now() + Math.random(),
    backendId: id || 0,
    brand: getCardBrand(rawCardNumber),
    last4,
    expiry,
    holderName,
    label,
    maskedNumber: `•••• •••• •••• ${last4}`,
    cardNumber: rawCardNumber,
  };
};

export const getUserWalletBalance = async () => {
  const res = await api.get("/Wallet/balance");
  return res.data;
};

export const getUserWalletTransactionHistory = async () => {
  try {
    const res = await api.get("/Wallet/TransactionHistory");
    const list = normalizeListResponse(res.data);
    return Array.isArray(list) ? list : [];
  } catch (error) {
    const status = Number(error?.response?.status || 0);
    if (status === 404) return [];
    throw error;
  }
};

export const depositToUserWallet = async ({ amount, savedCardId }) => {
  const res = await api.post("/Wallet/deposit", {
    amount: Number(amount || 0),
    savedCardId: Number(savedCardId || 0),
  });

  return res.data;
};

export const withdrawFromUserWallet = async ({ amount, cardId }) => {
  const res = await api.post("/Wallet/withdraw", {
    amount: Number(amount || 0),
    cardId: Number(cardId || 0),
  });

  return res.data;
};

export const addUserCard = async (payload) => {
  const cardNumber = String(payload?.cardNumber || "")
    .replace(/\D/g, "")
    .slice(0, 16);

  const expiryDate = normalizeExpiryDate(payload?.expiryDate);
  const cvv = String(payload?.cvv || "")
    .replace(/\D/g, "")
    .slice(0, 3);

  const cardholderName = toStringValue(payload?.holderName || payload?.cardholderName);
  const cardLabel = toStringValue(payload?.cardLabel);

  if (cardNumber.length !== 16) throw new Error("Card number must be 16 numbers");

  const expiryError = validateCardExpiry(expiryDate);
  if (expiryError) throw new Error(expiryError);

  if (cvv.length !== 3) throw new Error("CVV must be 3 numbers");
  if (!cardholderName) throw new Error("Cardholder name is required");

  const requestBody = {
    cardNumber,
    expiryDate,
    cvv,
    cardholderName,
    cardLabel,
  };

  const res = await api.post("/Card/AddCard", requestBody);

  const localCard = normalizeSavedCardItem({
    ...(isPlainObject(res?.data) ? res.data : {}),
    cardNumber,
    expiryDate,
    cardholderName,
    cardLabel,
  });

  const current = getStoredSavedCards();
  setStoredSavedCards([localCard, ...current]);

  return {
    ...(isPlainObject(res?.data) ? res.data : {}),
    localCard,
    message: res?.data?.message || "Card added successfully",
  };
};

export const getUserSavedCards = async () => {
  const res = await api.get("/Card/cards");
  const cards = normalizeListResponse(res.data).map(normalizeSavedCardItem);
  setStoredSavedCards(cards);
  return cards;
};

export const deleteUserSavedCard = async (cardId) => {
  const numericId = Number(cardId || 0);
  if (!numericId) {
    throw new Error("Invalid card id");
  }

  const res = await api.delete(`/Card/Delete-Card/${numericId}`);

  const current = getStoredSavedCards();
  setStoredSavedCards(
    current.filter((item) => Number(item?.backendId || item?.id || 0) !== numericId)
  );

  return {
    ...(isPlainObject(res?.data) ? res.data : {}),
    deletedId: numericId,
    message: res?.data?.message || "Card deleted successfully",
  };
};