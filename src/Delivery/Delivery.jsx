import { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import icon from "../assets/cargo-truck.png";
import { setLanguage } from "../utiles/setLanguage";
import { applyTheme, getSavedTheme, saveTheme } from "../utiles/themeManager";
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
  saveLocalDeliveryProgress,
} from "../API/delivery";

const DELIVERY_DRAFT_KEY = "deliveryStepDrafts";
const MAX_IMAGE_SIZE_MB = 4;

const COUNTRY_CODES = new Set([
  "1", "7", "20", "27", "30", "31", "32", "33", "34", "36", "39", "40", "41",
  "43", "44", "45", "46", "47", "48", "49", "51", "52", "53", "54", "55", "56",
  "57", "58", "60", "61", "62", "63", "64", "65", "66", "81", "82", "84", "86",
  "90", "91", "92", "93", "94", "95", "98", "211", "212", "213", "216", "218",
  "220", "221", "222", "223", "224", "225", "226", "227", "228", "229", "230",
  "231", "232", "233", "234", "235", "236", "237", "238", "239", "240", "241",
  "242", "243", "244", "245", "246", "248", "249", "250", "251", "252", "253",
  "254", "255", "256", "257", "258", "260", "261", "262", "263", "264", "265",
  "266", "267", "268", "269", "290", "291", "297", "298", "299", "350", "351",
  "352", "353", "354", "355", "356", "357", "358", "359", "370", "371", "372",
  "373", "374", "375", "376", "377", "378", "380", "381", "382", "383", "385",
  "386", "387", "389", "420", "421", "423", "500", "501", "502", "503", "504",
  "505", "506", "507", "508", "509", "590", "591", "592", "593", "594", "595",
  "596", "597", "598", "599", "670", "672", "673", "674", "675", "676", "677",
  "678", "679", "680", "681", "682", "683", "685", "686", "687", "688", "689",
  "690", "691", "692", "850", "852", "853", "855", "856", "880", "886", "960",
  "961", "962", "963", "964", "965", "966", "967", "968", "970", "971", "972",
  "973", "974", "975", "976", "977", "992", "993", "994", "995", "996", "998",
]);

const readDeliveryDrafts = () => {
  try {
    const raw = localStorage.getItem(DELIVERY_DRAFT_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

const saveDeliveryDraft = (auctionId, patch) => {
  try {
    const id = Number(auctionId || 0);
    if (!id) return false;
    const drafts = readDeliveryDrafts();
    drafts[id] = { ...(drafts[id] || {}), ...patch, updatedAt: new Date().toISOString() };
    localStorage.setItem(DELIVERY_DRAFT_KEY, JSON.stringify(drafts));
    return true;
  } catch {
    return false;
  }
};

const fileToDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Failed to read image."));
    reader.readAsDataURL(file);
  });

const dataUrlToFile = (dataUrl, filename, mimeType) => {
  const parts = String(dataUrl || "").split(",");
  const header = parts[0] || "";
  const base64 = parts[1] || "";
  const mime = mimeType || header.match(/:(.*?);/)?.[1] || "image/jpeg";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new File([bytes], filename || "delivery-photo.jpg", { type: mime });
};

const normalizePhone = (value) => {
  let phone = String(value || "").trim().replace(/[^\d+]/g, "");
  if (phone.startsWith("00")) phone = `+${phone.slice(2)}`;
  if (phone.includes("+")) phone = `+${phone.replace(/\+/g, "")}`;
  return phone.slice(0, 16);
};

const getCountryCodeFromPhone = (phone) => {
  const digits = String(phone || "").replace(/\D/g, "");
  for (let len = 3; len >= 1; len--) {
    const code = digits.slice(0, len);
    if (COUNTRY_CODES.has(code)) return code;
  }
  return "";
};

const validateInternationalPhone = (value) => {
  const phone = normalizePhone(value);
  if (!phone) return "Contact number is required.";
  if (!phone.startsWith("+")) return "Contact number must start with country code, for example +201001234567.";
  if (!/^\+[1-9]\d{7,14}$/.test(phone)) return "Contact number must be valid international format, 8 to 15 digits after country code.";
  const countryCode = getCountryCodeFromPhone(phone);
  if (!countryCode) return "Invalid country code.";
  const nationalNumber = phone.replace("+", "").slice(countryCode.length);
  if (nationalNumber.length < 6) return "Phone number is too short after country code.";
  if (/^(\d)\1+$/.test(nationalNumber)) return "Phone number cannot contain the same repeated digit only.";
  return "";
};

const validateImageFile = (file) => {
  if (!file) return "Please choose image.";
  const name = String(file.name || "").toLowerCase();
  const type = String(file.type || "").toLowerCase();
  const isValidExtension = name.endsWith(".png") || name.endsWith(".jpg") || name.endsWith(".jpeg");
  const isValidType = type === "image/png" || type === "image/jpeg" || type === "";
  if (!isValidExtension || !isValidType) return "Only PNG, JPG, or JPEG images are allowed.";
  if (file.size / (1024 * 1024) > MAX_IMAGE_SIZE_MB) return `Each image must be ${MAX_IMAGE_SIZE_MB} MB or less.`;
  return "";
};

export default function Delivery() {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === "ar";
  const navigate = useNavigate();
  const location = useLocation();

  const [theme, setTheme] = useState(() => getSavedTheme());
  const darkModeActive = theme === "dark";

  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [deliveries, setDeliveries] = useState([]);
  const [deliveryEmail, setDeliveryEmail] = useState("");
  const [rowLoadingId, setRowLoadingId] = useState(0);
  const [search, setSearch] = useState("");
  const [progressVersion, setProgressVersion] = useState(0);

  const [showCheckModal, setShowCheckModal] = useState(false);
  const [activeDelivery, setActiveDelivery] = useState(null);
  const [modalBusy, setModalBusy] = useState(false);
  const [wizardData, setWizardData] = useState({
    contact: "", code: "", codeVerified: false, imageFiles: [], savedImages: [],
  });

  const localProgress = useMemo(
    () => getLocalDeliveryProgress(),
    [deliveries, rowLoadingId, progressVersion]
  );

  useEffect(() => { applyTheme(theme); }, [theme]);

  const toggleDarkMode = () => {
    const nextTheme = darkModeActive ? "light" : "dark";
    setTheme(nextTheme); saveTheme(nextTheme); applyTheme(nextTheme);
  };

  useEffect(() => {
    document.title = t("deliveryAccessDocTitle", { defaultValue: "Delivery Access" });
  }, [t]);

  useEffect(() => {
    const link = document.querySelector("link[rel~='icon']") || document.createElement("link");
    link.rel = "icon"; link.href = icon; document.head.appendChild(link);
  }, []);

  useEffect(() => {
    if (!error && !info) return;
    const timer = setTimeout(() => { setError(""); setInfo(""); }, 15000);
    return () => clearTimeout(timer);
  }, [error, info]);

  useEffect(() => {
    const emailFromState = String(location?.state?.sellerEmail || "").trim();
    const emailFromQuery = new URLSearchParams(location.search).get("email") || "";
    const savedEmail = getDeliverySessionEmail() || "";
    setDeliveryEmail(emailFromState || emailFromQuery || savedEmail || "");
    if (sessionStorage.getItem("delivery_access_unlocked") === "true") setIsUnlocked(true);
  }, [location.state, location.search]);

  const refreshDeliveries = async () => {
    const data = await getMyDeliveries();
    setDeliveries(Array.isArray(data) ? data : []);
  };

  useEffect(() => {
    if (!isUnlocked) return;
    const load = async () => {
      try {
        setLoading(true); setError("");
        await refreshDeliveries();
      } catch (err) {
        setError(err?.response?.data?.message || err?.message || t("failedToLoadDeliveryOrders", { defaultValue: "Failed to load delivery orders." }));
      } finally { setLoading(false); }
    };
    load();
  }, [isUnlocked, t]);

  const getAuctionId = (item) => Number(item?.auctionId || item?.AuctionId || item?.id || item?.Id || 0);

  const getEffectiveStatus = (item) => {
    const auctionId = getAuctionId(item);
    const progress = localProgress[auctionId] || {};
    return Number(progress?.status || item?.status || item?.Status || 1);
  };

  const handleRequestOtp = async () => {
    const emailToUse = String(deliveryEmail || "").trim();
    if (!emailToUse) { setError(t("sellerEmailRequired", { defaultValue: "Seller email is required." })); return; }
    try {
      setLoading(true); setError(""); setInfo("");
      await requestDeliveryLoginOtp(emailToUse);
      setInfo(t("otpSentTo", { email: emailToUse, defaultValue: `OTP sent to ${emailToUse}` }));
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || t("failedToSendOtp", { defaultValue: "Failed to send OTP." }));
    } finally { setLoading(false); }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!deliveryEmail.trim()) { setError(t("sellerEmailMissing", { defaultValue: "Seller email is missing." })); return; }
    if (String(otp).trim().length !== 6) { setError(t("otpMustBe6Digits", { defaultValue: "OTP must be 6 digits." })); return; }
    try {
      setLoading(true); setError(""); setInfo("");
      await verifyDeliveryLoginOtp({ email: deliveryEmail.trim(), code: otp.trim() });
      sessionStorage.setItem("delivery_access_unlocked", "true");
      setIsUnlocked(true);
      setInfo(t("otpVerifiedSuccessfully", { defaultValue: "OTP verified successfully." }));
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || t("invalidOtp", { defaultValue: "Invalid OTP." }));
    } finally { setLoading(false); }
  };

  const handleLogout = () => {
    logoutDeliverySession();
    sessionStorage.removeItem("delivery_access_unlocked");
    setIsUnlocked(false); setOtp(""); setError(""); setInfo("");
    setDeliveries([]); setShowCheckModal(false); setActiveDelivery(null);
  };

  const openCheckModal = (item) => {
    const auctionId = getAuctionId(item);
    if (!auctionId) { setError("Auction ID is missing."); return; }
    const savedDraft = readDeliveryDrafts()[auctionId] || {};
    const progress = getLocalDeliveryProgress()[auctionId] || {};
    setError(""); setInfo(""); setActiveDelivery(item);
    setWizardData({
      contact: String(savedDraft.contact || progress.contact || ""),
      code: String(savedDraft.code || progress.code || ""),
      codeVerified: Boolean(savedDraft.codeVerified || progress.codeVerified),
      imageFiles: [],
      savedImages: Array.isArray(savedDraft.savedImages) ? savedDraft.savedImages : [],
    });
    setShowCheckModal(true);
  };

  const closeCheckModal = () => { setShowCheckModal(false); setActiveDelivery(null); setModalBusy(false); };

  const handleContactChange = (value) => {
    const auctionId = getAuctionId(activeDelivery);
    const clean = normalizePhone(value);
    setWizardData((prev) => ({ ...prev, contact: clean }));
    saveDeliveryDraft(auctionId, { contact: clean });
  };

  const handleCodeChange = (value) => {
    const auctionId = getAuctionId(activeDelivery);
    const clean = String(value || "").replace(/[^a-zA-Z0-9]/g, "").slice(0, 30);
    setWizardData((prev) => ({ ...prev, code: clean, codeVerified: false }));
    saveDeliveryDraft(auctionId, { code: clean, codeVerified: false });
  };

  const handleImagesChange = async (files) => {
    const auctionId = getAuctionId(activeDelivery);
    const selectedFiles = Array.from(files || []);
    if (!selectedFiles.length) return;
    for (const file of selectedFiles) {
      const msg = validateImageFile(file);
      if (msg) { setError(msg); return; }
    }
    try {
      const savedImages = [];
      for (const file of selectedFiles) {
        const dataUrl = await fileToDataUrl(file);
        savedImages.push({ name: file.name, type: file.type, size: file.size, dataUrl });
      }
      setWizardData((prev) => ({ ...prev, imageFiles: selectedFiles, savedImages }));
      const saved = saveDeliveryDraft(auctionId, { savedImages });
      if (!saved) setError("Images selected, but they could not be saved locally.");
      else setError("");
    } catch { setError("Failed to read images."); }
  };

  const handleModalStep2 = async () => {
    const auctionId = getAuctionId(activeDelivery);
    try {
      if (!auctionId) throw new Error("Auction ID is missing.");
      setModalBusy(true); setRowLoadingId(auctionId); setError(""); setInfo("");
      await completeDeliveryStep2(auctionId);
      setProgressVersion((prev) => prev + 1);
      await refreshDeliveries();
      setInfo("Order checked successfully.");
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Failed step 2.");
    } finally { setModalBusy(false); setRowLoadingId(0); }
  };

  const handleModalStep3Contact = async () => {
    const auctionId = getAuctionId(activeDelivery);
    const contact = normalizePhone(wizardData.contact);
    try {
      if (!auctionId) throw new Error("Auction ID is missing.");
      const msg = validateInternationalPhone(contact);
      if (msg) throw new Error(msg);
      setModalBusy(true); setRowLoadingId(auctionId); setError(""); setInfo("");
      await completeDeliveryStep3({ auctionId, contact });
      saveDeliveryDraft(auctionId, { contact });
      setProgressVersion((prev) => prev + 1);
      await refreshDeliveries();
      setInfo("Contact submitted successfully.");
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Failed step 3.");
    } finally { setModalBusy(false); setRowLoadingId(0); }
  };

  const handleVerifyUserCode = () => {
    const auctionId = getAuctionId(activeDelivery);
    const enteredCode = String(wizardData.code || "").trim().toUpperCase();
    const expectedCode = String(activeDelivery?.code || activeDelivery?.Code || "").trim().toUpperCase();
    try {
      if (!auctionId) throw new Error("Auction ID is missing.");
      if (!enteredCode) throw new Error("Please enter user delivery code.");
      if (!/^[a-zA-Z0-9]+$/.test(enteredCode)) throw new Error("Delivery code must contain letters and numbers only.");
      if (!expectedCode) throw new Error("Delivery code was not returned from API. Cannot verify code.");
      if (enteredCode !== expectedCode) throw new Error("Delivery code is incorrect.");
      setWizardData((prev) => ({ ...prev, code: enteredCode, codeVerified: true }));
      saveDeliveryDraft(auctionId, { code: enteredCode, codeVerified: true });
      saveLocalDeliveryProgress(auctionId, { code: enteredCode, codeVerified: true });
      setProgressVersion((prev) => prev + 1);
      setError(""); setInfo("Delivery code verified successfully.");
    } catch (err) { setError(err?.message || "Failed to verify delivery code."); }
  };

  const handleModalStep4Images = async () => {
    const auctionId = getAuctionId(activeDelivery);
    try {
      if (!auctionId) throw new Error("Auction ID is missing.");
      const progress = getLocalDeliveryProgress()[auctionId] || {};
      const codeVerified = Boolean(wizardData.codeVerified || progress.codeVerified);
      if (!codeVerified) throw new Error("Please verify user delivery code first.");
      let imagesToUpload = wizardData.imageFiles;
      if ((!imagesToUpload || !imagesToUpload.length) && wizardData.savedImages.length) {
        imagesToUpload = wizardData.savedImages.map((img) => dataUrlToFile(img.dataUrl, img.name, img.type));
      }
      if (!imagesToUpload || !imagesToUpload.length) throw new Error("Please choose at least one image.");
      for (const image of imagesToUpload) {
        const msg = validateImageFile(image);
        if (msg) throw new Error(msg);
      }
      setModalBusy(true); setRowLoadingId(auctionId); setError(""); setInfo("");
      await completeDeliveryStep4({ auctionId, images: imagesToUpload });
      saveDeliveryDraft(auctionId, { savedImages: wizardData.savedImages });
      setProgressVersion((prev) => prev + 1);
      await refreshDeliveries();
      setInfo("Delivery completed successfully.");
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Failed step 4.");
    } finally { setModalBusy(false); setRowLoadingId(0); }
  };

  const handleNotDelivered = async () => {
    const auctionId = getAuctionId(activeDelivery);
    try {
      if (!auctionId) throw new Error("Auction ID is missing.");
      setModalBusy(true); setRowLoadingId(auctionId); setError(""); setInfo("");
      await completeDeliveryStep5NotCompleted(auctionId);
      setProgressVersion((prev) => prev + 1);
      await refreshDeliveries();
      setInfo("Delivery marked as not delivered.");
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Failed to mark delivery as not delivered.");
    } finally { setModalBusy(false); setRowLoadingId(0); }
  };

  const formatMoney = (value) => {
    const num = Number(value || 0);
    if (!Number.isFinite(num)) return "$0";
    return `$${num.toLocaleString(i18n.language)}`;
  };

  const getDeliveryStatusLabel = (status) => {
    const s = Number(status || 0);
    if (s === 1) return t("orderPlaced", { defaultValue: "Order placed" });
    if (s === 2) return t("inProgress", { defaultValue: "In progress" });
    if (s === 3) return t("shipping", { defaultValue: "Shipping" });
    if (s === 4) return t("delivered", { defaultValue: "Delivered" });
    if (s === 5) return t("notDelivered", { defaultValue: "Not delivered" });
    return t("unknown", { defaultValue: "Unknown" });
  };

  const filteredDeliveries = deliveries.filter((item) => {
    const term = search.trim().toLowerCase();
    if (!term) return true;
    return (
      String(item?.auctionTitle || "").toLowerCase().includes(term) ||
      String(item?.userEmail || "").toLowerCase().includes(term) ||
      String(item?.userNumber || "").toLowerCase().includes(term) ||
      String(item?.finalPrice || "").toLowerCase().includes(term) ||
      String(getDeliveryStatusLabel(getEffectiveStatus(item))).toLowerCase().includes(term)
    );
  });

  const activeAuctionId = getAuctionId(activeDelivery);
  const activeStatus = activeDelivery ? getEffectiveStatus(activeDelivery) : 1;
  const activeProgress = activeAuctionId ? localProgress[activeAuctionId] || {} : {};
  const codeVerified = Boolean(wizardData.codeVerified || activeProgress.codeVerified);

  // ── NAVBAR (shared between login and dashboard views) ──
  const Navbar = () => (
    <header className="dv-navbar">
      <div className="dv-navbar-left">
        <div className="dv-brand">
          <i className="fa fa-truck" />
          <span>Safqa Delivery</span>
        </div>
      </div>
      <div className="dv-navbar-right">
        <button
          className="dv-nav-icon-btn"
          onClick={() => setLanguage(isArabic ? "en" : "ar")}
          type="button"
        >
          {isArabic ? "EN" : "ع"}
        </button>
        <button className="dv-nav-icon-btn" onClick={toggleDarkMode} type="button">
          <i className={`fa-solid ${darkModeActive ? "fa-sun" : "fa-moon"}`} />
        </button>
      </div>
    </header>
  );

  if (!isUnlocked) {
    return (
      <div className={`delivery-page ${darkModeActive ? "dark-delivery" : ""}`} dir={isArabic ? "rtl" : "ltr"}>
        <style>{deliveryStyles}</style>
        <Navbar />

        <div className="delivery-login-card">
          <h1 className="delivery-title">
            {t("deliveryAccess", { defaultValue: "Delivery Access" })}
          </h1>

          <p className="delivery-text">
            {t("deliveryAccessMessage", {
              defaultValue: "Enter seller email, send OTP, then verify it to open delivery orders.",
            })}
          </p>

          {error ? <div className="delivery-error">{error}</div> : null}
          {info ? <div className="delivery-success">{info}</div> : null}

          <input
            type="email"
            value={deliveryEmail}
            onChange={(e) => { setDeliveryEmail(e.target.value); setError(""); }}
            placeholder={t("sellerEmail", { defaultValue: "Seller email" })}
            className="delivery-input"
          />

          <button className="delivery-primary-btn" onClick={handleRequestOtp} disabled={loading} type="button">
            {loading ? t("sending", { defaultValue: "Sending..." }) : t("sendOtp", { defaultValue: "Send OTP" })}
          </button>

          <form onSubmit={handleVerifyOtp}>
            <input
              type="text"
              value={otp}
              onChange={(e) => { setOtp(e.target.value.replace(/\D/g, "").slice(0, 6)); setError(""); }}
              placeholder={t("otpPlaceholder", { defaultValue: "Enter 6-digit OTP" })}
              className="delivery-input"
            />
            <button type="submit" className="delivery-primary-btn" disabled={loading}>
              {loading ? t("verifying", { defaultValue: "Verifying..." }) : t("verifyOtp", { defaultValue: "Verify OTP" })}
            </button>
          </form>

          <button className="delivery-secondary-btn" type="button" onClick={() => navigate("/login")}>
            {t("goToLogin", { defaultValue: "Go to Login" })}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`delivery-dashboard ${darkModeActive ? "dark-delivery" : ""}`} dir={isArabic ? "rtl" : "ltr"}>
      <style>{deliveryStyles}</style>
      <Navbar />

      <div className="delivery-container">
        <h2 className="delivery-main-title">
          {t("deliveryDashboard", { defaultValue: "Delivery Dashboard" })}
        </h2>

        {/* ── TOP BAR: search | email (full, no clip) | logout ── */}
        <div className="delivery-top">
          <input
            type="text"
            className="delivery-search"
            placeholder={t("searchDeliveries", { defaultValue: "Search deliveries..." })}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <div className="delivery-email-chip" title={deliveryEmail}>
            <i className="fa fa-envelope" style={{ marginInlineEnd: 8, flexShrink: 0 }} />
            <span className="delivery-email-text">
              {deliveryEmail || t("delivery", { defaultValue: "Delivery" })}
            </span>
          </div>

          <button className="delivery-logout" onClick={handleLogout}>
            <i className="fa fa-sign-out" style={{ marginInlineEnd: 6 }} />
            {t("logout", { defaultValue: "Logout" })}
          </button>
        </div>

        {error ? <div className="delivery-error">{error}</div> : null}
        {info ? <div className="delivery-success">{info}</div> : null}

        <div className="delivery-list">
          {loading ? (
            <div className="delivery-empty">
              {t("loadingDeliveries", { defaultValue: "Loading deliveries..." })}
            </div>
          ) : filteredDeliveries.length > 0 ? (
            filteredDeliveries.map((item, index) => {
              const auctionId = getAuctionId(item);
              const busy = rowLoadingId === auctionId;
              const statusNumber = getEffectiveStatus(item);

              return (
                <div className="delivery-card" key={`${auctionId}-${index}`}>
                  <div className="delivery-card-top">
                    <div className="delivery-icon-box">
                      <i className="fa-solid fa-truck"></i>
                    </div>

                    <div className="delivery-card-body">
                      <h3 className="delivery-card-title">{item.auctionTitle || "-"}</h3>
                      <p className="delivery-card-desc">
                        {t("deliveryOrder", { defaultValue: "Delivery Order" })}
                      </p>

                      <div className="delivery-card-meta">
                        <span className="delivery-card-chip">
                          {getDeliveryStatusLabel(statusNumber)}
                        </span>
                        <span className="delivery-card-chip">{item.userEmail || "-"}</span>
                        <span className="delivery-card-chip">{item.userNumber || "-"}</span>
                      </div>

                      <div className="delivery-card-date-row">
                        <div className="delivery-info-box">
                          <div className="delivery-info-label">
                            {t("userEmail", { defaultValue: "User Email" })}
                          </div>
                          <div className="delivery-info-value">{item.userEmail || "-"}</div>
                        </div>
                        <div className="delivery-info-box">
                          <div className="delivery-info-label">
                            {t("userNumber", { defaultValue: "User Number" })}
                          </div>
                          <div className="delivery-info-value">{item.userNumber || "-"}</div>
                        </div>
                      </div>

                      <div className="delivery-actions-panel">
                        <button
                          className="delivery-action-btn"
                          type="button"
                          onClick={() => openCheckModal(item)}
                          disabled={busy}
                        >
                          {statusNumber >= 4 || statusNumber === 5
                            ? t("view", { defaultValue: "View" })
                            : t("check", { defaultValue: "Check" })}
                        </button>
                      </div>
                    </div>

                    <div className="delivery-card-right">
                      <div>
                        <div className="delivery-price-label">
                          {t("finalPrice", { defaultValue: "Final Price" })}
                        </div>
                        <div className="delivery-price-value">{formatMoney(item.finalPrice)}</div>
                      </div>
                      <div className="delivery-status-note">
                        {busy
                          ? t("loading", { defaultValue: "Loading..." })
                          : t("auctionId", { defaultValue: "Auction ID" }) + `: ${auctionId}`}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="delivery-empty">
              {t("noDeliveriesFound", { defaultValue: "No deliveries found." })}
            </div>
          )}
        </div>
      </div>

      {showCheckModal && activeDelivery ? (
        <div className="delivery-modal-backdrop" onMouseDown={closeCheckModal}>
          <div className="delivery-modal" onMouseDown={(e) => e.stopPropagation()}>
            <div className="delivery-modal-header">
              <div>
                <h3 className="delivery-modal-title">
                  {activeDelivery.auctionTitle || "Delivery Steps"}
                </h3>
                <p className="delivery-modal-subtitle">
                  {t("auctionId", { defaultValue: "Auction ID" })}: {activeAuctionId}
                </p>
              </div>
              <button type="button" className="delivery-modal-close" onClick={closeCheckModal}>×</button>
            </div>

            <div className="delivery-modal-current">
              {getDeliveryStatusLabel(activeStatus)}
            </div>

            <div className="delivery-step-list">
              {/* Step 1 */}
              <div className={`delivery-step-card ${activeStatus >= 2 || activeStatus === 5 ? "done" : "active"}`}>
                <div className="delivery-step-number">1</div>
                <div className="delivery-step-content">
                  <h4>Order check</h4>
                  <p>Click check to move the delivery from Order placed to In progress.</p>
                  <button
                    type="button"
                    className="delivery-action-btn"
                    onClick={handleModalStep2}
                    disabled={modalBusy || activeStatus >= 2 || activeStatus === 5}
                  >
                    {activeStatus >= 2 || activeStatus === 5 ? "Checked" : "Check"}
                  </button>
                </div>
              </div>

              {/* Step 2 */}
              <div className={`delivery-step-card ${activeStatus >= 3 || activeStatus === 5 ? "done" : activeStatus === 2 ? "active" : "locked"}`}>
                <div className="delivery-step-number">2</div>
                <div className="delivery-step-content">
                  <h4>Delivery contact number</h4>
                  <p>Enter phone number with country code, for example +201001234567.</p>
                  <input
                    type="text"
                    inputMode="tel"
                    className="delivery-small-input full"
                    placeholder="+201001234567"
                    value={wizardData.contact}
                    onChange={(e) => handleContactChange(e.target.value)}
                    disabled={modalBusy || activeStatus < 2 || activeStatus >= 3 || activeStatus === 5}
                  />
                  <button
                    type="button"
                    className="delivery-action-btn"
                    onClick={handleModalStep3Contact}
                    disabled={modalBusy || activeStatus < 2 || activeStatus >= 3 || activeStatus === 5}
                  >
                    {activeStatus >= 3 || activeStatus === 5 ? "Submitted" : "Submit Contact"}
                  </button>
                </div>
              </div>

              {/* Step 3 */}
              <div className={`delivery-step-card ${codeVerified || activeStatus >= 4 || activeStatus === 5 ? "done" : activeStatus === 3 ? "active" : "locked"}`}>
                <div className="delivery-step-number">3</div>
                <div className="delivery-step-content">
                  <h4>User delivery code</h4>
                  <p>Enter the code from the user. Numbers only.</p>
                  <input
                    type="text"
                    inputMode="text"
                    autoCapitalize="characters"
                    className="delivery-small-input full"
                    placeholder="Enter user delivery code"
                    value={wizardData.code}
                    onChange={(e) => handleCodeChange(e.target.value)}
                    disabled={modalBusy || activeStatus < 3 || activeStatus >= 4 || activeStatus === 5 || codeVerified}
                  />
                  <button
                    type="button"
                    className="delivery-action-btn"
                    onClick={handleVerifyUserCode}
                    disabled={modalBusy || activeStatus < 3 || activeStatus >= 4 || activeStatus === 5 || codeVerified}
                  >
                    {codeVerified ? "Code Verified" : "Verify Code"}
                  </button>
                </div>
              </div>

              {/* Step 4 */}
              <div className={`delivery-step-card ${activeStatus >= 4 ? "done" : codeVerified && activeStatus === 3 ? "active" : "locked"}`}>
                <div className="delivery-step-number">4</div>
                <div className="delivery-step-content">
                  <h4>Delivery image</h4>
                  <p>Upload one or more PNG/JPG images, then complete delivery.</p>
                  <input
                    type="file"
                    multiple
                    accept=".png,.jpg,.jpeg,image/png,image/jpeg"
                    className="delivery-file-input full"
                    disabled={modalBusy || !codeVerified || activeStatus < 3 || activeStatus >= 4 || activeStatus === 5}
                    onChange={(e) => handleImagesChange(e.target.files)}
                  />
                  {wizardData.savedImages.length ? (
                    <div className="delivery-selected-file">
                      Selected: {wizardData.savedImages.map((img) => img.name).join(", ")}
                    </div>
                  ) : null}
                  <button
                    type="button"
                    className="delivery-action-btn"
                    onClick={handleModalStep4Images}
                    disabled={modalBusy || !codeVerified || activeStatus < 3 || activeStatus >= 4 || activeStatus === 5}
                  >
                    {activeStatus >= 4 ? "Delivered" : "Upload Image & Complete"}
                  </button>
                </div>
              </div>
            </div>

            <div className="delivery-modal-footer">
              <button
                type="button"
                className="delivery-danger-btn"
                onClick={handleNotDelivered}
                disabled={modalBusy || activeStatus >= 4 || activeStatus === 5}
              >
                Not Delivered
              </button>
            </div>

            {activeStatus >= 4 ? (
              <div className="delivery-modal-done">Delivery completed successfully.</div>
            ) : null}
            {activeStatus === 5 ? (
              <div className="delivery-modal-failed">Delivery marked as not delivered.</div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

const deliveryStyles = `
  /* ── CSS Variables ── */
  .delivery-page,
  .delivery-dashboard {
    --dv-bg: #f5f6fa;
    --dv-card: #ffffff;
    --dv-box: #fafafa;
    --dv-input: #ffffff;
    --dv-text: #1f2937;
    --dv-muted: #667085;
    --dv-soft: #f1f5f9;
    --dv-border: #e5e7eb;
    --dv-blue: #023E8A;
    --dv-blue-soft: #eaf2ff;
    --dv-navbar-bg: #023E8A;
    --dv-navbar-text: #ffffff;

    width: 100%;
    min-height: 100vh;
    background: var(--dv-bg);
    color: var(--dv-text);
    box-sizing: border-box;
    font-family: Arial, Helvetica, sans-serif;
  }

  .delivery-page.dark-delivery,
  .delivery-dashboard.dark-delivery {
    --dv-bg: #000000;
    --dv-card: #151515;
    --dv-box: #0d0d0d;
    --dv-input: #000000;
    --dv-text: #f5f5f5;
    --dv-muted: #b7b7b7;
    --dv-soft: #1f1f1f;
    --dv-border: #2f2f2f;
    --dv-blue: #4da3ff;
    --dv-blue-soft: #10243f;
    --dv-navbar-bg: #0a0a0a;
    --dv-navbar-text: #f5f5f5;
  }

  .delivery-page *,
  .delivery-dashboard * {
    box-sizing: border-box;
  }

  /* ── NAVBAR ── */
  .dv-navbar {
    position: sticky;
    top: 0;
    z-index: 1000;
    width: 100%;
    height: 64px;
    background: var(--dv-navbar-bg);
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 24px;
    box-shadow: 0 2px 12px rgba(0,0,0,0.18);
  }

  .dv-navbar-left,
  .dv-navbar-right {
    display: flex;
    align-items: center;
    gap: 14px;
  }

  .dv-brand {
    display: flex;
    align-items: center;
    gap: 10px;
    color: #fff;
    font-size: 20px;
    font-weight: 900;
    letter-spacing: 0.5px;
  }

  .dv-brand i {
    font-size: 22px;
  }

  .dv-nav-icon-btn {
    background: rgba(255,255,255,0.15);
    border: 1px solid rgba(255,255,255,0.25);
    color: #fff;
    border-radius: 10px;
    width: 42px;
    height: 42px;
    font-size: 15px;
    font-weight: 800;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.2s;
  }

  .dv-nav-icon-btn:hover {
    background: rgba(255,255,255,0.28);
  }

  /* ── MAIN CONTENT PADDING ── */
  .delivery-page > .delivery-login-card,
  .delivery-dashboard > .delivery-container {
    padding-top: 36px;
    padding-bottom: 60px;
  }

  /* ── LOGIN CARD ── */
  .delivery-login-card {
    width: min(680px, 92%);
    margin: 0 auto;
    padding: 28px;
    border-radius: 22px;
    background: var(--dv-card);
    border: 1px solid var(--dv-border);
    box-shadow: 0 16px 50px rgba(0,0,0,0.08);
  }

  .delivery-title,
  .delivery-main-title {
    text-align: center;
    font-size: 36px;
    font-weight: 800;
    color: var(--dv-blue);
    margin: 0 0 20px;
  }

  .delivery-text,
  .delivery-card-desc,
  .delivery-modal-subtitle,
  .delivery-step-content p {
    color: var(--dv-muted);
  }

  /* ── INPUTS ── */
  .delivery-input,
  .delivery-search,
  .delivery-small-input {
    width: 100%;
    height: 56px;
    border: 1px solid var(--dv-border);
    border-radius: 14px;
    padding: 0 16px;
    font-size: 16px;
    outline: none;
    margin-bottom: 14px;
    background: var(--dv-input);
    color: var(--dv-text);
  }

  .delivery-input:focus,
  .delivery-search:focus,
  .delivery-small-input:focus {
    border-color: var(--dv-blue);
  }

  /* ── BUTTONS ── */
  .delivery-primary-btn,
  .delivery-secondary-btn,
  .delivery-action-btn,
  .delivery-danger-btn {
    border: none;
    border-radius: 14px;
    font-weight: 800;
    cursor: pointer;
  }

  .delivery-primary-btn,
  .delivery-action-btn {
    background: var(--dv-blue);
    color: #fff;
  }

  .delivery-primary-btn,
  .delivery-secondary-btn {
    width: 100%;
    min-height: 54px;
    font-size: 16px;
    margin-bottom: 14px;
  }

  .delivery-secondary-btn {
    background: var(--dv-blue-soft);
    color: var(--dv-blue);
  }

  .delivery-primary-btn:disabled,
  .delivery-action-btn:disabled,
  .delivery-danger-btn:disabled {
    opacity: 0.65;
    cursor: not-allowed;
  }

  /* ── ALERTS ── */
  .delivery-error {
    background: #fff1f0;
    color: #cf1322;
    border: 1px solid #ffa39e;
    border-radius: 14px;
    padding: 14px 16px;
    font-size: 15px;
    font-weight: 700;
    margin-bottom: 16px;
    overflow-wrap: anywhere;
  }

  .delivery-success {
    background: #f6ffed;
    color: #237804;
    border: 1px solid #b7eb8f;
    border-radius: 14px;
    padding: 14px 16px;
    font-size: 15px;
    font-weight: 700;
    margin-bottom: 16px;
  }

  .dark-delivery .delivery-error {
    background: #2a0f12;
    color: #ff9aa2;
    border-color: #6b252b;
  }

  .dark-delivery .delivery-success {
    background: #102315;
    color: #8ff0a4;
    border-color: #285f35;
  }

  /* ── DASHBOARD CONTAINER ── */
  .delivery-container {
    width: min(1280px, 94%);
    margin: 0 auto;
  }

  /* ── TOP BAR: 3-column, email chip does NOT clip ── */
  .delivery-top {
    width: 100%;
    padding: 18px 22px;
    border-radius: 18px;
    margin-bottom: 24px;
    background: var(--dv-card);
    border: 1px solid var(--dv-border);
    box-shadow: 0 6px 20px rgba(0,0,0,0.06);
    display: grid;
    grid-template-columns: 1fr auto auto;
    gap: 14px;
    align-items: center;
  }

  .delivery-search {
    height: 52px;
    margin-bottom: 0;
    min-width: 0;
  }

  /* ── EMAIL CHIP: full text, never cut off ── */
  .delivery-email-chip {
    height: 52px;
    border-radius: 12px;
    background: var(--dv-soft);
    border: 1px solid var(--dv-border);
    color: var(--dv-text);
    display: flex;
    align-items: center;
    padding: 0 16px;
    font-weight: 700;
    font-size: 14px;
    white-space: nowrap;          /* keep on one line */
    max-width: 340px;             /* reasonable cap */
  }

  .delivery-email-text {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  /* ── LOGOUT ── */
  .delivery-logout {
    height: 52px;
    padding: 0 20px;
    border: none;
    border-radius: 12px;
    font-size: 14px;
    font-weight: 800;
    cursor: pointer;
    background: #ef4444;
    color: #fff;
    white-space: nowrap;
    display: flex;
    align-items: center;
    gap: 6px;
  }

  /* ── DELIVERY LIST ── */
  .delivery-list {
    display: flex;
    flex-direction: column;
    gap: 20px;
    max-height: 74vh;
    overflow-y: auto;
    padding-inline-end: 4px;
  }

  .delivery-card {
    background: var(--dv-card);
    border: 1px solid var(--dv-border);
    border-radius: 20px;
    padding: 20px;
    box-shadow: 0 6px 20px rgba(0,0,0,0.06);
  }

  .delivery-card-top {
    display: grid;
    grid-template-columns: 170px 1fr auto;
    gap: 18px;
    align-items: center;
  }

  .delivery-icon-box {
    width: 170px;
    height: 120px;
    border-radius: 16px;
    background: var(--dv-blue-soft);
    border: 1px solid var(--dv-border);
    color: var(--dv-blue);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 46px;
  }

  .delivery-card-title {
    color: var(--dv-text);
    font-size: 24px;
    font-weight: 800;
    margin: 0 0 6px;
  }

  .delivery-card-chip {
    padding: 8px 12px;
    border-radius: 999px;
    font-size: 13px;
    font-weight: 700;
    background: var(--dv-soft);
    color: var(--dv-text);
  }

  .delivery-card-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    margin-bottom: 12px;
  }

  .delivery-card-date-row {
    display: grid;
    grid-template-columns: repeat(2, minmax(180px, 1fr));
    gap: 12px;
  }

  .delivery-info-box {
    border: 1px solid var(--dv-border);
    border-radius: 14px;
    padding: 12px 14px;
    background: var(--dv-box);
  }

  .delivery-info-label,
  .delivery-price-label {
    font-size: 12px;
    font-weight: 800;
    color: var(--dv-muted);
    margin-bottom: 4px;
    text-transform: uppercase;
  }

  .delivery-info-value,
  .delivery-price-value {
    color: var(--dv-text);
    font-weight: 700;
    word-break: break-word;
  }

  .delivery-price-value {
    font-size: 30px;
    font-weight: 900;
  }

  .delivery-card-right {
    min-width: 220px;
    display: flex;
    flex-direction: column;
    gap: 14px;
    align-items: flex-end;
  }

  .delivery-status-note {
    min-width: 160px;
    padding: 12px 18px;
    border-radius: 12px;
    font-size: 14px;
    font-weight: 800;
    text-align: center;
    background: var(--dv-blue-soft);
    color: var(--dv-blue);
  }

  .delivery-actions-panel {
    margin-top: 14px;
    display: grid;
    gap: 10px;
  }

  .delivery-action-btn,
  .delivery-danger-btn {
    min-height: 46px;
    font-size: 14px;
    padding: 0 16px;
  }

  .delivery-danger-btn {
    background: #ef4444;
    color: #fff;
  }

  .delivery-empty {
    width: 100%;
    border-radius: 16px;
    padding: 36px 20px;
    text-align: center;
    color: var(--dv-muted);
    font-size: 16px;
    background: var(--dv-card);
    border: 1px solid var(--dv-border);
    box-shadow: 0 6px 20px rgba(0,0,0,0.06);
  }

  .delivery-small-input.full {
    width: 100%;
    margin-bottom: 10px;
  }

  .delivery-file-input.full {
    width: 100%;
    font-size: 14px;
    margin-bottom: 8px;
    color: var(--dv-text);
  }

  .delivery-selected-file {
    border-radius: 10px;
    padding: 9px 10px;
    font-size: 13px;
    font-weight: 800;
    margin-bottom: 10px;
    word-break: break-word;
    background: var(--dv-soft);
    color: var(--dv-text);
  }

  /* ── MODAL ── */
  .delivery-modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.55);
    z-index: 99999;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 18px;
  }

  .delivery-modal {
    width: min(660px, 100%);
    max-height: 92vh;
    overflow-y: auto;
    border-radius: 22px;
    padding: 22px;
    box-shadow: 0 24px 70px rgba(0,0,0,0.28);
    background: var(--dv-card);
    border: 1px solid var(--dv-border);
    color: var(--dv-text);
  }

  .delivery-modal-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 14px;
    margin-bottom: 14px;
  }

  .delivery-modal-title {
    text-align: start;
    font-size: 22px;
    font-weight: 900;
    margin: 0 0 4px;
    color: var(--dv-blue);
  }

  .delivery-modal-close {
    border: none;
    background: transparent;
    color: #ef4444;
    font-size: 30px;
    cursor: pointer;
    line-height: 1;
  }

  .delivery-modal-current {
    border-radius: 14px;
    padding: 12px 14px;
    font-weight: 900;
    margin-bottom: 14px;
    background: var(--dv-blue-soft);
    color: var(--dv-blue);
  }

  .delivery-step-list {
    display: grid;
    gap: 14px;
  }

  .delivery-step-card {
    display: grid;
    grid-template-columns: 44px 1fr;
    gap: 12px;
    border: 1px solid var(--dv-border);
    border-radius: 18px;
    padding: 16px;
    background: var(--dv-card);
  }

  .delivery-step-card.active {
    border-color: var(--dv-blue);
    background: var(--dv-box);
  }

  .delivery-step-card.done {
    border-color: #4ade80;
    background: rgba(74, 222, 128, 0.12);
  }

  .delivery-step-card.locked {
    opacity: 0.58;
  }

  .delivery-step-number {
    width: 38px;
    height: 38px;
    border-radius: 50%;
    background: var(--dv-blue);
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 900;
  }

  .delivery-step-content h4 {
    margin: 0 0 6px;
    font-size: 17px;
    font-weight: 900;
    color: var(--dv-text);
  }

  .delivery-step-content p {
    margin: 0 0 12px;
    line-height: 1.5;
    font-size: 14px;
  }

  .delivery-modal-footer {
    display: flex;
    justify-content: flex-end;
    margin-top: 16px;
  }

  .delivery-modal-done,
  .delivery-modal-failed {
    margin-top: 14px;
    border-radius: 14px;
    padding: 14px;
    font-weight: 900;
    text-align: center;
  }

  .delivery-modal-done {
    background: #f6ffed;
    color: #237804;
    border: 1px solid #b7eb8f;
  }

  .delivery-modal-failed {
    background: #fff1f0;
    color: #cf1322;
    border: 1px solid #ffa39e;
  }

  .dark-delivery .delivery-modal-done {
    background: #102315;
    color: #8ff0a4;
    border-color: #285f35;
  }

  .dark-delivery .delivery-modal-failed {
    background: #2a0f12;
    color: #ff9aa2;
    border-color: #6b252b;
  }

  /* ── RESPONSIVE ── */
 @media (max-width: 1100px) {
    .delivery-top {
      grid-template-columns: 1fr auto;
      grid-template-areas:
        "search logout"
        "email  email";
    }
    .delivery-search   { grid-area: search; }
    .delivery-email-chip {
      grid-area: email;
      max-width: 100%;
      width: 100%;
      display: flex;
    }
    .delivery-logout   { grid-area: logout; }
    .delivery-card-top {
      grid-template-columns: 160px 1fr;
    }
    .delivery-card-right {
      grid-column: 1 / -1;
      align-items: flex-start;
      min-width: 0;
    }
  }

  @media (max-width: 760px) {
    .dv-navbar { padding: 0 14px; }
    .dv-brand span { display: none; }
    .delivery-top {
      grid-template-columns: 1fr auto;
    }
    .delivery-card-top {
      grid-template-columns: 1fr;
    }
    .delivery-icon-box {
      width: 100%;
      height: 160px;
    }
    .delivery-card-date-row {
      grid-template-columns: 1fr;
    }
    .delivery-price-value { font-size: 24px; }
    .delivery-step-card { grid-template-columns: 1fr; }
  }
`;