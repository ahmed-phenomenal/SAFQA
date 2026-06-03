import axios from "axios";
import API_BASE_URL from "./baseUrl";

const AUTH_KEYS = [
  "token",
  "userToken",
  "sellerToken",
  "adminToken",
  "refreshToken",
  "role",
  "accountType",
  "sellerId",
  "currentUserEmail",
  "pendingEmail",
  "authLoginHintAccountType",
];

// Admin paths removed — they are now protected, not public
const PUBLIC_FRONTEND_PATHS = [
  "/login",
  "/sign-up",
  "/forget",
  "/code",
  "/reset-password",
  "/confirm_login",
  "/delivery",
];

const isPublicFrontendPath = () => {
  if (typeof window === "undefined") return false;
  const path = window.location.pathname;
  return PUBLIC_FRONTEND_PATHS.some((publicPath) => {
    return path === publicPath || path.startsWith(`${publicPath}/`);
  });
};

const readStorage = (key) => {
  if (typeof window === "undefined") return null;
  const fromLocal = localStorage.getItem(key);
  if (fromLocal) return fromLocal;
  const fromSession = sessionStorage.getItem(key);
  if (fromSession) return fromSession;
  return null;
};

const writeStorage = (key, value) => {
  localStorage.setItem(key, value);
};

const removeFromBothStorages = (key) => {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(key);
  localStorage.removeItem(key);
};

export const safeJsonParse = (value, fallback = null) => {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

const normalizeTokenString = (value) => {
  let token = String(value || "").trim();
  if (!token) return "";
  const parsed = safeJsonParse(token, null);
  if (typeof parsed === "string") token = parsed.trim();
  if (token.toLowerCase().startsWith("bearer ")) token = token.slice(7).trim();
  if (
    (token.startsWith('"') && token.endsWith('"')) ||
    (token.startsWith("'") && token.endsWith("'"))
  ) {
    token = token.slice(1, -1).trim();
  }
  if (!token || token === "undefined" || token === "null" || token === "[object Object]") return "";
  return token;
};

export const extractTokenFromUnknown = (value) => {
  if (!value) return "";
  if (typeof value === "object") {
    const nested =
      value.token || value.accessToken || value.access_token ||
      value.jwt || value.jwtToken || value.idToken ||
      value.sellerToken || value.userToken || value.adminToken ||
      value.data?.token || value.data?.accessToken || value.data?.access_token ||
      value.data?.jwt || value.data?.jwtToken ||
      value.data?.sellerToken || value.data?.userToken || value.data?.adminToken ||
      value.result?.token || value.result?.accessToken || value.result?.access_token ||
      value.result?.jwt || value.result?.jwtToken ||
      value.result?.sellerToken || value.result?.userToken || value.result?.adminToken ||
      "";
    return extractTokenFromUnknown(nested);
  }
  const raw = normalizeTokenString(value);
  const parsed = safeJsonParse(raw, null);
  if (parsed && typeof parsed === "object") return extractTokenFromUnknown(parsed);
  return raw;
};

export const extractRefreshTokenFromUnknown = (value) => {
  if (!value) return "";
  if (typeof value === "object") {
    const nested =
      value.refreshToken || value.refresh_token || value.RefreshToken ||
      value.refresh || value.Refresh ||
      value.data?.refreshToken || value.data?.refresh_token || value.data?.RefreshToken ||
      value.data?.refresh ||
      value.result?.refreshToken || value.result?.refresh_token ||
      value.result?.RefreshToken || value.result?.refresh ||
      "";
    return extractRefreshTokenFromUnknown(nested);
  }
  return normalizeTokenString(value);
};

export const getStoredToken = (...keys) => {
  for (const key of keys) {
    const token = extractTokenFromUnknown(readStorage(key));
    if (token) return token;
  }
  return "";
};

export const getRefreshToken = () => {
  return extractRefreshTokenFromUnknown(readStorage("refreshToken"));
};

export const getCreateSellerAccessToken = () => {
  return getStoredToken("userToken", "token", "sellerToken", "adminToken");
};

export const getSellerScopedAccessToken = () => {
  return getStoredToken("sellerToken", "token", "userToken", "adminToken");
};

export const getDefaultAccessToken = () => {
  return getStoredToken("token", "userToken", "sellerToken", "adminToken");
};

export const ensureDeviceId = () => {
  let deviceId = readStorage("DeviceId");
  if (!deviceId) {
    deviceId = "web-" + (window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`);
    writeStorage("DeviceId", deviceId);
  }
  return deviceId;
};

export const extractErrorMessage = (data, fallbackMessage = "") => {
  if (!data) return fallbackMessage;
  if (typeof data === "string") return data.trim() || fallbackMessage;
  if (typeof data !== "object") return fallbackMessage;
  const direct =
    data.message || data.Message || data.error || data.Error ||
    data.detail || data.Detail || data.title || data.Title || "";
  if (typeof direct === "string" && direct.trim()) return direct.trim();
  if (Array.isArray(data.errors)) {
    const first = data.errors.find((item) => typeof item === "string" && item.trim());
    if (first) return first.trim();
  }
  if (data.errors && typeof data.errors === "object") {
    for (const value of Object.values(data.errors)) {
      if (Array.isArray(value)) {
        const first = value.find((item) => typeof item === "string" && item.trim());
        if (first) return first.trim();
      }
      if (typeof value === "string" && value.trim()) return value.trim();
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

export const clearAuthTokensOnly = () => {
  AUTH_KEYS.forEach(removeFromBothStorages);
};

export const clearAuthAndRedirectToLogin = () => {
  clearAuthTokensOnly();
  if (typeof window === "undefined") return;
  if (isPublicFrontendPath()) return;
  const currentPath = window.location.pathname + window.location.search + window.location.hash;
  if (!window.location.pathname.includes("/login")) {
    window.location.replace(`/login?redirect=${encodeURIComponent(currentPath)}`);
  }
};

const normalizeRole = (value) => {
  const role = String(value || "").trim().toLowerCase();
  if (role === "seller") return "seller";
  if (role === "admin") return "admin";
  if (role === "user") return "user";
  if (role === "buyer") return "user";
  if (role === "customer") return "user";
  if (role === "administrator") return "admin";
  return "";
};

const normalizeAccountType = (value) => {
  const accountType = String(value || "").trim().toLowerCase();
  if (accountType === "seller") return "seller";
  if (accountType === "buyer") return "buyer";
  if (accountType === "user") return "buyer";
  return "";
};

const getCurrentRoleTokenKey = () => {
  const role = normalizeRole(readStorage("role"));
  const accountType = normalizeAccountType(readStorage("accountType"));
  if (role === "seller" || accountType === "seller" || readStorage("sellerToken")) return "sellerToken";
  if (role === "admin" || readStorage("adminToken")) return "adminToken";
  if (role === "user" || readStorage("userToken")) return "userToken";
  return "token";
};

export const persistAuthTokensFromResponse = (data, options = {}) => {
  const accessToken = extractTokenFromUnknown(data);
  const refreshToken = extractRefreshTokenFromUnknown(data);
  const role = normalizeRole(options.role || readStorage("role"));
  const accountType = normalizeAccountType(options.accountType || readStorage("accountType"));
  let tokenKey = options.tokenKey || "";
  if (!tokenKey) {
    if (role === "seller" || accountType === "seller") tokenKey = "sellerToken";
    else if (role === "admin") tokenKey = "adminToken";
    else if (role === "user" || accountType === "buyer") tokenKey = "userToken";
    else tokenKey = getCurrentRoleTokenKey();
  }
  if (accessToken) {
    writeStorage("token", accessToken);
    if (tokenKey && tokenKey !== "token") writeStorage(tokenKey, accessToken);
  }
  if (refreshToken) writeStorage("refreshToken", refreshToken);
  if (role) writeStorage("role", role);
  if (accountType) writeStorage("accountType", accountType);
  return { accessToken, refreshToken, tokenKey };
};

export const isRefreshTokenRoute = (url = "") => {
  return String(url || "").toLowerCase().includes("/auth/refresh-token");
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

export const getAccessTokenForRoute = (url = "") => {
  const lower = String(url || "").toLowerCase();
  if (lower.includes("/seller/createseller")) return getCreateSellerAccessToken();
  const isSellerScopedRoute =
    lower.includes("/seller/") || lower.includes("/wallet/") ||
    lower.includes("/card/") || lower.includes("/notifications/") ||
    lower.includes("/auction/") || lower.includes("/item/") ||
    lower.includes("/transaction/") || lower.includes("/bid/") ||
    lower.includes("/totalbid/") || lower.includes("/dispute/") ||
    lower.includes("/chat/") || lower.includes("/order/") ||
    lower.includes("/review/") || lower.includes("/tracking/");
  if (isSellerScopedRoute) return getSellerScopedAccessToken();
  return getDefaultAccessToken();
};

const refreshClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
});

let refreshPromise = null;

export const refreshAccessToken = async () => {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    const refreshToken = getRefreshToken();
    const deviceId = ensureDeviceId();

    if (!refreshToken) {
      clearAuthTokensOnly();
      throw {
        response: { status: 401, data: { message: "Session expired. Please login again." } },
      };
    }

    const attempts = [
      { data: undefined, headers: {} },
      { data: { refreshToken }, headers: { "Content-Type": "application/json" } },
      { data: JSON.stringify(refreshToken), headers: { "Content-Type": "application/json" } },
      { data: refreshToken, headers: { "Content-Type": "text/plain" } },
    ];

    let lastError = null;

    for (const attempt of attempts) {
      try {
        const res = await refreshClient.post("/Auth/refresh-token", attempt.data, {
          headers: {
            ...(attempt.headers || {}),
            "x-api-key": "abc123xyhgfhjgkiho3544351z",
            DeviceId: deviceId,
            Accept: "application/json",
          },
        });

        const saved = persistAuthTokensFromResponse(res.data, {
          tokenKey: getCurrentRoleTokenKey(),
          role: readStorage("role"),
          accountType: readStorage("accountType"),
        });

        if (!saved.accessToken) {
          throw new Error("Refresh token succeeded but access token was not returned.");
        }

        return saved.accessToken;
      } catch (error) {
        lastError = error;
      }
    }

    clearAuthTokensOnly();

    throw {
      ...lastError,
      response: {
        ...(lastError?.response || {}),
        status: Number(lastError?.response?.status || 401),
        data: {
          ...(typeof lastError?.response?.data === "object" && lastError?.response?.data
            ? lastError.response.data : {}),
          message: extractErrorMessage(
            lastError?.response?.data,
            lastError?.message || "Session expired. Please login again."
          ),
        },
      },
    };
  })();

  try {
    return await refreshPromise;
  } finally {
    refreshPromise = null;
  }
};

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
});

api.interceptors.request.use((config) => {
  const url = String(config.url || "").toLowerCase();
  const token = getAccessTokenForRoute(url);
  const deviceId = ensureDeviceId();
  const isFormData = typeof FormData !== "undefined" && config.data instanceof FormData;

  config.headers = {
    ...(config.headers || {}),
    "x-api-key": "abc123xyhgfhjgkiho3544351z",
    DeviceId: deviceId,
    Accept: "application/json",
  };

  if (!isFormData) config.headers["Content-Type"] = "application/json";
  else delete config.headers["Content-Type"];

  if (!isPublicAuthRoute(url) && token && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error?.config || {};
    const status = Number(error?.response?.status || 0);
    const requestUrl = String(originalRequest.url || "").toLowerCase();
    const shouldSkipLoginRedirect = isPublicFrontendPath();

    if (
      status === 401 &&
      !shouldSkipLoginRedirect &&
      !originalRequest._retry &&
      !isPublicAuthRoute(requestUrl) &&
      !isRefreshTokenRoute(requestUrl) &&
      !!getRefreshToken()
    ) {
      originalRequest._retry = true;
      try {
        const newAccessToken = await refreshAccessToken();
        originalRequest.headers = {
          ...(originalRequest.headers || {}),
          Authorization: `Bearer ${newAccessToken}`,
        };
        return api(originalRequest);
      } catch (refreshError) {
        clearAuthAndRedirectToLogin();
        return Promise.reject(refreshError);
      }
    }

    if (status === 401 && !shouldSkipLoginRedirect && !isPublicAuthRoute(requestUrl)) {
      clearAuthAndRedirectToLogin();
    }

    if (error?.response) {
      const normalizedMessage = extractErrorMessage(
        error.response.data,
        error.message || `Request failed with status ${error.response.status}`
      );
      error.response.data = {
        ...(typeof error.response.data === "object" ? error.response.data : {}),
        message: normalizedMessage,
      };
      return Promise.reject(error);
    }

    return Promise.reject({
      ...error,
      response: {
        status: 0,
        data: { message: error?.message || "Network error. Please check your connection." },
      },
    });
  }
);

export default api;