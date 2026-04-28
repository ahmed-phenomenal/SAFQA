import axios from "axios";
import API_BASE_URL from "./baseUrl";
import {
  ensureDeviceId,
  extractErrorMessage,
  getRefreshToken,
  persistAuthTokensFromResponse,
  refreshAccessToken,
} from "./axios";

const readStorage = (key) => {
  const fromSession =
    typeof window !== "undefined" ? sessionStorage.getItem(key) : null;
  if (fromSession) return fromSession;

  const fromLocal =
    typeof window !== "undefined" ? localStorage.getItem(key) : null;
  return fromLocal;
};

const cleanToken = (value) => {
  if (!value) return "";

  let token = String(value).trim();

  try {
    const parsed = JSON.parse(token);
    if (typeof parsed === "string") {
      token = parsed.trim();
    }
  } catch {
    //
  }

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

const getStoredToken = (...keys) => {
  for (const key of keys) {
    const token = cleanToken(readStorage(key));
    if (token) return token;
  }
  return "";
};

/**
 * Important:
 * For seller routes, prefer sellerToken first.
 * If sellerToken does not exist yet, fall back to token/userToken.
 */
const getSellerScopedAccessToken = () => {
  return getStoredToken("sellerToken", "token", "userToken", "adminToken");
};

const isRefreshTokenRoute = (url = "") => {
  const lower = String(url || "").toLowerCase();
  return lower.includes("/auth/refresh-token");
};

const sellerApi = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
});

sellerApi.interceptors.request.use((config) => {
  const token = getSellerScopedAccessToken();
  const deviceId = ensureDeviceId();
  const isFormData =
    typeof FormData !== "undefined" && config.data instanceof FormData;

  config.headers = {
    ...(config.headers || {}),
    "x-api-key": "abc123xyhgfhjgkiho3544351z",
    DeviceId: deviceId,
    Accept: "application/json",
  };

  if (!isFormData) {
    config.headers["Content-Type"] = "application/json";
  } else {
    delete config.headers["Content-Type"];
  }

  if (token && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

sellerApi.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error?.config || {};
    const status = Number(error?.response?.status || 0);
    const requestUrl = String(originalRequest.url || "").toLowerCase();

    if (
      status === 401 &&
      !originalRequest._retry &&
      !isRefreshTokenRoute(requestUrl) &&
      !!getRefreshToken()
    ) {
      originalRequest._retry = true;

      try {
        const newAccessToken = await refreshAccessToken();

        persistAuthTokensFromResponse(
          { accessToken: newAccessToken },
          {
            tokenKey: "sellerToken",
            role: "seller",
            accountType: "seller",
          }
        );

        originalRequest.headers = {
          ...(originalRequest.headers || {}),
          Authorization: `Bearer ${newAccessToken}`,
        };

        return sellerApi(originalRequest);
      } catch (refreshError) {
        return Promise.reject(refreshError);
      }
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
        data: {
          message:
            error?.message || "Network error. Please check your connection.",
        },
      },
    });
  }
);

export default sellerApi;