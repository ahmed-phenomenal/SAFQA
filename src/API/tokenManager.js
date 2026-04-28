const safeJsonParse = (value, fallback = null) => {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

const normalizeTokenString = (value) => {
  let token = String(value || "").trim();

  if (!token) return "";

  if (token.toLowerCase().startsWith("bearer ")) {
    token = token.slice(7).trim();
  }

  if (
    (token.startsWith('"') && token.endsWith('"')) ||
    (token.startsWith("'") && token.endsWith("'"))
  ) {
    token = token.slice(1, -1).trim();
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

export const extractTokenFromUnknown = (value) => {
  if (!value) return "";

  if (typeof value === "object") {
    const direct =
      value.token ||
      value.accessToken ||
      value.access_token ||
      value.jwt ||
      value.jwtToken ||
      value.idToken ||
      value.sellerToken ||
      value.userToken ||
      value.adminToken ||
      value.data?.token ||
      value.data?.accessToken ||
      value.data?.access_token ||
      value.data?.jwt ||
      value.data?.jwtToken ||
      value.data?.sellerToken ||
      value.data?.userToken ||
      value.data?.adminToken ||
      value.result?.token ||
      value.result?.accessToken ||
      value.result?.access_token ||
      value.result?.jwt ||
      value.result?.jwtToken ||
      value.result?.sellerToken ||
      value.result?.userToken ||
      value.result?.adminToken ||
      "";

    return extractTokenFromUnknown(direct);
  }

  let token = normalizeTokenString(value);
  if (!token) return "";

  const parsed = safeJsonParse(token, null);
  if (parsed && typeof parsed === "object") {
    return extractTokenFromUnknown(parsed);
  }

  return normalizeTokenString(token);
};

export const extractRefreshTokenFromUnknown = (value) => {
  if (!value) return "";

  if (typeof value === "object") {
    const direct =
      value.refreshToken ||
      value.refresh_token ||
      value.RefreshToken ||
      value.refresh ||
      value.Refresh ||
      value.data?.refreshToken ||
      value.data?.refresh_token ||
      value.data?.RefreshToken ||
      value.data?.refresh ||
      value.result?.refreshToken ||
      value.result?.refresh_token ||
      value.result?.RefreshToken ||
      value.result?.refresh ||
      "";

    return direct ? extractRefreshTokenFromUnknown(direct) : "";
  }

  return normalizeTokenString(value);
};

export const extractErrorMessage = (data, fallbackMessage = "") => {
  if (!data) return fallbackMessage;

  if (typeof data === "string") {
    return data.trim() || fallbackMessage;
  }

  if (typeof data !== "object") {
    return fallbackMessage;
  }

  const direct =
    data.message ||
    data.Message ||
    data.error ||
    data.Error ||
    data.detail ||
    data.Detail ||
    data.title ||
    data.Title ||
    "";

  if (typeof direct === "string" && direct.trim()) {
    return direct.trim();
  }

  if (Array.isArray(data.errors)) {
    const first = data.errors.find(
      (item) => typeof item === "string" && item.trim()
    );
    if (first) return first.trim();
  }

  if (data.errors && typeof data.errors === "object") {
    for (const value of Object.values(data.errors)) {
      if (Array.isArray(value)) {
        const first = value.find(
          (item) => typeof item === "string" && item.trim()
        );
        if (first) return first.trim();
      }

      if (typeof value === "string" && value.trim()) {
        return value.trim();
      }
    }
  }

  if (data.data && typeof data.data === "object") {
    const nested = extractErrorMessage(data.data, "");
    if (nested) return nested;
  }

  if (data.result && typeof data.result === "object") {
    const nested = extractErrorMessage(data.result, "");
    if (nested) return nested;
  }

  return fallbackMessage;
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

export const ensureDeviceId = () => {
  let deviceId = localStorage.getItem("DeviceId");

  if (!deviceId) {
    deviceId = "web-" + (window.crypto?.randomUUID?.() ?? String(Date.now()));
    localStorage.setItem("DeviceId", deviceId);
  }

  return deviceId;
};

export const getStoredToken = (...keys) => {
  for (const key of keys) {
    const token = extractTokenFromUnknown(localStorage.getItem(key));
    if (token) return token;
  }
  return "";
};

export const getRefreshToken = () => {
  return extractRefreshTokenFromUnknown(localStorage.getItem("refreshToken"));
};

export const getDefaultAccessToken = () => {
  return getStoredToken("token", "userToken", "sellerToken", "adminToken");
};

export const getCreateSellerAccessToken = () => {
  return getStoredToken("userToken", "token", "sellerToken", "adminToken");
};

export const getSellerScopedAccessToken = () => {
  return getStoredToken("sellerToken", "token", "userToken", "adminToken");
};

export const clearAuthSession = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("userToken");
  localStorage.removeItem("sellerToken");
  localStorage.removeItem("adminToken");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("role");
  localStorage.removeItem("accountType");
};

const normalizeAccountType = (value) => {
  const v = String(value || "").trim().toLowerCase();
  return v === "seller" ? "seller" : "buyer";
};

export const persistAuthSession = (input, options = {}) => {
  const payload =
    input && typeof input === "object" && input.data && typeof input.data === "object"
      ? input.data
      : input;

  const accessToken = extractTokenFromUnknown(payload);
  const refreshToken =
    extractRefreshTokenFromUnknown(payload) ||
    extractRefreshTokenFromUnknown(options.refreshToken);

  const decoded = decodeJwtPayload(accessToken);
  const decodedRole = readRoleFromPayload(decoded);

  const requestedRole = normalizeRole(options.role);
  const requestedAccountType = normalizeAccountType(options.accountType);

  const role =
    requestedRole ||
    decodedRole ||
    (requestedAccountType === "seller" ? "seller" : "user") ||
    normalizeRole(localStorage.getItem("role"));

  if (accessToken) {
    localStorage.setItem("token", accessToken);

    if (role === "seller") {
      localStorage.setItem("sellerToken", accessToken);
      localStorage.setItem("role", "seller");
      localStorage.setItem("accountType", "seller");
    } else if (role === "admin") {
      localStorage.setItem("adminToken", accessToken);
      localStorage.setItem("role", "admin");
      localStorage.setItem("accountType", "buyer");
    } else {
      localStorage.setItem("userToken", accessToken);
      localStorage.setItem("role", "user");
      localStorage.setItem("accountType", "buyer");
    }
  }

  if (refreshToken) {
    localStorage.setItem("refreshToken", refreshToken);
  }

  return {
    accessToken,
    refreshToken,
    role,
  };
};

export const isRefreshTokenRoute = (url = "") => {
  const lower = String(url || "").toLowerCase();
  return lower.includes("/auth/refresh-token");
};

export const isPublicAuthRoute = (url = "") => {
  const lower = String(url || "").toLowerCase();

  return (
    lower.includes("/auth/register") ||
    lower.includes("/auth/login") ||
    lower.includes("/auth/confirm-email") ||
    lower.includes("/auth/resend-confirm-email") ||
    lower.includes("/auth/google") ||
    lower.includes("/auth/facebook") ||
    lower.includes("/auth/resendregistrationotp") ||
    lower.includes("/auth/request-forgetpassword") ||
    lower.includes("/auth/verify-forgetpassword") ||
    lower.includes("/auth/reset-forgetpassword") ||
    lower.includes("/auth/resendotp") ||
    lower.includes("/auth/countries") ||
    lower.includes("/auth/cities/") ||
    lower.includes("/auth/refresh-token")
  );
};