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

    const looksLikeBase64 =
      /^[A-Za-z0-9+/=\s]+$/.test(raw) && !raw.includes("{") && !raw.includes("}");

    if (!looksLikeBase64) return "";

    return `data:image/png;base64,${raw.replace(/\s/g, "")}`;
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
          citiesData = await getCitiesByCountryId(currentCountryId).catch(() => []);
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
    <div className="account py-3" dir={isArabic ? "rtl" : "ltr"}>
      <div className="container" style={{ maxWidth: 700 }}>
        <h1>{t("editSellerProfile")}</h1>

        {loading ? (
          <div className="alert alert-info">{t("loading")}</div>
        ) : (
          <form onSubmit={handleSubmit}>
            {message ? <div className="alert alert-success">{message}</div> : null}
            {error ? <div className="alert alert-danger">{error}</div> : null}

            <div className="mb-3 text-center">
              {toImageSrc(preview) ? (
                <img
                  src={toImageSrc(preview)}
                  alt={t("storeLogo")}
                  style={{
                    width: 110,
                    height: 110,
                    borderRadius: "50%",
                    objectFit: "cover",
                    border: "1px solid #e5e7eb",
                  }}
                />
              ) : (
                <div
                  style={{
                    width: 110,
                    height: 110,
                    borderRadius: "50%",
                    margin: "0 auto",
                    background: "#eef2f7",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#8a94a6",
                    fontSize: 32,
                  }}
                >
                  <i className="fa-regular fa-image"></i>
                </div>
              )}
            </div>

            <div className="mb-3">
              <label className="form-label">{t("storeName")}</label>
              <input
                type="text"
                className="form-control"
                name="storeName"
                value={formData.storeName}
                onChange={handleChange}
                placeholder={t("enterStoreName")}
              />
            </div>

            <div className="mb-3">
              <label className="form-label">{t("phoneNumber")}</label>
              <input
                type="text"
                className="form-control"
                name="phoneNumber"
                value={formData.phoneNumber}
                onChange={handleChange}
                placeholder={t("enterPhoneNumber")}
              />
            </div>

            <div className="mb-3">
              <label className="form-label">{t("country")}</label>
              <select
                className="form-control"
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

            <div className="mb-3">
              <label className="form-label">{t("city")}</label>
              <select
                className="form-control"
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

            <div className="mb-3">
              <label className="form-label">{t("description")}</label>
              <textarea
                className="form-control"
                name="description"
                rows="4"
                value={formData.description}
                onChange={handleChange}
                placeholder={t("enterDescription")}
              ></textarea>
            </div>

            <div className="mb-4">
              <label className="form-label">{t("storeLogo")}</label>
              <input
                type="file"
                className="form-control"
                name="storeLogo"
                accept="image/*"
                onChange={handleChange}
              />
            </div>

            <div style={{ display: "flex", gap: 12 }}>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={submitLoading}
              >
                {submitLoading ? t("saving") : t("saveChanges")}
              </button>

              <button
                type="button"
                className="btn btn-outline-secondary"
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