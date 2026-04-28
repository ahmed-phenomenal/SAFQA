import React, { useEffect, useState } from "react";
import { useFormik } from "formik";
import * as Yup from "yup";
import icon from "../../assets/2.png";
import { useNavigate } from "react-router-dom";
import Loading from "../Loading/Loading";
import { useTranslation } from "react-i18next";
import { forgetPasswordRequest } from "../../API/auth";

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

export default function Forget() {
  const [favicon] = useState(icon);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === "ar";

  useEffect(() => {
    document.title = t("forgetDocTitle", "Forget Password");
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

  const validationSchema = Yup.object({
    email: Yup.string()
      .email(t("forgetEmailPatternInvalid", "Invalid email"))
      .required(t("forgetEmailRequired", "Email is required")),
  });

  const handleForget = async (values) => {
    try {
      setLoading(true);
      setMsg("");

      await forgetPasswordRequest(values.email);

      localStorage.setItem("resetEmail", values.email.trim());

      setLoading(false);
      navigate("/code");
    } catch (error) {
      setLoading(false);
      setMsg(
        extractMessage(error?.response?.data) ||
          t("somethingWentWrong", "Something went wrong")
      );
    }
  };

  const formik = useFormik({
    initialValues: {
      email: "",
    },
    validationSchema,
    onSubmit: handleForget,
  });

  return (
    <div className="container" dir={isArabic ? "rtl" : "ltr"}>
      <div className="forget">
        <h1 style={{ padding: "10px 0" }}>
          {t("forgetHeading", "Forget Password")}
        </h1>

        <form className="forms" onSubmit={formik.handleSubmit}>
          {msg ? (
            <div className="alert alert-danger" role="alert">
              {msg}
            </div>
          ) : null}

          <div className="input-group mb-3">
            <input
              style={{ padding: "10px 10px", margin: "10px 0" }}
              type="email"
              id="email"
              name="email"
              onBlur={formik.handleBlur}
              onChange={formik.handleChange}
              value={formik.values.email}
              className="form-control"
              placeholder={t("forgetEmailPlaceholder", "Enter your email")}
              aria-label={t("email", "Email")}
            />
          </div>

          {formik.errors.email && formik.touched.email ? (
            <div className="alert alert-danger" role="alert">
              {formik.errors.email}
            </div>
          ) : null}

          <div className="button-wrapper">
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
                t("forgetSendCode", "Send Code")
              )}
            </button>
          </div>
        </form>
      </div>

      {loading ? <Loading /> : null}
    </div>
  );
}