import { useState, useEffect } from "react";
import icon from "../../assets/2.png";
import { useFormik } from "formik";
import * as Yup from "yup";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { changePassword } from "../../API/auth";

const extractBackendErrors = (data) => {
  const source = data?.errors || data?.Errors || {};
  const mapped = {};

  Object.keys(source).forEach((key) => {
    const value = Array.isArray(source[key]) ? source[key][0] : source[key];
    const lower = String(key).toLowerCase();

    if (lower.includes("old") || lower.includes("current")) {
      mapped.oldPassword = value;
    } else if (lower === "newpassword" || lower.includes("newpassword")) {
      mapped.newPassword = value;
    } else if (lower.includes("confirm")) {
      mapped.confirmNewPassword = value;
    } else {
      mapped.general = value;
    }
  });

  return mapped;
};

export default function ChangePassword() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  useEffect(() => {
    document.title = t("changePasswordDocTitle", "Change Password");
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

    updateFavicon(icon);
  }, []);

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [msgType, setMsgType] = useState("danger");

  const validationSchema = Yup.object({
    oldPassword: Yup.string().required(
      t("oldPasswordRequired", "Old password is required")
    ),

    newPassword: Yup.string()
      .min(8, t("passwordMin8", "Password must be at least 8 characters"))
      .matches(
        /[a-z]/,
        t("passwordLowercase", "Password must contain a lowercase letter")
      )
      .matches(
        /[A-Z]/,
        t("passwordUppercase", "Password must contain an uppercase letter")
      )
      .matches(/[0-9]/, t("passwordNumber", "Password must contain a number"))
      .matches(
        /[^a-zA-Z0-9]/,
        t("passwordSymbol", "Password must contain a special character")
      )
      .required(t("newPasswordRequired", "New password is required")),

    confirmNewPassword: Yup.string()
      .oneOf([Yup.ref("newPassword")], t("passwordsMustMatch", "Passwords must match"))
      .required(t("confirmPasswordRequired", "Confirm password is required")),
  });

  const handleSubmit = async (values) => {
    try {
      setLoading(true);
      setMsg("");
      setMsgType("danger");

      const res = await changePassword({
        oldPassword: values.oldPassword,
        newPassword: values.newPassword,
        confirmNewPassword: values.confirmNewPassword,
      });

      setMsg(
        res?.message ||
          res?.Message ||
          t("passwordChangedSuccess", "Password changed successfully")
      );
      setMsgType("success");

      const role = String(
        localStorage.getItem("role") ||
          localStorage.getItem("accountType") ||
          "user"
      )
        .trim()
        .toLowerCase();

      setTimeout(() => {
        if (role === "seller") {
          navigate("/seller-profile");
        } else {
          navigate("/profile");
        }
      }, 1200);
    } catch (error) {
      const data = error?.response?.data || {};
      const backendErrors = extractBackendErrors(data);

      if (backendErrors.oldPassword) {
        formik.setFieldError("oldPassword", backendErrors.oldPassword);
        formik.setFieldTouched("oldPassword", true, false);
      }

      if (backendErrors.newPassword) {
        formik.setFieldError("newPassword", backendErrors.newPassword);
        formik.setFieldTouched("newPassword", true, false);
      }

      if (backendErrors.confirmNewPassword) {
        formik.setFieldError("confirmNewPassword", backendErrors.confirmNewPassword);
        formik.setFieldTouched("confirmNewPassword", true, false);
      }

      setMsg(
        backendErrors.general ||
          data?.message ||
          data?.Message ||
          error?.message ||
          t("changePasswordFailed", "Failed to change password")
      );
      setMsgType("danger");
    } finally {
      setLoading(false);
    }
  };

  const formik = useFormik({
    initialValues: {
      oldPassword: "",
      newPassword: "",
      confirmNewPassword: "",
    },
    validationSchema,
    onSubmit: handleSubmit,
  });

  return (
    <div className="code">
      <div className="container">
        <h1 style={{ padding: "10px 0" }}>
          {t("changePassword", "Change Password")}
        </h1>

        <form className="forms" onSubmit={formik.handleSubmit}>
          {msg && <div className={`alert alert-${msgType}`}>{msg}</div>}

          <input
            type="password"
            name="oldPassword"
            placeholder={t("oldPassword", "Old Password")}
            className="form-control mb-3"
            onChange={(e) => {
              setMsg("");
              formik.handleChange(e);
            }}
            onBlur={formik.handleBlur}
            value={formik.values.oldPassword}
          />
          {formik.errors.oldPassword && formik.touched.oldPassword && (
            <div className="alert alert-danger">{formik.errors.oldPassword}</div>
          )}

          <input
            type="password"
            name="newPassword"
            placeholder={t("newPassword", "New Password")}
            className="form-control mb-3"
            onChange={(e) => {
              setMsg("");
              formik.handleChange(e);
            }}
            onBlur={formik.handleBlur}
            value={formik.values.newPassword}
          />
          {formik.errors.newPassword && formik.touched.newPassword && (
            <div className="alert alert-danger">{formik.errors.newPassword}</div>
          )}

          <input
            type="password"
            name="confirmNewPassword"
            placeholder={t("confirmNewPassword", "Confirm New Password")}
            className="form-control mb-3"
            onChange={(e) => {
              setMsg("");
              formik.handleChange(e);
            }}
            onBlur={formik.handleBlur}
            value={formik.values.confirmNewPassword}
          />
          {formik.errors.confirmNewPassword && formik.touched.confirmNewPassword && (
            <div className="alert alert-danger">
              {formik.errors.confirmNewPassword}
            </div>
          )}

          <div className="button-wrapper">
            <button type="submit" className="login-btn" disabled={loading}>
              {loading ? (
                <i className="fa-solid fa-spin fa-circle-notch"></i>
              ) : (
                t("changePasswordBtn", "Change Password")
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}