import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import icon from "../../../assets/2.png";
import {
  editSellerProfile,
  getCitiesByCountryId,
  getCountries,
  getSellerDisplayProfile,
  getSellerBusinessAccount,
} from "../../../API/seller";

export default function Seller_account_edit() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === "ar";

  const [formData, setFormData] = useState({
    storeName: "",
    phoneNumber: "",
    description: "",
    storeLogo: null,
    cityId: 0,
    city: "",
    country: "",
    countryId: 0,
  });

  const [preview, setPreview] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [countries, setCountries] = useState([]);
  const [cities, setCities] = useState([]);
  const [listsLoading, setListsLoading] = useState(false);
  const [initialDataLoaded, setInitialDataLoaded] = useState(false);

  useEffect(() => {
    document.title = t("editSellerProfileDocTitle");
  }, [t]);

  useEffect(() => {
    const link = document.querySelector("link[rel~='icon']");
    if (link) link.href = icon;
  }, []);

  const toImageSrc = (value) => {
    const raw = String(value || "").trim();

    if (!raw) return "";
    if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
    if (raw.startsWith("data:image/")) return raw;

    const cleaned = raw.replace(/\s/g, "");

    const looksLikeBase64 =
      /^[A-Za-z0-9+/=]+$/.test(cleaned) &&
      cleaned.length > 80 &&
      !cleaned.includes("{") &&
      !cleaned.includes("}");

    if (!looksLikeBase64) return "";

    return `data:image/png;base64,${cleaned}`;
  };

  const selectedCountryId = useMemo(
    () => Number(formData.countryId || 0),
    [formData.countryId]
  );

  useEffect(() => {
    let mounted = true;

    const loadData = async () => {
      try {
        setLoading(true);
        setListsLoading(true);
        setError("");

        let profileData = null;

        try {
          profileData = await getSellerBusinessAccount();
        } catch {
          profileData = await getSellerDisplayProfile();
        }

        const countriesData = await getCountries().catch(() => []);

        if (!mounted) return;

        setPreview(
          profileData?.image ||
            profileData?.storeLogo ||
            profileData?.logo ||
            ""
        );

        setCountries(Array.isArray(countriesData) ? countriesData : []);

        const currentCityId = Number(profileData?.cityId || 0);
        const currentCountryId = Number(profileData?.countryId || 0);

        if (currentCityId) {
          localStorage.setItem("sellerCityId", String(currentCityId));
        }

        if (currentCountryId) {
          localStorage.setItem("sellerCountryId", String(currentCountryId));
        }

        let citiesData = [];
        if (currentCountryId) {
          citiesData = await getCitiesByCountryId(currentCountryId).catch(
            () => []
          );
        }

        if (!mounted) return;

        setCities(Array.isArray(citiesData) ? citiesData : []);

        setFormData({
          storeName: profileData?.storeName || "",
          phoneNumber: profileData?.phoneNumber || "",
          description: profileData?.description || "",
          storeLogo: null,
          cityId: currentCityId,
          city: profileData?.city || profileData?.cityName || "",
          country: profileData?.country || profileData?.countryName || "",
          countryId: currentCountryId,
        });

        setInitialDataLoaded(true);
      } catch (err) {
        if (!mounted) return;
        setError(
          err?.response?.data?.message ||
            err?.message ||
            t("failedToLoadProfileData")
        );
      } finally {
        if (mounted) {
          setLoading(false);
          setListsLoading(false);
        }
      }
    };

    loadData();

    return () => {
      mounted = false;
    };
  }, [t]);

  useEffect(() => {
    let mounted = true;

    const loadCities = async () => {
      if (!initialDataLoaded) return;

      if (!selectedCountryId) {
        setCities([]);
        setFormData((prev) => ({
          ...prev,
          cityId: 0,
          city: "",
        }));
        return;
      }

      try {
        setListsLoading(true);
        const data = await getCitiesByCountryId(selectedCountryId);

        if (!mounted) return;

        const safeCities = Array.isArray(data) ? data : [];
        setCities(safeCities);

        const hasCurrentCity = safeCities.some(
          (item) => Number(item.id) === Number(formData.cityId || 0)
        );

        if (!hasCurrentCity) {
          setFormData((prev) => ({
            ...prev,
            cityId: 0,
            city: "",
          }));
        }
      } catch {
        if (!mounted) return;
        setCities([]);
      } finally {
        if (mounted) setListsLoading(false);
      }
    };

    loadCities();

    return () => {
      mounted = false;
    };
  }, [selectedCountryId, initialDataLoaded, formData.cityId]);

  const handleChange = (e) => {
    const { name, value, files } = e.target;

    if (name === "storeLogo") {
      const file = files?.[0] || null;

      setFormData((prev) => ({
        ...prev,
        storeLogo: file,
      }));

      if (file) {
        const reader = new FileReader();
        reader.onload = () => setPreview(reader.result);
        reader.readAsDataURL(file);
      }

      return;
    }

    if (name === "countryId") {
      const selectedId = Number(value || 0);
      const selectedCountry =
        countries.find((item) => Number(item.id) === selectedId)?.name || "";

      setFormData((prev) => ({
        ...prev,
        countryId: selectedId,
        country: selectedCountry,
        cityId: 0,
        city: "",
      }));

      return;
    }

    if (name === "cityId") {
      const selectedId = Number(value || 0);
      const selectedCity =
        cities.find((item) => Number(item.id) === selectedId)?.name || "";

      setFormData((prev) => ({
        ...prev,
        cityId: selectedId,
        city: selectedCity,
      }));

      return;
    }

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setSubmitLoading(true);
      setMessage("");
      setError("");

      if (!formData.countryId) {
        throw new Error(t("pleaseSelectCountry"));
      }

      if (!formData.cityId) {
        throw new Error(t("pleaseSelectCity"));
      }

      const res = await editSellerProfile({
        storeName: formData.storeName,
        phoneNumber: formData.phoneNumber,
        description: formData.description,
        storeLogo: formData.storeLogo,
        cityId: formData.cityId,
        countryId: formData.countryId,
      });

      localStorage.setItem("sellerCityId", String(formData.cityId));
      localStorage.setItem("sellerCountryId", String(formData.countryId));

      setMessage(res?.message || t("profileUpdatedSuccessfully"));

      setTimeout(() => {
        navigate("/seller-account");
      }, 800);
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          t("failedToUpdateProfile")
      );
    } finally {
      setSubmitLoading(false);
    }
  };

  return (
    <div className="seller-edit-account-page" dir={isArabic ? "rtl" : "ltr"}>
      <style>{`
        .seller-edit-account-page {
          min-height: 100vh;
          background: var(--seller-edit-bg, #f5f6fa);
          padding: 36px 0 70px;
          font-family: Arial, Helvetica, sans-serif;
          color: var(--seller-edit-text, #1f2937);
        }

        .seller-edit-account-page * {
          box-sizing: border-box;
        }

        .seller-edit-account-container {
          width: min(760px, 94%);
          margin: 0 auto;
        }

        .seller-edit-account-title {
          margin: 0 0 24px;
          color: var(--seller-edit-primary, #023E8A);
          font-size: 34px;
          font-weight: 900;
          text-align: center;
          text-transform: uppercase;
        }

        .seller-edit-account-form {
          width: 100%;
          background: transparent !important;
          border: none !important;
          box-shadow: none !important;
          padding: 0 !important;
        }

        .seller-edit-avatar-wrap {
          width: 128px;
          height: 128px;
          border-radius: 50%;
          overflow: hidden;
          margin: 0 auto 26px;
          background: var(--seller-edit-avatar-bg, #eef2f7);
          border: 3px solid var(--seller-edit-avatar-border, #ffffff);
          box-shadow: 0 8px 24px rgba(0,0,0,0.12);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .seller-edit-avatar-wrap img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
          border-radius: 50%;
        }

        .seller-edit-field {
          margin-bottom: 18px;
        }

        .seller-edit-label {
          display: block;
          margin-bottom: 8px;
          color: var(--seller-edit-primary, #023E8A);
          font-size: 15px;
          font-weight: 800;
        }

        .seller-edit-input {
          width: 100%;
          min-height: 52px;
          border-radius: 8px;
          border: 1px solid var(--seller-edit-input-border, #d5dce8);
          background: var(--seller-edit-input-bg, #ffffff);
          color: var(--seller-edit-input-text, #1f2937);
          padding: 12px 14px;
          font-size: 16px;
          outline: none;
        }

        .seller-edit-input:focus {
          border-color: var(--seller-edit-primary, #023E8A);
          box-shadow: 0 0 0 3px rgba(2, 62, 138, 0.1);
        }

        .seller-edit-textarea {
          min-height: 130px;
          resize: vertical;
        }

        .seller-edit-actions {
          display: flex;
          gap: 12px;
          margin-top: 24px;
        }

        .seller-edit-save,
        .seller-edit-cancel {
          flex: 1;
          min-height: 52px;
          border: none;
          border-radius: 10px;
          font-size: 16px;
          font-weight: 900;
          cursor: pointer;
        }

        .seller-edit-save {
          background: var(--seller-edit-primary, #023E8A);
          color: #fff;
        }

        .seller-edit-cancel {
          background: var(--seller-edit-cancel-bg, #eef2ff);
          color: var(--seller-edit-primary, #023E8A);
        }

        .seller-edit-save:disabled {
          opacity: 0.65;
          cursor: not-allowed;
        }

        [data-theme="dark"] .seller-edit-account-page,
        body.dark .seller-edit-account-page {
          --seller-edit-bg: #000;
          --seller-edit-text: #fff;
          --seller-edit-primary: #4da3ff;
          --seller-edit-input-bg: #000;
          --seller-edit-input-text: #fff;
          --seller-edit-input-border: #333;
          --seller-edit-cancel-bg: #111;
          --seller-edit-avatar-bg: #111;
          --seller-edit-avatar-border: #111;
        }

        @media (max-width: 600px) {
          .seller-edit-account-title {
            font-size: 28px;
          }

          .seller-edit-actions {
            flex-direction: column;
          }
        }
      `}</style>

      <div className="seller-edit-account-container">
        <h1 className="seller-edit-account-title">{t("editSellerProfile")}</h1>

        {loading ? (
          <div className="alert alert-info">{t("loading")}</div>
        ) : (
          <form className="seller-edit-account-form" onSubmit={handleSubmit}>
            {message ? <div className="alert alert-success">{message}</div> : null}
            {error ? <div className="alert alert-danger">{error}</div> : null}

            <div className="seller-edit-avatar-wrap">
              {toImageSrc(preview) ? (
                <img src={toImageSrc(preview)} alt={t("storeLogo")} />
              ) : (
                <i
                  className="fa-regular fa-image"
                  style={{
                    color: "#8a94a6",
                    fontSize: 36,
                  }}
                ></i>
              )}
            </div>

            <div className="seller-edit-field">
              <label className="seller-edit-label">{t("storeName")}</label>
              <input
                type="text"
                className="seller-edit-input"
                name="storeName"
                value={formData.storeName}
                onChange={handleChange}
                placeholder={t("enterStoreName")}
              />
            </div>

            <div className="seller-edit-field">
              <label className="seller-edit-label">{t("phoneNumber")}</label>
              <input
                type="text"
                className="seller-edit-input"
                name="phoneNumber"
                value={formData.phoneNumber}
                onChange={handleChange}
                placeholder={t("enterPhoneNumber")}
              />
            </div>

            <div className="seller-edit-field">
              <label className="seller-edit-label">{t("country")}</label>
              <select
                className="seller-edit-input"
                name="countryId"
                value={formData.countryId || ""}
                onChange={handleChange}
                disabled={listsLoading}
              >
                <option value="">{t("selectCountry")}</option>
                {countries.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="seller-edit-field">
              <label className="seller-edit-label">{t("city")}</label>
              <select
                className="seller-edit-input"
                name="cityId"
                value={formData.cityId || ""}
                onChange={handleChange}
                disabled={!formData.countryId || listsLoading}
              >
                <option value="">{t("selectCity")}</option>
                {cities.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="seller-edit-field">
              <label className="seller-edit-label">{t("description")}</label>
              <textarea
                className="seller-edit-input seller-edit-textarea"
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder={t("enterDescription")}
              />
            </div>

            <div className="seller-edit-field">
              <label className="seller-edit-label">{t("storeLogo")}</label>
              <input
                type="file"
                className="seller-edit-input"
                name="storeLogo"
                accept="image/*"
                onChange={handleChange}
              />
            </div>

            <div className="seller-edit-actions">
              <button
                type="submit"
                className="seller-edit-save"
                disabled={submitLoading}
              >
                {submitLoading ? t("saving") : t("saveChanges")}
              </button>

              <button
                type="button"
                className="seller-edit-cancel"
                onClick={() => navigate(-1)}
              >
                {t("cancel")}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}