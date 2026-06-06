import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import icon from "../../../assets/2.png";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useTranslatedApiData } from "../../../Hooks/useTranslatedApiData";
import { useAutoTranslatedText } from "../../../Hooks/useAutoTranslatedText";
import {
  createSeller,
  personalVerification,
  businessVerification,
  getCountries,
  getCitiesByCountryId,
} from "../../../API/seller";
import { getNotifications } from "../../../API/Seller_Notifications";

const ALLOWED_IMAGE_FILE_TYPES = ["image/png", "image/jpeg", "image/jpg"];
const MAX_FILE_SIZE_MB = 5;
const DEFAULT_BUSINESS_TYPE = 2;
const MAX_INT_32 = 2147483647;

/* ─── Account-scoped draft key helpers ──────────────────────────── */
const getCurrentAccountKey = () => {
  return String(
    localStorage.getItem("currentUserEmail") ||
      localStorage.getItem("pendingEmail") ||
      sessionStorage.getItem("currentUserEmail") ||
      sessionStorage.getItem("pendingEmail") ||
      "guest"
  )
    .trim()
    .toLowerCase();
};

const getScopedDraftKey = (name) =>
  `seller_verification_draft:${getCurrentAccountKey()}:${name}`;

const getDigitsOnly = (value) => String(value || "").replace(/\D/g, "");

const isValidPhoneNumber = (value) => {
  const digits = getDigitsOnly(value);
  return digits.length >= 8 && digits.length <= 15;
};

/* ─── Draft helpers ─────────────────────────────────────────────── */
const saveDraft = (draft) => {
  try {
    localStorage.setItem(
      getScopedDraftKey("payload"),
      JSON.stringify({ draft })
    );
  } catch {
    //
  }
};

const readDraft = () => {
  try {
    const raw = localStorage.getItem(getScopedDraftKey("payload"));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed.draft || null;
  } catch {
    return null;
  }
};

const clearDraft = () => {
  try {
    localStorage.removeItem(getScopedDraftKey("payload"));
  } catch {
    //
  }
};

/* ─── File → base64 data URL ────────────────────────────────────── */
const fileToBase64 = (file) =>
  new Promise((resolve, reject) => {
    if (!file) { resolve(null); return; }
    if (typeof file === "string") { resolve(file); return; }
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });

/* ─── base64 data URL → File object ────────────────────────────── */
const base64ToFile = (dataUrl, filename) => {
  try {
    if (!dataUrl || typeof dataUrl !== "string") return null;
    const [header, data] = dataUrl.split(",");
    if (!data) return null;
    const mime = header.match(/:(.*?);/)?.[1] || "image/png";
    const binary = atob(data);
    const array = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) array[i] = binary.charCodeAt(i);
    return new File([array], filename, { type: mime });
  } catch {
    return null;
  }
};

/* ─── File storage helpers ──────────────────────────────────────── */
const saveFileToStorage = async (key, file) => {
  if (!file) return;
  try {
    const b64 = await fileToBase64(file);
    if (b64) localStorage.setItem(getScopedDraftKey(key), b64);
  } catch {
    //
  }
};

const loadFileFromStorage = (key, filename) => {
  try {
    const b64 = localStorage.getItem(getScopedDraftKey(key));
    if (!b64) return null;
    return base64ToFile(b64, filename);
  } catch {
    return null;
  }
};

const clearFileFromStorage = (key) => {
  try {
    localStorage.removeItem(getScopedDraftKey(key));
  } catch {
    //
  }
};

const FILE_KEYS = {
  sellerLogo: "file_sellerLogo",
  nationalIdFront: "file_nationalIdFront",
  nationalIdBack: "file_nationalIdBack",
  selfieWithId: "file_selfieWithId",
  commercialRegistration: "file_commercialRegistration",
  taxId: "file_taxId",
  ownerNationalIdFront: "file_ownerNationalIdFront",
  ownerNationalIdBack: "file_ownerNationalIdBack",
};

const clearAllFilesFromStorage = () => {
  Object.values(FILE_KEYS).forEach(clearFileFromStorage);
};

/* ─── Notifications gate ─────────────────────────────────────────
   Same logic as SellerProfile: 200 = verified, 403/401 = not verified.
   Any other error (network etc.) → assume not verified so we don't
   accidentally block a real first-time submission.
─────────────────────────────────────────────────────────────────── */
const checkIsVerifiedViaNotifications = async () => {
  try {
    await getNotifications();
    return true; // 200 → verified
  } catch (err) {
    const status = Number(err?.response?.status || 0);
    if (status === 403 || status === 401) return false; // explicitly not verified
    // Network/server error → don't treat as verified, let submission proceed
    return false;
  }
};

/* ─── looksSuccessful helper ────────────────────────────────────── */
const looksSuccessful = (data) => {
  const raw =
    data?.isSuccess ??
    data?.IsSuccess ??
    data?.success ??
    data?.Success ??
    data?.status ??
    data?.Status;

  if (raw === true || raw === "true" || raw === 1 || raw === "1") return true;

  if (typeof raw === "string") {
    const normalized = raw.trim().toLowerCase();
    if (
      ["ok", "success", "done", "completed", "created", "accepted", "submitted"].includes(
        normalized
      )
    ) {
      return true;
    }
  }

  return false;
};

export default function Verification() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const pageMode = location?.state?.mode || "verify";

  const [favicon] = useState(icon);
  const [apiLoading, setApiLoading] = useState(false);
  const [generalError, setGeneralError] = useState("");
  const [generalSuccess, setGeneralSuccess] = useState("");

  const { translatedText: translatedGeneralError } =
    useAutoTranslatedText(generalError);
  const { translatedText: translatedGeneralSuccess } =
    useAutoTranslatedText(generalSuccess);

  const cachedDraft = readDraft();

  const [countries, setCountries] = useState([]);
  const [cities, setCities] = useState([]);
  const [countriesLoading, setCountriesLoading] = useState(false);
  const [citiesLoading, setCitiesLoading] = useState(false);

  const { translatedData: translatedCountries } = useTranslatedApiData(countries);
  const { translatedData: translatedCities } = useTranslatedApiData(cities);

  const displayCountries = Array.isArray(translatedCountries)
    ? translatedCountries
    : countries;
  const displayCities = Array.isArray(translatedCities) ? translatedCities : cities;

  const [currentStep, setCurrentStep] = useState(
    Number(cachedDraft?.currentStep || 0)
  );

  /* ─── Form state ─── */
  const [formData, setFormData] = useState({
    sellerName: cachedDraft?.sellerName || "",
    sellerNumber: cachedDraft?.sellerNumber || "",
    sellerCountry: cachedDraft?.sellerCountry || "",
    sellerCountryId: cachedDraft?.sellerCountryId || "",
    sellerCity: cachedDraft?.sellerCity || "",
    sellerCityId: cachedDraft?.sellerCityId || "",
    sellerLogo: null,
    sellerDescription: cachedDraft?.sellerDescription || "",
    nationalIdFront: null,
    nationalIdBack: null,
    selfieWithId: null,
    commercialRegistration: null,
    taxId: null,
    ownerNationalIdFront: null,
    ownerNationalIdBack: null,
    instaPayNumber: cachedDraft?.instaPayNumber || "",
    bankName: cachedDraft?.bankName || "",
    accountHolderName: cachedDraft?.accountHolderName || "",
    iban: cachedDraft?.iban || "",
    localAccountNumber: cachedDraft?.localAccountNumber || "",
  });

  /* ─── Restore saved files on mount ─── */
  useEffect(() => {
    const restored = {};
    for (const [field, storageKey] of Object.entries(FILE_KEYS)) {
      const file = loadFileFromStorage(storageKey, field);
      if (file) restored[field] = file;
    }
    if (Object.keys(restored).length > 0) {
      setFormData((prev) => ({ ...prev, ...restored }));
    }
  }, []);

  const [errors, setErrors] = useState({});

  const steps = useMemo(
    () => [
      t("sellerInformation"),
      t("identityVerification"),
      t("businessVerification"),
    ],
    [t]
  );

  /* ─── Friendly API error messages ─── */
  const getFriendlyApiError = (error, fallbackMessage) => {
    const status = Number(error?.response?.status || 0);
    const backendMessage =
      error?.response?.data?.message ||
      error?.response?.data?.Message ||
      error?.response?.data?.errors?.[0] ||
      error?.message ||
      "";

    const message = String(backendMessage || "").trim();
    const looksLikeRawStatus =
      /^request failed with status code/i.test(message) ||
      /^network error/i.test(message) ||
      /^something went wrong$/i.test(message);

    if (status === 401) return t("sessionExpired");

    if (status === 403) {
      if (message && !looksLikeRawStatus) return message;
      return fallbackMessage;
    }

    if (status === 409) {
      const stepFailed = error?.__step ?? currentStep;
      if (stepFailed === 0) return t("sellerInfoSaved");
      if (stepFailed === 1) return t("identityUploaded");
      if (stepFailed === 2) return t("businessSubmitted");
      return message || t("stepAlreadyExists");
    }

    if (status === 500) return message || fallbackMessage;
    if (looksLikeRawStatus || !message) return fallbackMessage;

    return message;
  };

  useEffect(() => {
    document.title = t("verificationDocTitle");
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
    if (pageMode === "review") {
      setCurrentStep(0);
      setGeneralError("");
      setGeneralSuccess("");
    }
  }, [pageMode]);

  /* ─── Save text/scalar draft on change ─── */
  useEffect(() => {
    saveDraft({
      currentStep,
      sellerName: formData.sellerName,
      sellerNumber: formData.sellerNumber,
      sellerCountry: formData.sellerCountry,
      sellerCountryId: formData.sellerCountryId,
      sellerCity: formData.sellerCity,
      sellerCityId: formData.sellerCityId,
      sellerDescription: formData.sellerDescription,
      instaPayNumber: formData.instaPayNumber,
      bankName: formData.bankName,
      accountHolderName: formData.accountHolderName,
      iban: formData.iban,
      localAccountNumber: formData.localAccountNumber,
    });
  }, [formData, currentStep]);

  /* ─── Load countries on mount ─── */
  useEffect(() => {
    const loadCountries = async () => {
      try {
        setCountriesLoading(true);
        const data = await getCountries();
        const normalized = Array.isArray(data) ? data : [];
        setCountries(normalized);
        if (formData.sellerCountryId) {
          const selectedCountry = normalized.find(
            (item) => String(item.id) === String(formData.sellerCountryId)
          );
          if (selectedCountry) {
            setFormData((prev) => ({
              ...prev,
              sellerCountry: selectedCountry.name || prev.sellerCountry,
            }));
          }
        }
      } catch {
        setCountries([]);
      } finally {
        setCountriesLoading(false);
      }
    };
    loadCountries();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ─── Load cities when country changes ─── */
  useEffect(() => {
    const loadCities = async () => {
      const countryId = Number(formData.sellerCountryId || 0);
      if (!countryId) { setCities([]); return; }
      try {
        setCitiesLoading(true);
        const data = await getCitiesByCountryId(countryId);
        const normalized = Array.isArray(data) ? data : [];
        setCities(normalized);
        if (formData.sellerCityId) {
          const selectedCity = normalized.find(
            (item) => String(item.id) === String(formData.sellerCityId)
          );
          if (selectedCity) {
            setFormData((prev) => ({
              ...prev,
              sellerCity: selectedCity.name || prev.sellerCity,
            }));
          } else {
            setFormData((prev) => ({
              ...prev,
              sellerCityId: "",
              sellerCity: "",
            }));
          }
        }
      } catch {
        setCities([]);
      } finally {
        setCitiesLoading(false);
      }
    };
    loadCities();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.sellerCountryId]);

  const clearStepVisuals = () => {
    setGeneralError("");
    setGeneralSuccess("");
  };

  /* ─── File validation ─── */
  const validateFile = (file) => {
    if (!file) return "";
    const fileName = String(file?.name || "").toLowerCase();
    const hasValidExtension =
      fileName.endsWith(".png") ||
      fileName.endsWith(".jpg") ||
      fileName.endsWith(".jpeg");
    const hasValidMimeType = ALLOWED_IMAGE_FILE_TYPES.includes(
      String(file?.type || "").toLowerCase()
    );
    if (!hasValidMimeType && !hasValidExtension) return t("onlyPngJpeg");
    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024)
      return t("maxFileSize", { size: MAX_FILE_SIZE_MB });
    return "";
  };

  /* ─── Map backend field errors ─── */
  const applyBackendFieldErrors = (error, stepIndex) => {
    const backendErrors = error?.response?.data?.errors;
    if (!backendErrors || typeof backendErrors !== "object") return false;

    const nextErrors = {};
    const assign = (targetKey, message) => {
      if (!targetKey || !message || nextErrors[targetKey]) return;
      nextErrors[targetKey] = message;
    };
    const pickMessage = (value) => {
      if (Array.isArray(value)) return String(value.find(Boolean) || "").trim();
      return String(value || "").trim();
    };

    Object.entries(backendErrors).forEach(([rawKey, rawValue]) => {
      const key = String(rawKey || "").toLowerCase().trim();
      const message = pickMessage(rawValue);
      if (!message) return;

      if (stepIndex === 0) {
        if (["storename", "sellername", "name"].includes(key)) assign("sellerName", message);
        else if (["phonenumber", "sellernumber", "phone", "mobile"].includes(key)) assign("sellerNumber", message);
        else if (["countryid", "sellercountry", "sellercountryid"].includes(key)) assign("sellerCountry", message);
        else if (["cityid", "sellercity", "sellercityid"].includes(key)) assign("sellerCity", message);
        else if (["description", "sellerdescription"].includes(key)) assign("sellerDescription", message);
        else if (["logo", "sellerlogo"].includes(key)) assign("sellerLogo", message);
      }
      if (stepIndex === 1) {
        if (["nationalidfront"].includes(key)) assign("nationalIdFront", message);
        else if (["nationalidback"].includes(key)) assign("nationalIdBack", message);
        else if (["selfiewithid"].includes(key)) assign("selfieWithId", message);
      }
      if (stepIndex === 2) {
        if (["commercialregister", "commercialregistration"].includes(key)) assign("commercialRegistration", message);
        else if (["taxid"].includes(key)) assign("taxId", message);
        else if (["ownernationalidfront"].includes(key)) assign("ownerNationalIdFront", message);
        else if (["ownernationalidback"].includes(key)) assign("ownerNationalIdBack", message);
        else if (["instapaynumber"].includes(key)) assign("instaPayNumber", message);
        else if (["bankname"].includes(key)) assign("bankName", message);
        else if (["accountname", "accountholdername"].includes(key)) assign("accountHolderName", message);
        else if (["iban"].includes(key)) assign("iban", message);
        else if (["localaccountnumber"].includes(key)) assign("localAccountNumber", message);
      }
    });

    if (!Object.keys(nextErrors).length) return false;
    setErrors((prev) => ({ ...prev, ...nextErrors }));
    setGeneralError("");
    return true;
  };

  /* ─── Input handlers ─── */
  const handleChange = (e) => {
    const { name, value } = e.target;
    clearStepVisuals();
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const handleDigitsInputChange = (e, fieldName) => {
    const digits = getDigitsOnly(e.target.value);
    clearStepVisuals();
    setFormData((prev) => ({ ...prev, [fieldName]: digits }));
    setErrors((prev) => ({ ...prev, [fieldName]: "" }));
  };

  const handleCountryChange = (e) => {
    const selectedId = String(e.target.value || "");
    const selectedCountry = countries.find((item) => String(item.id) === selectedId);
    clearStepVisuals();
    setFormData((prev) => ({
      ...prev,
      sellerCountryId: selectedId,
      sellerCountry: selectedCountry?.name || "",
      sellerCityId: "",
      sellerCity: "",
    }));
    setErrors((prev) => ({ ...prev, sellerCountry: "", sellerCity: "" }));
  };

  const handleCityChange = (e) => {
    const selectedId = String(e.target.value || "");
    const selectedCity = cities.find((item) => String(item.id) === selectedId);
    clearStepVisuals();
    setFormData((prev) => ({
      ...prev,
      sellerCityId: selectedId,
      sellerCity: selectedCity?.name || "",
    }));
    setErrors((prev) => ({ ...prev, sellerCity: "" }));
  };

  const handleFileChange = async (e, fieldName) => {
    const file = e.target.files?.[0];
    clearStepVisuals();
    const fileError = validateFile(file);
    if (fileError) {
      setErrors((prev) => ({ ...prev, [fieldName]: fileError }));
      setFormData((prev) => ({ ...prev, [fieldName]: null }));
      return;
    }
    setFormData((prev) => ({ ...prev, [fieldName]: file || null }));
    setErrors((prev) => ({ ...prev, [fieldName]: "" }));
    if (file && FILE_KEYS[fieldName]) {
      await saveFileToStorage(FILE_KEYS[fieldName], file);
    }
  };

  /* ─── Per-step validation ─── */
  const validateStep = () => {
    const newErrors = {};

    if (currentStep === 0) {
      const phoneDigits = getDigitsOnly(formData.sellerNumber);
      if (!formData.sellerName.trim()) newErrors.sellerName = t("storeNameRequired");
      if (!phoneDigits) newErrors.sellerNumber = t("phoneRequired");
      else if (!isValidPhoneNumber(phoneDigits)) newErrors.sellerNumber = t("phoneInvalid");
      if (!formData.sellerCountryId) newErrors.sellerCountry = t("countryRequired");
      if (!formData.sellerCityId) newErrors.sellerCity = t("cityRequired");
      if (!formData.sellerDescription.trim()) newErrors.sellerDescription = t("descriptionRequired");
      else if (formData.sellerDescription.length > 650) newErrors.sellerDescription = t("descriptionMax650");
      if (formData.sellerLogo) {
        const logoError = validateFile(formData.sellerLogo);
        if (logoError) newErrors.sellerLogo = logoError;
      }
    }

    if (currentStep === 1) {
      if (!formData.nationalIdFront) newErrors.nationalIdFront = t("nationalFrontRequired");
      if (!formData.nationalIdBack) newErrors.nationalIdBack = t("nationalBackRequired");
      if (!formData.selfieWithId) newErrors.selfieWithId = t("selfieRequired");
      if (formData.nationalIdFront) {
        const err = validateFile(formData.nationalIdFront);
        if (err) newErrors.nationalIdFront = err;
      }
      if (formData.nationalIdBack) {
        const err = validateFile(formData.nationalIdBack);
        if (err) newErrors.nationalIdBack = err;
      }
      if (formData.selfieWithId) {
        const err = validateFile(formData.selfieWithId);
        if (err) newErrors.selfieWithId = err;
      }
    }

    if (currentStep === 2) {
      if (!formData.commercialRegistration) newErrors.commercialRegistration = t("commercialRegisterRequired");
      if (!formData.taxId) newErrors.taxId = t("taxIdRequired");
      if (!formData.ownerNationalIdFront) newErrors.ownerNationalIdFront = t("ownerFrontRequired");
      if (!formData.ownerNationalIdBack) newErrors.ownerNationalIdBack = t("ownerBackRequired");
      if (!formData.bankName.trim()) newErrors.bankName = t("bankNameRequired");
      if (!formData.accountHolderName.trim()) newErrors.accountHolderName = t("accountNameRequired");
      if (!formData.iban.trim()) newErrors.iban = t("ibanRequired");
      if (formData.commercialRegistration) {
        const err = validateFile(formData.commercialRegistration);
        if (err) newErrors.commercialRegistration = err;
      }
      if (formData.taxId) {
        const err = validateFile(formData.taxId);
        if (err) newErrors.taxId = err;
      }
      if (formData.ownerNationalIdFront) {
        const err = validateFile(formData.ownerNationalIdFront);
        if (err) newErrors.ownerNationalIdFront = err;
      }
      if (formData.ownerNationalIdBack) {
        const err = validateFile(formData.ownerNationalIdBack);
        if (err) newErrors.ownerNationalIdBack = err;
      }
      const instaPayDigits = getDigitsOnly(formData.instaPayNumber);
      if (instaPayDigits) {
        const instaPayAsNumber = Number(instaPayDigits);
        if (!Number.isFinite(instaPayAsNumber) || instaPayAsNumber > MAX_INT_32) {
          newErrors.instaPayNumber = t("instaPayInvalid");
        }
      }
    }

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) {
      setGeneralError("");
      setGeneralSuccess("");
    }
    return Object.keys(newErrors).length === 0;
  };

  /* ─── Submit all 3 steps ─────────────────────────────────────────
     NOTIFICATIONS GATE PATTERN (same as SellerProfile):
     
     Before every API call that might fail with 403, we first check
     getNotifications(). If it returns 200, the seller is already
     fully verified — we treat the whole flow as complete and navigate
     to /seller immediately without hitting personal-verification or
     business-verification at all.

     Flow:
     1. Check notifications → if 200, already verified → done ✅
     2. Call createSeller:
        - 200/201 → success, continue
        - 409     → already exists, check notifications again:
                    if 200 → already verified → done ✅
                    if 403 → seller exists but not verified → continue to step 2
     3. Call personalVerification (tokens re-read fresh from storage)
        - 200/201 → success, continue
        - 409     → already uploaded → continue
        - 403     → check notifications: if 200 → done ✅, else rethrow
     4. Call businessVerification (tokens re-read fresh)
        - 200/201/409 → success → done ✅
  ─────────────────────────────────────────────────────────────────── */
  const submitAllToBackend = async () => {
    /* ── Pre-flight: notifications gate check ── */
    const alreadyVerifiedAtStart = await checkIsVerifiedViaNotifications();
    if (alreadyVerifiedAtStart) {
      return { alreadyVerified: true };
    }

    /* ── STEP 1: Create Seller ── */
    const step1Payload = {
      StoreName: formData.sellerName.trim(),
      PhoneNumber: getDigitsOnly(formData.sellerNumber),
      CityId: Number(formData.sellerCityId),
      BusinessType: DEFAULT_BUSINESS_TYPE,
      Description: formData.sellerDescription.trim(),
      Logo: formData.sellerLogo || undefined,
    };

    let step1Data;
    try {
      step1Data = await createSeller(step1Payload);
    } catch (error) {
      const status = Number(error?.response?.status || 0);
      // 409 = seller already exists — check if also already verified
      if (status === 409) {
        const verifiedAfter409 = await checkIsVerifiedViaNotifications();
        if (verifiedAfter409) return { alreadyVerified: true };
        // Not verified yet — treat as step 1 success and continue
        step1Data = {
          ...(error?.response?.data || {}),
          alreadyExists: true,
          isSuccess: true,
        };
      } else {
        throw Object.assign(error, { __step: 0 });
      }
    }

    const step1Success =
      step1Data?.alreadyExists === true ||
      looksSuccessful(step1Data) ||
      Number(step1Data?.sellerId || 0) > 0;

    if (!step1Success) {
      throw Object.assign(
        new Error(step1Data?.message || step1Data?.errors?.[0] || "Create seller failed"),
        { __step: 0 }
      );
    }

    /* ── STEP 2: Personal Verification ──
       Tokens are re-read fresh inside personalVerification() — the
       sellerToken written by createSeller is now in storage.
       If we get 403, check notifications before giving up: the seller
       may have been verified via another session between step 1 and 2.
    ── */
    const personalFormData = new FormData();
    if (formData.nationalIdFront instanceof File)
      personalFormData.append("NationalIdFront", formData.nationalIdFront);
    if (formData.nationalIdBack instanceof File)
      personalFormData.append("NationalIdBack", formData.nationalIdBack);
    if (formData.selfieWithId instanceof File)
      personalFormData.append("SelfieWithId", formData.selfieWithId);

    let step2Data;
    try {
      step2Data = await personalVerification(personalFormData);
    } catch (error) {
      const status = Number(error?.response?.status || 0);
      if (status === 403 || status === 401) {
        // Before treating this as a hard failure, check if already verified
        const verifiedAfterPersonal403 = await checkIsVerifiedViaNotifications();
        if (verifiedAfterPersonal403) return { alreadyVerified: true };
      }
      throw Object.assign(error, { __step: 1 });
    }

    const step2Success =
      step2Data?.alreadyExists === true ||
      looksSuccessful(step2Data);

    if (!step2Success) {
      throw Object.assign(
        new Error(step2Data?.message || step2Data?.errors?.[0] || "Personal verification failed"),
        { __step: 1 }
      );
    }

    /* ── STEP 3: Business Verification ── */
    const step3Payload = {
      CommercialRegister:
        formData.commercialRegistration instanceof File
          ? formData.commercialRegistration
          : null,
      TaxId: formData.taxId instanceof File ? formData.taxId : null,
      OwnerNationalIdFront:
        formData.ownerNationalIdFront instanceof File
          ? formData.ownerNationalIdFront
          : null,
      OwnerNationalIdBack:
        formData.ownerNationalIdBack instanceof File
          ? formData.ownerNationalIdBack
          : null,
      BankName: formData.bankName.trim(),
      AccountName: formData.accountHolderName.trim(),
      IBAN: formData.iban.trim(),
      LocalAccountNumber: getDigitsOnly(formData.localAccountNumber),
      instaPayNumber: getDigitsOnly(formData.instaPayNumber),
    };

    let step3Data;
    try {
      step3Data = await businessVerification(step3Payload);
    } catch (error) {
      const status = Number(error?.response?.status || 0);
      if (status === 403 || status === 401) {
        const verifiedAfterBusiness403 = await checkIsVerifiedViaNotifications();
        if (verifiedAfterBusiness403) return { alreadyVerified: true };
      }
      throw Object.assign(error, { __step: 2 });
    }

    const step3Success =
      step3Data?.alreadyExists === true ||
      looksSuccessful(step3Data);

    if (!step3Success) {
      throw Object.assign(
        new Error(step3Data?.message || step3Data?.errors?.[0] || "Business verification failed"),
        { __step: 2 }
      );
    }

    return { step1Data, step2Data, step3Data };
  };

  /* ─── Next button handler ─── */
  const handleNext = async () => {
    clearStepVisuals();
    setErrors({});

    const isValid = validateStep();
    if (!isValid) return;

    if (currentStep === 0) { setCurrentStep(1); return; }
    if (currentStep === 1) { setCurrentStep(2); return; }

    /* Step 2 (final) — submit everything */
    if (currentStep === 2) {
      try {
        setApiLoading(true);

        const result = await submitAllToBackend();

        clearDraft();
        clearAllFilesFromStorage();

        // Whether already verified or just submitted, show success and go home
        setGeneralSuccess(t("businessSubmitted"));
        setTimeout(() => {
          navigate("/seller", { replace: true });
        }, 800);
      } catch (error) {
        const stepFailed = error?.__step ?? 2;
        const status = Number(error?.response?.status || 0);

        if (status === 409) {
          clearDraft();
          clearAllFilesFromStorage();
          setGeneralSuccess(t("businessSubmitted"));
          setTimeout(() => {
            navigate("/seller", { replace: true });
          }, 800);
          return;
        }

        const hasMappedFieldErrors = applyBackendFieldErrors(error, stepFailed);
        if (hasMappedFieldErrors) {
          setCurrentStep(stepFailed);
          setGeneralError("");
          return;
        }

        if (stepFailed === 0) {
          setGeneralError(getFriendlyApiError(error, t("saveSellerFailed")));
          setCurrentStep(0);
        } else if (stepFailed === 1) {
          setGeneralError(getFriendlyApiError(error, t("uploadIdentityFailed")));
          setCurrentStep(1);
        } else {
          setGeneralError(getFriendlyApiError(error, t("submitBusinessFailed")));
        }
      } finally {
        setApiLoading(false);
      }
    }
  };

  const handleBack = () => {
    clearStepVisuals();
    setErrors({});
    if (currentStep > 0 && !apiLoading) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  /* ─── Render helpers ─── */
  const renderFileName = (file) => {
    if (!file) return null;
    return (
      <p
        className="verification__file-name"
        style={{ margin: "8px 0 0", fontSize: "13px", color: "#5d6677", wordBreak: "break-word" }}
      >
        {file.name}
      </p>
    );
  };

  const renderFieldError = (message) => {
    if (!message) return null;
    return <p className="verification__field-error">{message}</p>;
  };

  const renderAlert = () => {
    if (generalError) {
      return (
        <div className="alert alert-danger" role="alert">
          {translatedGeneralError}
        </div>
      );
    }
    if (generalSuccess) {
      return (
        <div className="alert alert-success" role="alert">
          {translatedGeneralSuccess}
        </div>
      );
    }
    return null;
  };

  /* ─── Step renders ─── */
  const renderSellerInformationStep = () => (
    <div className="verification__card">
      <h2 className="verification__title">{t("sellerInformation")}</h2>
      {renderAlert()}

      <div className="verification__field">
        <label className="verification__label">{t("storeName")}</label>
        <input
          type="text"
          name="sellerName"
          placeholder={t("storeName")}
          className="verification__input"
          value={formData.sellerName}
          onChange={handleChange}
        />
        {renderFieldError(errors.sellerName)}
      </div>

      <div className="verification__field">
        <label className="verification__label">{t("phoneNumber")}</label>
        <input
          type="text"
          name="sellerNumber"
          placeholder={t("phoneNumber")}
          className="verification__input"
          value={formData.sellerNumber}
          onChange={(e) => handleDigitsInputChange(e, "sellerNumber")}
          maxLength={15}
        />
        {renderFieldError(errors.sellerNumber)}
      </div>

      <div className="verification__row">
        <div className="verification__field verification__field--half">
          <label className="verification__label">{t("country")}</label>
          <select
            name="sellerCountryId"
            className="verification__input"
            value={formData.sellerCountryId}
            onChange={handleCountryChange}
            disabled={countriesLoading || apiLoading}
          >
            <option value="">
              {countriesLoading ? t("loadingCountries") : t("country")}
            </option>
            {displayCountries.map((country) => (
              <option key={country.id} value={country.id}>
                {country.name}
              </option>
            ))}
          </select>
          {renderFieldError(errors.sellerCountry)}
        </div>

        <div className="verification__field verification__field--half">
          <label className="verification__label">{t("city")}</label>
          <select
            name="sellerCityId"
            className="verification__input"
            value={formData.sellerCityId}
            onChange={handleCityChange}
            disabled={!formData.sellerCountryId || citiesLoading || apiLoading}
          >
            <option value="">
              {citiesLoading
                ? t("loadingCities")
                : !formData.sellerCountryId
                ? t("selectCountryFirst")
                : t("city")}
            </option>
            {displayCities.map((city) => (
              <option key={city.id} value={city.id}>
                {city.name}
              </option>
            ))}
          </select>
          {renderFieldError(errors.sellerCity)}
        </div>
      </div>

      <div className="verification__field">
        <label className="verification__label">{t("logoOptional")}</label>
        <label className="verification__upload-box">
          <input
            type="file"
            className="verification__file-input"
            accept=".png,.jpeg,.jpg,image/png,image/jpeg"
            onChange={(e) => handleFileChange(e, "sellerLogo")}
          />
          <span>{t("addImage")}</span>
        </label>
        {renderFileName(formData.sellerLogo)}
        {renderFieldError(errors.sellerLogo)}
      </div>

      <div className="verification__field">
        <label className="verification__label">{t("description")}</label>
        <textarea
          name="sellerDescription"
          className="verification__textarea"
          value={formData.sellerDescription}
          onChange={handleChange}
          maxLength={650}
        />
        <div className="verification__counter">
          {formData.sellerDescription.length}/650
        </div>
        {renderFieldError(errors.sellerDescription)}
      </div>

      <p className="verification__note">{t("draftNote")}</p>
    </div>
  );

  const renderIdentityStep = () => (
    <div className="verification__card">
      <h2 className="verification__title">{t("identityVerification")}</h2>
      <p className="verification__subtitle">{t("identitySubtitle")}</p>
      {renderAlert()}

      <div className="verification__field">
        <label className="verification__upload-button">
          <input
            type="file"
            className="verification__file-input"
            accept=".png,.jpeg,.jpg,image/png,image/jpeg"
            onChange={(e) => handleFileChange(e, "nationalIdFront")}
          />
          {t("uploadNationalIdFront")}
        </label>
        {renderFileName(formData.nationalIdFront)}
        {renderFieldError(errors.nationalIdFront)}
      </div>

      <div className="verification__field">
        <label className="verification__upload-button">
          <input
            type="file"
            className="verification__file-input"
            accept=".png,.jpeg,.jpg,image/png,image/jpeg"
            onChange={(e) => handleFileChange(e, "nationalIdBack")}
          />
          {t("uploadNationalIdBack")}
        </label>
        {renderFileName(formData.nationalIdBack)}
        {renderFieldError(errors.nationalIdBack)}
      </div>

      <div className="verification__field">
        <label className="verification__upload-button">
          <input
            type="file"
            className="verification__file-input"
            accept=".png,.jpeg,.jpg,image/png,image/jpeg"
            onChange={(e) => handleFileChange(e, "selfieWithId")}
          />
          {t("uploadSelfieWithId")}
        </label>
        {renderFileName(formData.selfieWithId)}
        {renderFieldError(errors.selfieWithId)}
      </div>

      <p className="verification__note">{t("step2Note")}</p>
    </div>
  );

  const renderBusinessStep = () => (
    <div className="verification__card">
      <h2 className="verification__title">{t("businessVerification")}</h2>
      <p className="verification__subtitle">{t("businessSubtitle")}</p>
      {renderAlert()}

      <div className="verification__field">
        <label className="verification__upload-button">
          <input
            type="file"
            className="verification__file-input"
            accept=".png,.jpeg,.jpg,image/png,image/jpeg"
            onChange={(e) => handleFileChange(e, "commercialRegistration")}
          />
          {t("uploadCommercialRegister")}
        </label>
        {renderFileName(formData.commercialRegistration)}
        {renderFieldError(errors.commercialRegistration)}
      </div>

      <div className="verification__field">
        <label className="verification__upload-button">
          <input
            type="file"
            className="verification__file-input"
            accept=".png,.jpeg,.jpg,image/png,image/jpeg"
            onChange={(e) => handleFileChange(e, "taxId")}
          />
          {t("uploadTaxId")}
        </label>
        {renderFileName(formData.taxId)}
        {renderFieldError(errors.taxId)}
      </div>

      <div className="verification__field">
        <label className="verification__upload-button">
          <input
            type="file"
            className="verification__file-input"
            accept=".png,.jpeg,.jpg,image/png,image/jpeg"
            onChange={(e) => handleFileChange(e, "ownerNationalIdFront")}
          />
          {t("uploadOwnerNationalIdFront")}
        </label>
        {renderFileName(formData.ownerNationalIdFront)}
        {renderFieldError(errors.ownerNationalIdFront)}
      </div>

      <div className="verification__field">
        <label className="verification__upload-button">
          <input
            type="file"
            className="verification__file-input"
            accept=".png,.jpeg,.jpg,image/png,image/jpeg"
            onChange={(e) => handleFileChange(e, "ownerNationalIdBack")}
          />
          {t("uploadOwnerNationalIdBack")}
        </label>
        {renderFileName(formData.ownerNationalIdBack)}
        {renderFieldError(errors.ownerNationalIdBack)}
      </div>

      <div className="verification__field">
        <label className="verification__label">{t("instaPayNumber")}</label>
        <input
          type="text"
          name="instaPayNumber"
          placeholder={t("Digits only, optional", { defaultValue: "Digits only, optional" })}
          className="verification__input"
          value={formData.instaPayNumber}
          onChange={(e) => handleDigitsInputChange(e, "instaPayNumber")}
        />
        {renderFieldError(errors.instaPayNumber)}
      </div>

      <div className="verification__field">
        <label className="verification__label">{t("bankName")}</label>
        <select
          name="bankName"
          className="verification__input"
          value={formData.bankName}
          onChange={handleChange}
        >
          <option value="">{t("bankName")}</option>
          <option value="National Bank of Egypt">National Bank of Egypt</option>
          <option value="Banque Misr">Banque Misr</option>
          <option value="CIB">CIB</option>
          <option value="QNB">QNB</option>
        </select>
        {renderFieldError(errors.bankName)}
      </div>

      <div className="verification__field">
        <label className="verification__label">{t("accountName")}</label>
        <input
          type="text"
          name="accountHolderName"
          placeholder={t("accountName")}
          className="verification__input"
          value={formData.accountHolderName}
          onChange={handleChange}
        />
        {renderFieldError(errors.accountHolderName)}
      </div>

      <div className="verification__field">
        <label className="verification__label">{t("iban")}</label>
        <input
          type="text"
          name="iban"
          placeholder={t("iban")}
          className="verification__input"
          value={formData.iban}
          onChange={handleChange}
        />
        {renderFieldError(errors.iban)}
      </div>

      <div className="verification__field">
        <label className="verification__label">
          {t("localAccountNumberOptional")}
        </label>
        <input
          type="text"
          name="localAccountNumber"
          placeholder={t("Digits only", { defaultValue: "Digits only" })}
          className="verification__input"
          value={formData.localAccountNumber}
          onChange={(e) => handleDigitsInputChange(e, "localAccountNumber")}
        />
        {renderFieldError(errors.localAccountNumber)}
      </div>

      <p className="verification__note">{t("pendingReviewNote")}</p>
    </div>
  );

  return (
    <div className="verification">
      <style>{`
        .verification {
          width: 100%;
          min-height: auto;
          background: #f7f8fc;
          padding: 18px 0 28px;
          box-sizing: border-box;
        }
        .verification * { box-sizing: border-box; }
        .verification__wrapper { width: min(92%, 860px); margin: 0 auto; }
        .verification__progress {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
          margin-bottom: 18px;
        }
        .verification__progress-step {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 10px 14px;
          border-radius: 999px;
          background: #eef2f7;
          color: #6c7890;
          font-size: 14px;
          font-weight: 700;
        }
        .verification__progress-step--active {
          background: #0b4aa2;
          color: #fff;
        }
        .verification__progress-step--done {
          background: #dfe9f9;
          color: #0b4aa2;
        }
        .verification__progress-number {
          width: 22px;
          height: 22px;
          border-radius: 50%;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: 800;
          background: rgba(255,255,255,0.22);
          flex-shrink: 0;
        }
        .verification__progress-step:not(.verification__progress-step--active) .verification__progress-number {
          background: #fff;
        }
        .verification__body { width: 100%; }
        .verification__card {
          width: 100%;
          background: #fff;
          border: 1px solid #e6eaf1;
          border-radius: 18px;
          padding: 22px;
          box-shadow: 0 8px 24px rgba(15, 34, 58, 0.06);
        }
        .verification__title {
          margin: 0 0 8px;
          font-size: 30px;
          font-weight: 800;
          color: #0b4aa2;
        }
        .verification__subtitle {
          margin: 0 0 18px;
          font-size: 14px;
          line-height: 1.7;
          color: #677487;
        }
        .verification__field { margin-bottom: 16px; }
        .verification__row { display: flex; gap: 12px; }
        .verification__field--half { width: 50%; }
        .verification__label {
          display: block;
          margin-bottom: 8px;
          font-size: 14px;
          font-weight: 700;
          color: #0b4aa2;
        }
        .verification__input,
        .verification__textarea {
          width: 100%;
          border: 1px solid #d5dce8;
          border-radius: 10px;
          background: #fff;
          padding: 12px 14px;
          font-size: 14px;
          color: #263248;
          outline: none;
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
        }
        .verification__input:focus,
        .verification__textarea:focus {
          border-color: #0b4aa2;
          box-shadow: 0 0 0 3px rgba(11, 74, 162, 0.08);
        }
        .verification__textarea {
          min-height: 120px;
          resize: vertical;
        }
        .verification__upload-box,
        .verification__upload-button {
          width: 100%;
          min-height: 48px;
          border: 1px dashed #c9d2e2;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 12px 14px;
          cursor: pointer;
          background: #fbfcff;
          color: #61708a;
          font-size: 14px;
          font-weight: 600;
          transition: border-color 0.2s ease, background 0.2s ease;
        }
        .verification__upload-box:hover,
        .verification__upload-button:hover {
          border-color: #0b4aa2;
          background: #f5f9ff;
        }
        .verification__file-input { display: none; }
        .verification__counter {
          margin-top: 8px;
          text-align: right;
          font-size: 12px;
          color: #7c889c;
        }
        .verification__note {
          margin: 10px 0 0;
          font-size: 13px;
          line-height: 1.7;
          color: #7c889c;
        }
        .verification__field-error {
          margin: 6px 0 0;
          font-size: 13px;
          line-height: 1.5;
          color: #dc3545;
          font-weight: 500;
        }
        .verification__actions {
          margin-top: 18px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          padding: 0;
        }
        .verification__button {
          min-width: 140px;
          border: none;
          border-radius: 12px;
          padding: 12px 18px;
          font-size: 15px;
          font-weight: 800;
          cursor: pointer;
          transition: opacity 0.2s ease, transform 0.2s ease;
        }
        .verification__button:disabled {
          opacity: 0.65;
          cursor: not-allowed;
          transform: none;
        }
        .verification__button--secondary {
          background: #edf1f7;
          color: #5c697d;
        }
        .verification__button--primary {
          background: #0b4aa2;
          color: #fff;
        }
        .alert { border-radius: 10px; margin-bottom: 14px; }
        @media (max-width: 768px) {
          .verification { padding: 14px 0 24px; }
          .verification__wrapper { width: 94%; }
          .verification__card { padding: 18px; }
          .verification__title { font-size: 24px; }
          .verification__row { flex-direction: column; gap: 0; }
          .verification__field--half { width: 100%; }
          .verification__actions { flex-direction: column; }
          .verification__button { width: 100%; }
        }
      `}</style>

      <ToastContainer theme="colored" />

      <div className="verification__wrapper">
        <div className="verification__progress">
          {steps.map((step, index) => (
            <div
              key={step}
              className={`verification__progress-step ${
                index === currentStep
                  ? "verification__progress-step--active"
                  : index < currentStep
                  ? "verification__progress-step--done"
                  : ""
              }`}
            >
              <span className="verification__progress-number">{index + 1}</span>
              <span className="verification__progress-label">{step}</span>
            </div>
          ))}
        </div>

        <div className="verification__body">
          {currentStep === 0 && renderSellerInformationStep()}
          {currentStep === 1 && renderIdentityStep()}
          {currentStep === 2 && renderBusinessStep()}
        </div>

        <div className="verification__actions">
          <button
            type="button"
            className="verification__button verification__button--secondary"
            onClick={handleBack}
            disabled={currentStep === 0 || apiLoading}
          >
            {t("back")}
          </button>

          <button
            type="button"
            className="verification__button verification__button--primary"
            onClick={handleNext}
            disabled={apiLoading}
          >
            {apiLoading
              ? t("loading")
              : currentStep === steps.length - 1
              ? t("submitForReview")
              : t("saveContinue")}
          </button>
        </div>
      </div>
    </div>
  );
}