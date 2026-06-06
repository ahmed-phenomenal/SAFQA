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
  try { return JSON.parse(value); } catch { return null; }
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
  } catch { return null; }
};

const normalizeRole = (roleValue) => {
  if (!roleValue) return "";
  const role = String(roleValue).toLowerCase().trim();
  if (role.includes("admin"))  return "admin";
  if (role.includes("seller")) return "seller";
  if (role.includes("user") || role.includes("buyer") || role.includes("customer") || role.includes("member")) return "user";
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
    "role", "roles", "Role", "Roles",
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

const readStoredToken = (key) => extractTokenFromUnknown(readStorage(key));

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

export const getStoredTokens = () => ({
  token:       readStoredToken("token"),
  userToken:   readStoredToken("userToken"),
  sellerToken: readStoredToken("sellerToken"),
  adminToken:  readStoredToken("adminToken"),
});

export const getAuthState = () => {
  const { token, userToken, sellerToken, adminToken } = getStoredTokens();

  const adminPayload  = decodeJwtPayload(adminToken);
  const sellerPayload = decodeJwtPayload(sellerToken);
  const userPayload   = decodeJwtPayload(userToken);
  const tokenPayload  = decodeJwtPayload(token);

  const adminRole  = readRoleFromPayload(adminPayload);
  const sellerRole = readRoleFromPayload(sellerPayload);
  const userRole   = readRoleFromPayload(userPayload);
  const tokenRole  = readRoleFromPayload(tokenPayload);

  if (adminToken || adminRole === "admin") {
    return { isAuthenticated: true, role: "admin",  token: adminToken };
  }
  if (sellerToken || sellerRole === "seller") {
    return { isAuthenticated: true, role: "seller", token: sellerToken };
  }
  if (userToken || userRole === "user") {
    return { isAuthenticated: true, role: "user",   token: userToken };
  }
  if (token) {
    return { isAuthenticated: true, role: tokenRole || readStorage("role") || "user", token };
  }

  return { isAuthenticated: false, role: "guest", token: "" };
};

export const getSellerVerificationAccountKey = () => {
  return String(
    readStorage("currentUserEmail") ||
    readStorage("pendingEmail") ||
    readStorage("sellerEmail") ||
    "guest"
  ).trim().toLowerCase();
};

export const getSellerVerificationScopedKey = (baseKey) => {
  return `${baseKey}:${getSellerVerificationAccountKey()}`;
};

// ✅ Scoped only — no global key fallback so new accounts are never falsely verified
export const hasSellerVerifiedAccess = () => {
  if (typeof window === "undefined") return false;
  const accountKey = getSellerVerificationAccountKey();
  if (!accountKey || accountKey === "guest") return false;
  return (
    localStorage.getItem(`seller_verified_local:${accountKey}`) === "true" ||
    sessionStorage.getItem(`seller_verified_local:${accountKey}`) === "true"
  );
};

// ✅ Scoped only
export const hasSellerSubmittedVerification = () => {
  if (typeof window === "undefined") return false;
  const accountKey = getSellerVerificationAccountKey();
  if (!accountKey || accountKey === "guest") return false;
  return (
    localStorage.getItem(`seller_verification_submitted:${accountKey}`) === "true" ||
    sessionStorage.getItem(`seller_verification_submitted:${accountKey}`) === "true"
  );
};

// ✅ Does NOT dispatch any event — callers are responsible for that if needed
export const markSellerVerifiedAccess = () => {
  if (typeof window === "undefined") return false;
  const accountKey = getSellerVerificationAccountKey();
  if (!accountKey || accountKey === "guest") return false;

  const scopedVerifiedKey  = `seller_verified_local:${accountKey}`;
  const scopedSubmittedKey = `seller_verification_submitted:${accountKey}`;

  sessionStorage.setItem(scopedVerifiedKey, "true");
  localStorage.setItem(scopedVerifiedKey, "true");
  sessionStorage.setItem(scopedSubmittedKey, "true");
  localStorage.setItem(scopedSubmittedKey, "true");
  sessionStorage.setItem("role", "seller");
  sessionStorage.setItem("accountType", "seller");

  // ✅ No event dispatch here — prevents infinite loops in listeners
  return true;
};

export const clearStoredSession = () => {
  const accountKey = getSellerVerificationAccountKey();
  const keysToRemove = [
    "token", "userToken", "sellerToken", "adminToken", "refreshToken",
    "sellerId", "pendingEmail", "currentUserEmail", "pendingAccountType",
    "authLoginHintAccountType", "role", "accountType",
    // Clear old global keys in case they exist from previous sessions
    "seller_verified_global",
    "seller_verification_submitted_global",
    "seller_verification_country_id", "seller_verification_city_id",
    "seller_verification_country_name", "seller_verification_city_name",
    "seller_verification_store_name", "seller_verification_phone",
    "seller_verification_description", "seller_auctions_local_cache",
    ROLE_HINTS_KEY,
  ];

  // Also clear scoped keys for the current account
  if (accountKey && accountKey !== "guest") {
    keysToRemove.push(`seller_verified_local:${accountKey}`);
    keysToRemove.push(`seller_verification_submitted:${accountKey}`);
  }

  keysToRemove.forEach(removeFromBothStorages);
};

export const clearSellerVerificationFlags = () => {
  if (typeof window === "undefined") return;
  const accountKey = getSellerVerificationAccountKey();
  [
    `seller_verified_local:${accountKey}`,
    `seller_verification_submitted:${accountKey}`,
    "seller_verified_global",
    "seller_verification_submitted_global",
  ].forEach(removeFromBothStorages);
};