import { useEffect, useMemo, useState } from "react";
import { useFormik } from "formik";
import * as Yup from "yup";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import Login_navbar from "../Sign-in/Navbar";
import icon from "../../assets/2.png";
import { confirmEmail, resendRegistrationOtp } from "../../API/auth";

const extractMessage = (obj) => {
  if (!obj) return "";
  if (typeof obj === "string") return obj;

  return (
    obj.Message ||
    obj.message ||
    obj?.data?.Message ||
    obj?.data?.message ||
    obj?.Data?.Message ||
    obj?.Data?.message ||
    obj.title ||
    obj.error ||
    obj.detail ||
    ""
  );
};

export default function ConfirmLogin() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const isArabic = i18n.language === "ar";

  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [generalError, setGeneralError] = useState("");
  const [generalSuccess, setGeneralSuccess] = useState("");
  const [countdown, setCountdown] = useState(0);

  const emailFromState = location?.state?.email || "";
  const emailFromStorage = localStorage.getItem("pendingEmail") || "";

  const accountTypeFromState = location?.state?.accountType || "";
  const accountTypeFromStorage =
    localStorage.getItem("pendingAccountType") || "buyer";

  const email = useMemo(
    () => emailFromState || emailFromStorage,
    [emailFromState, emailFromStorage]
  );

  const accountType = useMemo(() => {
    const raw = accountTypeFromState || accountTypeFromStorage || "buyer";
    return String(raw).trim().toLowerCase() === "seller" ? "seller" : "buyer";
  }, [accountTypeFromState, accountTypeFromStorage]);

  useEffect(() => {
    document.title = t("confirmCodeDocTitle");

    const link = document.querySelector("link[rel~='icon']");
    if (link) link.href = icon;

    if (!email) {
      toast.error(t("missingEmailRegisterAgain"));
      navigate("/sign-up", { replace: true });
    }
  }, [email, navigate, t]);

  useEffect(() => {
    if (countdown <= 0) return;

    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [countdown]);

  const validationSchema = Yup.object({
    otp: Yup.string()
      .required(t("otpRequired"))
      .matches(/^\d{6}$/, t("otpMustBe6Digits")),
  });

  async function handleConfirm(values) {
    setGeneralError("");
    setGeneralSuccess("");
    setLoading(true);

    try {
      const data = await confirmEmail({
        email: email.trim(),
        otp: values.otp.trim(),
        accountType,
      });

      const message = String(extractMessage(data) || "").toLowerCase();
      const okRaw =
        data?.IsSuccess ??
        data?.isSuccess ??
        data?.Success ??
        data?.success ??
        data?.Data?.IsSuccess ??
        data?.Data?.isSuccess;

      const ok =
        okRaw === true || okRaw === "true" || okRaw === 1 || okRaw === "1";

      if (ok || message.includes("success") || message.includes("confirm")) {
        const successMsg =
          extractMessage(data) || t("emailConfirmedSuccessfully");

        setGeneralSuccess(successMsg);
        setGeneralError("");
        toast.success(successMsg);

        localStorage.removeItem("pendingEmail");
        localStorage.removeItem("pendingAccountType");
        localStorage.setItem("authLoginHintAccountType", accountType);

        navigate("/login", {
          replace: true,
          state: { email: email.trim(), accountType },
        });
        return;
      }

      setGeneralError(extractMessage(data) || t("invalidExpiredOtp"));
    } catch (err) {
      const backendMsg =
        extractMessage(err?.response?.data?.Data) ||
        extractMessage(err?.response?.data) ||
        err?.message;

      setGeneralError(backendMsg || t("invalidExpiredOtp"));
      setGeneralSuccess("");
    } finally {
      setLoading(false);
    }
  }

  async function handleResendCode() {
    if (!email || resendLoading || countdown > 0) return;

    setGeneralError("");
    setGeneralSuccess("");
    setResendLoading(true);

    try {
      const data = await resendRegistrationOtp({
        email: email.trim(),
        accountType,
      });

      const successMsg = extractMessage(data) || t("codeSentSuccessfully");

      setGeneralSuccess(successMsg);
      setGeneralError("");
      toast.success(successMsg);

      setCountdown(60);
      formik.setFieldValue("otp", "");
    } catch (err) {
      const backendMsg =
        extractMessage(err?.response?.data?.Data) ||
        extractMessage(err?.response?.data) ||
        err?.message;

      setGeneralError(backendMsg || t("couldNotSendCode"));
      setGeneralSuccess("");
    } finally {
      setResendLoading(false);
    }
  }

  const formik = useFormik({
    initialValues: { otp: "" },
    validationSchema,
    onSubmit: handleConfirm,
    validateOnMount: true,
    validateOnChange: true,
    validateOnBlur: true,
  });

  return (
    <>
      <ToastContainer theme="colored" />

      <div className="code" dir={isArabic ? "rtl" : "ltr"}>
        <div className="container">
          <h1 style={{ padding: "10px 0" }}>{t("confirmCodeTitle")}</h1>

          <p style={{ marginTop: 6 }}>
            {t("codeSentTo")} <b>{email}</b>
          </p>

          <form className="forms" onSubmit={formik.handleSubmit}>
            {generalSuccess && (
              <div className="alert alert-success">{generalSuccess}</div>
            )}

            {generalError && (
              <div className="alert alert-danger">{generalError}</div>
            )}

            <fieldset disabled={loading} style={{ border: 0 }}>
              <input
                type="text"
                name="otp"
                placeholder={t("enterSixDigitCode")}
                className="form-control mb-2 my-4"
                value={formik.values.otp}
                onChange={(e) => {
                  const v = e.target.value.replace(/\D/g, "").slice(0, 6);
                  formik.setFieldValue("otp", v);
                }}
              />

              <div style={{ marginBottom: "16px" }}>
                {t("didntGetCode")}
                <button
                  type="button"
                  onClick={handleResendCode}
                  disabled={resendLoading || countdown > 0}
                  className="signup-link"
                  style={{
                    border: "none",
                    background: "transparent",
                    marginInlineStart: "8px",
                  }}
                >
                  {resendLoading
                    ? t("sending")
                    : countdown > 0
                    ? t("getCodeAgainIn", { seconds: countdown })
                    : t("getCode")}
                </button>
              </div>

              <div className="button-wrapper">
                <button
                  type="submit"
                  className="login-btn"
                  disabled={
                    loading || !formik.isValid || formik.values.otp.length !== 6
                  }
                >
                  {loading ? (
                    <i className="fa-solid fa-circle-notch fa-spin" />
                  ) : (
                    t("confirm")
                  )}
                </button>
              </div>

              <div className="signup-wrapper my-3">
                {t("backTo")}
                <Link
                  to="/login"
                  className="signup-link"
                  state={{ email: email.trim(), accountType }}
                >
                  {" "}
                  {t("login")}
                </Link>
              </div>
            </fieldset>
          </form>
        </div>
      </div>
    </>
  );
}