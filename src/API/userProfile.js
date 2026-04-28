import api from "./axios";
import { getCities, getCountries } from "./auth";

const firstDefined = (...values) =>
  values.find((value) => value !== undefined && value !== null && value !== "");

const toStringValue = (value) => {
  if (value === undefined || value === null) return "";
  return String(value).trim();
};

const toNumberValue = (value) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
};

const isPlainObject = (value) =>
  Object.prototype.toString.call(value) === "[object Object]";

const toImageSrc = (value) => {
  const raw = String(value || "").trim();

  if (!raw || raw === " ") return "";
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
  if (raw.startsWith("data:image/")) return raw;

  const looksLikeBase64 =
    /^[A-Za-z0-9+/=\s]+$/.test(raw) && !raw.includes("{") && !raw.includes("}");

  if (!looksLikeBase64) return "";

  return `data:image/png;base64,${raw.replace(/\s/g, "")}`;
};

const pickRootObject = (data) => {
  if (!data || typeof data !== "object") return {};
  if (isPlainObject(data.data)) return data.data;
  if (isPlainObject(data.Data)) return data.Data;
  if (isPlainObject(data.result)) return data.result;
  return data;
};

const deepFindValueByKeys = (input, wantedKeys = []) => {
  if (!input || !wantedKeys.length) return undefined;

  const normalizedKeys = wantedKeys.map((key) => String(key).toLowerCase());
  const queue = [input];
  const visited = new Set();

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current || typeof current !== "object") continue;
    if (visited.has(current)) continue;
    visited.add(current);

    if (Array.isArray(current)) {
      current.forEach((item) => {
        if (item && typeof item === "object") queue.push(item);
      });
      continue;
    }

    for (const [key, value] of Object.entries(current)) {
      if (normalizedKeys.includes(String(key).toLowerCase())) {
        return value;
      }
      if (value && typeof value === "object") {
        queue.push(value);
      }
    }
  }

  return undefined;
};

const normalizeGender = (value) => {
  const raw = String(value ?? "").trim().toLowerCase();

  if (raw === "1" || raw === "male") return "Male";
  if (raw === "2" || raw === "female") return "Female";
  if (!raw) return "";

  return String(value);
};

const normalizeDate = (value) => {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toISOString().split("T")[0];
};

const formatDateForDisplay = (value) => {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);

  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const normalizeProfileResponse = (data) => {
  const root = pickRootObject(data);

  const city = toStringValue(
    firstDefined(
      root?.city,
      root?.City,
      root?.cityName,
      root?.CityName,
      deepFindValueByKeys(data, ["city", "cityName"])
    )
  );

  const country = toStringValue(
    firstDefined(
      root?.country,
      root?.Country,
      root?.countryName,
      root?.CountryName,
      deepFindValueByKeys(data, ["country", "countryName"])
    )
  );

  const image = toStringValue(
    firstDefined(
      root?.image,
      root?.Image,
      root?.profileImage,
      root?.ProfileImage,
      root?.avatar,
      root?.Avatar,
      deepFindValueByKeys(data, ["image", "profileImage", "avatar"])
    )
  );

  return {
    fullName: toStringValue(
      firstDefined(
        root?.fullName,
        root?.FullName,
        root?.name,
        root?.Name,
        deepFindValueByKeys(data, ["fullName", "name"])
      )
    ),
    email: toStringValue(
      firstDefined(root?.email, root?.Email, deepFindValueByKeys(data, ["email"]))
    ),
    phoneNumber: toStringValue(
      firstDefined(
        root?.phoneNumber,
        root?.PhoneNumber,
        root?.phone,
        root?.Phone,
        deepFindValueByKeys(data, ["phoneNumber", "phone"])
      )
    ),
    gender: normalizeGender(
      firstDefined(root?.gender, root?.Gender, deepFindValueByKeys(data, ["gender"]))
    ),
    genderValue: toNumberValue(
      firstDefined(root?.gender, root?.Gender, deepFindValueByKeys(data, ["gender"]))
    ),
    birthDate: normalizeDate(
      firstDefined(
        root?.birthDate,
        root?.BirthDate,
        deepFindValueByKeys(data, ["birthDate"])
      )
    ),
    birthDateDisplay: formatDateForDisplay(
      firstDefined(
        root?.birthDate,
        root?.BirthDate,
        deepFindValueByKeys(data, ["birthDate"])
      )
    ),
    city,
    country,
    location: [city, country].filter(Boolean).join(", "),
    cityId: toNumberValue(
      firstDefined(root?.cityId, root?.CityId, deepFindValueByKeys(data, ["cityId"]))
    ),
    countryId: toNumberValue(
      firstDefined(
        root?.countryId,
        root?.CountryId,
        deepFindValueByKeys(data, ["countryId"])
      )
    ),
    image,
    imageSrc: toImageSrc(image),
  };
};

const normalizeOrderImages = (images) => {
  if (!Array.isArray(images)) return [];
  return images
    .map((item) => {
      if (typeof item === "string") return toImageSrc(item);

      return toImageSrc(
        firstDefined(
          item?.image,
          item?.Image,
          item?.url,
          item?.Url,
          item?.imageUrl,
          item?.ImageUrl,
          item?.src,
          item?.Src
        )
      );
    })
    .filter(Boolean);
};

const normalizeOrderItem = (item, type) => {
  const auctionId = toNumberValue(
    firstDefined(
      item?.auctionId,
      item?.AuctionId,
      item?.id,
      item?.Id,
      deepFindValueByKeys(item, ["auctionId", "id"])
    )
  );

  const deliveredAt = firstDefined(
    item?.deliveredAt,
    item?.DeliveredAt,
    deepFindValueByKeys(item, ["deliveredAt"])
  );

  const expectedDeliveryDate = firstDefined(
    item?.expectedDeliveryDate,
    item?.ExpectedDeliveryDate,
    deepFindValueByKeys(item, ["expectedDeliveryDate"])
  );

  return {
    id: auctionId || Math.random(),
    auctionId,
    orderLabel: auctionId ? `#${auctionId}` : "-",
    images: normalizeOrderImages(item?.images || item?.Images),
    deliveredAt: deliveredAt || "",
    expectedDeliveryDate: expectedDeliveryDate || "",
    dateText:
      type === "delivered"
        ? formatDateForDisplay(deliveredAt)
        : formatDateForDisplay(expectedDeliveryDate),
    raw: item,
  };
};

export const getUserDisplayProfile = async () => {
  const res = await api.get("/User/view-profile");
  return normalizeProfileResponse(res.data);
};

export const getUserAccount = async () => {
  const res = await api.get("/User/view-account");
  return normalizeProfileResponse(res.data);
};

export const getUserCountries = async () => {
  return await getCountries();
};

export const getUserCitiesByCountryId = async (countryId) => {
  return await getCities(countryId);
};

export const editUserAccount = async (payload) => {
  const formData = new FormData();

  formData.append("FullName", String(payload?.fullName || "").trim());
  formData.append("PhoneNumber", String(payload?.phoneNumber || "").trim());
  formData.append("Gender", String(Number(payload?.gender || 0)));
  formData.append("BirthDate", String(payload?.birthDate || ""));
  formData.append("CityId", String(Number(payload?.cityId || 0)));

  if (payload?.image) {
    formData.append("Image", payload.image);
  }

  const res = await api.put("/User/edit-account", formData);
  return res.data;
};

export const getUserDeliveredOrders = async () => {
  const res = await api.get("/Order/delivered");
  const list = Array.isArray(res.data) ? res.data : [];
  return list.map((item) => normalizeOrderItem(item, "delivered"));
};

export const getUserInProgressOrders = async () => {
  const res = await api.get("/Order/in-progress");
  const list = Array.isArray(res.data) ? res.data : [];
  return list.map((item) => normalizeOrderItem(item, "progress"));
};