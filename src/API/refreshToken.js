import axios from "axios";
import API_BASE_URL from "./baseUrl";
import {
  clearAuthSession,
  ensureDeviceId,
  extractErrorMessage,
  getRefreshToken,
  persistAuthSession,
} from "./tokenManager";

const refreshClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 20000,
});

let refreshPromise = null;

const buildRefreshAttempts = (refreshToken) => {
  return [
    {
      data: JSON.stringify(refreshToken),
      headers: {
        "Content-Type": "application/json",
      },
    },
    {
      data: refreshToken,
      headers: {
        "Content-Type": "text/plain",
      },
    },
    {
      data: { refreshToken },
      headers: {
        "Content-Type": "application/json",
      },
    },
  ];
};

const callRefreshEndpoint = async (refreshToken) => {
  const deviceId = ensureDeviceId();
  const attempts = buildRefreshAttempts(refreshToken);

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

      const saved = persistAuthSession(res.data);

      if (!saved.accessToken) {
        throw new Error(
          "Refresh token API succeeded but no new access token was returned."
        );
      }

      return saved.accessToken;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error("Refresh token request failed.");
};

export const refreshAccessToken = async () => {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    const refreshToken = getRefreshToken();

    if (!refreshToken) {
      clearAuthSession();
      throw {
        response: {
          status: 401,
          data: {
            message: "No refresh token found. Please login again.",
          },
        },
      };
    }

    try {
      const newAccessToken = await callRefreshEndpoint(refreshToken);
      return newAccessToken;
    } catch (error) {
      const message = extractErrorMessage(
        error?.response?.data,
        error?.message || "Session expired. Please login again."
      );

      clearAuthSession();

      throw {
        ...error,
        response: {
          ...(error?.response || {}),
          status: Number(error?.response?.status || 401),
          data: {
            ...(typeof error?.response?.data === "object" && error?.response?.data
              ? error.response.data
              : {}),
            message,
          },
        },
      };
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
};