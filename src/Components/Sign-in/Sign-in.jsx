import { useEffect, useContext, useState, useRef } from "react";
import { useFormik } from "formik";
import * as Yup from "yup";
import icon from "../../assets/2.png";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { auth } from "../../Context/AuthContext";
import googleLogo from "../../assets/google.png";
import facebookLogo from "../../assets/facebook.png";
import Navbar from "./Navbar";
import { useTranslation } from "react-i18next";
import { login, googleAuth, facebookAuth } from "../../API/auth";
import { rememberAccountTypeByEmail } from "../../API/authAccess";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { jwtDecode } from "jwt-decode";

// ---------------------------------------------------------------------------
// IMPORTANT — Google Cloud Console setup required for Vercel to work:
//
//   1. Go to: https://console.cloud.google.com/
//   2. APIs & Services → Credentials → your OAuth 2.0 Client ID
//   3. Under "Authorized JavaScript origins" add ALL your origins:
//        http://localhost:5173
//        http://localhost:3000
//        https://your-app.vercel.app          ← THIS IS THE ONE YOU'RE MISSING
//        https://your-custom-domain.com       ← if applicable
//   4. Save. Changes can take up to 5 minutes to propagate.
//
// Without step 3 your Vercel domain is rejected by Google before any token
// is issued — that is the root cause of the 401 you're seeing.
//
// The code below uses google.accounts.id (One Tap / Sign In With Google)
// which returns a proper id_token JWT — exactly what your backend expects.
// We trigger it by clicking the hidden rendered Google button (the only
// reliable cross-browser way to open the account picker popup on demand).
// ---------------------------------------------------------------------------

const GOOGLE_CLIENT_ID =
  import.meta.env.VITE_GOOGLE_CLIENT_ID ||
  "532958992608-694frj530ikpti9btvkmuigpi5d52vno.apps.googleusercontent.com";
const FACEBOOK_APP_ID = import.meta.env.VITE_FACEBOOK_APP_ID || "";
const MAIN_COLOR = "#023E8A";

// ─── Pure helpers ────────────────────────────────────────────────────────────

const extractSellerIdFromToken = (token) => {
  try {
    const decoded = jwtDecode(token);
    const raw =
      decoded?.SellerId ?? decoded?.sellerId ??
      decoded?.UserId ?? decoded?.userId ??
      decoded?.nameid ?? decoded?.sub ?? decoded?.id ??
      decoded?.["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"] ??
      null;
    if (raw !== null && raw !== undefined) {
      const num = Number(raw);
      if (!isNaN(num) && num > 0) return num;
    }
  } catch {}
  return null;
};

const extractSellerIdFromResponse = (data) => {
  if (!data || typeof data !== "object") return null;
  const root = data?.Data ?? data?.data ?? data ?? {};
  const raw =
    root?.SellerId ?? root?.sellerId ?? root?.UserId ?? root?.userId ??
    root?.Id ?? root?.id ??
    data?.SellerId ?? data?.sellerId ?? data?.UserId ?? data?.userId ?? null;
  if (raw !== null && raw !== undefined) {
    const num = Number(raw);
    if (!isNaN(num) && num > 0) return num;
  }
  return null;
};

const persistSellerId = (id) => {
  if (!id) return;
  const str = String(id);
  localStorage.setItem("sellerId", str);
  sessionStorage.setItem("sellerId", str);
  try {
    window.dispatchEvent(
      new StorageEvent("storage", { key: "sellerId", newValue: str })
    );
  } catch {}
};

const extractMessage = (obj) => {
  if (!obj) return "";
  if (typeof obj === "string") return obj.trim();
  const direct =
    obj.Message || obj.message || obj.title || obj.error || obj.detail ||
    obj.Errors?.[0] || obj.errors?.[0] ||
    obj.data?.Message || obj.data?.message ||
    obj.Data?.Message || obj.Data?.message;
  if (direct && typeof direct === "string") return direct.trim();
  return "";
};

const toUserFacingError = (raw, t) => {
  if (!raw) return t("invalidCredentials");
  const lower = raw.toLowerCase();
  if (
    lower.includes("not found") || lower.includes("no user") ||
    lower.includes("does not exist") || lower.includes("not exist") ||
    lower.includes("unregistered") || lower.includes("no account")
  ) return t("accountNotFound");
  if (
    lower.includes("lock") || lower.includes("block") ||
    lower.includes("disabled") || lower.includes("suspend")
  ) return t("accountLocked");
  return t("invalidCredentials");
};

const normalizeAccountType = (v) =>
  String(v || "").trim().toLowerCase() === "seller" ? "seller" : "buyer";
const accountTypeToBackendRole = (at) =>
  normalizeAccountType(at) === "seller" ? "seller" : "user";
const accountTypeToFrontendRole = (at) =>
  normalizeAccountType(at) === "seller" ? "seller" : "user";
const roleToRoute = (role) => {
  if (role === "admin") return "/admin";
  if (role === "seller") return "/seller";
  return "/home";
};
const decodeJwtSafely = (token) => {
  try { return jwtDecode(token); } catch { return null; }
};
const getRoleFromToken = (token) => {
  const decoded = decodeJwtSafely(token);
  if (!decoded) return null;
  const raw =
    decoded["role"] || decoded["roles"] || decoded["Role"] || decoded["Roles"] ||
    decoded["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"] ||
    decoded["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/role"] || "";
  if (Array.isArray(raw)) {
    const n = raw.map((r) => String(r).toLowerCase().trim());
    if (n.includes("admin") || n.includes("administrator")) return "admin";
    if (n.includes("seller")) return "seller";
    return n[0] || null;
  }
  return String(raw || "").toLowerCase().trim() || null;
};

// ─── AccountTypeModal ────────────────────────────────────────────────────────

function AccountTypeModal({ open, onClose, onSelect, loading, t }) {
  if (!open) return null;
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 9999, padding: "16px",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%", maxWidth: "380px", background: "#fff",
          borderRadius: "14px", padding: "24px",
          boxShadow: "0 18px 45px rgba(0,0,0,0.18)",
        }}
      >
        <h3
          style={{
            margin: 0, marginBottom: "10px", color: MAIN_COLOR,
            fontSize: "22px", fontWeight: 700, textAlign: "center",
          }}
        >
          {t("chooseAccountType")}
        </h3>
        <p
          style={{
            margin: 0, marginBottom: "20px", color: "#6c757d",
            textAlign: "center", fontSize: "14px",
          }}
        >
          {t("continueAs")}
        </p>
        <div style={{ display: "grid", gap: "12px" }}>
          <button
            type="button" onClick={() => onSelect("buyer")} disabled={loading}
            style={{
              border: `1px solid ${MAIN_COLOR}`, background: "#fff",
              color: MAIN_COLOR, borderRadius: "10px", padding: "12px 16px",
              fontWeight: 700, cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            {t("buyerAccount")}
          </button>
          <button
            type="button" onClick={() => onSelect("seller")} disabled={loading}
            style={{
              border: "none", background: MAIN_COLOR, color: "#fff",
              borderRadius: "10px", padding: "12px 16px",
              fontWeight: 700, cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            {t("sellerAccount")}
          </button>
          <button
            type="button" onClick={onClose} disabled={loading}
            style={{
              border: "none", background: "transparent", color: "#6c757d",
              padding: "6px", marginTop: "2px",
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            {t("cancel")}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

export default function Signin() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { setlogin } = useContext(auth);

  const [loading, setLoading] = useState(false);
  const [facebookReady, setFacebookReady] = useState(false);
  const [generalError, setGeneralError] = useState("");
  const [accountModalOpen, setAccountModalOpen] = useState(false);
  const [loginMethod, setLoginMethod] = useState("password");

  // The hidden div where the real Google button is rendered.
  // Clicking the inner iframe/div opens Google's account picker popup reliably.
  const googleBtnContainerRef = useRef(null);
  const googleInitDoneRef = useRef(false);
  const facebookInitializedRef = useRef(false);

  // Stores the account type chosen in the modal so the async Google
  // callback can read the latest value without stale closure issues.
  const pendingAccountTypeRef = useRef("buyer");

  // ─── Page setup ──────────────────────────────────────────────────────────

  useEffect(() => {
    document.title = t("signInDocTitle");
    const link = document.querySelector("link[rel~='icon']");
    if (link) link.href = icon;
  }, [t]);

  // ─── Session helpers ──────────────────────────────────────────────────────

  const clearAllTokens = () => {
    [
      "token", "userToken", "sellerToken", "adminToken", "refreshToken",
      "role", "accountType", "sellerId", "currentUserEmail", "pendingEmail",
    ].forEach((key) => {
      sessionStorage.removeItem(key);
      localStorage.removeItem(key);
    });
  };

  const isAllowedRedirectForRole = (path, finalRole) => {
    const p = String(path || "").trim();
    if (!p || !p.startsWith("/")) return false;
    if (p.startsWith("/login") || p.startsWith("/sign-in")) return false;
    if (finalRole === "admin") return p.startsWith("/admin");
    if (finalRole === "seller") {
      return (
        p === "/seller" || p.startsWith("/seller/") ||
        p.startsWith("/seller-") || p.startsWith("/seller_") ||
        p === "/seller-statistics" || p.startsWith("/seller-statistics") ||
        p === "/lot-Auction" || p === "/single-Auction"
      );
    }
    if (finalRole === "user")
      return !p.startsWith("/admin") && !p.startsWith("/seller");
    return false;
  };

  const getRedirectAfterLogin = (finalRole) => {
    const params = new URLSearchParams(location.search);
    const fromQuery = params.get("redirect");
    if (fromQuery) {
      const decoded = decodeURIComponent(fromQuery);
      if (isAllowedRedirectForRole(decoded, finalRole)) return decoded;
    }
    const fromPath =
      location.state?.from?.pathname && location.state?.from?.search
        ? `${location.state.from.pathname}${location.state.from.search}`
        : location.state?.from?.pathname;
    if (fromPath && isAllowedRedirectForRole(fromPath, finalRole))
      return fromPath;
    return roleToRoute(finalRole);
  };

  const saveAdminAndRedirect = (token, email, responseData = null) => {
    const tkn = String(token || "").trim();
    if (!tkn) return;
    clearAllTokens();
    const em = String(email || "").trim().toLowerCase();
    if (em) {
      localStorage.setItem("currentUserEmail", em);
      localStorage.setItem("pendingEmail", em);
    }
    localStorage.setItem("adminToken", tkn);
    localStorage.setItem("token", tkn);
    localStorage.setItem("role", "admin");
    localStorage.setItem("accountType", "admin");
    const finalId =
      extractSellerIdFromToken(tkn) ??
      (responseData ? extractSellerIdFromResponse(responseData) : null);
    if (finalId) persistSellerId(finalId);
    const decoded = decodeJwtSafely(tkn);
    setlogin(
      decoded
        ? { ...decoded, role: "admin", accountType: "admin" }
        : { role: "admin", accountType: "admin" }
    );
    navigate("/admin", { replace: true });
  };

  const saveSessionAndRedirect = (
    token, refreshToken, email, selectedAccountType, responseData = null
  ) => {
    const tkn = String(token || "").trim();
    const rft = String(refreshToken || "").trim();
    const em = String(email || "").trim().toLowerCase();
    if (!tkn) return;
    const finalRole = accountTypeToFrontendRole(selectedAccountType);
    const finalAccountType = finalRole === "seller" ? "seller" : "buyer";
    const decoded = decodeJwtSafely(tkn);
    clearAllTokens();
    if (em) {
      localStorage.setItem("currentUserEmail", em);
      localStorage.setItem("pendingEmail", em);
    }
    localStorage.setItem("token", tkn);
    localStorage.setItem("role", finalRole);
    localStorage.setItem("accountType", finalAccountType);
    if (finalRole === "seller") {
      localStorage.setItem("sellerToken", tkn);
      if (em) rememberAccountTypeByEmail(em, "seller");
    } else {
      localStorage.setItem("userToken", tkn);
      if (em) rememberAccountTypeByEmail(em, "buyer");
    }
    if (rft) localStorage.setItem("refreshToken", rft);
    const finalSellerId =
      extractSellerIdFromToken(tkn) ??
      (responseData ? extractSellerIdFromResponse(responseData) : null);
    if (finalSellerId) persistSellerId(finalSellerId);
    setlogin(
      decoded
        ? { ...decoded, role: finalRole, accountType: finalAccountType }
        : { role: finalRole, accountType: finalAccountType }
    );
    navigate(getRedirectAfterLogin(finalRole), { replace: true });
  };

  // ─── Password login ───────────────────────────────────────────────────────

  const tryLoginRaw = async (email, password, roleParam) => {
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_BASE_URL || ""}/Auth/login?role=${roleParam}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": "abc123xyhgfhjgkiho3544351z",
          },
          body: JSON.stringify({ email, password }),
        }
      );
      if (!res.ok) return { success: false };
      const data = await res.json();
      const root = data?.Data || data?.data || data || {};
      const token =
        root?.Token || root?.token || root?.AccessToken || root?.accessToken ||
        data?.Token || data?.token || "";
      const refreshToken =
        root?.RefreshToken || root?.refreshToken ||
        data?.RefreshToken || data?.refreshToken || "";
      if (!token) return { success: false };
      return { success: true, token, refreshToken, data };
    } catch {
      return { success: false };
    }
  };

  const tryLoginOnce = async ({ email, password, accountType }) => {
    try {
      const backendRole = accountTypeToBackendRole(accountType);
      const data = await login({ email, password }, { params: { role: backendRole } });
      const root = data?.Data || data?.data || data || {};
      const okRaw =
        root?.IsSuccess ?? root?.isSuccess ??
        data?.IsSuccess ?? data?.isSuccess ??
        root?.Success ?? root?.success;
      const ok =
        okRaw === true || okRaw === "true" || okRaw === 1 || okRaw === "1";
      const token =
        root?.Token || root?.token || root?.AccessToken || root?.accessToken ||
        data?.Token || data?.token || "";
      const refreshToken =
        root?.RefreshToken || root?.refreshToken ||
        data?.RefreshToken || data?.refreshToken || "";
      if (!ok && !token) {
        return {
          success: false,
          message:
            extractMessage(root) || extractMessage(data) || t("invalidCredentials"),
        };
      }
      return { success: true, token, refreshToken, rawResponse: data };
    } catch (err) {
      return {
        success: false,
        message:
          extractMessage(err?.response?.data?.Data) ||
          extractMessage(err?.response?.data) ||
          err?.message ||
          t("invalidCredentials"),
      };
    }
  };

  async function handlePasswordLogin(values, forcedAccountType) {
    setGeneralError("");
    setLoading(true);
    try {
      const email = String(values.email || "").trim().toLowerCase();
      const password = String(values.password || "");
      const actualAccountType = normalizeAccountType(forcedAccountType);
      const result = await tryLoginOnce({ email, password, accountType: actualAccountType });
      if (!result.success) {
        const friendly = toUserFacingError(result.message, t);
        setGeneralError(friendly);
        toast.error(friendly);
        return;
      }
      const tokenRole = getRoleFromToken(result.token);
      if (tokenRole === "admin" || tokenRole === "administrator") {
        toast.success(t("loginSuccessfulAsUser") || "Welcome, Admin!");
        saveAdminAndRedirect(result.token, email, result.rawResponse);
        return;
      }
      toast.success(
        actualAccountType === "seller"
          ? t("loginSuccessfulAsSeller")
          : t("loginSuccessfulAsUser")
      );
      saveSessionAndRedirect(
        result.token, result.refreshToken, email, actualAccountType, result.rawResponse
      );
    } finally {
      setLoading(false);
      setAccountModalOpen(false);
    }
  }

  const resolveAdminFromProbes = async (email, password) => {
    const adminProbe = await tryLoginRaw(email, password, "admin");
    if (!adminProbe.success) return { isAdmin: false, adminProbe };
    const tokenRole = getRoleFromToken(adminProbe.token);
    if (tokenRole === "admin" || tokenRole === "administrator")
      return { isAdmin: true, adminProbe };
    return { isAdmin: false, adminProbe };
  };

  const formik = useFormik({
    initialValues: {
      email: location?.state?.email || localStorage.getItem("pendingEmail") || "",
      password: "",
    },
    validationSchema: Yup.object({
      email: Yup.string()
        .email(t("invalidEmail"))
        .required(t("emailRequired")),
      password: Yup.string().required(t("passwordRequired")),
    }),
    onSubmit: async (values) => {
      setGeneralError("");
      setLoading(true);
      try {
        const email = String(values.email || "").trim().toLowerCase();
        const password = String(values.password || "");
        const { isAdmin, adminProbe } = await resolveAdminFromProbes(email, password);
        if (isAdmin && adminProbe.success) {
          toast.success(t("loginSuccessfulAsUser") || "Welcome, Admin!");
          saveAdminAndRedirect(adminProbe.token, email, adminProbe.data);
          return;
        }
        const userProbe = await tryLoginRaw(email, password, "user");
        if (!userProbe.success) {
          const errResult = await tryLoginOnce({ email, password, accountType: "buyer" });
          const friendly = toUserFacingError(errResult.message, t);
          setGeneralError(friendly);
          toast.error(friendly);
          return;
        }
        setLoginMethod("password");
        setAccountModalOpen(true);
      } finally {
        setLoading(false);
      }
    },
    validateOnMount: true,
    validateOnChange: true,
    validateOnBlur: true,
    enableReinitialize: false,
  });

  // ─── Google Sign-In ───────────────────────────────────────────────────────
  //
  // Strategy: use google.accounts.id (the only API that returns id_token).
  // We render the real Google button into a hidden container, then
  // programmatically click the iframe inside it. This is the only 100%
  // reliable way to open the account-picker popup on demand — Google's own
  // prompt() is suppressed when called from outside a direct user gesture.
  //
  // PREREQUISITE: add your Vercel domain to Google Cloud Console →
  //   APIs & Services → Credentials → your client → Authorized JavaScript origins.
  //   Without this, Google rejects the request before issuing any token.

  const initAndRenderGoogleButton = (idTokenCallback) => {
    if (!window.google?.accounts?.id) return;
    window.google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: idTokenCallback,
      auto_select: false,
      cancel_on_tap_outside: true,
    });
    if (googleBtnContainerRef.current) {
      // Always re-render so the callback closure captures the latest accountType.
      googleBtnContainerRef.current.innerHTML = "";
      window.google.accounts.id.renderButton(googleBtnContainerRef.current, {
        type: "standard",
        theme: "outline",
        size: "large",
        shape: "rectangular",
        text: "signin_with",
        width: 260,
      });
    }
  };

  // Load GSI script once on mount.
  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;
    const existing = document.querySelector(
      'script[src="https://accounts.google.com/gsi/client"]'
    );
    if (existing) {
      // Script already loaded — render the button immediately.
      if (window.google?.accounts?.id && !googleInitDoneRef.current) {
        initAndRenderGoogleButton(defaultGoogleCallback);
        googleInitDoneRef.current = true;
      }
      return;
    }
    const s = document.createElement("script");
    s.src = "https://accounts.google.com/gsi/client";
    s.async = true;
    s.defer = true;
    s.onload = () => {
      initAndRenderGoogleButton(defaultGoogleCallback);
      googleInitDoneRef.current = true;
    };
    s.onerror = () =>
      console.error("Failed to load Google Sign-In script.");
    document.body.appendChild(s);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Default callback — used for the initial render; gets replaced on each click.
  const defaultGoogleCallback = async (response) => {
    const idToken = response?.credential;
    if (!idToken) {
      const msg = t("googleTokenMissing") || "Google did not return a token.";
      setGeneralError(msg);
      toast.error(msg);
      return;
    }
    await handleGoogleBackend(idToken, pendingAccountTypeRef.current || "buyer");
  };

  async function handleGoogleBackend(idToken, selectedAccountType) {
    setGeneralError("");
    setLoading(true);
    try {
      const actualAccountType = normalizeAccountType(selectedAccountType);
      const backendRole = accountTypeToBackendRole(actualAccountType);

      // Your backend receives { idToken } — unchanged from before.
      const data = await googleAuth({ idToken }, { params: { role: backendRole } });

      const root = data?.Data || data?.data || data || {};
      const okRaw =
        root?.IsSuccess ?? root?.isSuccess ??
        data?.IsSuccess ?? data?.isSuccess;
      const ok =
        okRaw === true || okRaw === "true" || okRaw === 1 || okRaw === "1";
      const token =
        root?.Token || root?.token || root?.AccessToken || root?.accessToken ||
        data?.Token || data?.token || "";
      const refreshToken =
        root?.RefreshToken || root?.refreshToken ||
        data?.RefreshToken || data?.refreshToken || "";
      const email =
        root?.Email || root?.email ||
        data?.Email || data?.email ||
        formik.values.email || "";

      if (!ok && !token) {
        const msg =
          extractMessage(root) || extractMessage(data) || t("googleLoginFailed");
        setGeneralError(msg);
        toast.error(msg);
        return;
      }
      toast.success(
        actualAccountType === "seller"
          ? t("loginSuccessfulAsSeller")
          : t("loginSuccessfulAsUser")
      );
      saveSessionAndRedirect(token, refreshToken, email, actualAccountType, data);
    } catch (err) {
      const msg =
        extractMessage(err?.response?.data?.Data) ||
        extractMessage(err?.response?.data) ||
        err?.message ||
        t("googleLoginFailed");
      setGeneralError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
      setAccountModalOpen(false);
    }
  }

  function startGoogleLogin(selectedAccountType) {
    setGeneralError("");
    const accountType = normalizeAccountType(selectedAccountType);
    pendingAccountTypeRef.current = accountType;

    if (!GOOGLE_CLIENT_ID) {
      const msg = t("googleEnvMissing") || "Google Client ID not set.";
      setGeneralError(msg);
      toast.error(msg);
      return;
    }
    if (!window.google?.accounts?.id) {
      const msg = t("googleNotReady") || "Google Sign-In not ready. Refresh the page.";
      setGeneralError(msg);
      toast.error(msg);
      return;
    }

    // Re-initialize with a fresh callback that captures the chosen accountType,
    // then click the real rendered Google button.
    initAndRenderGoogleButton(async (response) => {
      const idToken = response?.credential;
      if (!idToken) {
        const msg = t("googleTokenMissing") || "Google did not return a token.";
        setGeneralError(msg);
        toast.error(msg);
        return;
      }
      await handleGoogleBackend(idToken, pendingAccountTypeRef.current || "buyer");
    });

    // Small delay so renderButton finishes painting before we click.
    setTimeout(() => {
      if (!googleBtnContainerRef.current) return;

      // Try the iframe first (most browsers), then any [role=button] element.
      const clickTarget =
        googleBtnContainerRef.current.querySelector("iframe") ||
        googleBtnContainerRef.current.querySelector("[role='button']") ||
        googleBtnContainerRef.current.querySelector("div[tabindex='0']");

      if (clickTarget) {
        clickTarget.click();
      } else {
        // Absolute fallback — Google's own prompt.
        window.google.accounts.id.prompt((notification) => {
          if (notification.isNotDisplayed?.()) {
            const msg =
              t("googlePromptNotDisplayed") ||
              "Google sign-in could not be shown. Ensure your domain is in Google Cloud Console.";
            setGeneralError(msg);
            toast.error(msg);
          } else if (notification.isSkippedMoment?.()) {
            const msg =
              t("googlePromptSkipped") ||
              "Google sign-in was skipped. Please try again.";
            setGeneralError(msg);
            toast.info(msg);
          }
        });
      }
    }, 150);
  }

  // ─── Facebook Sign-In ─────────────────────────────────────────────────────

  useEffect(() => {
    if (!FACEBOOK_APP_ID) return;
    window.fbAsyncInit = function () {
      try {
        if (!facebookInitializedRef.current) {
          window.FB.init({
            appId: FACEBOOK_APP_ID,
            cookie: true,
            xfbml: false,
            version: "v22.0",
          });
          facebookInitializedRef.current = true;
        }
        setFacebookReady(true);
      } catch {
        setFacebookReady(false);
        setGeneralError(t("facebookInitFailed"));
      }
    };
    const existing = document.querySelector(
      'script[src="https://connect.facebook.net/en_US/sdk.js"]'
    );
    if (existing) {
      if (window.FB) setFacebookReady(true);
      return;
    }
    const s = document.createElement("script");
    s.src = "https://connect.facebook.net/en_US/sdk.js";
    s.async = true;
    s.defer = true;
    s.crossOrigin = "anonymous";
    s.onerror = () => {
      setFacebookReady(false);
      setGeneralError(t("facebookSdkFailed"));
    };
    document.body.appendChild(s);
  }, [t]);

  async function handleFacebookBackend(accessToken, selectedAccountType) {
    setGeneralError("");
    setLoading(true);
    try {
      const actualAccountType = normalizeAccountType(selectedAccountType);
      const backendRole = accountTypeToBackendRole(actualAccountType);
      const data = await facebookAuth(
        { accessToken },
        { params: { role: backendRole } }
      );
      const root = data?.Data || data?.data || data || {};
      const okRaw =
        root?.IsSuccess ?? root?.isSuccess ??
        data?.IsSuccess ?? data?.isSuccess;
      const ok =
        okRaw === true || okRaw === "true" || okRaw === 1 || okRaw === "1";
      const token =
        root?.Token || root?.token || root?.AccessToken || root?.accessToken ||
        data?.Token || data?.token || "";
      const refreshToken =
        root?.RefreshToken || root?.refreshToken ||
        data?.RefreshToken || data?.refreshToken || "";
      const email =
        root?.Email || root?.email ||
        data?.Email || data?.email ||
        formik.values.email || "";
      if (!ok && !token) {
        const msg =
          extractMessage(root) || extractMessage(data) || t("facebookLoginFailed");
        setGeneralError(msg);
        toast.error(msg);
        return;
      }
      toast.success(
        actualAccountType === "seller"
          ? t("loginSuccessfulAsSeller")
          : t("loginSuccessfulAsUser")
      );
      saveSessionAndRedirect(token, refreshToken, email, actualAccountType, data);
    } catch (err) {
      const msg =
        extractMessage(err?.response?.data?.Data) ||
        extractMessage(err?.response?.data) ||
        err?.message ||
        t("facebookLoginFailed");
      setGeneralError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
      setAccountModalOpen(false);
    }
  }

  function startFacebookLogin(selectedAccountType) {
    setGeneralError("");
    const actualAccountType = normalizeAccountType(selectedAccountType);
    if (!FACEBOOK_APP_ID) {
      const msg = t("facebookEnvMissing");
      setGeneralError(msg);
      toast.error(msg);
      return;
    }
    if (!facebookReady || !window.FB) {
      const msg = t("facebookNotReady");
      setGeneralError(msg);
      toast.error(msg);
      return;
    }
    window.FB.login(
      (resp) => {
        const accessToken = resp?.authResponse?.accessToken;
        if (!accessToken) {
          const msg = t("facebookCancelled");
          setGeneralError(msg);
          toast.info(msg);
          return;
        }
        handleFacebookBackend(accessToken, actualAccountType);
      },
      { scope: "public_profile,email", return_scopes: true }
    );
  }

  // ─── Modal dispatch ───────────────────────────────────────────────────────

  function handleGoogleLoginClick() {
    setGeneralError("");
    setLoginMethod("google");
    setAccountModalOpen(true);
  }
  function handleFacebookLoginClick() {
    setGeneralError("");
    setLoginMethod("facebook");
    setAccountModalOpen(true);
  }

  function handleAccountTypeSelect(accountType) {
    const at = normalizeAccountType(accountType);
    if (loginMethod === "google") {
      setAccountModalOpen(false);
      startGoogleLogin(at);
      return;
    }
    if (loginMethod === "facebook") {
      setAccountModalOpen(false);
      startFacebookLogin(at);
      return;
    }
    handlePasswordLogin(formik.values, at);
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <>
      <Navbar />
      <ToastContainer theme="colored" />
      <div className="sign-in">
        <div className="container">
          <h1 style={{ padding: "10px 0" }}>{t("heading")}</h1>
          <form className="forms" onSubmit={formik.handleSubmit}>
            {generalError && (
              <div className="alert alert-danger">{generalError}</div>
            )}
            <fieldset
              disabled={loading}
              style={{ border: 0, margin: 0, padding: 0, minWidth: 0 }}
            >
              {/* Email */}
              <div className="input-group mb-4">
                <input
                  type="email"
                  name="email"
                  className="form-control p-2"
                  placeholder={t("emailPlaceholder")}
                  onChange={(e) => {
                    setGeneralError("");
                    formik.handleChange(e);
                  }}
                  onBlur={formik.handleBlur}
                  value={formik.values.email}
                />
              </div>
              {formik.touched.email && formik.errors.email && (
                <div className="alert alert-danger">{formik.errors.email}</div>
              )}

              {/* Password */}
              <div
                className="input-group mb-5"
                style={{ position: "relative" }}
              >
                <input
                  type="password"
                  name="password"
                  className="form-control p-2"
                  placeholder={t("passwordPlaceholder")}
                  onChange={(e) => {
                    setGeneralError("");
                    formik.handleChange(e);
                  }}
                  onBlur={formik.handleBlur}
                  value={formik.values.password}
                />
              </div>
              {formik.touched.password && formik.errors.password && (
                <div className="alert alert-danger">
                  {formik.errors.password}
                </div>
              )}

              <div className="forgot-wrapper">
                <Link to="/forget" className="forgot-text">
                  {t("forgotPassword")}
                </Link>
              </div>

              <div className="button-wrapper">
                <button
                  type="submit"
                  className="login-btn"
                  disabled={loading || !formik.isValid}
                  style={{
                    opacity: loading || !formik.isValid ? 0.8 : 1,
                    cursor:
                      loading || !formik.isValid ? "not-allowed" : "pointer",
                    pointerEvents: loading ? "none" : "auto",
                  }}
                >
                  {loading ? <></> : t("loginNow")}
                </button>
              </div>

              <div className="signup-wrapper">
                <span>{t("dontHaveAccount")}</span>
                <Link to="/sign-up" className="signup-link">
                  {t("signUp")}
                </Link>
              </div>

              <div className="or-divider">
                <span>{t("or")}</span>
              </div>

              {/* Social buttons + hidden real Google button */}
              <div className="social-login" style={{ position: "relative" }}>
                <button
                  type="button"
                  className="social-box google"
                  onClick={handleGoogleLoginClick}
                  disabled={loading}
                  style={{
                    opacity: loading ? 0.8 : 1,
                    cursor: loading ? "not-allowed" : "pointer",
                  }}
                >
                  <img src={googleLogo} alt="Google" className="social-logo" />
                  <span>{t("signInWithGoogle")}</span>
                </button>

                <button
                  type="button"
                  className="social-box facebook"
                  onClick={handleFacebookLoginClick}
                  disabled={loading}
                  style={{
                    opacity: loading ? 0.8 : 1,
                    cursor: loading ? "not-allowed" : "pointer",
                  }}
                >
                  <img
                    src={facebookLogo}
                    alt="Facebook"
                    className="social-logo"
                  />
                  <span>{t("signInWithFacebook")}</span>
                </button>

                {/*
                  Hidden container for the real Google Sign-In button.
                  We render the genuine Google iframe here so we can
                  programmatically click it — the only reliable way to open
                  Google's account picker without the One Tap cooldown.
                  `visibility: hidden` hides it visually but keeps it
                  interactable (unlike display:none which blocks clicks).
                */}
                <div
                  ref={googleBtnContainerRef}
                  aria-hidden="true"
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "1px",
                    height: "1px",
                    overflow: "hidden",
                    opacity: 0,
                    pointerEvents: "none", // clicks are triggered programmatically
                    zIndex: -1,
                  }}
                />
              </div>
            </fieldset>
          </form>
        </div>
      </div>

      <AccountTypeModal
        open={accountModalOpen}
        onClose={() => { if (!loading) setAccountModalOpen(false); }}
        onSelect={handleAccountTypeSelect}
        loading={loading}
        t={t}
      />
    </>
  );
}