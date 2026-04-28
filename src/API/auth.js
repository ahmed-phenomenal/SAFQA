import api, { persistAuthTokensFromResponse } from "./axios";

const normalizeAccountType = (value) => {
  const accountType = String(value || "buyer").trim().toLowerCase();
  return accountType === "seller" ? "seller" : "buyer";
};

const getRoleFromAccountType = (value) => {
  const accountType = normalizeAccountType(value);
  return accountType === "seller" ? "seller" : "user";
};

const toNullableNumber = (value) => {
  if (value === "" || value === null || value === undefined) return null;

  const num = Number(value);
  return Number.isFinite(num) ? num : null;
};

const withRole = (accountType) => {
  const role = getRoleFromAccountType(accountType);
  return {
    role,
    params: { role },
  };
};

const mergeConfigs = (baseConfig = {}, extraConfig = {}) => {
  return {
    ...baseConfig,
    ...extraConfig,
    params: {
      ...(baseConfig.params || {}),
      ...(extraConfig.params || {}),
    },
    headers: {
      ...(baseConfig.headers || {}),
      ...(extraConfig.headers || {}),
    },
  };
};

export const getCountries = async () => {
  const res = await api.get("/Auth/countries");
  const data = Array.isArray(res.data)
    ? res.data
    : Array.isArray(res.data?.Data)
    ? res.data.Data
    : Array.isArray(res.data?.data)
    ? res.data.data
    : [];

  return data.map((item) => ({
    id: Number(item.id ?? item.Id ?? 0),
    name: String(item.name ?? item.Name ?? ""),
  }));
};

export const getCities = async (countryId) => {
  const id = toNullableNumber(countryId);

  if (!id) return [];

  const res = await api.get(`/Auth/cities/${id}`);
  const data = Array.isArray(res.data)
    ? res.data
    : Array.isArray(res.data?.Data)
    ? res.data.Data
    : Array.isArray(res.data?.data)
    ? res.data.data
    : [];

  return data.map((item) => ({
    id: Number(item.id ?? item.Id ?? 0),
    name: String(item.name ?? item.Name ?? ""),
  }));
};

export const register = async (values) => {
  const cityId = toNullableNumber(values.cityId);

  const res = await api.post("/Auth/register", {
    fullName: String(values.fullName || "").trim(),
    birthDate: values.birthDate || null,
    phoneNumber: String(values.phoneNumber || "").trim(),
    gender: Number(values.gender),
    email: String(values.email || "").trim(),
    password: String(values.password || ""),
    cityId,
  });

  return res.data;
};

export const confirmEmail = async (values, config = {}) => {
  const accountType = normalizeAccountType(values.accountType);
  const { params } = withRole(accountType);

  const res = await api.post(
    "/Auth/confirm-email",
    {
      email: String(values.email || "").trim(),
      otp: String(values.otp || "").trim(),
    },
    mergeConfigs({ params }, config)
  );

  persistAuthTokensFromResponse(res.data, {
    role: params.role,
    accountType,
    tokenKey: accountType === "seller" ? "sellerToken" : "userToken",
  });

  return res.data;
};

export const resendConfirmEmailCode = async (
  { email, accountType },
  config = {}
) => {
  const normalizedAccountType = normalizeAccountType(accountType);
  const { params } = withRole(normalizedAccountType);

  const res = await api.post(
    "/Auth/resend-confirm-email",
    {
      email: String(email || "").trim(),
    },
    mergeConfigs({ params }, config)
  );

  return res.data;
};

export const resendRegistrationOtp = async (
  { email, accountType },
  config = {}
) => {
  const normalizedAccountType = normalizeAccountType(accountType);
  const { params } = withRole(normalizedAccountType);

  const res = await api.post(
    "/Auth/resendRegistrationOtp",
    {
      email: String(email || "").trim(),
    },
    mergeConfigs({ params }, config)
  );

  return res.data;
};

export const login = async (values, config = {}) => {
  const explicitRole = String(config?.params?.role || "")
    .trim()
    .toLowerCase();

  const derivedAccountType =
    explicitRole === "seller"
      ? "seller"
      : normalizeAccountType(values.accountType || config.accountType);

  const { params } = withRole(derivedAccountType);

  const requestBody = {
    email: String(values.email || "").trim(),
    password: String(values.password || ""),
  };

  const finalConfig = mergeConfigs({ params }, config);

  if (explicitRole) {
    finalConfig.params.role = explicitRole;
  }

  delete finalConfig.accountType;

  const res = await api.post("/Auth/login", requestBody, finalConfig);

  const finalRole = explicitRole || params.role;
  const tokenKey =
    finalRole === "seller"
      ? "sellerToken"
      : finalRole === "admin"
      ? "adminToken"
      : "userToken";

  persistAuthTokensFromResponse(res.data, {
    role: finalRole,
    accountType: derivedAccountType,
    tokenKey,
  });

  if (typeof window !== "undefined") {
    localStorage.setItem("currentUserEmail", requestBody.email);
    sessionStorage.setItem("currentUserEmail", requestBody.email);
  }

  return res.data;
};

export const googleAuth = async (
  { idToken, accountType = "buyer" },
  config = {}
) => {
  const normalizedAccountType = normalizeAccountType(accountType);
  const { params } = withRole(normalizedAccountType);
  const token = String(idToken || "").trim();

  const finalConfig = mergeConfigs({ params }, config);
  delete finalConfig.accountType;

  const res = await api.post(
    "/Auth/google",
    {
      idToken: token,
    },
    finalConfig
  );

  persistAuthTokensFromResponse(res.data, {
    role: params.role,
    accountType: normalizedAccountType,
    tokenKey: normalizedAccountType === "seller" ? "sellerToken" : "userToken",
  });

  return res.data;
};

export const facebookAuth = async (
  { accessToken, accountType = "buyer" },
  config = {}
) => {
  const normalizedAccountType = normalizeAccountType(accountType);
  const { params } = withRole(normalizedAccountType);
  const token = String(accessToken || "").trim();

  const finalConfig = mergeConfigs({ params }, config);
  delete finalConfig.accountType;

  const res = await api.post(
    "/Auth/facebook",
    {
      accessToken: token,
    },
    finalConfig
  );

  persistAuthTokensFromResponse(res.data, {
    role: params.role,
    accountType: normalizedAccountType,
    tokenKey: normalizedAccountType === "seller" ? "sellerToken" : "userToken",
  });

  return res.data;
};

export const forgetPasswordRequest = async (email) => {
  const res = await api.post("/Auth/request-ForgetPassword", {
    Email: String(email || "").trim(),
  });
  return res.data;
};

export const forgetPasswordVerify = async ({ email, code }) => {
  const res = await api.post("/Auth/verify-ForgetPassword", {
    Email: String(email || "").trim(),
    Code: String(code || "").trim(),
  });
  return res.data;
};

export const forgetPasswordReset = async ({ email, token, newPassword }) => {
  const res = await api.post("/Auth/reset-ForgetPassword", {
    Email: String(email || "").trim(),
    Token: String(token || "").trim(),
    NewPassword: String(newPassword || ""),
  });
  return res.data;
};

export const forgetPasswordResend = async (email) => {
  const res = await api.post("/Auth/resendotp", {
    Email: String(email || "").trim(),
  });
  return res.data;
};

export const forgetPasswordSignoutAll = async () => {
  const res = await api.post("/Auth/signout-all");
  return res.data;
};

export const changePassword = async ({
  oldPassword,
  newPassword,
  confirmNewPassword,
}) => {
  const oldValue = String(oldPassword || "").trim();
  const newValue = String(newPassword || "").trim();
  const confirmValue = String(confirmNewPassword || "").trim();

  const payload = {
    oldPassword: oldValue,
    OldPassword: oldValue,
    currentPassword: oldValue,
    CurrentPassword: oldValue,

    newPassword: newValue,
    NewPassword: newValue,

    confirmNewPassword: confirmValue,
    ConfirmNewPassword: confirmValue,
    confirmPassword: confirmValue,
    ConfirmPassword: confirmValue,
  };

  const res = await api.post("/Auth/change-password", payload);
  return res.data;
};