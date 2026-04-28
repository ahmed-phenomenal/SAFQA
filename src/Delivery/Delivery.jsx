import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useTranslatedApiData } from "../hooks/useTranslatedApiData";
import { useAutoTranslatedText } from "../hooks/useAutoTranslatedText";
import {
  requestDeliveryLoginOtp,
  verifyDeliveryLoginOtp,
  getMyDeliveries,
  completeDeliveryStep2,
  completeDeliveryStep3,
  completeDeliveryStep4,
  completeDeliveryStep5NotCompleted,
  logoutDeliverySession,
  getDeliverySessionEmail,
  getLocalDeliveryProgress,
} from "../API/delivery";

export default function Delivery() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const params = useParams();
  const location = useLocation();

  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [deliveries, setDeliveries] = useState([]);
  const [deliveryEmail, setDeliveryEmail] = useState("");
  const [contactInputs, setContactInputs] = useState({});
  const [imageInputs, setImageInputs] = useState({});
  const [rowLoadingId, setRowLoadingId] = useState(0);

  const { translatedData: translatedDeliveries } = useTranslatedApiData(deliveries);
  const { translatedText: translatedError } = useAutoTranslatedText(error);
  const { translatedText: translatedInfo } = useAutoTranslatedText(info);

  const DELIVERY_ROUTE_KEY = "768515";

  const accessKey = useMemo(() => {
    if (params?.accessKey) return String(params.accessKey).trim();

    const pathname = String(location.pathname || "").trim();

    if (pathname.startsWith("/delivery/")) {
      return pathname.replace("/delivery/", "").trim();
    }

    if (pathname.startsWith("/delivery")) {
      return pathname.replace("/delivery", "").trim();
    }

    return "";
  }, [params, location.pathname]);

  const localProgress = useMemo(
    () => getLocalDeliveryProgress(),
    [deliveries, rowLoadingId]
  );

  useEffect(() => {
    document.title = t("deliveryAccessDocTitle");
  }, [t]);

  useEffect(() => {
    const emailFromState = String(location?.state?.sellerEmail || "").trim();
    const emailFromQuery = new URLSearchParams(location.search).get("email") || "";
    const savedEmail = getDeliverySessionEmail() || "";

    const finalEmail = emailFromState || emailFromQuery || savedEmail || "";
    setDeliveryEmail(finalEmail);

    const savedUnlocked = sessionStorage.getItem("delivery_access_unlocked");
    const savedKey = sessionStorage.getItem("delivery_access_key");

    if (
      savedUnlocked === "true" &&
      savedKey === accessKey &&
      accessKey === DELIVERY_ROUTE_KEY
    ) {
      setIsUnlocked(true);
    }
  }, [accessKey, location.state, location.search]);

  useEffect(() => {
    if (!isUnlocked) return;

    const load = async () => {
      try {
        setLoading(true);
        setError("");
        const data = await getMyDeliveries();
        setDeliveries(Array.isArray(data) ? data : []);
      } catch (err) {
        setError(
          err?.response?.data?.message ||
            err?.message ||
            t("failedToLoadDeliveryOrders")
        );
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [isUnlocked, t]);

  const handleRequestOtp = async () => {
    try {
      const emailToUse = String(deliveryEmail || "").trim();

      if (!emailToUse) {
        setError(t("sellerEmailRequired"));
        return;
      }

      setLoading(true);
      setError("");
      setInfo("");

      await requestDeliveryLoginOtp(emailToUse);

      setInfo(t("otpSentTo", { email: emailToUse }));
    } catch (err) {
      setError(
        err?.response?.data?.message || err?.message || t("failedToSendOtp")
      );
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();

    if (accessKey !== DELIVERY_ROUTE_KEY) {
      setError(t("accessCodeNotFound"));
      return;
    }

    if (!deliveryEmail.trim()) {
      setError(t("sellerEmailMissing"));
      return;
    }

    if (String(otp).trim().length !== 6) {
      setError(t("otpMustBe6Digits"));
      return;
    }

    try {
      setLoading(true);
      setError("");
      setInfo("");

      await verifyDeliveryLoginOtp({
        email: deliveryEmail.trim(),
        code: otp.trim(),
      });

      sessionStorage.setItem("delivery_access_unlocked", "true");
      sessionStorage.setItem("delivery_access_key", accessKey);

      setIsUnlocked(true);
      setInfo(t("otpVerifiedSuccessfully"));
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || t("invalidOtp"));
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logoutDeliverySession();
    sessionStorage.removeItem("delivery_access_unlocked");
    sessionStorage.removeItem("delivery_access_key");
    setIsUnlocked(false);
    setOtp("");
    setError("");
    setInfo("");
    setDeliveries([]);
  };

  const refreshDeliveries = async () => {
    const data = await getMyDeliveries();
    setDeliveries(Array.isArray(data) ? data : []);
  };

  const handleStep2 = async (auctionId) => {
    try {
      setRowLoadingId(auctionId);
      setError("");
      await completeDeliveryStep2(auctionId);
      await refreshDeliveries();
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || t("failedStep2"));
    } finally {
      setRowLoadingId(0);
    }
  };

  const handleStep3 = async (auctionId) => {
    try {
      const contact = String(contactInputs[auctionId] || "").trim();

      if (!contact) {
        setError(t("pleaseEnterContact"));
        return;
      }

      setRowLoadingId(auctionId);
      setError("");
      await completeDeliveryStep3({ auctionId, contact });
      await refreshDeliveries();
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || t("failedStep3"));
    } finally {
      setRowLoadingId(0);
    }
  };

  const handleStep4 = async (auctionId) => {
    try {
      const image = imageInputs[auctionId];

      if (!image) {
        setError(t("pleaseChooseImage"));
        return;
      }

      setRowLoadingId(auctionId);
      setError("");
      await completeDeliveryStep4({ auctionId, image });
      await refreshDeliveries();
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || t("failedStep4"));
    } finally {
      setRowLoadingId(0);
    }
  };

  const handleStep5 = async (auctionId) => {
    try {
      setRowLoadingId(auctionId);
      setError("");
      await completeDeliveryStep5NotCompleted(auctionId);
      await refreshDeliveries();
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || t("failedStep5"));
    } finally {
      setRowLoadingId(0);
    }
  };

  if (accessKey !== DELIVERY_ROUTE_KEY) {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <h1 style={styles.errorTitle}>{t("invalidDeliveryLink")}</h1>
          <p style={styles.text}>{t("accessCodeNotFound")}</p>
          <button style={styles.button} onClick={() => navigate("/login")}>
            {t("goToLogin")}
          </button>
        </div>
      </div>
    );
  }

  if (!isUnlocked) {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <h1 style={styles.title}>{t("deliveryAccess")}</h1>
          <p style={styles.text}>{t("deliveryAccessMessage")}</p>

          <div style={styles.infoBox}>
            <div>
              <strong>{t("routeKey")}:</strong> {accessKey}
            </div>
            <div>
              <strong>{t("sellerEmail")}:</strong>{" "}
              {deliveryEmail || t("missing")}
            </div>
          </div>

          {error ? <div style={styles.errorBox}>{translatedError}</div> : null}
          {info ? <div style={styles.successBox}>{translatedInfo}</div> : null}

          <input
            type="email"
            value={deliveryEmail}
            onChange={(e) => {
              setDeliveryEmail(e.target.value);
              setError("");
            }}
            placeholder={t("sellerEmail")}
            style={styles.input}
          />

          <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
            <button
              style={styles.button}
              onClick={handleRequestOtp}
              disabled={loading}
            >
              {loading ? t("sending") : t("sendOtp")}
            </button>
          </div>

          <form onSubmit={handleVerifyOtp}>
            <input
              type="text"
              value={otp}
              onChange={(e) => {
                setOtp(e.target.value.replace(/\D/g, "").slice(0, 6));
                setError("");
              }}
              placeholder={t("otpPlaceholder")}
              style={styles.input}
            />

            <button type="submit" style={styles.button} disabled={loading}>
              {loading ? t("verifying") : t("verifyOtp")}
            </button>
          </form>
        </div>
      </div>
    );
  }

  const dataToRender = Array.isArray(translatedDeliveries)
    ? translatedDeliveries
    : deliveries;

  return (
    <div style={styles.page}>
      <div style={{ ...styles.card, maxWidth: 1280 }}>
        <div style={styles.headerRow}>
          <div>
            <h1 style={styles.title}>{t("deliveryDashboard")}</h1>
            <p style={styles.text}>{t("accessGrantedSession")}</p>
          </div>

          <button style={styles.logoutButton} onClick={handleLogout}>
            {t("logout")}
          </button>
        </div>

        <div style={styles.successBox}>{t("deliveryUnlocked")}</div>

        <div style={styles.infoBox}>
          <div>
            <strong>{t("routeKey")}:</strong> {accessKey}
          </div>
          <div>
            <strong>OTP:</strong> {t("verified")}
          </div>
          <div>
            <strong>{t("sellerEmail")}:</strong> {deliveryEmail || "-"}
          </div>
        </div>

        {error ? <div style={styles.errorBox}>{translatedError}</div> : null}

        {loading ? (
          <div style={styles.placeholder}>{t("loadingDeliveries")}</div>
        ) : dataToRender.length === 0 ? (
          <div style={styles.placeholder}>{t("noDeliveriesFound")}</div>
        ) : (
          <div style={styles.grid}>
            {dataToRender.map((item) => {
              const auctionId = Number(item?.id || 0);
              const progress = localProgress[auctionId] || {};
              const busy = rowLoadingId === auctionId;

              return (
                <div key={auctionId} style={styles.orderCard}>
                  <div style={styles.orderTop}>
                    <div>
                      <div style={styles.orderTitle}>
                        {item?.auctionTitle || "-"}
                      </div>
                      <div style={styles.orderCode}>{item?.code || "-"}</div>
                    </div>

                    <div style={styles.badge}>
                      {t("status")} {item?.status ?? "-"}
                    </div>
                  </div>

                  <div style={styles.metaGrid}>
                    <div>
                      <strong>{t("auctionId")}:</strong> {auctionId}
                    </div>
                    <div>
                      <strong>{t("userEmail")}:</strong>{" "}
                      {item?.userEmail || "-"}
                    </div>
                    <div>
                      <strong>{t("userNumber")}:</strong>{" "}
                      {item?.userNumber || "-"}
                    </div>
                    <div>
                      <strong>{t("finalPrice")}:</strong>{" "}
                      {item?.finalPrice ?? "-"}
                    </div>
                  </div>

                  <div style={styles.progressBox}>
                    <div>
                      {t("step2Checked")}:{" "}
                      {progress.step2Checked ? t("yes") : t("no")}
                    </div>
                    <div>
                      {t("step3Contact")}:{" "}
                      {progress.step3Submitted ? t("yes") : t("no")}
                    </div>
                    <div>
                      {t("step4Photo")}:{" "}
                      {progress.step4Uploaded ? t("yes") : t("no")}
                    </div>
                    <div>
                      {t("notCompleted")}:{" "}
                      {progress.notCompleted ? t("yes") : t("no")}
                    </div>
                  </div>

                  <div style={styles.actionRow}>
                    <button
                      style={styles.primaryBtn}
                      onClick={() => handleStep2(auctionId)}
                      disabled={busy}
                    >
                      {busy ? t("loading") : t("check")}
                    </button>
                  </div>

                  <div style={styles.sectionTitle}>{t("contactStep")}</div>
                  <div style={styles.inlineRow}>
                    <input
                      type="text"
                      placeholder={t("enterContact")}
                      value={contactInputs[auctionId] || ""}
                      onChange={(e) =>
                        setContactInputs((prev) => ({
                          ...prev,
                          [auctionId]: e.target.value,
                        }))
                      }
                      style={styles.smallInput}
                    />
                    <button
                      style={styles.primaryBtn}
                      onClick={() => handleStep3(auctionId)}
                      disabled={busy}
                    >
                      {t("submitContact")}
                    </button>
                  </div>

                  <div style={styles.sectionTitle}>{t("uploadPhotoStep")}</div>
                  <div style={styles.inlineRow}>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) =>
                        setImageInputs((prev) => ({
                          ...prev,
                          [auctionId]: e.target.files?.[0] || null,
                        }))
                      }
                      style={styles.fileInput}
                    />
                    <button
                      style={styles.primaryBtn}
                      onClick={() => handleStep4(auctionId)}
                      disabled={busy}
                    >
                      {t("uploadPhoto")}
                    </button>
                  </div>

                  <div style={styles.actionRow}>
                    <button
                      style={styles.dangerBtn}
                      onClick={() => handleStep5(auctionId)}
                      disabled={busy}
                    >
                      {t("markNotCompleted")}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "#f5f7fb",
    padding: "30px",
  },
  card: {
    width: "100%",
    maxWidth: "680px",
    background: "#fff",
    borderRadius: "22px",
    padding: "28px",
    boxShadow: "0 16px 50px rgba(0,0,0,0.08)",
    margin: "0 auto",
  },
  title: {
    margin: "0 0 12px",
    color: "#0b4aa2",
    fontSize: "44px",
    fontWeight: 900,
  },
  errorTitle: {
    margin: "0 0 12px",
    color: "#dc2626",
    fontSize: "42px",
    fontWeight: 800,
  },
  text: {
    margin: "0 0 18px",
    color: "#667085",
    fontSize: "20px",
    lineHeight: 1.6,
  },
  input: {
    width: "100%",
    height: "58px",
    borderRadius: "14px",
    border: "1px solid #d0d7e2",
    padding: "0 16px",
    fontSize: "20px",
    marginBottom: "14px",
    outline: "none",
  },
  smallInput: {
    flex: 1,
    minWidth: 240,
    height: "50px",
    borderRadius: "12px",
    border: "1px solid #d0d7e2",
    padding: "0 14px",
    fontSize: "16px",
    outline: "none",
  },
  fileInput: {
    flex: 1,
    minWidth: 240,
    fontSize: "15px",
  },
  button: {
    height: "54px",
    border: "none",
    borderRadius: "14px",
    background: "#0b4aa2",
    color: "#fff",
    fontWeight: 800,
    fontSize: "18px",
    padding: "0 22px",
    cursor: "pointer",
  },
  logoutButton: {
    height: "48px",
    border: "none",
    borderRadius: "12px",
    background: "#ef2b2b",
    color: "#fff",
    fontWeight: 800,
    fontSize: "16px",
    padding: "0 18px",
    cursor: "pointer",
  },
  successBox: {
    background: "#ecfdf3",
    color: "#027a48",
    border: "1px solid #abefc6",
    borderRadius: "14px",
    padding: "16px",
    fontSize: "17px",
    fontWeight: 700,
    marginBottom: "18px",
  },
  errorBox: {
    background: "#fff1f2",
    color: "#b42318",
    border: "1px solid #fda29b",
    borderRadius: "14px",
    padding: "16px",
    fontSize: "17px",
    fontWeight: 700,
    marginBottom: "18px",
  },
  infoBox: {
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: "14px",
    padding: "16px",
    fontSize: "17px",
    color: "#334155",
    lineHeight: 1.8,
    marginBottom: "18px",
  },
  headerRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "16px",
    marginBottom: "18px",
  },
  placeholder: {
    minHeight: "180px",
    borderRadius: "16px",
    border: "1px dashed #cbd5e1",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#64748b",
    fontSize: "18px",
    fontWeight: 700,
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(420px, 1fr))",
    gap: "18px",
  },
  orderCard: {
    border: "1px solid #e2e8f0",
    borderRadius: "18px",
    padding: "18px",
    background: "#fff",
    boxShadow: "0 8px 24px rgba(15,23,42,0.05)",
  },
  orderTop: {
    display: "flex",
    justifyContent: "space-between",
    gap: "12px",
    marginBottom: "14px",
    alignItems: "flex-start",
  },
  orderTitle: {
    fontSize: "24px",
    fontWeight: 800,
    color: "#0f172a",
    marginBottom: "6px",
  },
  orderCode: {
    fontSize: "15px",
    color: "#64748b",
    fontWeight: 700,
  },
  badge: {
    background: "#eef4ff",
    color: "#0b4aa2",
    padding: "8px 12px",
    borderRadius: "999px",
    fontWeight: 800,
    fontSize: "14px",
    whiteSpace: "nowrap",
  },
  metaGrid: {
    display: "grid",
    gap: "8px",
    marginBottom: "14px",
    color: "#334155",
    fontSize: "15px",
  },
  progressBox: {
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: "12px",
    padding: "12px",
    marginBottom: "14px",
    display: "grid",
    gap: "6px",
    color: "#334155",
    fontSize: "14px",
    fontWeight: 700,
  },
  sectionTitle: {
    fontSize: "15px",
    fontWeight: 800,
    color: "#0f172a",
    margin: "12px 0 8px",
  },
  inlineRow: {
    display: "flex",
    gap: "10px",
    flexWrap: "wrap",
    alignItems: "center",
    marginBottom: "12px",
  },
  actionRow: {
    display: "flex",
    gap: "10px",
    flexWrap: "wrap",
    marginTop: "10px",
  },
  primaryBtn: {
    minHeight: "48px",
    border: "none",
    borderRadius: "12px",
    background: "#0b4aa2",
    color: "#fff",
    fontWeight: 800,
    fontSize: "15px",
    padding: "0 16px",
    cursor: "pointer",
  },
  dangerBtn: {
    minHeight: "48px",
    border: "none",
    borderRadius: "12px",
    background: "#ef4444",
    color: "#fff",
    fontWeight: 800,
    fontSize: "15px",
    padding: "0 16px",
    cursor: "pointer",
  },
};