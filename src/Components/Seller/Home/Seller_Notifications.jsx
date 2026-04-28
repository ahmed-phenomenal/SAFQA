import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import icon from "../../../assets/2.png";
import {
  deleteOneNotification,
  deleteSelectedNotifications,
  getNotifications,
  getUnseenNotificationIds,
  markNotificationsAsSeen,
} from "../../../API/Seller_Notifications";

const skeletonRows = [1, 2, 3];

export default function Seller_Notifications() {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === "ar";

  const [favicon] = useState(icon);
  const navigate = useNavigate();
  const didLoadRef = useRef(false);

  const [notifications, setNotifications] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [freshIds, setFreshIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    document.title = t("sellerNotificationsDocTitle");
  }, [t]);

  useEffect(() => {
    const updateFavicon = (iconUrl) => {
      const link = document.querySelector("link[rel~='icon']");
      if (!link) {
        const newLink = document.createElement("link");
        newLink.rel = "icon";
        newLink.href = iconUrl;
        document.head.appendChild(newLink);
      } else {
        link.href = iconUrl;
      }
    };

    updateFavicon(favicon);
  }, [favicon]);

  useEffect(() => {
    const styleId = "seller-notifications-skeleton-style";

    if (document.getElementById(styleId)) return;

    const style = document.createElement("style");
    style.id = styleId;
    style.innerHTML = `
      @keyframes sellerSkeletonShimmer {
        0% { background-position: 200% 0; }
        100% { background-position: -200% 0; }
      }
    `;
    document.head.appendChild(style);

    return () => {
      const node = document.getElementById(styleId);
      if (node) node.remove();
    };
  }, []);

  const getApiErrorMessage = (err, fallback) => {
    const statusCode = err?.response?.status;
    const apiMessage =
      err?.response?.data?.message ||
      err?.response?.data?.Message ||
      err?.response?.data?.title ||
      "";

    const normalizedApiMessage = String(apiMessage).toLowerCase();

    const isVerificationError =
      statusCode === 403 ||
      normalizedApiMessage.includes("not verified") ||
      normalizedApiMessage.includes("verification") ||
      normalizedApiMessage.includes("verify");

    return isVerificationError
      ? t("verificationRequiredPage")
      : apiMessage || err?.message || fallback;
  };

  const loadNotifications = async () => {
    try {
      setLoading(true);
      setError("");

      const data = await getNotifications();
      const list = Array.isArray(data) ? data : [];
      const unseenBeforeOpen = getUnseenNotificationIds(list);

      setNotifications(list);
      setFreshIds(unseenBeforeOpen);

      if (list.length) {
        markNotificationsAsSeen(list.map((item) => item.id));
      }
    } catch (err) {
      setError(getApiErrorMessage(err, t("failedToLoadNotifications")));
      setNotifications([]);
      setFreshIds([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (didLoadRef.current) return;
    didLoadRef.current = true;
    loadNotifications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const formatTimeAgo = (dateValue) => {
    if (!dateValue) return t("recently");

    const parsed = new Date(dateValue);
    if (Number.isNaN(parsed.getTime())) {
      return String(dateValue);
    }

    const diffMs = Date.now() - parsed.getTime();
    const diffMin = Math.floor(diffMs / (1000 * 60));

    if (diffMin < 1) return t("momentsAgo");
    if (diffMin < 60) return t("minutesAgo", { count: diffMin });

    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return t("hoursAgo", { count: diffHours });

    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return t("yesterday");
    if (diffDays < 7) return t("daysAgo", { count: diffDays });

    return parsed.toLocaleDateString(i18n.language);
  };

  const resolveType = (item) => {
    const combined = `${item?.type || ""} ${item?.title || ""} ${
      item?.description || ""
    }`
      .toLowerCase()
      .trim();

    if (
      combined.includes("report") ||
      combined.includes("dispute") ||
      combined.includes("complaint")
    ) {
      return "report";
    }

    if (combined.includes("order")) return "order";

    if (
      combined.includes("payment") ||
      combined.includes("wallet") ||
      combined.includes("transaction")
    ) {
      return "wallet";
    }

    if (combined.includes("review") || combined.includes("feedback")) {
      return "review";
    }

    if (combined.includes("shipping") || combined.includes("delivery")) {
      return "shipping";
    }

    if (combined.includes("verification") || combined.includes("document")) {
      return "verification";
    }

    if (
      combined.includes("stats") ||
      combined.includes("statistics") ||
      combined.includes("performance")
    ) {
      return "stats";
    }

    return "default";
  };

  const getIconStyle = (type) => {
    switch (type) {
      case "report":
        return { color: "#e53935" };
      case "order":
        return { color: "#023e8a" };
      case "wallet":
        return { color: "#2e7d32" };
      case "review":
        return { color: "#f4b400" };
      case "shipping":
        return { color: "#6c757d" };
      case "verification":
        return { color: "#9c27b0" };
      case "stats":
        return { color: "#d35400" };
      default:
        return { color: "#023e8a" };
    }
  };

  const getIconClass = (type) => {
    switch (type) {
      case "report":
        return "fa-circle-exclamation";
      case "order":
        return "fa-box";
      case "wallet":
        return "fa-wallet";
      case "review":
        return "fa-star";
      case "shipping":
        return "fa-truck";
      case "verification":
        return "fa-id-card";
      case "stats":
        return "fa-chart-line";
      default:
        return "fa-bell";
    }
  };

  const enrichedNotifications = useMemo(() => {
    return notifications.map((item) => {
      const uiType = resolveType(item);

      return {
        ...item,
        uiType,
        timeLabel: formatTimeAgo(item.createdAt),
        icon: getIconClass(uiType),
        isFresh: freshIds.includes(String(item.id)),
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notifications, freshIds, i18n.language]);

  const allSelected =
    enrichedNotifications.length > 0 &&
    selectedIds.length === enrichedNotifications.length;

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds([]);
      return;
    }

    setSelectedIds(enrichedNotifications.map((item) => String(item.id)));
  };

  const toggleSelectOne = (id) => {
    const value = String(id);

    setSelectedIds((prev) =>
      prev.includes(value)
        ? prev.filter((itemId) => itemId !== value)
        : [...prev, value]
    );
  };

  const handleDeleteSelected = async () => {
    if (!selectedIds.length) return;

    const confirmed = window.confirm(
      t("deleteSelectedNotificationsConfirm", {
        count: selectedIds.length,
      })
    );

    if (!confirmed) return;

    try {
      setDeleting(true);
      setError("");

      await deleteSelectedNotifications(selectedIds);

      setNotifications((prev) =>
        prev.filter((item) => !selectedIds.includes(String(item.id)))
      );
      setFreshIds((prev) =>
        prev.filter((id) => !selectedIds.includes(String(id)))
      );
      setSelectedIds([]);
    } catch (err) {
      setError(
        getApiErrorMessage(err, t("failedToDeleteSelectedNotifications"))
      );
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteOne = async (id) => {
    const notificationId = String(id);
    const confirmed = window.confirm(t("deleteNotificationConfirm"));
    if (!confirmed) return;

    try {
      setDeleting(true);
      setError("");

      await deleteOneNotification(notificationId);

      setNotifications((prev) =>
        prev.filter((item) => String(item.id) !== notificationId)
      );
      setSelectedIds((prev) =>
        prev.filter((itemId) => itemId !== notificationId)
      );
      setFreshIds((prev) => prev.filter((itemId) => itemId !== notificationId));
    } catch (err) {
      setError(getApiErrorMessage(err, t("failedToDeleteNotification")));
    } finally {
      setDeleting(false);
    }
  };

  const skeletonBlockStyle = {
    background:
      "linear-gradient(90deg, #f1f1f1 25%, #e7e7e7 37%, #f1f1f1 63%)",
    backgroundSize: "400% 100%",
    animation: "sellerSkeletonShimmer 1.4s ease infinite",
    borderRadius: "10px",
  };

  return (
    <div
      className="notifications seller-notifications"
      dir={isArabic ? "rtl" : "ltr"}
    >
      <div className="container">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "12px",
            flexWrap: "wrap",
            marginBottom: "20px",
          }}
        >
          <h1 style={{ margin: 0 }}>{t("sellerNotificationsTitle")}</h1>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              flexWrap: "wrap",
            }}
          >
            <button
              type="button"
              onClick={loadNotifications}
              disabled={loading || deleting}
              style={{
                border: "1px solid #ddd",
                background: "#fff",
                padding: "10px 14px",
                borderRadius: "8px",
                cursor: loading || deleting ? "not-allowed" : "pointer",
              }}
            >
              {loading ? t("refreshing") : t("refresh")}
            </button>

            <button
              type="button"
              onClick={handleDeleteSelected}
              disabled={!selectedIds.length || deleting}
              style={{
                border: "none",
                background: selectedIds.length ? "#d32f2f" : "#ccc",
                color: "#fff",
                padding: "10px 14px",
                borderRadius: "8px",
                cursor:
                  !selectedIds.length || deleting ? "not-allowed" : "pointer",
              }}
            >
              {deleting
                ? t("deleting")
                : t("deleteSelectedCount", { count: selectedIds.length })}
            </button>
          </div>
        </div>

        {!loading && error && (
          <div
            style={{
              background: "#fdecea",
              color: "#b3261e",
              padding: "12px 14px",
              borderRadius: "10px",
              marginBottom: "18px",
            }}
          >
            {error}
          </div>
        )}

        {!loading && !!enrichedNotifications.length && (
          <div
            style={{
              marginBottom: "16px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <input
              id="select-all-notifications"
              type="checkbox"
              checked={allSelected}
              onChange={toggleSelectAll}
            />
            <label htmlFor="select-all-notifications">{t("selectAll")}</label>
          </div>
        )}

        {loading ? (
          <div style={{ display: "grid", gap: "18px" }}>
            {skeletonRows.map((item) => (
              <div
                key={item}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "16px",
                  padding: "22px 18px",
                  borderRadius: "18px",
                  background: "#fff",
                  boxShadow: "0 6px 20px rgba(0,0,0,0.05)",
                }}
              >
                <div style={{ width: "18px", height: "18px", ...skeletonBlockStyle }} />
                <div
                  style={{
                    width: "48px",
                    height: "48px",
                    borderRadius: "50%",
                    ...skeletonBlockStyle,
                  }}
                />
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      width: "220px",
                      maxWidth: "60%",
                      height: "20px",
                      marginBottom: "12px",
                      ...skeletonBlockStyle,
                    }}
                  />
                  <div
                    style={{
                      width: "380px",
                      maxWidth: "90%",
                      height: "16px",
                      ...skeletonBlockStyle,
                    }}
                  />
                </div>
                <div
                  style={{
                    minWidth: "120px",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-end",
                    gap: "10px",
                  }}
                >
                  <div
                    style={{
                      width: "70px",
                      height: "16px",
                      ...skeletonBlockStyle,
                    }}
                  />
                  <div
                    style={{
                      width: "78px",
                      height: "40px",
                      borderRadius: "12px",
                      ...skeletonBlockStyle,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : enrichedNotifications.length === 0 ? (
          <div
            style={{
              padding: "24px 0",
              textAlign: "center",
              color: "#666",
            }}
          >
            {t("noNotificationsFound")}
          </div>
        ) : (
          enrichedNotifications.map((item) => (
            <div
              className={`notification-card ${
                item.uiType === "report" ? "seller-report-card" : ""
              }`}
              key={item.id}
              style={{
                display: "flex",
                alignItems: "stretch",
                gap: "14px",
                position: "relative",
                padding: "18px",
              }}
            >
              {item.isFresh && (
                <span
                  style={{
                    position: "absolute",
                    top: "12px",
                    left: isArabic ? "auto" : "12px",
                    right: isArabic ? "12px" : "auto",
                    width: "10px",
                    height: "10px",
                    borderRadius: "50%",
                    background: "#f4c430",
                    boxShadow: "0 0 0 2px #fff",
                  }}
                />
              )}

              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  paddingTop: "8px",
                }}
              >
                <input
                  type="checkbox"
                  checked={selectedIds.includes(String(item.id))}
                  onChange={() => toggleSelectOne(item.id)}
                />
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "16px",
                  flex: 1,
                  flexWrap: "wrap",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    gap: "14px",
                    alignItems: "center",
                    flex: 1,
                    minWidth: "260px",
                  }}
                >
                  <div
                    className={`notification-icon ${
                      item.uiType === "report" ? "seller-report-icon" : ""
                    }`}
                    style={{ flexShrink: 0 }}
                  >
                    <i
                      className={`fa-solid ${item.icon}`}
                      style={getIconStyle(item.uiType)}
                    ></i>
                  </div>

                  <div className="notification-content" style={{ flex: 1 }}>
                    <h4 style={{ marginBottom: "6px" }}>
                      {item.title || t("notification")}
                    </h4>
                    <p style={{ marginBottom: 0 }}>
                      {item.description || t("noDetailsAvailable")}
                    </p>

                    {item.uiType === "report" && (
                      <button
                        className="seller-report-chat-btn"
                        onClick={() => navigate("/seller-chat")}
                        style={{ marginTop: "10px" }}
                      >
                        {t("openChat")}
                      </button>
                    )}
                  </div>
                </div>

                <div
                  style={{
                    minWidth: "120px",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: isArabic ? "flex-start" : "flex-end",
                    justifyContent: "space-between",
                    gap: "10px",
                    marginLeft: isArabic ? 0 : "auto",
                    marginRight: isArabic ? "auto" : 0,
                  }}
                >
                  <span
                    className="notification-time"
                    style={{
                      whiteSpace: "nowrap",
                      textAlign: isArabic ? "left" : "right",
                    }}
                  >
                    {item.timeLabel}
                  </span>

                  <button
                    type="button"
                    onClick={() => handleDeleteOne(item.id)}
                    disabled={deleting}
                    style={{
                      border: "1px solid #e0e0e0",
                      background: "#fff",
                      color: "#d32f2f",
                      padding: "10px 14px",
                      borderRadius: "10px",
                      cursor: deleting ? "not-allowed" : "pointer",
                      minWidth: "78px",
                    }}
                  >
                    {t("delete")}
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}