import { useEffect, useMemo, useRef, useState } from "react";
import { useFormik } from "formik";
import * as Yup from "yup";
import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import Login_navbar from "../Sign-in/Navbar";
import icon from "../../assets/2.png";
import {
  getCountries,
  getCities,
  register,
  resendRegistrationOtp,
} from "../../API/auth";

const MAIN_COLOR = "#023E8A";
const EGYPT_COUNTRY_ID = 51;

const flagUrl = (code) => `https://flagcdn.com/w40/${code}.png`;

const COUNTRY_META = {
  "Antigua and Barbuda": { dialCode: "+1-268", flagUrl: flagUrl("ag") },
  Argentina: { dialCode: "+54", flagUrl: flagUrl("ar") },
  Australia: { dialCode: "+61", flagUrl: flagUrl("au") },
  Benin: { dialCode: "+229", flagUrl: flagUrl("bj") },
  Bolivia: { dialCode: "+591", flagUrl: flagUrl("bo") },
  Canada: { dialCode: "+1", flagUrl: flagUrl("ca") },
  Chile: { dialCode: "+56", flagUrl: flagUrl("cl") },
  "Christmas Island": { dialCode: "+61", flagUrl: flagUrl("cx") },
  Egypt: { dialCode: "+20", flagUrl: flagUrl("eg") },
  Ethiopia: { dialCode: "+251", flagUrl: flagUrl("et") },
  Finland: { dialCode: "+358", flagUrl: flagUrl("fi") },
  France: { dialCode: "+33", flagUrl: flagUrl("fr") },
  Germany: { dialCode: "+49", flagUrl: flagUrl("de") },
  Guatemala: { dialCode: "+502", flagUrl: flagUrl("gt") },
  Ireland: { dialCode: "+353", flagUrl: flagUrl("ie") },
  Italy: { dialCode: "+39", flagUrl: flagUrl("it") },
  Japan: { dialCode: "+81", flagUrl: flagUrl("jp") },
  Jordan: { dialCode: "+962", flagUrl: flagUrl("jo") },
  Kazakhstan: { dialCode: "+7", flagUrl: flagUrl("kz") },
  "Kyrgyz Republic": { dialCode: "+996", flagUrl: flagUrl("kg") },
  Martinique: { dialCode: "+596", flagUrl: flagUrl("mq") },
  Mauritania: { dialCode: "+222", flagUrl: flagUrl("mr") },
  Mauritius: { dialCode: "+230", flagUrl: flagUrl("mu") },
  Montenegro: { dialCode: "+382", flagUrl: flagUrl("me") },
  Morocco: { dialCode: "+212", flagUrl: flagUrl("ma") },
  "Norfolk Island": { dialCode: "+672", flagUrl: flagUrl("nf") },
  "North Macedonia": { dialCode: "+389", flagUrl: flagUrl("mk") },
  "Palestinian Territory": { dialCode: "+970", flagUrl: flagUrl("ps") },
  Paraguay: { dialCode: "+595", flagUrl: flagUrl("py") },
  Peru: { dialCode: "+51", flagUrl: flagUrl("pe") },
  Qatar: { dialCode: "+974", flagUrl: flagUrl("qa") },
  Reunion: { dialCode: "+262", flagUrl: flagUrl("re") },
  Romania: { dialCode: "+40", flagUrl: flagUrl("ro") },
  "Saint Vincent and the Grenadines": { dialCode: "+1-784", flagUrl: flagUrl("vc") },
  "Saudi Arabia": { dialCode: "+966", flagUrl: flagUrl("sa") },
  Seychelles: { dialCode: "+248", flagUrl: flagUrl("sc") },
  "Slovakia (Slovak Republic)": { dialCode: "+421", flagUrl: flagUrl("sk") },
  "South Africa": { dialCode: "+27", flagUrl: flagUrl("za") },
  Spain: { dialCode: "+34", flagUrl: flagUrl("es") },
  Suriname: { dialCode: "+597", flagUrl: flagUrl("sr") },
  "Syrian Arab Republic": { dialCode: "+963", flagUrl: flagUrl("sy") },
  Taiwan: { dialCode: "+886", flagUrl: flagUrl("tw") },
  Tajikistan: { dialCode: "+992", flagUrl: flagUrl("tj") },
  Tonga: { dialCode: "+676", flagUrl: flagUrl("to") },
  "Turks and Caicos Islands": { dialCode: "+1-649", flagUrl: flagUrl("tc") },
  Ukraine: { dialCode: "+380", flagUrl: flagUrl("ua") },
  "United Arab Emirates": { dialCode: "+971", flagUrl: flagUrl("ae") },
  "United Kingdom": { dialCode: "+44", flagUrl: flagUrl("gb") },
  "United States": { dialCode: "+1", flagUrl: flagUrl("us") },
  "United States Minor Outlying Islands": { dialCode: "+1", flagUrl: flagUrl("um") },
};

function PasswordToggleButton({ showPassword, onToggle, disabled }) {
  const { t, i18n } = useTranslation();
  const [hovered, setHovered] = useState(false);
  const isArabic = i18n.language === "ar";

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onToggle}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      aria-label={showPassword ? t("hidePassword") : t("showPassword")}
      style={{
        position: "absolute",
        right: isArabic ? "auto" : "12px",
        left: isArabic ? "12px" : "auto",
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
      <i className={`fa-solid ${showPassword ? "fa-eye-slash" : "fa-eye"}`}></i>
    </button>
  );
}

function CountryCodeDropdown({
  selectedCountry,
  countries,
  open,
  setOpen,
  disabled,
  onSelect,
  onBlur,
}) {
  const { t, i18n } = useTranslation();
  const wrapRef = useRef(null);
  const isArabic = i18n.language === "ar";

  useEffect(() => {
    if (!open) return;

    const handleOutside = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
        onBlur?.();
      }
    };

    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [open, setOpen, onBlur]);

  return (
    <div ref={wrapRef} style={{ position: "relative" }}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((prev) => !prev)}
        onBlur={onBlur}
        style={{
          width: "100%",
          height: 46,
          border: "1px solid #ced4da",
          borderRadius: 6,
          background: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 12px",
          cursor: disabled ? "not-allowed" : "pointer",
        }}
      >
        {selectedCountry ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              direction: "ltr",
            }}
          >
            <img
              src={selectedCountry.flagUrl}
              alt={selectedCountry.name}
              width="24"
              height="18"
              style={{
                objectFit: "cover",
                borderRadius: 2,
                border: "1px solid #ddd",
              }}
            />
            <span>{selectedCountry.dialCode}</span>
          </div>
        ) : (
          <span style={{ color: "#6c757d" }}>{t("selectCountryCode")}</span>
        )}

        <i className={`fa-solid fa-chevron-${open ? "up" : "down"}`}></i>
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            left: 0,
            right: 0,
            background: "#fff",
            border: "1px solid #dee2e6",
            borderRadius: 8,
            boxShadow: "0 10px 25px rgba(0,0,0,0.12)",
            maxHeight: 260,
            overflowY: "auto",
            zIndex: 1000,
          }}
        >
          {countries.map((country) => (
            <button
              key={country.id}
              type="button"
              onClick={() => {
                onSelect(country);
                setOpen(false);
              }}
              style={{
                width: "100%",
                border: "none",
                background: "#fff",
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 12px",
                cursor: "pointer",
                textAlign: isArabic ? "right" : "left",
              }}
            >
              <img
                src={country.flagUrl}
                alt={country.name}
                width="24"
                height="18"
                style={{
                  objectFit: "cover",
                  borderRadius: 2,
                  border: "1px solid #ddd",
                }}
              />
              <span style={{ minWidth: 55, direction: "ltr" }}>{country.dialCode}</span>
              <span style={{ color: "#495057" }}>{country.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const extractAnyMessage = (obj) => {
  if (!obj) return "";
  if (typeof obj === "string") return obj;

  return (
    obj.Message ||
    obj.message ||
    obj.title ||
    obj.error ||
    obj.Errors?.[0] ||
    obj.errors?.[0] ||
    obj.data?.Message ||
    obj.data?.message ||
    obj.data?.Errors?.[0] ||
    obj.data?.errors?.[0] ||
    ""
  );
};

const extractBackendFieldErrors = (data) => {
  const source =
    data?.errors || data?.Errors || data?.data?.errors || data?.data?.Errors || {};
  const result = {};

  Object.keys(source).forEach((key) => {
    const value = source[key];
    const msg = Array.isArray(value) ? value[0] : value;
    const lower = String(key).toLowerCase();

    if (lower.includes("phone")) result.phone = msg;
    else if (lower.includes("email")) result.email = msg;
    else if (lower.includes("password")) result.password = msg;
    else if (lower.includes("name")) result.name = msg;
    else if (lower.includes("birth")) result.birthdate = msg;
    else if (lower.includes("gender")) result.gender = msg;
    else if (lower.includes("country")) result.countryId = msg;
    else if (lower.includes("city") || lower.includes("postal") || lower.includes("zip")) {
      result.cityId = msg;
    } else if (lower.includes("confirm")) result.confirmPassword = msg;
    else result.general = msg;
  });

  return result;
};

const isOtpFlowMessage = (message) => {
  const msg = String(message || "").toLowerCase();

  return (
    msg.includes("otp sent") ||
    msg.includes("otp already sent") ||
    msg.includes("please check your email") ||
    msg.includes("check your email") ||
    msg.includes("verification code sent") ||
    msg.includes("code sent")
  );
};

const isRegisterSuccessResponse = (data) => {
  const okRaw =
    data?.IsSuccess ??
    data?.isSuccess ??
    data?.Success ??
    data?.success ??
    data?.Succeeded ??
    data?.succeeded;

  if (okRaw === true || okRaw === "true" || okRaw === 1 || okRaw === "1") {
    return true;
  }

  const msg =
    data?.Message ||
    data?.message ||
    data?.title ||
    data?.error ||
    data?.detail ||
    "";

  return isOtpFlowMessage(msg);
};

const isAlreadyConfirmedEmailMessage = (message) => {
  const msg = String(message || "").toLowerCase();

  return (
    msg.includes("already confirmed") ||
    msg.includes("email confirmed") ||
    msg.includes("already exists and confirmed") ||
    msg.includes("already registered and confirmed")
  );
};

const shouldResendOtpInstead = (message) => {
  const msg = String(message || "").toLowerCase();

  return (
    msg.includes("already exists") ||
    msg.includes("already registered") ||
    msg.includes("email is already taken") ||
    msg.includes("user already exists") ||
    msg.includes("otp already sent") ||
    msg.includes("please confirm your email") ||
    msg.includes("email not confirmed") ||
    msg.includes("unconfirmed")
  );
};

const getCountryMeta = (country) => {
  if (!country) return { dialCode: "", flagUrl: "" };
  return COUNTRY_META[country.name] || { dialCode: "", flagUrl: "" };
};

const getPhoneError = (value, selectedCountry, t) => {
  const raw = String(value || "").trim();
  const digits = raw.replace(/\D/g, "");
  const selectedCountryId = Number(selectedCountry?.id);

  if (!digits) return t("phoneRequired");

  if (selectedCountryId === EGYPT_COUNTRY_ID) {
    if (digits.length !== 11) return t("phoneMustBe11");
    if (!digits.startsWith("01")) return t("phoneMustStart01");
    if (!/^01[0125]\d{8}$/.test(digits)) {
      return t("phoneMustStartEgyptPrefix");
    }
    return "";
  }

  if (digits.length < 6 || digits.length > 15) {
    return t("phoneBetween6And15");
  }

  return "";
};

const toBackendPhone = (value, selectedCountry) => {
  const raw = String(value || "").trim();
  const digits = raw.replace(/\D/g, "");
  const dialCode = String(getCountryMeta(selectedCountry).dialCode || "");
  const normalizedDialCode = dialCode.replace(/-.*/, "");

  if (!digits) return "";

  if (Number(selectedCountry?.id) === EGYPT_COUNTRY_ID) {
    if (digits.length === 11 && digits.startsWith("0")) {
      return `+20${digits.slice(1)}`;
    }
    if (digits.length === 10) {
      return `+20${digits}`;
    }
  }

  if (raw.startsWith("+")) {
    return `+${digits}`;
  }

  if (normalizedDialCode) {
    return `${normalizedDialCode}${digits}`;
  }

  return digits;
};

export default function Register() {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const isArabic = i18n.language === "ar";

  const [loading, setLoading] = useState(false);
  const [generalError, setGeneralError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [countryDropdownOpen, setCountryDropdownOpen] = useState(false);

  const [countries, setCountries] = useState([]);
  const [cities, setCities] = useState([]);
  const [countriesLoading, setCountriesLoading] = useState(false);
  const [citiesLoading, setCitiesLoading] = useState(false);

  const countriesWithMeta = useMemo(() => {
    return countries.map((country) => ({
      ...country,
      ...getCountryMeta(country),
    }));
  }, [countries]);

  const validationSchema = Yup.object({
    name: Yup.string()
      .min(2, t("signupNameRequired"))
      .max(50, t("signupNameRequired"))
      .required(t("signupNameRequired")),

    email: Yup.string()
      .trim()
      .email(t("signupInvalidEmail"))
      .required(t("signupInvalidEmail")),

    countryId: Yup.string().required(t("countryCodeRequired")),
    cityId: Yup.string().required(t("cityRequired")),

    phone: Yup.string().test("phone-validation", function (value) {
      const selectedCountry = countries.find(
        (item) => String(item.id) === String(this.parent.countryId)
      );
      const error = getPhoneError(value, selectedCountry, t);
      if (error) return this.createError({ message: error });
      return true;
    }),

    birthdate: Yup.string().required(t("signupBirthdateRequired")),
    gender: Yup.string().required(t("signupGenderRequired")),

    password: Yup.string()
      .min(8, t("passwordMin8"))
      .matches(/[a-z]/, t("passwordLowercase"))
      .matches(/[A-Z]/, t("passwordUppercase"))
      .matches(/[0-9]/, t("passwordNumber"))
      .matches(/[^a-zA-Z0-9]/, t("passwordSymbol"))
      .required(t("passwordRequired")),

    confirmPassword: Yup.string()
      .oneOf([Yup.ref("password")], t("signupConfirmPasswordMatch"))
      .required(t("signupConfirmPasswordRequired")),

    terms: Yup.boolean().oneOf([true], t("signupAcceptTerms")),
  });

  const hardGoToConfirm = (emailValue) => {
    const savedEmail = String(emailValue || "").trim().toLowerCase();

    if (savedEmail) {
      localStorage.setItem("pendingEmail", savedEmail);
    }

    window.location.replace("/confirm_login");
  };

  async function resendRegister(email) {
    try {
      const normalizedEmail = String(email || "").trim().toLowerCase();

      const data = await resendRegistrationOtp({
        email: normalizedEmail,
      });

      toast.success(extractAnyMessage(data) || t("newOtpSent"));

      setTimeout(() => {
        localStorage.setItem("pendingEmail", normalizedEmail);
        window.location.replace("/confirm_login");
      }, 400);
    } catch (err) {
      const msg =
        extractAnyMessage(err?.response?.data) ||
        err?.message ||
        t("failedToResendOtp");

      if (isAlreadyConfirmedEmailMessage(msg)) {
        formik.setFieldError("email", msg);
        formik.setFieldTouched("email", true, false);
        setGeneralError(msg);
        return;
      }

      toast.error(msg);
      setGeneralError(msg);
    }
  }

  async function handleSignup(values) {
    setGeneralError("");

    const selectedCountry = countries.find(
      (item) => String(item.id) === String(values.countryId)
    );

    const phoneError = getPhoneError(values.phone, selectedCountry, t);

    if (phoneError) {
      formik.setFieldTouched("phone", true, false);
      formik.setFieldError("phone", phoneError);
      return;
    }

    if (!values.countryId) {
      formik.setFieldTouched("countryId", true, false);
      formik.setFieldError("countryId", t("countryCodeRequired"));
      return;
    }

    if (!values.cityId) {
      formik.setFieldTouched("cityId", true, false);
      formik.setFieldError("cityId", t("cityRequired"));
      return;
    }

    setLoading(true);

    try {
      const emailTrim = String(values.email || "").trim().toLowerCase();

      const data = await register({
        fullName: values.name,
        birthDate: values.birthdate,
        phoneNumber: toBackendPhone(values.phone, selectedCountry),
        gender: values.gender === "male" ? 1 : 2,
        email: emailTrim,
        password: values.password,
        countryId: values.countryId,
        cityId: values.cityId,
      });

      if (isRegisterSuccessResponse(data)) {
        toast.success(extractAnyMessage(data) || t("otpSent"));
        setTimeout(() => {
          hardGoToConfirm(emailTrim);
        }, 400);
        return;
      }

      const msg = extractAnyMessage(data) || t("registerFailed");

      if (isOtpFlowMessage(msg)) {
        toast.success(msg);
        setTimeout(() => {
          hardGoToConfirm(emailTrim);
        }, 400);
        return;
      }

      if (isAlreadyConfirmedEmailMessage(msg)) {
        formik.setFieldError("email", msg);
        formik.setFieldTouched("email", true, false);
        setGeneralError(msg);
        return;
      }

      if (shouldResendOtpInstead(msg)) {
        await resendRegister(emailTrim);
        return;
      }

      const fieldErrors = extractBackendFieldErrors(data);

      if (fieldErrors.name) formik.setFieldError("name", fieldErrors.name);
      if (fieldErrors.email) formik.setFieldError("email", fieldErrors.email);
      if (fieldErrors.countryId) formik.setFieldError("countryId", fieldErrors.countryId);
      if (fieldErrors.cityId) formik.setFieldError("cityId", fieldErrors.cityId);
      if (fieldErrors.phone) formik.setFieldError("phone", fieldErrors.phone);
      if (fieldErrors.birthdate) formik.setFieldError("birthdate", fieldErrors.birthdate);
      if (fieldErrors.gender) formik.setFieldError("gender", fieldErrors.gender);
      if (fieldErrors.password) formik.setFieldError("password", fieldErrors.password);
      if (fieldErrors.confirmPassword) {
        formik.setFieldError("confirmPassword", fieldErrors.confirmPassword);
      }

      setGeneralError(fieldErrors.general || msg);
    } catch (err) {
      const backendData = err?.response?.data;
      const msg = extractAnyMessage(backendData) || err?.message || t("registerFailed");
      const emailTrim = String(values.email || "").trim().toLowerCase();

      if (isRegisterSuccessResponse(backendData) || isOtpFlowMessage(msg)) {
        toast.success(msg || t("otpSent"));
        setTimeout(() => {
          hardGoToConfirm(emailTrim);
        }, 400);
        return;
      }

      if (isAlreadyConfirmedEmailMessage(msg)) {
        formik.setFieldError("email", msg);
        formik.setFieldTouched("email", true, false);
        setGeneralError(msg);
        return;
      }

      if (shouldResendOtpInstead(msg)) {
        await resendRegister(emailTrim);
        return;
      }

      const fieldErrors = extractBackendFieldErrors(backendData);

      if (fieldErrors.name) formik.setFieldError("name", fieldErrors.name);
      if (fieldErrors.email) formik.setFieldError("email", fieldErrors.email);
      if (fieldErrors.countryId) formik.setFieldError("countryId", fieldErrors.countryId);
      if (fieldErrors.cityId) formik.setFieldError("cityId", fieldErrors.cityId);
      if (fieldErrors.phone) formik.setFieldError("phone", fieldErrors.phone);
      if (fieldErrors.birthdate) formik.setFieldError("birthdate", fieldErrors.birthdate);
      if (fieldErrors.gender) formik.setFieldError("gender", fieldErrors.gender);
      if (fieldErrors.password) formik.setFieldError("password", fieldErrors.password);
      if (fieldErrors.confirmPassword) {
        formik.setFieldError("confirmPassword", fieldErrors.confirmPassword);
      }

      setGeneralError(fieldErrors.general || msg);
    } finally {
      setLoading(false);
    }
  }

  const formik = useFormik({
    initialValues: {
      name: "",
      email: "",
      countryId: "",
      cityId: "",
      phone: "",
      birthdate: "",
      gender: "",
      password: "",
      confirmPassword: "",
      terms: false,
    },
    validationSchema,
    onSubmit: handleSignup,
    validateOnMount: true,
    validateOnChange: true,
    validateOnBlur: true,
  });

  useEffect(() => {
    document.title = t("signupDocTitle");
    const link = document.querySelector("link[rel~='icon']");
    if (link) link.href = icon;
  }, [t]);

  useEffect(() => {
    const resendEmail = location?.state?.resendEmail;

    if (resendEmail) {
      resendRegister(resendEmail);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location]);

  useEffect(() => {
    let ignore = false;

    const loadCountries = async () => {
      setCountriesLoading(true);

      try {
        const data = await getCountries();

        if (ignore) return;

        setCountries(Array.isArray(data) ? data : []);

        if (!formik.values.countryId && Array.isArray(data) && data.length > 0) {
          const egypt = data.find(
            (item) => String(item.name || "").trim().toLowerCase() === "egypt"
          );

          const defaultCountryId = String(egypt?.id || data[0].id || "");
          formik.setFieldValue("countryId", defaultCountryId, false);
        }
      } catch (err) {
        if (ignore) return;
        const msg =
          extractAnyMessage(err?.response?.data) ||
          err?.message ||
          t("failedToLoadCountries");
        toast.error(msg);
      } finally {
        if (!ignore) setCountriesLoading(false);
      }
    };

    loadCountries();

    return () => {
      ignore = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t]);

  useEffect(() => {
    let ignore = false;
    const selectedCountryId = formik.values.countryId;

    const loadCities = async () => {
      if (!selectedCountryId) {
        setCities([]);
        return;
      }

      setCitiesLoading(true);

      try {
        const data = await getCities(selectedCountryId);

        if (ignore) return;

        setCities(Array.isArray(data) ? data : []);

        const stillExists = Array.isArray(data)
          ? data.some((item) => String(item.id) === String(formik.values.cityId))
          : false;

        if (!stillExists) {
          formik.setFieldValue("cityId", "", false);
        }
      } catch (err) {
        if (ignore) return;
        const msg =
          extractAnyMessage(err?.response?.data) ||
          err?.message ||
          t("failedToLoadCities");
        toast.error(msg);
        setCities([]);
      } finally {
        if (!ignore) setCitiesLoading(false);
      }
    };

    loadCities();

    return () => {
      ignore = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formik.values.countryId, t]);

  const selectedCountry = countriesWithMeta.find(
    (country) => String(country.id) === String(formik.values.countryId)
  );

  return (
    <>
      <Login_navbar />
      <ToastContainer theme="colored" />

      <div className="register" dir={isArabic ? "rtl" : "ltr"}>
        <div className="container">
          <h1 style={{ padding: "10px 0" }}>{t("signupHeading")}</h1>

          <form className="forms" onSubmit={formik.handleSubmit}>
            {generalError && <div className="alert alert-danger">{generalError}</div>}

            <fieldset
              disabled={loading}
              style={{
                border: 0,
                margin: 0,
                padding: 0,
                minWidth: 0,
              }}
            >
              <input
                type="text"
                name="name"
                placeholder={t("signupFullName")}
                className="form-control mb-2 my-4"
                onChange={(e) => {
                  setGeneralError("");
                  formik.handleChange(e);
                }}
                onBlur={formik.handleBlur}
                value={formik.values.name}
              />
              {formik.touched.name && formik.errors.name && (
                <div className="alert alert-danger">{formik.errors.name}</div>
              )}

              <input
                type="email"
                name="email"
                placeholder={t("signupEmail")}
                className="form-control mb-2 my-4"
                onChange={(e) => {
                  setGeneralError("");
                  formik.handleChange(e);
                }}
                onBlur={formik.handleBlur}
                value={formik.values.email}
              />
              {formik.touched.email && formik.errors.email && (
                <div className="alert alert-danger">{formik.errors.email}</div>
              )}

              <div
                className="mb-2 my-4"
                style={{
                  display: "grid",
                  gridTemplateColumns: "220px 1fr",
                  gap: "12px",
                  alignItems: "start",
                }}
              >
                <div>
                  <CountryCodeDropdown
                    selectedCountry={selectedCountry}
                    countries={countriesWithMeta}
                    open={countryDropdownOpen}
                    setOpen={setCountryDropdownOpen}
                    disabled={countriesLoading}
                    onBlur={() => formik.setFieldTouched("countryId", true, false)}
                    onSelect={(country) => {
                      setGeneralError("");
                      formik.setFieldValue("countryId", String(country.id));
                      formik.setFieldValue("cityId", "");
                      formik.setFieldTouched("countryId", true, false);
                    }}
                  />
                  {formik.touched.countryId && formik.errors.countryId && (
                    <div className="alert alert-danger mt-2">
                      {formik.errors.countryId}
                    </div>
                  )}
                </div>

                <div>
                  <input
                    type="tel"
                    name="phone"
                    placeholder={t("signupPhone")}
                    className="form-control"
                    onChange={(e) => {
                      setGeneralError("");
                      formik.setFieldValue(
                        "phone",
                        String(e.target.value || "").replace(/[^\d]/g, "")
                      );
                    }}
                    onBlur={formik.handleBlur}
                    value={formik.values.phone}
                    style={{ direction: "ltr", textAlign: "left" }}
                  />
                  {formik.touched.phone && formik.errors.phone && (
                    <div className="alert alert-danger mt-2">{formik.errors.phone}</div>
                  )}
                </div>
              </div>

              <select
                name="cityId"
                className="form-control mb-2 my-4"
                onChange={(e) => {
                  setGeneralError("");
                  formik.handleChange(e);
                }}
                onBlur={formik.handleBlur}
                value={formik.values.cityId}
                disabled={!formik.values.countryId || citiesLoading}
              >
                <option value="" disabled>
                  {!formik.values.countryId
                    ? t("cities")
                    : citiesLoading
                    ? t("loadingCities")
                    : t("citiesInCountry", { country: selectedCountry?.name || "" })}
                </option>
                {cities.map((city) => (
                  <option key={city.id} value={city.id}>
                    {city.name}
                  </option>
                ))}
              </select>
              {formik.touched.cityId && formik.errors.cityId && (
                <div className="alert alert-danger">{formik.errors.cityId}</div>
              )}

              <input
                type="date"
                name="birthdate"
                className="form-control mb-2 my-4"
                onChange={(e) => {
                  setGeneralError("");
                  formik.handleChange(e);
                }}
                onBlur={formik.handleBlur}
                value={formik.values.birthdate}
              />
              {formik.touched.birthdate && formik.errors.birthdate && (
                <div className="alert alert-danger">{formik.errors.birthdate}</div>
              )}

              <select
                name="gender"
                className="form-control mb-2 my-4"
                onChange={(e) => {
                  setGeneralError("");
                  formik.handleChange(e);
                }}
                onBlur={formik.handleBlur}
                value={formik.values.gender}
              >
                <option value="">{t("signupSelectGender")}</option>
                <option value="male">{t("signupMale")}</option>
                <option value="female">{t("signupFemale")}</option>
              </select>
              {formik.touched.gender && formik.errors.gender && (
                <div className="alert alert-danger">{formik.errors.gender}</div>
              )}

              <div style={{ position: "relative" }}>
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  placeholder={t("signupPassword")}
                  className="form-control mb-2 my-4"
                  onChange={(e) => {
                    setGeneralError("");
                    formik.handleChange(e);
                  }}
                  onBlur={formik.handleBlur}
                  value={formik.values.password}
                  style={{ paddingRight: isArabic ? undefined : "45px", paddingLeft: isArabic ? "45px" : undefined }}
                />
                <PasswordToggleButton
                  showPassword={showPassword}
                  onToggle={() => setShowPassword((prev) => !prev)}
                  disabled={loading}
                />
              </div>
              {formik.touched.password && formik.errors.password && (
                <div className="alert alert-danger">{formik.errors.password}</div>
              )}

              <input
                type="password"
                name="confirmPassword"
                placeholder={t("signupConfirmPassword")}
                className="form-control mb-2 my-4"
                onChange={(e) => {
                  setGeneralError("");
                  formik.handleChange(e);
                }}
                onBlur={formik.handleBlur}
                value={formik.values.confirmPassword}
              />
              {formik.touched.confirmPassword && formik.errors.confirmPassword && (
                <div className="alert alert-danger">
                  {formik.errors.confirmPassword}
                </div>
              )}

              <div className="terms mb-2 my-4">
                <input
                  type="checkbox"
                  name="terms"
                  onChange={(e) => {
                    setGeneralError("");
                    formik.handleChange(e);
                  }}
                  onBlur={formik.handleBlur}
                  checked={formik.values.terms}
                />
                <label>
                  {t("signupAgree")}{" "}
                  <Link to="/Terms&Conditions">
                    <span className="span1">{t("signupTerms")}</span>
                  </Link>
                </label>
              </div>

              {formik.submitCount > 0 && formik.errors.terms && (
                <div className="alert alert-danger">{formik.errors.terms}</div>
              )}

              <div className="button-wrapper">
                <button
                  type="submit"
                  className="login-btn"
                  disabled={loading}
                  style={{
                    opacity: loading ? 0.8 : 1,
                    cursor: loading ? "not-allowed" : "pointer",
                    pointerEvents: loading ? "none" : "auto",
                  }}
                >
                  {loading ? (
                    <i className="fa-solid fa-circle-notch fa-spin"></i>
                  ) : (
                    t("signupBtn")
                  )}
                </button>
              </div>

              <div className="signup-wrapper my-3">
                <span>{t("signupHaveAccount")}</span>
                <Link to="/login" className="signup-link">
                  {t("signupLogin")}
                </Link>
              </div>
            </fieldset>
          </form>
        </div>
      </div>
    </>
  );
}