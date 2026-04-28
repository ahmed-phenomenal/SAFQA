import api from "./axios";

const DELIVERY_TOKEN_KEY = "deliveryToken";
const DELIVERY_EMAIL_KEY = "deliveryEmail";
const DELIVERY_PROGRESS_KEY = "delivery_progress_local";

const safeJsonParse = (value, fallback = null) => {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

const getDeliveryToken = () =>
  sessionStorage.getItem(DELIVERY_TOKEN_KEY) ||
  localStorage.getItem(DELIVERY_TOKEN_KEY) ||
  "";

const getAuthConfig = () => {
  const token = getDeliveryToken();
  return token
    ? {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    : {};
};

const readLocalProgress = () => {
  const parsed = safeJsonParse(localStorage.getItem(DELIVERY_PROGRESS_KEY), {});
  return parsed && typeof parsed === "object" ? parsed : {};
};

const writeLocalProgress = (value) => {
  localStorage.setItem(DELIVERY_PROGRESS_KEY, JSON.stringify(value || {}));
};

const upsertAuctionProgress = (auctionId, patch) => {
  const id = Number(auctionId || 0);
  if (!id) return;

  const current = readLocalProgress();
  current[id] = {
    auctionId: id,
    step2Checked: false,
    step3Submitted: false,
    contact: "",
    step4Uploaded: false,
    uploadedImage: "",
    notCompleted: false,
    updatedAt: new Date().toISOString(),
    ...(current[id] || {}),
    ...(patch || {}),
  };
  writeLocalProgress(current);
};

const fileToBase64DataUrl = (file) =>
  new Promise((resolve, reject) => {
    if (!file) {
      resolve("");
      return;
    }

    if (typeof file === "string") {
      resolve(file);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Failed to read file."));
    reader.readAsDataURL(file);
  });

export const getLocalDeliveryProgress = () => {
  return readLocalProgress();
};

export const requestDeliveryLoginOtp = async (email) => {
  const body = { email: String(email || "").trim() };
  const res = await api.post("/Delivery/request-login-otp", body);
  sessionStorage.setItem(DELIVERY_EMAIL_KEY, body.email);
  return res.data;
};

export const verifyDeliveryLoginOtp = async ({ email, code }) => {
  const body = {
    email: String(email || "").trim(),
    code: String(code || "").trim(),
  };

  const res = await api.post("/Delivery/verify-login-otp", body);
  const token =
    res?.data?.token ||
    res?.data?.Token ||
    res?.data?.accessToken ||
    res?.data?.AccessToken ||
    "";

  if (token) {
    sessionStorage.setItem(DELIVERY_TOKEN_KEY, token);
  }

  sessionStorage.setItem(DELIVERY_EMAIL_KEY, body.email);

  return res.data;
};

export const logoutDeliverySession = () => {
  sessionStorage.removeItem(DELIVERY_TOKEN_KEY);
  sessionStorage.removeItem(DELIVERY_EMAIL_KEY);
};

export const getDeliverySessionEmail = () => {
  return sessionStorage.getItem(DELIVERY_EMAIL_KEY) || "";
};

export const getMyDeliveries = async () => {
  const res = await api.get("/Delivery/my-deliveries", getAuthConfig());
  return Array.isArray(res?.data?.item2) ? res.data.item2 : [];
};

export const completeDeliveryStep2 = async (auctionId) => {
  const id = Number(auctionId || 0);
  const res = await api.post(`/Delivery/step-2/${id}`, null, getAuthConfig());

  upsertAuctionProgress(id, {
    step2Checked: true,
    notCompleted: false,
  });

  return res.data;
};

export const completeDeliveryStep3 = async ({ auctionId, contact }) => {
  const id = Number(auctionId || 0);
  const body = {
    auctionId: id,
    contact: String(contact || "").trim(),
  };

  const res = await api.post("/Delivery/step-3", body, getAuthConfig());

  upsertAuctionProgress(id, {
    step2Checked: true,
    step3Submitted: true,
    contact: body.contact,
    notCompleted: false,
  });

  return res.data;
};

export const completeDeliveryStep4 = async ({ auctionId, image }) => {
  const id = Number(auctionId || 0);

  const formData = new FormData();
  formData.append("AuctionId", String(id));
  formData.append("Image", image);

  const res = await api.post("/Delivery/step-4", formData, {
    ...getAuthConfig(),
    headers: {
      ...(getAuthConfig().headers || {}),
    },
  });

  const imageDataUrl = await fileToBase64DataUrl(image);

  upsertAuctionProgress(id, {
    step2Checked: true,
    step3Submitted: true,
    step4Uploaded: true,
    uploadedImage: imageDataUrl,
    notCompleted: false,
  });

  return res.data;
};

export const completeDeliveryStep5NotCompleted = async (auctionId) => {
  const id = Number(auctionId || 0);
  const res = await api.post(`/Delivery/step-5/${id}`, null, getAuthConfig());

  upsertAuctionProgress(id, {
    notCompleted: true,
  });

  return res.data;
};