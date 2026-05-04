import sellerApi from "./sellerAxios";

const DELIVERY_TOKEN_KEY = "deliveryToken";
const DELIVERY_EMAIL_KEY = "deliveryEmail";
const DELIVERY_PROGRESS_KEY = "deliveryLocalProgress";

const cleanToken = (value) => {
  if (!value) return "";

  let token = String(value).trim();

  try {
    const parsed = JSON.parse(token);
    if (typeof parsed === "string") token = parsed.trim();
  } catch {
    //
  }

  if (
    (token.startsWith('"') && token.endsWith('"')) ||
    (token.startsWith("'") && token.endsWith("'"))
  ) {
    token = token.slice(1, -1).trim();
  }

  if (token.toLowerCase().startsWith("bearer ")) {
    token = token.slice(7).trim();
  }

  if (!token || token === "undefined" || token === "null" || token === "[object Object]") {
    return "";
  }

  return token;
};

const readStorage = (key) => {
  const sessionValue =
    typeof window !== "undefined" ? sessionStorage.getItem(key) : null;

  if (sessionValue) return sessionValue;

  return typeof window !== "undefined" ? localStorage.getItem(key) : null;
};

const getDeliveryToken = () => cleanToken(readStorage(DELIVERY_TOKEN_KEY));

const saveDeliverySession = ({ email, token }) => {
  const cleanEmail = String(email || "").trim();
  const clean = cleanToken(token);

  if (cleanEmail) sessionStorage.setItem(DELIVERY_EMAIL_KEY, cleanEmail);
  if (clean) sessionStorage.setItem(DELIVERY_TOKEN_KEY, clean);
};

export const getDeliverySessionEmail = () => {
  return readStorage(DELIVERY_EMAIL_KEY) || "";
};

export const logoutDeliverySession = () => {
  sessionStorage.removeItem(DELIVERY_TOKEN_KEY);
  sessionStorage.removeItem(DELIVERY_EMAIL_KEY);
  sessionStorage.removeItem("delivery_access_unlocked");
  sessionStorage.removeItem("delivery_access_key");

  localStorage.removeItem(DELIVERY_TOKEN_KEY);
  localStorage.removeItem(DELIVERY_EMAIL_KEY);
};

const authHeaders = () => {
  const token = getDeliveryToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const extractMessage = (data, fallback) => {
  if (!data) return fallback;
  if (typeof data === "string") return data;

  if (data.error) return data.error;
  if (data.message) return data.message;
  if (data.Message) return data.Message;
  if (data.title) return data.title;
  if (data.Title) return data.Title;

  if (Array.isArray(data.errors) && data.errors.length) {
    return data.errors.join(", ");
  }

  if (data.errors && typeof data.errors === "object") {
    return Object.values(data.errors).flat().join(", ");
  }

  return fallback;
};

const normalizeError = (error, fallback) => {
  const message = extractMessage(error?.response?.data, fallback);

  if (error?.response) {
    error.response.data = {
      ...(typeof error.response.data === "object" && error.response.data
        ? error.response.data
        : {}),
      message,
    };
  } else {
    error.response = {
      status: 0,
      data: {
        message: error?.message || fallback,
      },
    };
  }

  return error;
};

const unwrapDeliveries = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.item2)) return data.item2;
  if (Array.isArray(data?.Item2)) return data.Item2;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.Data)) return data.Data;
  if (Array.isArray(data?.result)) return data.result;
  if (Array.isArray(data?.Result)) return data.Result;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.Items)) return data.Items;
  return [];
};

const normalizeDelivery = (item) => ({
  id: Number(item?.id || item?.Id || item?.auctionId || item?.AuctionId || 0),
  auctionId: Number(item?.auctionId || item?.AuctionId || item?.id || item?.Id || 0),
  code: item?.code || item?.Code || "",
  status: Number(item?.status ?? item?.Status ?? 1),
  userNumber: item?.userNumber || item?.UserNumber || "",
  userEmail: item?.userEmail || item?.UserEmail || "",
  auctionTitle: item?.auctionTitle || item?.AuctionTitle || "",
  finalPrice: item?.finalPrice ?? item?.FinalPrice ?? 0,
});

export const getLocalDeliveryProgress = () => {
  try {
    const localRaw = localStorage.getItem(DELIVERY_PROGRESS_KEY);

    if (localRaw) {
      return JSON.parse(localRaw);
    }

    const oldSessionRaw = sessionStorage.getItem(DELIVERY_PROGRESS_KEY);

    if (oldSessionRaw) {
      localStorage.setItem(DELIVERY_PROGRESS_KEY, oldSessionRaw);
      sessionStorage.removeItem(DELIVERY_PROGRESS_KEY);
      return JSON.parse(oldSessionRaw);
    }

    return {};
  } catch {
    return {};
  }
};

export const saveLocalDeliveryProgress = (auctionId, patch) => {
  const id = Number(auctionId || 0);
  if (!id) return;

  const current = getLocalDeliveryProgress();

  current[id] = {
    ...(current[id] || {}),
    ...patch,
    updatedAt: new Date().toISOString(),
  };

  localStorage.setItem(DELIVERY_PROGRESS_KEY, JSON.stringify(current));
};

export const requestDeliveryLoginOtp = async (email) => {
  try {
    const res = await sellerApi.post("/Delivery/request-login-otp", {
      email: String(email || "").trim(),
    });

    return res.data;
  } catch (error) {
    throw normalizeError(error, "Failed to send OTP.");
  }
};

export const verifyDeliveryLoginOtp = async ({ email, code }) => {
  try {
    const cleanEmail = String(email || "").trim();

    const res = await sellerApi.post("/Delivery/verify-login-otp", {
      email: cleanEmail,
      code: String(code || "").trim(),
    });

    const token =
      res?.data?.token ||
      res?.data?.Token ||
      res?.data?.data?.token ||
      res?.data?.Data?.Token ||
      "";

    if (!token) {
      throw new Error("OTP verified, but API did not return delivery token.");
    }

    saveDeliverySession({
      email: cleanEmail,
      token,
    });

    return res.data;
  } catch (error) {
    throw normalizeError(error, "Invalid OTP.");
  }
};

export const getMyDeliveries = async () => {
  try {
    const token = getDeliveryToken();

    if (!token) {
      throw new Error("Delivery token not found. Please verify OTP again.");
    }

    const res = await sellerApi.get("/Delivery/my-deliveries", {
      headers: authHeaders(),
      validateStatus: () => true,
    });

    const status = Number(res?.status || 0);
    const message = String(res?.data?.message || res?.data?.Message || "").toLowerCase();

    if (status === 400 && (message.includes("no deliveries") || message.includes("not found"))) {
      return [];
    }

    if (status >= 400) {
      const error = new Error(
        res?.data?.message ||
          res?.data?.Message ||
          "Failed to load delivery orders."
      );
      error.response = res;
      throw error;
    }

    return unwrapDeliveries(res.data).map(normalizeDelivery);
  } catch (error) {
    throw normalizeError(error, "Failed to load delivery orders.");
  }
};

export const completeDeliveryStep2 = async (auctionId) => {
  try {
    const id = Number(auctionId || 0);

    if (!id) {
      throw new Error("Invalid auction ID.");
    }

    const res = await sellerApi.put(`/Delivery/step-2/${id}`, null, {
      headers: authHeaders(),
    });

    saveLocalDeliveryProgress(id, {
      step2Checked: true,
      status: 2,
    });

    return res.data;
  } catch (error) {
    throw normalizeError(error, "Failed to complete step 2.");
  }
};

export const completeDeliveryStep3 = async ({ auctionId, contact }) => {
  try {
    const id = Number(auctionId || 0);
    const cleanContact = String(contact || "").trim();

    if (!id) {
      throw new Error("Invalid auction ID.");
    }

    if (!/^\+[1-9]\d{7,14}$/.test(cleanContact)) {
      throw new Error("Contact number must start with country code, for example +201001234567.");
    }

    const res = await sellerApi.put(
      "/Delivery/step-3",
      {
        auctionId: id,
        contact: cleanContact,
      },
      {
        headers: {
          ...authHeaders(),
          "Content-Type": "application/json",
        },
      }
    );

    saveLocalDeliveryProgress(id, {
      step3Submitted: true,
      contact: cleanContact,
      status: 3,
    });

    return res.data;
  } catch (error) {
    throw normalizeError(error, "Failed to complete step 3.");
  }
};

export const completeDeliveryStep4 = async ({ auctionId, image, images }) => {
  try {
    const id = Number(auctionId || 0);

    if (!id) {
      throw new Error("Invalid auction ID.");
    }

    const files = Array.isArray(images) && images.length ? images : image ? [image] : [];

    if (!files.length) {
      throw new Error("Please choose at least one image.");
    }

    const formData = new FormData();
    formData.append("AuctionId", String(id));

    files.forEach((file) => {
      if (!(file instanceof File)) {
        throw new Error("Invalid image file.");
      }

      const name = String(file.name || "").toLowerCase();
      const type = String(file.type || "").toLowerCase();

      const validExtension =
        name.endsWith(".png") || name.endsWith(".jpg") || name.endsWith(".jpeg");

      const validType = type === "image/png" || type === "image/jpeg" || type === "";

      if (!validExtension || !validType) {
        throw new Error("Only PNG, JPG, or JPEG images are allowed.");
      }

      formData.append("Image", file);
    });

    const res = await sellerApi.put("/Delivery/step-4", formData, {
      headers: authHeaders(),
    });

    saveLocalDeliveryProgress(id, {
      step4Uploaded: true,
      imageCount: files.length,
      status: 4,
    });

    return res.data;
  } catch (error) {
    throw normalizeError(error, "Failed to complete step 4.");
  }
};

export const completeDeliveryStep5NotCompleted = async (auctionId) => {
  try {
    const id = Number(auctionId || 0);

    if (!id) {
      throw new Error("Invalid auction ID.");
    }

    const res = await sellerApi.put(`/Delivery/step-5/${id}`, null, {
      headers: authHeaders(),
    });

    saveLocalDeliveryProgress(id, {
      notDelivered: true,
      status: 5,
    });

    return res.data;
  } catch (error) {
    throw normalizeError(error, "Failed to mark delivery as not delivered.");
  }
};