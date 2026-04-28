import React, { useEffect, useState } from "react";
import { useFormik } from "formik";
import * as Yup from "yup";
import icon from "../../assets/2.png";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  forgetPasswordVerify,
  forgetPasswordResend,
} from "../../API/auth";

const extractMessage = (obj) => {
  if (!obj) return "";

  if (typeof obj === "string") return obj;

  return (
    obj.Message ||
    obj.message ||
    obj?.data?.Message ||
    obj?.data?.message ||
    obj?.title ||
    obj?.error ||
    obj?.detail ||
    (Array.isArray(obj?.errors) ? obj.errors[0] : "") ||
    (Array.isArray(obj?.Errors) ? obj.Errors[0] : "") ||
    ""
  );
};

export default function ResetCode() {
  const [favicon] = useState(icon);
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === "ar";

  const email = localStorage.getItem("resetEmail") || "";

  useEffect(() => {
    document.title = t("resetCodeDocTitle", "Verification Code");
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
    if (!email) {
      navigate("/forget");
    }
  }, [email, navigate]);

  const validationSchema = Yup.object({
    code: Yup.string()
      .trim()
      .required(t("resetCodeRequired", "Code is required")),
  });

  const handleVerifyCode = async (values) => {
    try {
      setLoading(true);
      setMsg("");
      setSuccessMsg("");

      const data = await forgetPasswordVerify({
        email,
        code: values.code,
      });

      if (data?.token) {
        localStorage.setItem("resetToken", data.token);
      }

      if (data?.resetToken) {
        localStorage.setItem("resetToken", data.resetToken);
      }

      if (data?.data?.token) {
        localStorage.setItem("resetToken", data.data.token);
      }

      if (data?.data?.resetToken) {
        localStorage.setItem("resetToken", data.data.resetToken);
      }

      setLoading(false);
      navigate("/reset-password");
    } catch (error) {
      setLoading(false);
      setMsg(
        extractMessage(error?.response?.data) ||
          t("somethingWentWrong", "Something went wrong")
      );
    }
  };

  const handleResend = async () => {
    try {
      setResendLoading(true);
      setMsg("");
      setSuccessMsg("");

      const data = await forgetPasswordResend(email);

      setSuccessMsg(
        extractMessage(data) ||
          t("resetCodeResent", "Code sent again successfully")
      );

      setResendLoading(false);
    } catch (error) {
      setResendLoading(false);
      setMsg(
        extractMessage(error?.response?.data) ||
          t("somethingWentWrong", "Something went wrong")
      );
    }
  };

  const formik = useFormik({
    initialValues: {
      code: "",
    },
    validationSchema,
    onSubmit: handleVerifyCode,
  });

  return (
    <div className="container" dir={isArabic ? "rtl" : "ltr"}>
      <div className="forget">
        <h1>{t("resetCodeHeading", "Verification Code")}</h1>

        {email ? (
          <p style={{ marginBottom: "12px" }}>
            {t("resetCodeSentTo", "Code sent to")}: <strong>{email}</strong>
          </p>
        ) : null}

        <form className="forms" onSubmit={formik.handleSubmit}>
          {msg ? (
            <div className="alert alert-danger" role="alert">
              {msg}
            </div>
          ) : null}

          {successMsg ? (
            <div className="alert alert-success" role="alert">
              {successMsg}
            </div>
          ) : null}

          <div className="input-group mb-3">
            <input
              type="text"
              id="code"
              name="code"
              onBlur={formik.handleBlur}
              onChange={formik.handleChange}
              value={formik.values.code}
              className="form-control"
              placeholder={t("resetCodePlaceholder", "Enter code")}
              aria-label={t("resetCodeAriaLabel", "reset code")}
            />
          </div>

          {formik.errors.code && formik.touched.code ? (
            <div className="alert alert-danger" role="alert">
              {formik.errors.code}
            </div>
          ) : null}

          <div
            className="button-wrapper"
            style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}
          >
            <button
              type="submit"
              className="login-btn"
              disabled={loading || !formik.isValid || !formik.dirty}
            >
              {loading ? (
                <i className="fa-solid fa-spin fa-circle-notch"></i>
              ) : (
                t("resetCodeVerifyBtn", "Verify Code")
              )}
            </button>

            <button
              type="button"
              className="login-btn"
              onClick={handleResend}
              disabled={resendLoading || !email}
            >
              {resendLoading ? (
                <i className="fa-solid fa-spin fa-circle-notch"></i>
              ) : (
                t("resetCodeResendBtn", "Resend Code")
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}