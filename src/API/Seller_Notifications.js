import axios from "axios";
import {
  ensureDeviceId,
  extractErrorMessage,
  getRefreshToken,
  getStoredToken,
  isRefreshTokenRoute,
  refreshAccessToken,
  safeJsonParse,
} from "./axios";

const SELLER_SEEN_NOTIFICATIONS_KEY = "seller_seen_notification_ids";
const SELLER_NOT_VERIFIED_MESSAGE =
  "Data can't be shown unless you are verified.";

const firstDefined = (...values) =>
  values.find((value) => value !== undefined && value !== null && value !== "");

const isPlainObject = (value) =>
  Object.prototype.toString.call(value) === "[object Object]";

const getSellerToken = () => {
  return getStoredToken("sellerToken", "token", "userToken", "adminToken");
};

const notificationsApi = axios.create({
  baseURL: "https://e-safqa.runasp.net/api",
  timeout: 20000,
});

notificationsApi.interceptors.request.use((config) => {
  const token = getSellerToken();
  const deviceId = ensureDeviceId();

  config.headers = {
    ...(config.headers || {}),
    "x-api-key": "abc123xyhgfhjgkiho3544351z",
    DeviceId: deviceId,
    Accept: "application/json",
    "Content-Type": "application/json",
  };

  if (token && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  config.params = undefined;
  delete config.headers.role;
  delete config.headers.Role;
  delete config.headers.sellerId;
  delete config.headers.SellerId;

  console.log("[notificationsApi] request:", {
    url: config.url,
    method: config.method,
    hasAuthorization: !!config.headers.Authorization,
    authorizationPreview:
      typeof config.headers.Authorization === "string"
        ? `${config.headers.Authorization.slice(0, 22)}...`
        : "",
    params: config.params,
  });

  return config;
});

notificationsApi.interceptors.response.use(
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

        originalRequest.headers = {
          ...(originalRequest.headers || {}),
          Authorization: `Bearer ${newAccessToken}`,
        };

        return notificationsApi(originalRequest);
      } catch (refreshError) {
        return Promise.reject(refreshError);
      }
    }

    console.log("[notificationsApi] response error:", {
      url: error?.config?.url,
      method: error?.config?.method,
      status,
      data: error?.response?.data,
    });

    if (status === 403) {
      return Promise.reject({
        ...error,
        response: {
          ...(error.response || {}),
          status: 403,
          data: {
            ...(typeof error?.response?.data === "object" &&
            error?.response?.data
              ? error.response.data
              : {}),
            message: SELLER_NOT_VERIFIED_MESSAGE,
            Message: SELLER_NOT_VERIFIED_MESSAGE,
          },
        },
      });
    }

    if (error?.response) {
      const normalizedMessage = extractErrorMessage(
        error?.response?.data,
        error?.message ||
          `Request failed with status code ${error.response.status}`
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

const dispatchNotificationsUpdated = () => {
  window.dispatchEvent(new CustomEvent("seller-notifications-updated"));
};

const getSeenNotificationIds = () => {
  const parsed = safeJsonParse(
    localStorage.getItem(SELLER_SEEN_NOTIFICATIONS_KEY),
    []
  );

  if (!Array.isArray(parsed)) return [];
  return parsed.map((id) => String(id).trim()).filter(Boolean);
};

const setSeenNotificationIds = (ids = []) => {
  const unique = [...new Set(ids.map((id) => String(id).trim()).filter(Boolean))];
  localStorage.setItem(SELLER_SEEN_NOTIFICATIONS_KEY, JSON.stringify(unique));
  dispatchNotificationsUpdated();
};

export const markNotificationsAsSeen = (notificationIds = []) => {
  const current = getSeenNotificationIds();
  setSeenNotificationIds([...current, ...notificationIds]);
};

export const removeNotificationsFromSeen = (notificationIds = []) => {
  const idsToRemove = new Set(
    notificationIds.map((id) => String(id).trim()).filter(Boolean)
  );

  const current = getSeenNotificationIds();
  const updated = current.filter((id) => !idsToRemove.has(String(id)));
  setSeenNotificationIds(updated);
};

export const getUnseenNotificationIds = (notifications = []) => {
  const seen = new Set(getSeenNotificationIds());

  return notifications
    .map((item) => String(item?.id ?? "").trim())
    .filter((id) => id && !seen.has(id));
};

export const getUnseenNotificationsCount = (notifications = []) => {
  return getUnseenNotificationIds(notifications).length;
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
      for (const item of current) {
        if (item && typeof item === "object") {
          queue.push(item);
        }
      }
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

const extractNotificationsArray = (data) => {
  if (Array.isArray(data)) return data;

  const directCandidates = [
    data?.data,
    data?.result,
    data?.items,
    data?.notifications,
    data?.notificationList,
    data?.rows,
    data?.records,
    data?.payload,
    data?.value,
    data?.Data,
  ];

  for (const candidate of directCandidates) {
    if (Array.isArray(candidate)) return candidate;
  }

  const deepCandidate = deepFindValueByKeys(data, [
    "notifications",
    "notificationList",
    "items",
    "rows",
    "records",
    "data",
    "result",
    "payload",
    "value",
  ]);

  return Array.isArray(deepCandidate) ? deepCandidate : [];
};

const normalizeNotification = (item, index = 0) => {
  const id = String(
    firstDefined(
      item?.id,
      item?.Id,
      item?.notificationId,
      item?.NotificationId,
      item?.notificationID,
      item?.NotificationID,
      index + 1
    )
  ).trim();

  const title = String(
    firstDefined(
      item?.title,
      item?.Title,
      item?.subject,
      item?.Subject,
      item?.name,
      item?.Name,
      "Notification"
    )
  ).trim();

  const description = String(
    firstDefined(
      item?.description,
      item?.Description,
      item?.message,
      item?.Message,
      item?.body,
      item?.Body,
      item?.content,
      item?.Content,
      item?.details,
      item?.Details,
      ""
    )
  ).trim();

  const createdAt = firstDefined(
    item?.createdAt,
    item?.CreatedAt,
    item?.createdOn,
    item?.CreatedOn,
    item?.date,
    item?.Date,
    item?.time,
    item?.Time,
    item?.notificationDate,
    item?.NotificationDate,
    item?.sentAt,
    item?.SentAt,
    null
  );

  const type = String(
    firstDefined(
      item?.type,
      item?.Type,
      item?.notificationType,
      item?.NotificationType,
      item?.category,
      item?.Category,
      ""
    )
  )
    .trim()
    .toLowerCase();

  const isRead = Boolean(
    firstDefined(item?.isRead, item?.IsRead, item?.read, item?.Read, false)
  );

  return {
    id,
    title,
    description,
    createdAt,
    type,
    isRead,
    raw: item,
  };
};

export const getNotifications = async () => {
  const res = await notificationsApi.get("/Notifications/Get-Notifications");
  const list = extractNotificationsArray(res?.data);
  return list.map((item, index) => normalizeNotification(item, index));
};

export const deleteSelectedNotifications = async (notificationIds = []) => {
  const ids = notificationIds.map((id) => String(id).trim()).filter(Boolean);

  if (!ids.length) {
    throw new Error("No valid notification ids were provided.");
  }

  const normalizedIds = ids.map((id) => (/^\d+$/.test(id) ? Number(id) : id));

  const res = await notificationsApi.delete(
    "/Notifications/Delete-SelectedNotification",
    {
      data: {
        notificationIds: normalizedIds,
      },
    }
  );

  removeNotificationsFromSeen(ids);
  dispatchNotificationsUpdated();

  return res?.data;
};

export const deleteOneNotification = async (notificationId) => {
  return deleteSelectedNotifications([notificationId]);
};