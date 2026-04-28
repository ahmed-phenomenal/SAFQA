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

const GOOGLE_CLIENT_ID =
  import.meta.env.VITE_GOOGLE_CLIENT_ID ||
  "532958992608-694frj530ikpti9btvkmuigpi5d52vno.apps.googleusercontent.com";

const FACEBOOK_APP_ID = import.meta.env.VITE_FACEBOOK_APP_ID || "";
const MAIN_COLOR = "#023E8A";

function PasswordToggleButton({
  showPassword,
  onToggle,
  disabled,
  labels,
  isArabic,
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onToggle}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      aria-label={
        showPassword
          ? labels.hidePassword || "Hide password"
          : labels.showPassword || "Show password"
      }
      style={{
        position: "absolute",
        [isArabic ? "left" : "right"]: "12px",
        top: "50%",
        transform: "translateY(-50%)",
        border: "none",
        background: "transparent",
        padding: 0,
        cursor: disabled ? "not-allowed" : "pointer",
        color: hovered ? MAIN_COLOR : "#6c757d",
        fontSize: 18,
        lineHeight: 1,
        opacity: disabled ? 0.7 : 1,
        transition: "color 0.3s ease, opacity 0.3s ease",
      }}
    >
      {showPassword ? "🙈" : "👁️"}
    </button>
  );
}

const extractMessage = (obj) => {
  if (!obj) return "";
  if (typeof obj === "string") return obj;

  const direct =
    obj.Message ||
    obj.message ||
    obj.title ||
    obj.error ||
    obj.detail ||
    obj.Errors?.[0] ||
    obj.errors?.[0] ||
    obj.data?.Message ||
    obj.data?.message ||
    obj.Data?.Message ||
    obj.Data?.message;

  if (direct) return direct;

  return "";
};

const normalizeAccountType = (value) => {
  return String(value || "").trim().toLowerCase() === "seller"
    ? "seller"
    : "buyer";
};

const accountTypeToBackendRole = (accountType) => {
  return normalizeAccountType(accountType) === "seller" ? "seller" : "user";
};

const accountTypeToFrontendRole = (accountType) => {
  return normalizeAccountType(accountType) === "seller" ? "seller" : "user";
};

const roleToRoute = (role) => {
  if (role === "admin") return "/admin";
  if (role === "seller") return "/seller";
  return "/home";
};

const decodeJwtSafely = (token) => {
  try {
    return jwtDecode(token);
  } catch {
    return null;
  }
};

function AccountTypeModal({ open, onClose, onSelect, loading, t }) {
  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: "16px",
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: "380px",
          background: "#fff",
          borderRadius: "14px",
          padding: "24px",
          boxShadow: "0 18px 45px rgba(0,0,0,0.18)",
        }}
      >
        <h3
          style={{
            margin: 0,
            marginBottom: "10px",
            color: MAIN_COLOR,
            fontSize: "22px",
            fontWeight: 700,
            textAlign: "center",
          }}
        >
          {t("chooseAccountType")}
        </h3>

        <p
          style={{
            margin: 0,
            marginBottom: "20px",
            color: "#6c757d",
            textAlign: "center",
            fontSize: "14px",
          }}
        >
          {t("continueAs")}
        </p>

        <div style={{ display: "grid", gap: "12px" }}>
          <button
            type="button"
            onClick={() => onSelect("buyer")}
            disabled={loading}
            style={{
              border: `1px solid ${MAIN_COLOR}`,
              background: "#fff",
              color: MAIN_COLOR,
              borderRadius: "10px",
              padding: "12px 16px",
              fontWeight: 700,
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            {t("buyerAccount")}
          </button>

          <button
            type="button"
            onClick={() => onSelect("seller")}
            disabled={loading}
            style={{
              border: "none",
              background: MAIN_COLOR,
              color: "#fff",
              borderRadius: "10px",
              padding: "12px 16px",
              fontWeight: 700,
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            {t("sellerAccount")}
          </button>

          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            style={{
              border: "none",
              background: "transparent",
              color: "#6c757d",
              padding: "6px",
              marginTop: "2px",
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

export default function Signin() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { setlogin } = useContext(auth);

  const isArabic = i18n.language === "ar";

  const [loading, setLoading] = useState(false);
  const [googleReady, setGoogleReady] = useState(false);
  const [facebookReady, setFacebookReady] = useState(false);
  const [generalError, setGeneralError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [accountModalOpen, setAccountModalOpen] = useState(false);
  const [loginMethod, setLoginMethod] = useState("password");

  const googleBtnRef = useRef(null);
  const googleScriptLoadedRef = useRef(false);
  const googleInitializedRef = useRef(false);
  const facebookInitializedRef = useRef(false);
  const pendingSocialAccountTypeRef = useRef("buyer");

  useEffect(() => {
    document.title = t("signInDocTitle");
    const link = document.querySelector("link[rel~='icon']");
    if (link) link.href = icon;
  }, [t]);

  const clearAllTokens = () => {
    [
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
    ].forEach((key) => {
      sessionStorage.removeItem(key);
      localStorage.removeItem(key);
    });
  };

  const getRedirectAfterLogin = (finalRole) => {
    const from = location.state?.from?.pathname;

    if (from) {
      return from;
    }

    return roleToRoute(finalRole);
  };

  const saveSessionAndRedirect = (
    token,
    refreshToken,
    email,
    selectedAccountType
  ) => {
    const tkn = String(token || "").trim();
    const rft = String(refreshToken || "").trim();
    const normalizedEmail = String(email || "").trim().toLowerCase();

    if (!tkn) return;

    const finalRole = accountTypeToFrontendRole(selectedAccountType);
    const finalAccountType = finalRole === "seller" ? "seller" : "buyer";
    const decoded = decodeJwtSafely(tkn);

    clearAllTokens();

    if (normalizedEmail) {
      sessionStorage.setItem("currentUserEmail", normalizedEmail);
      sessionStorage.setItem("pendingEmail", normalizedEmail);
    }

    sessionStorage.setItem("token", tkn);
    sessionStorage.setItem("role", finalRole);
    sessionStorage.setItem("accountType", finalAccountType);

    if (finalRole === "seller") {
      sessionStorage.setItem("sellerToken", tkn);
      if (normalizedEmail) {
        rememberAccountTypeByEmail(normalizedEmail, "seller");
      }
    } else {
      sessionStorage.setItem("userToken", tkn);
      if (normalizedEmail) {
        rememberAccountTypeByEmail(normalizedEmail, "buyer");
      }
    }

    if (rft) {
      sessionStorage.setItem("refreshToken", rft);
    }

    if (decoded) {
      setlogin({
        ...decoded,
        role: finalRole,
        accountType: finalAccountType,
      });
    } else {
      setlogin({
        role: finalRole,
        accountType: finalAccountType,
      });
    }

    navigate(getRedirectAfterLogin(finalRole), { replace: true });
  };

  const validationScheme = Yup.object({
    email: Yup.string().email(t("invalidEmail")).required(t("emailRequired")),
    password: Yup.string().required(t("passwordRequired")),
  });

  const tryLoginOnce = async ({ email, password, accountType }) => {
    try {
      const backendRole = accountTypeToBackendRole(accountType);

      const payload = {
        email,
        password,
      };

      const data = await login(payload, {
        params: { role: backendRole },
      });

      const root = data?.Data || data?.data || data || {};

      const okRaw =
        root?.IsSuccess ??
        root?.isSuccess ??
        data?.IsSuccess ??
        data?.isSuccess ??
        root?.Success ??
        root?.success;

      const ok =
        okRaw === true || okRaw === "true" || okRaw === 1 || okRaw === "1";

      const token =
        root?.Token ||
        root?.token ||
        root?.AccessToken ||
        root?.accessToken ||
        data?.Token ||
        data?.token ||
        "";

      const refreshToken =
        root?.RefreshToken ||
        root?.refreshToken ||
        data?.RefreshToken ||
        data?.refreshToken ||
        "";

      if (!ok && !token) {
        return {
          success: false,
          message:
            extractMessage(root) || extractMessage(data) || t("loginFailed"),
        };
      }

      return {
        success: true,
        token,
        refreshToken,
        rawResponse: data,
      };
    } catch (err) {
      return {
        success: false,
        message:
          extractMessage(err?.response?.data?.Data) ||
          extractMessage(err?.response?.data) ||
          err?.message ||
          t("loginFailed"),
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

      const result = await tryLoginOnce({
        email,
        password,
        accountType: actualAccountType,
      });

      if (!result.success) {
        setGeneralError(result.message || t("loginFailed"));
        toast.error(result.message || t("loginFailed"));
        return;
      }

      toast.success(
        actualAccountType === "seller"
          ? t("loginSuccessfulAsSeller")
          : t("loginSuccessfulAsUser")
      );

      saveSessionAndRedirect(
        result.token,
        result.refreshToken,
        email,
        actualAccountType
      );
    } finally {
      setLoading(false);
      setAccountModalOpen(false);
    }
  }

  const formik = useFormik({
    initialValues: {
      email:
        location?.state?.email || sessionStorage.getItem("pendingEmail") || "",
      password: "",
    },
    validationSchema: validationScheme,
    onSubmit: () => {
      setGeneralError("");
      setLoginMethod("password");
      setAccountModalOpen(true);
    },
    validateOnMount: true,
    validateOnChange: true,
    validateOnBlur: true,
    enableReinitialize: false,
  });

  async function handleGoogleBackend(idToken, selectedAccountType) {
    setGeneralError("");
    setLoading(true);

    try {
      const actualAccountType = normalizeAccountType(selectedAccountType);
      const backendRole = accountTypeToBackendRole(actualAccountType);

      const data = await googleAuth(
        { idToken },
        {
          params: { role: backendRole },
        }
      );

      const root = data?.Data || data?.data || data || {};

      const okRaw =
        root?.IsSuccess ??
        root?.isSuccess ??
        data?.IsSuccess ??
        data?.isSuccess;

      const ok =
        okRaw === true || okRaw === "true" || okRaw === 1 || okRaw === "1";

      const token =
        root?.Token ||
        root?.token ||
        root?.AccessToken ||
        root?.accessToken ||
        data?.Token ||
        data?.token ||
        "";

      const refreshToken =
        root?.RefreshToken ||
        root?.refreshToken ||
        data?.RefreshToken ||
        data?.refreshToken ||
        "";

      const email =
        root?.Email ||
        root?.email ||
        data?.Email ||
        data?.email ||
        formik.values.email ||
        "";

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

      saveSessionAndRedirect(token, refreshToken, email, actualAccountType);
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

  async function handleFacebookBackend(accessToken, selectedAccountType) {
    setGeneralError("");
    setLoading(true);

    try {
      const actualAccountType = normalizeAccountType(selectedAccountType);
      const backendRole = accountTypeToBackendRole(actualAccountType);

      const data = await facebookAuth(
        { accessToken },
        {
          params: { role: backendRole },
        }
      );

      const root = data?.Data || data?.data || data || {};

      const okRaw =
        root?.IsSuccess ??
        root?.isSuccess ??
        data?.IsSuccess ??
        data?.isSuccess;

      const ok =
        okRaw === true || okRaw === "true" || okRaw === 1 || okRaw === "1";

      const token =
        root?.Token ||
        root?.token ||
        root?.AccessToken ||
        root?.accessToken ||
        data?.Token ||
        data?.token ||
        "";

      const refreshToken =
        root?.RefreshToken ||
        root?.refreshToken ||
        data?.RefreshToken ||
        data?.refreshToken ||
        "";

      const email =
        root?.Email ||
        root?.email ||
        data?.Email ||
        data?.email ||
        formik.values.email ||
        "";

      if (!ok && !token) {
        const msg =
          extractMessage(root) ||
          extractMessage(data) ||
          t("facebookLoginFailed");
        setGeneralError(msg);
        toast.error(msg);
        return;
      }

      toast.success(
        actualAccountType === "seller"
          ? t("loginSuccessfulAsSeller")
          : t("loginSuccessfulAsUser")
      );

      saveSessionAndRedirect(token, refreshToken, email, actualAccountType);
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

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;

    if (googleScriptLoadedRef.current) {
      setGoogleReady(true);
      return;
    }

    const existing = document.querySelector(
      'script[src="https://accounts.google.com/gsi/client"]'
    );

    if (existing) {
      googleScriptLoadedRef.current = true;
      setGoogleReady(true);
      return;
    }

    const s = document.createElement("script");
    s.src = "https://accounts.google.com/gsi/client";
    s.async = true;
    s.defer = true;
    s.onload = () => {
      googleScriptLoadedRef.current = true;
      setGoogleReady(true);
    };
    s.onerror = () => {
      setGoogleReady(false);
      setGeneralError(t("googleSdkFailed"));
    };
    document.body.appendChild(s);
  }, [t]);

  useEffect(() => {
    if (
      !googleReady ||
      !GOOGLE_CLIENT_ID ||
      !window.google?.accounts?.id ||
      googleInitializedRef.current
    ) {
      return;
    }

    try {
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: async (response) => {
          const idToken = response?.credential;

          if (!idToken) {
            const msg = t("googleTokenMissing");
            setGeneralError(msg);
            toast.error(msg);
            return;
          }

          await handleGoogleBackend(
            idToken,
            pendingSocialAccountTypeRef.current || "buyer"
          );
        },
        auto_select: false,
        cancel_on_tap_outside: true,
      });

      if (googleBtnRef.current) {
        googleBtnRef.current.innerHTML = "";
        window.google.accounts.id.renderButton(googleBtnRef.current, {
          type: "standard",
          theme: "outline",
          size: "large",
          shape: "rectangular",
          text: "signin_with",
          width: 260,
        });
      }

      googleInitializedRef.current = true;
    } catch {
      setGeneralError(t("googleInitFailed"));
    }
  }, [googleReady, t]);

  useEffect(() => {
    if (!FACEBOOK_APP_ID) return;

    window.fbAsyncInit = function () {
      try {
        if (!facebookInitializedRef.current) {
          window.FB.init({
            appId: FACEBOOK_APP_ID,
            cookie: true,
            xfbml: false,
            version: "v20.0",
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

  function startGoogleLogin(selectedAccountType) {
    setGeneralError("");

    pendingSocialAccountTypeRef.current = normalizeAccountType(selectedAccountType);

    if (!GOOGLE_CLIENT_ID) {
      const msg = t("googleEnvMissing");
      setGeneralError(msg);
      toast.error(msg);
      return;
    }

    if (!googleReady || !window.google?.accounts?.id) {
      const msg = t("googleNotReady");
      setGeneralError(msg);
      toast.error(msg);
      return;
    }

    try {
      const hiddenGoogleButton =
        googleBtnRef.current?.querySelector("div[role='button'], iframe");

      if (hiddenGoogleButton) {
        hiddenGoogleButton.click();
        return;
      }

      window.google.accounts.id.prompt((notification) => {
        if (notification.isNotDisplayed?.()) {
          const msg = t("googlePromptNotDisplayed");
          setGeneralError(msg);
          toast.error(msg);
        } else if (notification.isSkippedMoment?.()) {
          const msg = t("googlePromptSkipped");
          setGeneralError(msg);
          toast.info(msg);
        } else if (notification.isDismissedMoment?.()) {
          const msg = t("googlePromptDismissed");
          setGeneralError(msg);
          toast.info(msg);
        }
      });
    } catch {
      const msg = t("googleLoginStartFailed");
      setGeneralError(msg);
      toast.error(msg);
    }
  }

  function startFacebookLogin(selectedAccountType) {
    setGeneralError("");

    const actualAccountType = normalizeAccountType(selectedAccountType);
    pendingSocialAccountTypeRef.current = actualAccountType;

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
      function (resp) {
        const accessToken = resp?.authResponse?.accessToken;

        if (!accessToken) {
          const msg = t("facebookCancelled");
          setGeneralError(msg);
          toast.info(msg);
          return;
        }

        handleFacebookBackend(accessToken, actualAccountType);
      },
      {
        scope: "public_profile,email",
        return_scopes: true,
      }
    );
  }

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
    const actualAccountType = normalizeAccountType(accountType);

    if (loginMethod === "google") {
      setAccountModalOpen(false);
      startGoogleLogin(actualAccountType);
      return;
    }

    if (loginMethod === "facebook") {
      setAccountModalOpen(false);
      startFacebookLogin(actualAccountType);
      return;
    }

    handlePasswordLogin(formik.values, actualAccountType);
  }

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
              style={{
                border: 0,
                margin: 0,
                padding: 0,
                minWidth: 0,
              }}
            >
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

              <div
                className="input-group mb-5"
                style={{ position: "relative" }}
              >
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  className="form-control p-2"
                  placeholder={t("passwordPlaceholder")}
                  onChange={(e) => {
                    setGeneralError("");
                    formik.handleChange(e);
                  }}
                  onBlur={formik.handleBlur}
                  value={formik.values.password}
                  style={{
                    paddingRight: isArabic ? undefined : "45px",
                    paddingLeft: isArabic ? "45px" : undefined,
                  }}
                />

                <PasswordToggleButton
                  showPassword={showPassword}
                  onToggle={() => setShowPassword((prev) => !prev)}
                  disabled={loading}
                  labels={{
                    hidePassword: t("hidePassword"),
                    showPassword: t("showPassword"),
                  }}
                  isArabic={isArabic}
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

              <div className="social-login">
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

                <div
                  ref={googleBtnRef}
                  style={{
                    position: "absolute",
                    opacity: 0,
                    pointerEvents: "none",
                    width: 0,
                    height: 0,
                    overflow: "hidden",
                  }}
                />
              </div>
            </fieldset>
          </form>
        </div>
      </div>

      <AccountTypeModal
        open={accountModalOpen}
        onClose={() => {
          if (!loading) setAccountModalOpen(false);
        }}
        onSelect={handleAccountTypeSelect}
        loading={loading}
        t={t}
      />
    </>
  );
}