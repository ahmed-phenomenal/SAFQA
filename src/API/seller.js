import sellerApi from "./sellerAxios";

const LOCAL_SELLER_SAVED_CARDS_KEY = "seller_saved_cards_local";

const readStorage = (key) => {
  const fromSession =
    typeof window !== "undefined" ? sessionStorage.getItem(key) : null;
  if (fromSession !== null && fromSession !== undefined && fromSession !== "") {
    return fromSession;
  }

  const fromLocal =
    typeof window !== "undefined" ? localStorage.getItem(key) : null;
  return fromLocal;
};

const writeSession = (key, value) => {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(key, value);
};

const writeBoth = (key, value) => {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(key, value);
  localStorage.setItem(key, value);
};

const removeBoth = (key) => {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(key);
  localStorage.removeItem(key);
};

const cleanToken = (value) => {
  if (!value) return "";
  let token = String(value).trim();

  try {
    const parsed = JSON.parse(token);
    if (typeof parsed === "string") token = parsed.trim();
  } catch {
    //
  }

  if (
    (token.startsWith('"') && token.endsWith('"')) ||
    (token.startsWith("'") && token.endsWith("'"))
  ) {
    token = token.slice(1, -1).trim();
  }

  if (token.toLowerCase().startsWith("bearer ")) {
    token = token.slice(7).trim();
  }

  if (
    !token ||
    token === "undefined" ||
    token === "null" ||
    token === "[object Object]"
  ) {
    return "";
  }

  return token;
};

const getToken = (...keys) => {
  for (const key of keys) {
    const token = cleanToken(readStorage(key));
    if (token) return token;
  }
  return "";
};

const getCreateSellerPreferredToken = () => {
  return getToken("userToken", "token", "sellerToken", "adminToken");
};

const getCurrentAccountKey = () => {
  return String(
    readStorage("currentUserEmail") || readStorage("pendingEmail") || "guest"
  )
    .trim()
    .toLowerCase();
};

const getScopedKey = (baseKey) => `${baseKey}:${getCurrentAccountKey()}`;

const extractTokenFromResponse = (res) => {
  const data = res?.data || {};
  const headers = res?.headers || {};

  const authHeader =
    headers?.authorization ||
    headers?.Authorization ||
    headers?.["x-auth-token"] ||
    headers?.["X-Auth-Token"] ||
    "";

  const tokenFromHeader =
    typeof authHeader === "string" && authHeader.startsWith("Bearer ")
      ? authHeader.replace("Bearer ", "").trim()
      : "";

  return cleanToken(
    data?.token ||
      data?.Token ||
      data?.accessToken ||
      data?.AccessToken ||
      data?.jwt ||
      data?.Jwt ||
      data?.sellerToken ||
      data?.SellerToken ||
      data?.data?.sellerToken ||
      data?.result?.sellerToken ||
      tokenFromHeader ||
      ""
  );
};

const firstDefined = (...values) =>
  values.find((value) => value !== undefined && value !== null && value !== "");

const toStringValue = (value) => {
  if (value === undefined || value === null) return "";
  return String(value).trim();
};

const toNumberValue = (value) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
};

const toBooleanValue = (value) => {
  if (value === true || value === 1 || value === "1") return true;
  if (typeof value === "string") {
    const v = value.trim().toLowerCase();
    return v === "true" || v === "yes" || v === "done";
  }
  return false;
};

const isPlainObject = (value) =>
  Object.prototype.toString.call(value) === "[object Object]";

const readFormDataValue = (formData, key) => {
  if (!(formData instanceof FormData)) return undefined;
  const value = formData.get(key);
  return value === null ? undefined : value;
};

const appendIfHasValue = (formData, key, value) => {
  if (value !== undefined && value !== null && value !== "") {
    formData.append(key, value);
  }
};

const shouldRetryWithAnotherShape = (error) => {
  const status = Number(error?.response?.status || 0);
  return !status || [400, 404, 405, 415, 422, 500].includes(status);
};

const deepFindValueByKeys = (input, wantedKeys = []) => {
  if (!input || !wantedKeys.length) return undefined;

  const normalizedKeys = wantedKeys.map((key) => String(key).toLowerCase());
  const queue = [input];
  const visited = new Set();

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current || typeof current !== "object") continue;
    if (visited.has(current)) continue;
    visited.add(current);

    if (Array.isArray(current)) {
      current.forEach((item) => {
        if (item && typeof item === "object") queue.push(item);
      });
      continue;
    }

    if (isPlainObject(current)) {
      for (const [key, value] of Object.entries(current)) {
        if (normalizedKeys.includes(String(key).toLowerCase())) {
          return value;
        }
        if (value && typeof value === "object") {
          queue.push(value);
        }
      }
    }
  }

  return undefined;
};

const persistSellerIdFromAnyData = (data) => {
  const sellerId =
    Number(data?.sellerId || 0) ||
    Number(data?.data?.sellerId || 0) ||
    Number(data?.result?.sellerId || 0) ||
    Number(deepFindValueByKeys(data, ["sellerId"]) || 0);

  if (sellerId) {
    writeBoth(getScopedKey("sellerId"), String(sellerId));
  }

  return sellerId;
};

const persistSellerSession = (res) => {
  const sellerToken = extractTokenFromResponse(res);

  if (sellerToken) {
    writeSession("sellerToken", sellerToken);
  }

  const sellerId = persistSellerIdFromAnyData(res?.data || {});

  return { sellerToken, sellerId };
};
const persistSellerSessionFromToken = (token) => {
  const clean = cleanToken(token);

  if (clean) {
    writeSession("sellerToken", clean);
  }

  writeSession("role", "seller");
  writeSession("accountType", "seller");

  return clean;
};

const clearScopedVerificationProgress = () => {
  removeBoth(getScopedKey("seller_verified_local"));
  removeBoth(getScopedKey("seller_verification_prompt_dismissed"));
  removeBoth(getScopedKey("sellerId"));
  removeBoth(getScopedKey("seller_verification_submitted"));
};

const setLocalVerifiedState = (isVerified) => {
  writeBoth(getScopedKey("seller_verified_local"), isVerified ? "true" : "false");

  if (isVerified) {
    removeBoth(getScopedKey("seller_verification_prompt_dismissed"));
    removeBoth(getScopedKey("seller_verification_submitted"));
  }
};

const setLocalSubmittedState = (isSubmitted) => {
  writeBoth(
    getScopedKey("seller_verification_submitted"),
    isSubmitted ? "true" : "false"
  );

  if (isSubmitted) {
    removeBoth(getScopedKey("seller_verification_prompt_dismissed"));
  }
};

const getLocalSubmittedState = () => {
  return readStorage(getScopedKey("seller_verification_submitted")) === "true";
};

const buildCreateSellerPayload = (payload) => {
  const storeName = toStringValue(
    firstDefined(readFormDataValue(payload, "StoreName"), payload?.StoreName)
  );
  const phoneNumber = toStringValue(
    firstDefined(readFormDataValue(payload, "PhoneNumber"), payload?.PhoneNumber)
  );
  const cityId = toNumberValue(
    firstDefined(readFormDataValue(payload, "CityId"), payload?.CityId)
  );
  const businessType = toNumberValue(
    firstDefined(readFormDataValue(payload, "BusinessType"), payload?.BusinessType)
  );
  const description = toStringValue(
    firstDefined(readFormDataValue(payload, "Description"), payload?.Description)
  );
  const logo = firstDefined(readFormDataValue(payload, "Logo"), payload?.Logo);

  return {
    storeName,
    phoneNumber,
    cityId,
    businessType,
    description,
    logo,
  };
};

const buildBusinessPayload = (payload) => {
  const commercialRegister = firstDefined(
    readFormDataValue(payload, "CommercialRegister"),
    payload?.CommercialRegister
  );
  const taxId = firstDefined(readFormDataValue(payload, "TaxId"), payload?.TaxId);
  const ownerNationalIdFront = firstDefined(
    readFormDataValue(payload, "OwnerNationalIdFront"),
    payload?.OwnerNationalIdFront
  );
  const ownerNationalIdBack = firstDefined(
    readFormDataValue(payload, "OwnerNationalIdBack"),
    payload?.OwnerNationalIdBack
  );
  const instaPayNumber = toStringValue(
    firstDefined(
      readFormDataValue(payload, "instaPayNumber"),
      payload?.instaPayNumber
    )
  ).replace(/\D/g, "");
  const bankName = toStringValue(
    firstDefined(readFormDataValue(payload, "BankName"), payload?.BankName)
  );
  const accountName = toStringValue(
    firstDefined(readFormDataValue(payload, "AccountName"), payload?.AccountName)
  );
  const iban = toStringValue(
    firstDefined(readFormDataValue(payload, "IBAN"), payload?.IBAN)
  );
  const localAccountNumber = toStringValue(
    firstDefined(
      readFormDataValue(payload, "LocalAccountNumber"),
      payload?.LocalAccountNumber
    )
  ).replace(/\D/g, "");

  return {
    commercialRegister,
    taxId,
    ownerNationalIdFront,
    ownerNationalIdBack,
    instaPayNumber,
    bankName,
    accountName,
    iban,
    localAccountNumber,
  };
};

const buildPersonalFormData = (payload) => {
  const formData = new FormData();

  const nationalIdFront = firstDefined(
    readFormDataValue(payload, "NationalIdFront"),
    payload?.NationalIdFront
  );
  const nationalIdBack = firstDefined(
    readFormDataValue(payload, "NationalIdBack"),
    payload?.NationalIdBack
  );
  const selfieWithId = firstDefined(
    readFormDataValue(payload, "SelfieWithId"),
    payload?.SelfieWithId
  );

  appendIfHasValue(formData, "NationalIdFront", nationalIdFront);
  appendIfHasValue(formData, "NationalIdBack", nationalIdBack);
  appendIfHasValue(formData, "SelfieWithId", selfieWithId);

  return formData;
};

const buildCreateSellerSwaggerBody = (logo) => {
  const formData = new FormData();
  appendIfHasValue(formData, "Logo", logo);
  return formData;
};

const buildCreateSellerFallbackBody = ({
  storeName,
  phoneNumber,
  cityId,
  businessType,
  description,
  logo,
}) => {
  const formData = new FormData();
  appendIfHasValue(formData, "StoreName", storeName);
  appendIfHasValue(formData, "PhoneNumber", phoneNumber);
  appendIfHasValue(formData, "CityId", cityId);
  appendIfHasValue(formData, "BusinessType", businessType);
  appendIfHasValue(formData, "Description", description);
  appendIfHasValue(formData, "Logo", logo);
  return formData;
};

const buildBusinessFilesForm = ({
  commercialRegister,
  taxId,
  ownerNationalIdFront,
  ownerNationalIdBack,
}) => {
  const formData = new FormData();
  appendIfHasValue(formData, "CommercialRegister", commercialRegister);
  appendIfHasValue(formData, "TaxId", taxId);
  appendIfHasValue(formData, "OwnerNationalIdFront", ownerNationalIdFront);
  appendIfHasValue(formData, "OwnerNationalIdBack", ownerNationalIdBack);
  return formData;
};

const buildBusinessFullForm = ({
  commercialRegister,
  taxId,
  ownerNationalIdFront,
  ownerNationalIdBack,
  instaPayNumber,
  bankName,
  accountName,
  iban,
  localAccountNumber,
}) => {
  const formData = new FormData();
  appendIfHasValue(formData, "CommercialRegister", commercialRegister);
  appendIfHasValue(formData, "TaxId", taxId);
  appendIfHasValue(formData, "OwnerNationalIdFront", ownerNationalIdFront);
  appendIfHasValue(formData, "OwnerNationalIdBack", ownerNationalIdBack);
  appendIfHasValue(formData, "instaPayNumber", instaPayNumber);
  appendIfHasValue(formData, "BankName", bankName);
  appendIfHasValue(formData, "AccountName", accountName);
  appendIfHasValue(formData, "IBAN", iban);
  appendIfHasValue(formData, "LocalAccountNumber", localAccountNumber);
  return formData;
};

/**
 * Important:
 * after CreateSeller, if backend returns sellerToken, step 2/3 must prefer it first.
 */
const getVerificationFlowTokens = () => {
  const tokens = [
    cleanToken(readStorage("sellerToken")),
    cleanToken(readStorage("token")),
    cleanToken(readStorage("userToken")),
    cleanToken(readStorage("adminToken")),
  ].filter(Boolean);

  return [...new Set(tokens)];
};

const getApiErrorMessage = (error) =>
  String(
    error?.response?.data?.message ||
      error?.response?.data?.Message ||
      error?.message ||
      ""
  )
    .trim()
    .toLowerCase();

const isAlreadyExistsLikeMessage = (message) => {
  const msg = String(message || "").trim().toLowerCase();

  return (
    msg.includes("already exists") ||
    msg.includes("already exist") ||
    msg.includes("already uploaded") ||
    msg.includes("documents already uploaded") ||
    msg.includes("already verified") ||
    msg.includes("already submitted") ||
    msg.includes("already completed") ||
    msg.includes("already created") ||
    msg.includes("already done") ||
    msg.includes("duplicate") ||
    msg.includes("conflict")
  );
};

const buildAlreadyExistsResponse = (error, defaultMessage) => {
  const data = error?.response?.data || {};
  persistSellerIdFromAnyData(data);

  return {
    ...data,
    alreadyExists: true,
    isSuccess: true,
    message: data?.message || data?.Message || defaultMessage,
  };
};

const requestSellerGetWithFallback = async (url, options = {}) => {
  const tokens = getVerificationFlowTokens();
  let lastError = null;

  for (const token of tokens) {
    try {
      const res = await sellerApi.get(url, {
        ...options,
        headers: {
          ...(options.headers || {}),
          Authorization: `Bearer ${token}`,
        },
      });
      return res;
    } catch (error) {
      lastError = error;
      const status = Number(error?.response?.status || 0);
      if (status !== 401 && status !== 403 && status !== 404) {
        throw error;
      }
    }
  }

  throw lastError || new Error("Request failed");
};

const safeJsonParse = (value, fallback = null) => {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

const decodeJwtPayload = (token) => {
  try {
    if (!token || typeof token !== "string") return null;
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    const json = atob(padded);
    return safeJsonParse(json, null);
  } catch {
    return null;
  }
};

const pickDataObject = (data) => {
  if (!data || typeof data !== "object") return {};
  if (data.data && typeof data.data === "object" && !Array.isArray(data.data)) {
    return data.data;
  }
  if (data.Data && typeof data.Data === "object" && !Array.isArray(data.Data)) {
    return data.Data;
  }
  if (
    data.result &&
    typeof data.result === "object" &&
    !Array.isArray(data.result)
  ) {
    return data.result;
  }
  return data;
};

const getJwtFallbackProfile = () => {
  const token = getToken("sellerToken", "token", "userToken", "adminToken");
  const payload = decodeJwtPayload(token) || {};

  const jwtName = firstDefined(
    payload?.name,
    payload?.unique_name,
    payload?.fullName,
    payload?.fullname,
    payload?.FullName,
    payload?.given_name,
    payload?.nickname,
    payload?.displayName,
    payload?.DisplayName,
    payload?.["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name"],
    payload?.[
      "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname"
    ],
    payload?.[
      "http://schemas.microsoft.com/ws/2008/06/identity/claims/windowsaccountname"
    ],
    ""
  );

  const jwtEmail = firstDefined(
    payload?.email,
    payload?.Email,
    payload?.upn,
    payload?.preferred_username,
    payload?.["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress"],
    readStorage("pendingEmail"),
    readStorage("currentUserEmail"),
    ""
  );

  return {
    name: toStringValue(jwtName),
    email: toStringValue(jwtEmail),
  };
};

const getStoredSavedCards = () => {
  const parsed = safeJsonParse(readStorage(LOCAL_SELLER_SAVED_CARDS_KEY), []);
  return Array.isArray(parsed) ? parsed : [];
};

const setStoredSavedCards = (cards = []) => {
  writeBoth(LOCAL_SELLER_SAVED_CARDS_KEY, JSON.stringify(cards));
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

const fileToBase64 = (file) =>
  new Promise((resolve, reject) => {
    if (!file) {
      resolve("");
      return;
    }

    if (typeof file === "string") {
      const raw = String(file).trim();
      if (!raw) {
        resolve("");
        return;
      }
      if (raw.startsWith("data:")) {
        const base64 = raw.includes(",") ? raw.split(",")[1] : raw;
        resolve(base64 || "");
        return;
      }
      resolve(raw);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || "");
      const base64 = result.includes(",") ? result.split(",")[1] : result;
      resolve(base64 || "");
    };
    reader.onerror = () => reject(new Error("Failed to read image file."));
    reader.readAsDataURL(file);
  });

const normalizeListResponse = (resData) => {
  if (Array.isArray(resData)) return resData;
  if (Array.isArray(resData?.data)) return resData.data;
  if (Array.isArray(resData?.Data)) return resData.Data;
  if (Array.isArray(resData?.result)) return resData.result;
  if (Array.isArray(resData?.items)) return resData.items;
  if (Array.isArray(resData?.value)) return resData.value;
  return [];
};

const normalizeCountryItem = (item) => ({
  id: Number(
    firstDefined(
      item?.id,
      item?.countryId,
      item?.CountryId,
      item?.value,
      item?.Id
    ) || 0
  ),
  name: toStringValue(
    firstDefined(
      item?.name,
      item?.countryName,
      item?.CountryName,
      item?.label,
      item?.Name
    )
  ),
});

const normalizeCityItem = (item) => ({
  id: Number(
    firstDefined(item?.id, item?.cityId, item?.CityId, item?.value, item?.Id) || 0
  ),
  name: toStringValue(
    firstDefined(item?.name, item?.cityName, item?.CityName, item?.label, item?.Name)
  ),
  countryId: Number(
    firstDefined(item?.countryId, item?.CountryId, item?.parentId, item?.ParentId) ||
      0
  ),
});

const normalizeExpiryDate = (value) => {
  const digits = String(value || "").replace(/\D/g, "").slice(0, 4);
  if (digits.length < 4) return String(value || "").trim();
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}`;
};

const normalizeVerificationStatus = (raw) => {
  const value = String(raw || "").trim().toLowerCase();

  if (!value) return "";

  // IMPORTANT:
  // Do NOT treat boolean-like values such as "true" or "1" as verified.
  // Some seller APIs use true/1/active only to mean the seller account exists/is active,
  // not that admin approved the full verification documents.
  if (
    value.includes("approved") ||
    value.includes("verified") ||
    value.includes("accepted")
  ) {
    return "verified";
  }

  if (
    value.includes("pending") ||
    value.includes("under review") ||
    value.includes("submitted") ||
    value.includes("processing") ||
    value.includes("review")
  ) {
    return "pending";
  }

  if (
    value.includes("rejected") ||
    value.includes("declined") ||
    value.includes("failed")
  ) {
    return "rejected";
  }

  return value;
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

export const createSeller = async (payload) => {
  const primaryToken = getCreateSellerPreferredToken();

  if (!primaryToken) {
    throw new Error("Missing authentication token. Please login again.");
  }

  const { storeName, phoneNumber, cityId, businessType, description, logo } =
    buildCreateSellerPayload(payload);

  const uniqueTokens = [
    ...new Set(
      [primaryToken, ...getVerificationFlowTokens()].map(cleanToken).filter(Boolean)
    ),
  ];

  let lastError = null;

  const queryParams = {
    StoreName: storeName,
    PhoneNumber: phoneNumber,
    CityId: cityId,
    BusinessType: businessType,
    Description: description,
  };

  for (let i = 0; i < uniqueTokens.length; i += 1) {
    const token = uniqueTokens[i];

    try {
      const formData = new FormData();
      appendIfHasValue(formData, "Logo", logo);

      const res = await sellerApi.post("/seller/CreateSeller", formData, {
        params: queryParams,
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      persistSellerSession(res);
      persistSellerSessionFromToken(token);

      const sellerId =
        Number(res?.data?.sellerId || 0) ||
        Number(res?.data?.data?.sellerId || 0) ||
        Number(res?.data?.result?.sellerId || 0) ||
        Number(deepFindValueByKeys(res?.data || {}, ["sellerId"]) || 0);

      if (sellerId) {
        writeBoth(getScopedKey("sellerId"), String(sellerId));
      }

      return {
        ...(res?.data || {}),
        alreadyExists: false,
        isSuccess: true,
        sellerId,
      };
    } catch (error) {
      lastError = error;

      const status = Number(error?.response?.status || 0);
      const data = error?.response?.data || {};
      const msg = String(data?.message || data?.Message || "").toLowerCase();

      if (
        status === 409 ||
        msg.includes("already exists") ||
        msg.includes("already exist") ||
        msg.includes("already created")
      ) {
        persistSellerIdFromAnyData(data);
        persistSellerSessionFromToken(token);

        return {
          ...data,
          alreadyExists: true,
          isSuccess: true,
          message: data?.message || data?.Message || "Seller already exists.",
        };
      }

      if (status === 401 && i < uniqueTokens.length - 1) {
        continue;
      }

      throw error;
    }
  }

  throw lastError || new Error("Create seller failed");
};

export const personalVerification = async (payload) => {
  const tokens = getVerificationFlowTokens();

  if (!tokens.length) {
    throw new Error("Authentication token not found. Please login again.");
  }

  let lastError = null;

  for (let i = 0; i < tokens.length; i += 1) {
    const token = cleanToken(tokens[i]);
    if (!token) continue;

    try {
      const formData = new FormData();
      formData.append(
        "NationalIdFront",
        firstDefined(
          readFormDataValue(payload, "NationalIdFront"),
          payload?.NationalIdFront
        )
      );
      formData.append(
        "NationalIdBack",
        firstDefined(
          readFormDataValue(payload, "NationalIdBack"),
          payload?.NationalIdBack
        )
      );
      formData.append(
        "SelfieWithId",
        firstDefined(
          readFormDataValue(payload, "SelfieWithId"),
          payload?.SelfieWithId
        )
      );

      const res = await sellerApi.post("/seller/personal-verification", formData, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      persistSellerSession(res);
      persistSellerSessionFromToken(token);

      return {
        ...(res?.data || {}),
        alreadyExists: false,
        isSuccess: true,
      };
    } catch (error) {
      lastError = error;
      const status = Number(error?.response?.status || 0);
      const msg = String(
        error?.response?.data?.message ||
          error?.response?.data?.Message ||
          ""
      ).toLowerCase();

      if (
        status === 409 ||
        msg.includes("already exists") ||
        msg.includes("already uploaded") ||
        msg.includes("already verified") ||
        msg.includes("already submitted")
      ) {
        return {
          ...(error?.response?.data || {}),
          alreadyExists: true,
          isSuccess: true,
          message:
            error?.response?.data?.message ||
            error?.response?.data?.Message ||
            "Personal verification already uploaded.",
        };
      }

      if (status !== 401 || i === tokens.length - 1) {
        throw error;
      }
    }
  }

  throw lastError || new Error("Personal verification failed");
};

export const businessVerification = async (payload) => {
  const tokens = getVerificationFlowTokens();

  if (!tokens.length) {
    throw new Error("Authentication token not found. Please login again.");
  }

  const {
    commercialRegister,
    taxId,
    ownerNationalIdFront,
    ownerNationalIdBack,
    instaPayNumber,
    bankName,
    accountName,
    iban,
    localAccountNumber,
  } = buildBusinessPayload(payload);

  let lastError = null;

  for (let i = 0; i < tokens.length; i += 1) {
    const token = cleanToken(tokens[i]);
    if (!token) continue;

    const attempts = [
      () => {
        const formData = new FormData();
        appendIfHasValue(formData, "CommercialRegister", commercialRegister);
        appendIfHasValue(formData, "TaxId", taxId);
        appendIfHasValue(formData, "OwnerNationalIdFront", ownerNationalIdFront);
        appendIfHasValue(formData, "OwnerNationalIdBack", ownerNationalIdBack);

        if (instaPayNumber) {
          const numeric = Number(instaPayNumber);
          if (!Number.isFinite(numeric) || numeric > 2147483647) {
            throw new Error(
              "InstaPay number must be digits only and less than or equal to 2147483647."
            );
          }
          formData.append("instaPayNumber", String(numeric));
        }

        appendIfHasValue(formData, "BankName", bankName);
        appendIfHasValue(formData, "AccountName", accountName);
        appendIfHasValue(formData, "IBAN", iban);
        appendIfHasValue(formData, "LocalAccountNumber", localAccountNumber);

        return sellerApi.post("/seller/business-verification", formData, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
      },

      () => {
        const queryParams = {};

        if (instaPayNumber) {
          const numeric = Number(instaPayNumber);
          if (!Number.isFinite(numeric) || numeric > 2147483647) {
            throw new Error(
              "InstaPay number must be digits only and less than or equal to 2147483647."
            );
          }
          queryParams.instaPayNumber = numeric;
        }

        if (bankName) queryParams.BankName = bankName;
        if (accountName) queryParams.AccountName = accountName;
        if (iban) queryParams.IBAN = iban;
        if (localAccountNumber) queryParams.LocalAccountNumber = localAccountNumber;

        const formData = new FormData();
        appendIfHasValue(formData, "CommercialRegister", commercialRegister);
        appendIfHasValue(formData, "TaxId", taxId);
        appendIfHasValue(formData, "OwnerNationalIdFront", ownerNationalIdFront);
        appendIfHasValue(formData, "OwnerNationalIdBack", ownerNationalIdBack);

        return sellerApi.post("/seller/business-verification", formData, {
          params: queryParams,
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
      },
    ];

    for (let j = 0; j < attempts.length; j += 1) {
      try {
        const res = await attempts[j]();

        persistSellerSession(res);
        persistSellerSessionFromToken(token);
        writeSession("role", "seller");
        writeSession("accountType", "seller");
        setLocalSubmittedState(true);

        return {
          ...(res?.data || {}),
          alreadyExists: false,
          isSuccess: true,
        };
      } catch (error) {
        lastError = error;
        const status = Number(error?.response?.status || 0);
        const msg = String(
          error?.response?.data?.message ||
            error?.response?.data?.Message ||
            ""
        ).toLowerCase();

        if (
          status === 409 ||
          msg.includes("already exists") ||
          msg.includes("already uploaded") ||
          msg.includes("already verified") ||
          msg.includes("already submitted")
        ) {
          writeSession("role", "seller");
          writeSession("accountType", "seller");
          setLocalSubmittedState(true);

          return {
            ...(error?.response?.data || {}),
            alreadyExists: true,
            isSuccess: true,
            message:
              error?.response?.data?.message ||
              error?.response?.data?.Message ||
              "Business verification already uploaded.",
          };
        }

        const canTryNextShape =
          !status || [400, 404, 405, 415, 422, 500].includes(status);

        if (!canTryNextShape || j === attempts.length - 1) {
          if (status !== 401 || i === tokens.length - 1) {
            throw error;
          }
        }
      }
    }
  }

  throw lastError || new Error("Business verification failed");
};

export const getCountries = async () => {
  const res = await sellerApi.get("/Auth/countries");
  return normalizeListResponse(res.data)
    .map(normalizeCountryItem)
    .filter((item) => item.id && item.name);
};

export const getCitiesByCountryId = async (countryId) => {
  const numericCountryId = Number(countryId || 0);
  if (!numericCountryId) return [];

  const res = await sellerApi.get(`/Auth/cities/${numericCountryId}`);
  return normalizeListResponse(res.data)
    .map(normalizeCityItem)
    .filter((item) => item.id && item.name);
};

export const getSellerHome = async () => {
  try {
    const res = await requestSellerGetWithFallback("/seller/Home");
    return res.data;
  } catch (error) {
    const status = Number(error?.response?.status || 0);

    if (status === 401 || status === 403 || status === 404) {
      return { __forbidden: true };
    }

    throw error;
  }
};

export const getSellerBusinessAccount = async () => {
  try {
    const res = await requestSellerGetWithFallback("/seller/business-account");
    return res.data;
  } catch (error) {
    const status = Number(error?.response?.status || 0);

    if (status === 401 || status === 403 || status === 404) {
      return { __forbidden: true };
    }

    throw error;
  }
};

export const getSellerDisplayProfile = async () => {
  const jwtFallback = getJwtFallbackProfile();

  let homeRoot = {};
  let businessRoot = {};

  try {
    homeRoot = await getSellerHome();
  } catch {
    homeRoot = {};
  }

  try {
    businessRoot = await getSellerBusinessAccount();
  } catch {
    businessRoot = {};
  }

  const home = homeRoot && homeRoot.__forbidden ? {} : pickDataObject(homeRoot);
  const business =
    businessRoot && businessRoot.__forbidden ? {} : pickDataObject(businessRoot);

  const cityId = firstDefined(
    business?.cityId,
    business?.CityId,
    business?.city?.id,
    business?.City?.id,
    home?.cityId,
    home?.CityId,
    home?.city?.id,
    home?.City?.id,
    deepFindValueByKeys(businessRoot, ["cityId"]),
    deepFindValueByKeys(homeRoot, ["cityId"])
  );

  const countryId = firstDefined(
    business?.countryId,
    business?.CountryId,
    business?.country?.id,
    business?.Country?.id,
    home?.countryId,
    home?.CountryId,
    home?.country?.id,
    home?.Country?.id,
    deepFindValueByKeys(businessRoot, ["countryId"]),
    deepFindValueByKeys(homeRoot, ["countryId"])
  );

  const image = toStringValue(
    firstDefined(
      business?.image,
      business?.Image,
      business?.profileImage,
      business?.ProfileImage,
      business?.logo,
      business?.Logo,
      business?.storeLogo,
      business?.StoreLogo,
      home?.image,
      home?.Image,
      home?.profileImage,
      home?.ProfileImage,
      home?.logo,
      home?.Logo,
      home?.storeLogo,
      home?.StoreLogo,
      deepFindValueByKeys(businessRoot, ["image", "profileImage", "logo", "storeLogo"]),
      deepFindValueByKeys(homeRoot, ["image", "profileImage", "logo", "storeLogo"])
    )
  );

  let verificationStatus = normalizeVerificationStatus(
    firstDefined(
      business?.verificationStatus,
      business?.VerificationStatus,
      business?.status,
      business?.Status,
      home?.verificationStatus,
      home?.VerificationStatus,
      home?.status,
      home?.Status,
      businessRoot?.verificationStatus,
      businessRoot?.status,
      homeRoot?.verificationStatus,
      homeRoot?.status,
      deepFindValueByKeys(businessRoot, ["verificationStatus", "status"]),
      deepFindValueByKeys(homeRoot, ["verificationStatus", "status"])
    )
  );

  if (!verificationStatus) {
    const submitted =
      getLocalSubmittedState() ||
      toBooleanValue(
        firstDefined(
          business?.businessVerified,
          business?.isBusinessVerified,
          business?.hasSubmittedVerification,
          home?.businessVerified,
          home?.isBusinessVerified,
          home?.hasSubmittedVerification
        )
      );

    if (submitted) {
      verificationStatus = "pending";
    }
  }

  return {
    name: toStringValue(
      firstDefined(
        business?.sellerName,
        business?.SellerName,
        business?.fullName,
        business?.FullName,
        business?.name,
        business?.Name,
        home?.sellerName,
        home?.SellerName,
        home?.fullName,
        home?.FullName,
        home?.name,
        home?.Name,
        deepFindValueByKeys(businessRoot, ["sellerName", "fullName", "name"]),
        deepFindValueByKeys(homeRoot, ["sellerName", "fullName", "name"]),
        jwtFallback.name
      )
    ),
    email: toStringValue(
      firstDefined(
        business?.email,
        business?.Email,
        home?.email,
        home?.Email,
        deepFindValueByKeys(businessRoot, ["email"]),
        deepFindValueByKeys(homeRoot, ["email"]),
        jwtFallback.email
      )
    ),
    image,
    storeName: toStringValue(
      firstDefined(
        business?.storeName,
        business?.StoreName,
        business?.shopName,
        business?.ShopName,
        home?.storeName,
        home?.StoreName,
        home?.shopName,
        home?.ShopName,
        deepFindValueByKeys(businessRoot, ["storeName", "shopName"]),
        deepFindValueByKeys(homeRoot, ["storeName", "shopName"])
      )
    ),
    phoneNumber: toStringValue(
      firstDefined(
        business?.phoneNumber,
        business?.PhoneNumber,
        business?.mobile,
        business?.Mobile,
        business?.phone,
        business?.Phone,
        home?.phoneNumber,
        home?.PhoneNumber,
        home?.mobile,
        home?.Mobile,
        home?.phone,
        home?.Phone,
        deepFindValueByKeys(businessRoot, ["phoneNumber", "mobile", "phone"]),
        deepFindValueByKeys(homeRoot, ["phoneNumber", "mobile", "phone"])
      )
    ),
    description: toStringValue(
      firstDefined(
        business?.description,
        business?.Description,
        business?.about,
        business?.About,
        home?.description,
        home?.Description,
        home?.about,
        home?.About,
        deepFindValueByKeys(businessRoot, ["description", "about"]),
        deepFindValueByKeys(homeRoot, ["description", "about"])
      )
    ),
    city: toStringValue(
      firstDefined(
        business?.city,
        business?.City,
        business?.cityName,
        business?.CityName,
        business?.city?.name,
        business?.City?.name,
        home?.city,
        home?.City,
        home?.cityName,
        home?.CityName,
        home?.city?.name,
        home?.City?.name,
        deepFindValueByKeys(businessRoot, ["city", "cityName"]),
        deepFindValueByKeys(homeRoot, ["city", "cityName"])
      )
    ),
    country: toStringValue(
      firstDefined(
        business?.country,
        business?.Country,
        business?.countryName,
        business?.CountryName,
        business?.country?.name,
        business?.Country?.name,
        home?.country,
        home?.Country,
        home?.countryName,
        home?.CountryName,
        home?.country?.name,
        home?.Country?.name,
        deepFindValueByKeys(businessRoot, ["country", "countryName"]),
        deepFindValueByKeys(homeRoot, ["country", "countryName"])
      )
    ),
    cityId: toNumberValue(cityId),
    countryId: toNumberValue(countryId),
    sellerRating: firstDefined(
      business?.sellerRating,
      business?.SellerRating,
      business?.rating,
      business?.Rating,
      home?.sellerRating,
      home?.SellerRating,
      home?.rating,
      home?.Rating,
      deepFindValueByKeys(businessRoot, ["sellerRating", "rating"]),
      deepFindValueByKeys(homeRoot, ["sellerRating", "rating"]),
      ""
    ),
    followers: firstDefined(
      business?.followers,
      business?.Followers,
      home?.followers,
      home?.Followers,
      deepFindValueByKeys(businessRoot, ["followers"]),
      deepFindValueByKeys(homeRoot, ["followers"]),
      ""
    ),
    auctionsCount: firstDefined(
      business?.auctionsCount,
      business?.AuctionsCount,
      business?.auctions,
      business?.Auctions,
      home?.auctionsCount,
      home?.AuctionsCount,
      home?.auctions,
      home?.Auctions,
      deepFindValueByKeys(businessRoot, ["auctionsCount", "auctions"]),
      deepFindValueByKeys(homeRoot, ["auctionsCount", "auctions"]),
      ""
    ),
    upgradeType: toStringValue(
      firstDefined(
        business?.upgradeType,
        business?.UpgradeType,
        home?.upgradeType,
        home?.UpgradeType,
        deepFindValueByKeys(businessRoot, ["upgradeType"]),
        deepFindValueByKeys(homeRoot, ["upgradeType"])
      )
    ),
    verificationStatus,
    businessData: businessRoot,
    homeData: homeRoot,
  };
};

export const getSellerVerificationStatus = async () => {
  try {
    let homeRoot = {};
    let businessRoot = {};

    try {
      homeRoot = await getSellerHome();
    } catch {
      homeRoot = {};
    }

    try {
      businessRoot = await getSellerBusinessAccount();
    } catch {
      businessRoot = {};
    }

    const home = homeRoot && homeRoot.__forbidden ? {} : pickDataObject(homeRoot);
    const business =
      businessRoot && businessRoot.__forbidden ? {} : pickDataObject(businessRoot);

    const sellerId =
      Number(
        firstDefined(
          home?.sellerId,
          home?.SellerId,
          business?.sellerId,
          business?.SellerId,
          deepFindValueByKeys(homeRoot, ["sellerId"]),
          deepFindValueByKeys(businessRoot, ["sellerId"]),
          readStorage(getScopedKey("sellerId")),
          0
        )
      ) || 0;

    if (sellerId) {
      writeBoth(getScopedKey("sellerId"), String(sellerId));
    }

    const rawVerificationStatus = normalizeVerificationStatus(
      firstDefined(
        home?.verificationStatus,
        home?.VerificationStatus,
        home?.status,
        home?.Status,
        business?.verificationStatus,
        business?.VerificationStatus,
        business?.status,
        business?.Status,
        homeRoot?.verificationStatus,
        homeRoot?.status,
        businessRoot?.verificationStatus,
        businessRoot?.status,
        deepFindValueByKeys(homeRoot, ["verificationStatus", "status"]),
        deepFindValueByKeys(businessRoot, ["verificationStatus", "status"])
      )
    );

    const explicitPersonalVerified = toBooleanValue(
      firstDefined(
        home?.personalVerified,
        home?.isPersonalVerified,
        home?.PersonalVerified,
        home?.IsPersonalVerified,
        business?.personalVerified,
        business?.isPersonalVerified,
        business?.PersonalVerified,
        business?.IsPersonalVerified,
        deepFindValueByKeys(homeRoot, ["personalVerified", "isPersonalVerified"]),
        deepFindValueByKeys(businessRoot, ["personalVerified", "isPersonalVerified"])
      )
    );

    const explicitBusinessVerified = toBooleanValue(
      firstDefined(
        home?.businessVerified,
        home?.isBusinessVerified,
        home?.BusinessVerified,
        home?.IsBusinessVerified,
        business?.businessVerified,
        business?.isBusinessVerified,
        business?.BusinessVerified,
        business?.IsBusinessVerified,
        deepFindValueByKeys(homeRoot, ["businessVerified", "isBusinessVerified"]),
        deepFindValueByKeys(businessRoot, ["businessVerified", "isBusinessVerified"])
      )
    );

    const explicitSubmitted = toBooleanValue(
      firstDefined(
        home?.hasSubmittedVerification,
        home?.HasSubmittedVerification,
        business?.hasSubmittedVerification,
        business?.HasSubmittedVerification,
        deepFindValueByKeys(homeRoot, ["hasSubmittedVerification"]),
        deepFindValueByKeys(businessRoot, ["hasSubmittedVerification"])
      )
    );

    const sellerCreated = sellerId > 0;

    // Only admin-approved/verified status means verified.
    // Existing seller account, active account, true/1 flags, or uploaded step-1 info are NOT verified.
    const isVerified = rawVerificationStatus === "verified";

    const isRejected = rawVerificationStatus === "rejected";

    const isPending =
      !isVerified &&
      !isRejected &&
      (rawVerificationStatus === "pending" ||
        explicitSubmitted ||
        explicitPersonalVerified ||
        explicitBusinessVerified ||
        getLocalSubmittedState());

    if (isVerified) {
      setLocalVerifiedState(true);
      setLocalSubmittedState(true);
    } else if (isPending) {
      setLocalVerifiedState(false);
      setLocalSubmittedState(true);
    } else {
      setLocalVerifiedState(false);
    }

    return {
      isVerified,
      isPending,
      isRejected,
      hasSubmittedVerification: isVerified || isPending,
      personalVerified: explicitPersonalVerified,
      businessVerified: explicitBusinessVerified,
      sellerCreated,
      sellerId,
      verificationStatus: rawVerificationStatus,
      homeData: homeRoot || null,
      raw: {
        businessData: businessRoot || null,
        homeData: homeRoot || null,
      },
    };
  } catch {
    const localSubmitted = getLocalSubmittedState();
    const localSellerId = Number(readStorage(getScopedKey("sellerId")) || 0);

    return {
      isVerified: false,
      isPending: localSubmitted,
      isRejected: false,
      hasSubmittedVerification: localSubmitted,
      personalVerified: false,
      businessVerified: false,
      sellerCreated: localSellerId > 0,
      sellerId: localSellerId,
      verificationStatus: localSubmitted ? "pending" : "",
      homeData: null,
      raw: null,
    };
  }
};

export const resetVerificationForCurrentAccount = () => {
  clearScopedVerificationProgress();
};

export const getSellerAuctionHistory = async (page = 1) => {
  try {
    const res = await sellerApi.get("/Auction/Get-History", {
      params: { page },
    });
    return res.data;
  } catch {
    const res = await requestSellerGetWithFallback("/Auction/Get-History", {
      params: { page },
    });
    return res.data;
  }
};

export const editSellerProfile = async (payload) => {
  const tokens = getVerificationFlowTokens();
  if (!tokens.length) {
    throw new Error("Authentication token not found. Please login again.");
  }

  const cityId =
    Number(payload?.cityId || 0) ||
    Number(readStorage("sellerCityId") || 0) ||
    Number(readStorage(getScopedKey("sellerCityId")) || 0);

  if (!cityId) throw new Error("City is required");

  const countryId =
    Number(payload?.countryId || 0) ||
    Number(readStorage("sellerCountryId") || 0) ||
    Number(readStorage(getScopedKey("sellerCountryId")) || 0);

  const storeName = toStringValue(payload?.storeName);
  const phoneNumber = toStringValue(payload?.phoneNumber);
  const description = toStringValue(payload?.description);
  const storeLogo = payload?.storeLogo || null;

  const queryParams = {
    StoreName: storeName,
    PhoneNumber: phoneNumber,
    CityId: cityId,
    Description: description,
  };

  if (countryId) {
    queryParams.CountryId = countryId;
  }

  const formDataBody = new FormData();
  appendIfHasValue(formDataBody, "Logo", storeLogo);
  appendIfHasValue(formDataBody, "storeLogo", storeLogo);

  const jsonBody = {
    storeName,
    phoneNumber,
    cityId,
    description,
    ...(countryId ? { countryId } : {}),
  };

  const logoBase64 = await fileToBase64(storeLogo);
  const jsonWithLogoBody = {
    ...jsonBody,
    ...(logoBase64 ? { storeLogo: logoBase64 } : {}),
  };

  let lastError = null;

  for (const token of tokens) {
    try {
      const res = await sellerApi.put("/seller/edit-profile", jsonWithLogoBody, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      writeBoth("sellerCityId", String(cityId));
      writeBoth(getScopedKey("sellerCityId"), String(cityId));

      if (countryId) {
        writeBoth("sellerCountryId", String(countryId));
        writeBoth(getScopedKey("sellerCountryId"), String(countryId));
      }

      return res.data;
    } catch (error) {
      lastError = error;

      if (!shouldRetryWithAnotherShape(error)) {
        throw error;
      }

      const res = await sellerApi.put("/seller/edit-profile", formDataBody, {
        params: queryParams,
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      writeBoth("sellerCityId", String(cityId));
      writeBoth(getScopedKey("sellerCityId"), String(cityId));

      if (countryId) {
        writeBoth("sellerCountryId", String(countryId));
        writeBoth(getScopedKey("sellerCountryId"), String(countryId));
      }

      return res.data;
    }
  }

  throw lastError || new Error("Failed to update profile.");
};

export const upgradeSeller = async (upgradeType) => {
  const tokens = getVerificationFlowTokens();
  let lastError = null;

  for (const token of tokens) {
    try {
      const res = await sellerApi.post(
        "/seller/upgrade",
        { upgradeType: Number(upgradeType) },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      return res.data;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error("Upgrade failed");
};

export const getWalletBalance = async () => {
  const res = await requestSellerGetWithFallback("/Wallet/balance");
  return res.data;
};

export const getWalletTransactionHistory = async () => {
  try {
    const res = await requestSellerGetWithFallback("/Wallet/TransactionHistory");
    const list = normalizeListResponse(res.data);
    return Array.isArray(list) ? list : [];
  } catch (error) {
    const status = Number(error?.response?.status || 0);
    if (status === 404) return [];
    throw error;
  }
};

export const depositToWallet = async ({ amount, savedCardId }) => {
  const tokens = getVerificationFlowTokens();
  let lastError = null;

  for (const token of tokens) {
    try {
      const res = await sellerApi.post(
        "/Wallet/deposit",
        {
          amount: Number(amount || 0),
          savedCardId: Number(savedCardId || 0),
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      return res.data;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error("Deposit failed");
};

export const withdrawFromWallet = async ({ amount, cardId }) => {
  const tokens = getVerificationFlowTokens();
  let lastError = null;

  for (const token of tokens) {
    try {
      const res = await sellerApi.post(
        "/Wallet/withdraw",
        {
          amount: Number(amount || 0),
          cardId: Number(cardId || 0),
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      return res.data;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error("Withdraw failed");
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

export const addSellerCard = async (payload) => {
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

  const tokens = getVerificationFlowTokens();
  let lastError = null;

  for (const token of tokens) {
    try {
      const res = await sellerApi.post("/Card/AddCard", requestBody, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

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
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error("Add card failed");
};

export const getSellerSavedCards = async () => {
  const res = await requestSellerGetWithFallback("/Card/cards");
  const cards = normalizeListResponse(res.data).map(normalizeSavedCardItem);
  setStoredSavedCards(cards);
  return cards;
};

export const deleteSellerSavedCardLocal = async (cardId) => {
  const numericId = Number(cardId || 0);
  if (!numericId) {
    throw new Error("Invalid card id");
  }

  const tokens = getVerificationFlowTokens();
  let lastError = null;

  for (const token of tokens) {
    try {
      const res = await sellerApi.delete(`/Card/Delete-Card/${numericId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const current = getStoredSavedCards();
      setStoredSavedCards(
        current.filter((item) => Number(item?.backendId || item?.id || 0) !== numericId)
      );

      return {
        ...(isPlainObject(res?.data) ? res.data : {}),
        deletedId: numericId,
        message: res?.data?.message || "Card deleted successfully",
      };
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error("Delete card failed");
};