import React, { useEffect, useState } from "react";
import { useFormik } from "formik";
import * as Yup from "yup";
import icon from "../../assets/2.png";
import { useNavigate } from "react-router-dom";
import Loading from "../Loading/Loading";
import { useTranslation } from "react-i18next";
import {
  forgetPasswordReset,
  forgetPasswordSignoutAll,
} from "../../API/auth";

export default function ResetPassword() {
  const [favicon] = useState(icon);
  const [loading, setLoading] = useState(false);
  const [signoutLoading, setSignoutLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === "ar";

  const email = localStorage.getItem("resetEmail") || "";
  const token = localStorage.getItem("resetToken") || "";

  useEffect(() => {
    document.title = t("resetPasswordDocTitle", "Reset Password");
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
      return;
    }

    if (!token) {
      navigate("/reset-code");
    }
  }, [email, token, navigate]);

  const validationSchema = Yup.object({
    newPassword: Yup.string()
      .min(6, t("resetPasswordMin", "Password must be at least 6 characters"))
      .required(t("resetPasswordValidationRequired", "Password is required")),

    confirmPassword: Yup.string()
      .oneOf(
        [Yup.ref("newPassword")],
        t("resetPasswordValidationMatch", "Passwords must match")
      )
      .required(
        t(
          "resetPasswordValidationConfirmRequired",
          "Confirm password is required"
        )
      ),
  });

  const handleNewPassword = async (values) => {
    try {
      setLoading(true);
      setMsg("");
      setSuccessMsg("");

      await forgetPasswordReset({
        email,
        token,
        newPassword: values.newPassword,
      });

      setSuccessMsg(
        t("resetPasswordSuccess", "Password reset successfully")
      );

      localStorage.removeItem("resetEmail");
      localStorage.removeItem("resetToken");

      setLoading(false);

      setTimeout(() => {
        navigate("/login");
      }, 1200);
    } catch (error) {
      setLoading(false);
      setMsg(
        error?.response?.data?.message ||
          error?.response?.data?.errors?.[0] ||
          t("somethingWentWrong", "Something went wrong")
      );
    }
  };

  const handleSignoutAll = async () => {
    try {
      setSignoutLoading(true);
      setMsg("");

      await forgetPasswordSignoutAll();

      setSignoutLoading(false);
      setSuccessMsg(
        t(
          "resetPasswordSignoutAllSuccess",
          "Signed out from all devices successfully"
        )
      );
    } catch (error) {
      setSignoutLoading(false);
      setMsg(
        error?.response?.data?.message ||
          error?.response?.data?.errors?.[0] ||
          t("somethingWentWrong", "Something went wrong")
      );
    }
  };

  const formik = useFormik({
    initialValues: {
      newPassword: "",
      confirmPassword: "",
    },
    validationSchema,
    onSubmit: handleNewPassword,
  });

  return (
    <div className="sign-in" dir={isArabic ? "rtl" : "ltr"}>
      <div className="container">
        <h1>{t("resetPasswordHeading", "Reset Password")}</h1>

        {msg && (
          <div className="alert alert-danger" role="alert">
            {msg}
          </div>
        )}

        {successMsg && (
          <div className="alert alert-success" role="alert">
            {successMsg}
          </div>
        )}

        <form className="forms" onSubmit={formik.handleSubmit}>
          <div className="input-group mb-3">
            <input
              type="password"
              id="newPassword"
              name="newPassword"
              className="form-control"
              placeholder={t(
                "resetPasswordNewPlaceholder",
                "Enter new password"
              )}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              value={formik.values.newPassword}
            />
          </div>

          {formik.errors.newPassword && formik.touched.newPassword && (
            <div className="alert alert-danger">
              {formik.errors.newPassword}
            </div>
          )}

          <div className="input-group mb-3">
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              className="form-control"
              placeholder={t(
                "resetPasswordConfirmPlaceholder",
                "Confirm new password"
              )}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              value={formik.values.confirmPassword}
            />
          </div>

          {formik.errors.confirmPassword &&
            formik.touched.confirmPassword && (
              <div className="alert alert-danger">
                {formik.errors.confirmPassword}
              </div>
            )}

          <div
            className="button-wrapper"
            style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}
          >
            <button
              type="submit"
              className={`login-btn ${
                !formik.isValid || !formik.dirty ? "disabled" : ""
              }`}
              disabled={!formik.isValid || !formik.dirty || loading}
            >
              {loading ? (
                <i className="fa-solid fa-spin fa-circle-notch"></i>
              ) : (
                t("resetPasswordBtn", "Reset Password")
              )}
            </button>

            <button
              type="button"
              className="login-btn"
              onClick={handleSignoutAll}
              disabled={signoutLoading}
            >
              {signoutLoading ? (
                <i className="fa-solid fa-spin fa-circle-notch"></i>
              ) : (
                t("resetPasswordSignoutAllBtn", "Sign out all devices")
              )}
            </button>
          </div>
        </form>
      </div>

      {loading || signoutLoading ? <Loading /> : null}
    </div>
  );
}