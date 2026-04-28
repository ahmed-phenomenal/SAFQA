import React, { useEffect, useMemo, useState } from "react";
import icon from "../../assets/2.png";
import {
  editUserAccount,
  getUserAccount,
  getUserCitiesByCountryId,
  getUserCountries,
} from "../../API/userProfile";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

export default function Account_edit() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === "ar";

  const [formData, setFormData] = useState({
    fullName: "",
    phoneNumber: "",
    gender: 0,
    birthDate: "",
    cityId: 0,
    city: "",
    country: "",
    countryId: 0,
    image: null,
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
    document.title = t("editAccountDocTitle", "Edit Account");
  }, [t]);

  useEffect(() => {
    const link = document.querySelector("link[rel~='icon']");
    if (link) link.href = icon;
  }, []);

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

        const [profileData, countriesData] = await Promise.all([
          getUserAccount(),
          getUserCountries().catch(() => []),
        ]);

        if (!mounted) return;

        setPreview(profileData?.imageSrc || "");
        setCountries(Array.isArray(countriesData) ? countriesData : []);

        const currentCityId = Number(profileData?.cityId || 0);
        const currentCountryId = Number(profileData?.countryId || 0);

        let citiesData = [];
        if (currentCountryId) {
          citiesData = await getUserCitiesByCountryId(currentCountryId).catch(
            () => []
          );
        }

        if (!mounted) return;

        setCities(Array.isArray(citiesData) ? citiesData : []);

        setFormData({
          fullName: profileData?.fullName || "",
          phoneNumber: profileData?.phoneNumber || "",
          gender: Number(profileData?.genderValue || 0),
          birthDate: profileData?.birthDate || "",
          cityId: currentCityId,
          city: profileData?.city || "",
          country: profileData?.country || "",
          countryId: currentCountryId,
          image: null,
        });

        setInitialDataLoaded(true);
      } catch (err) {
        if (!mounted) return;

        setError(
          err?.response?.data?.message ||
            err?.message ||
            t("failedToLoadAccountData", "Failed to load account data.")
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
        const data = await getUserCitiesByCountryId(selectedCountryId);

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

    if (name === "image") {
      const file = files?.[0] || null;
      setFormData((prev) => ({
        ...prev,
        image: file,
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
      [name]: name === "gender" ? Number(value || 0) : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setSubmitLoading(true);
      setMessage("");
      setError("");

      if (!formData.fullName.trim()) {
        throw new Error(t("pleaseEnterFullName", "Please enter full name"));
      }

      if (!formData.phoneNumber.trim()) {
        throw new Error(t("pleaseEnterPhoneNumber", "Please enter phone number"));
      }

      if (!formData.gender) {
        throw new Error(t("pleaseSelectGender", "Please select gender"));
      }

      if (!formData.birthDate) {
        throw new Error(t("pleaseSelectBirthDate", "Please select birth date"));
      }

      if (!formData.cityId) {
        throw new Error(t("pleaseSelectCity", "Please select city"));
      }

      const res = await editUserAccount({
        fullName: formData.fullName,
        phoneNumber: formData.phoneNumber,
        gender: formData.gender,
        birthDate: formData.birthDate,
        cityId: formData.cityId,
        image: formData.image,
      });

      setMessage(
        res?.message || t("accountUpdatedSuccessfully", "Account updated successfully")
      );

      setTimeout(() => {
        navigate("/account");
      }, 800);
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          t("failedToUpdateAccount", "Failed to update account.")
      );
    } finally {
      setSubmitLoading(false);
    }
  };

  return (
    <div className="account py-3" dir={isArabic ? "rtl" : "ltr"}>
      <div className="container" style={{ maxWidth: 700 }}>
        <h1>{t("editAccountTitle", "Edit Account")}</h1>

        {loading ? (
          <div className="alert alert-info">{t("loading", "Loading...")}</div>
        ) : (
          <form onSubmit={handleSubmit}>
            {message ? <div className="alert alert-success">{message}</div> : null}
            {error ? <div className="alert alert-danger">{error}</div> : null}

            <div className="mb-3 text-center">
              {preview ? (
                <img
                  src={preview}
                  alt={t("profileImage", "profile")}
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
                  <i className="fa-regular fa-user"></i>
                </div>
              )}
            </div>

            <div className="mb-4">
              <label className="form-label">{t("profileImage", "Profile Image")}</label>
              <input
                type="file"
                className="form-control"
                name="image"
                accept="image/*"
                onChange={handleChange}
              />
            </div>

            <div className="mb-3">
              <label className="form-label">{t("fullName", "Full Name")}</label>
              <input
                type="text"
                className="form-control"
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                placeholder={t("enterFullName", "Enter full name")}
              />
            </div>

            <div className="mb-3">
              <label className="form-label">{t("phoneNumber", "Phone Number")}</label>
              <input
                type="text"
                className="form-control"
                name="phoneNumber"
                value={formData.phoneNumber}
                onChange={handleChange}
                placeholder={t("enterPhoneNumber", "Enter phone number")}
              />
            </div>

            <div className="mb-3">
              <label className="form-label">{t("gender", "Gender")}</label>
              <select
                className="form-control"
                name="gender"
                value={formData.gender || ""}
                onChange={handleChange}
              >
                <option value="">{t("selectGender", "Select gender")}</option>
                <option value={1}>{t("male", "Male")}</option>
                <option value={2}>{t("female", "Female")}</option>
              </select>
            </div>

            <div className="mb-3">
              <label className="form-label">{t("birthDate", "Birth Date")}</label>
              <input
                type="date"
                className="form-control"
                name="birthDate"
                value={formData.birthDate}
                onChange={handleChange}
              />
            </div>

            <div className="mb-3">
              <label className="form-label">{t("country", "Country")}</label>
              <select
                className="form-control"
                name="countryId"
                value={formData.countryId || ""}
                onChange={handleChange}
                disabled={listsLoading}
              >
                <option value="">{t("selectCountry", "Select country")}</option>
                {countries.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="mb-4">
              <label className="form-label">{t("city", "City")}</label>
              <select
                className="form-control"
                name="cityId"
                value={formData.cityId || ""}
                onChange={handleChange}
                disabled={!formData.countryId || listsLoading}
              >
                <option value="">{t("selectCity", "Select city")}</option>
                {cities.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: "flex", gap: 12 }}>
              <button type="submit" className="btn btn-primary" disabled={submitLoading}>
                {submitLoading ? t("saving", "Saving...") : t("saveChanges", "Save Changes")}
              </button>

              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={() => navigate(-1)}
              >
                {t("cancel", "Cancel")}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}