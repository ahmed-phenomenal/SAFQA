import { extractTokenFromUnknown } from "./axios";

const readStorage = (key) => {
  if (typeof window === "undefined") return null;

  const fromLocal = localStorage.getItem(key);
  if (fromLocal) return fromLocal;

  const fromSession = sessionStorage.getItem(key);
  if (fromSession) return fromSession;

  return null;
};

const removeFromBothStorages = (key) => {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(key);
  localStorage.removeItem(key);
};

const safeJsonParse = (value) => {
  try {
    return JSON.parse(value);
  } catch {
    return null;
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

    return safeJsonParse(json);
  } catch {
    return null;
  }
};

const isJwtExpired = (token) => {
  const payload = decodeJwtPayload(token);
  if (!payload?.exp) return false;

  const expiresAt = Number(payload.exp) * 1000;
  return Date.now() >= expiresAt;
};

const normalizeRole = (roleValue) => {
  if (!roleValue) return "";

  const role = String(roleValue).toLowerCase().trim();

  if (role.includes("admin")) return "admin";
  if (role.includes("seller")) return "seller";
  if (
    role.includes("user") ||
    role.includes("buyer") ||
    role.includes("customer") ||
    role.includes("member")
  ) {
    return "user";
  }

  return "";
};

const normalizeAccountType = (value) => {
  const v = String(value || "").trim().toLowerCase();
  return v === "seller" ? "seller" : "buyer";
};

const normalizeEmail = (value) => String(value || "").trim().toLowerCase();

const readRoleFromPayload = (payload) => {
  if (!payload || typeof payload !== "object") return "";

  const possibleKeys = [
    "role",
    "roles",
    "Role",
    "Roles",
    "http://schemas.microsoft.com/ws/2008/06/identity/claims/role",
    "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/role",
  ];

  for (const key of possibleKeys) {
    const value = payload[key];

    if (Array.isArray(value) && value.length > 0) {
      const normalized = normalizeRole(value[0]);
      if (normalized) return normalized;
    }

    if (typeof value === "string") {
      const normalized = normalizeRole(value);
      if (normalized) return normalized;
    }
  }

  return "";
};

const readStoredToken = (key) => {
  return extractTokenFromUnknown(readStorage(key));
};

const ROLE_HINTS_KEY = "authRoleHintsByEmail";

const getRoleHintsMap = () => {
  const raw = readStorage(ROLE_HINTS_KEY);
  const parsed = safeJsonParse(raw);
  return parsed && typeof parsed === "object" ? parsed : {};
};

const setRoleHintsMap = (map) => {
  if (typeof window === "undefined") return;

  localStorage.setItem(ROLE_HINTS_KEY, JSON.stringify(map || {}));
  sessionStorage.setItem(ROLE_HINTS_KEY, JSON.stringify(map || {}));
};

export const rememberAccountTypeByEmail = (email, accountType) => {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) return;

  const map = getRoleHintsMap();
  map[normalizedEmail] = normalizeAccountType(accountType);
  setRoleHintsMap(map);
};

export const getRememberedAccountTypeByEmail = (email) => {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) return "";

  const map = getRoleHintsMap();
  const value = map[normalizedEmail];
  return value === "seller" ? "seller" : value === "buyer" ? "buyer" : "";
};

export const getStoredTokens = () => {
  const token = readStoredToken("token");
  const userToken = readStoredToken("userToken");
  const sellerToken = readStoredToken("sellerToken");
  const adminToken = readStoredToken("adminToken");

  return {
    token,
    userToken,
    sellerToken,
    adminToken,
  };
};

export const getAuthState = () => {
  const { token, userToken, sellerToken, adminToken } = getStoredTokens();

  const cleanAdminToken = adminToken && !isJwtExpired(adminToken) ? adminToken : "";
  const cleanSellerToken =
    sellerToken && !isJwtExpired(sellerToken) ? sellerToken : "";
  const cleanUserToken = userToken && !isJwtExpired(userToken) ? userToken : "";
  const cleanToken = token && !isJwtExpired(token) ? token : "";

  const adminPayload = decodeJwtPayload(cleanAdminToken);
  const sellerPayload = decodeJwtPayload(cleanSellerToken);
  const userPayload = decodeJwtPayload(cleanUserToken);
  const tokenPayload = decodeJwtPayload(cleanToken);

  const adminRole = readRoleFromPayload(adminPayload);
  const sellerRole = readRoleFromPayload(sellerPayload);
  const userRole = readRoleFromPayload(userPayload);
  const tokenRole = readRoleFromPayload(tokenPayload);

  if (cleanAdminToken || adminRole === "admin") {
    return {
      isAuthenticated: true,
      role: "admin",
      token: cleanAdminToken,
    };
  }

  if (cleanSellerToken || sellerRole === "seller") {
    return {
      isAuthenticated: true,
      role: "seller",
      token: cleanSellerToken,
    };
  }

  if (cleanUserToken || userRole === "user") {
    return {
      isAuthenticated: true,
      role: "user",
      token: cleanUserToken,
    };
  }

  if (cleanToken) {
    return {
      isAuthenticated: true,
      role: tokenRole || readStorage("role") || "user",
      token: cleanToken,
    };
  }

  return {
    isAuthenticated: false,
    role: "guest",
    token: "",
  };
};

export const clearStoredSession = () => {
  [
    "token",
    "userToken",
    "sellerToken",
    "adminToken",
    "refreshToken",
    "sellerId",
    "pendingEmail",
    "currentUserEmail",
    "pendingAccountType",
    "authLoginHintAccountType",
    "role",
    "accountType",
    "seller_verification_country_id",
    "seller_verification_city_id",
    "seller_verification_country_name",
    "seller_verification_city_name",
    "seller_verification_store_name",
    "seller_verification_phone",
    "seller_verification_description",
    "seller_auctions_local_cache",
    ROLE_HINTS_KEY,
  ].forEach(removeFromBothStorages);
};