import sellerApi from "./sellerAxios";

export const ATTRIBUTE_DATA_TYPES = {
  TEXT: 1,
  NUMBER: 2,
  BOOLEAN: 4,
  DATE: 5,
  DATETIME: 6,
  ENUM: 7,
};

export const ATTRIBUTE_UNITS = {
  0: "",
  1: "cm",
  2: "m",
  3: "inch",
  4: "g",
  5: "kg",
  6: "lb",
  7: "L",
  8: "ml",
  9: "m²",
  10: "sec",
  11: "min",
  12: "hr",
};

export const CONDITION_OPTIONS = [
  { value: 1, label: "New" },
  { value: 2, label: "Used" },
  { value: 3, label: "Refurbished" },
];

const MAX_STARTING_PRICE = 999999999;
const MAX_BID_INCREMENT = 2147483647;

const readStorage = (key) => {
  if (typeof window === "undefined") return null;

  const fromSession = sessionStorage.getItem(key);
  if (fromSession !== null && fromSession !== undefined && fromSession !== "") {
    return fromSession;
  }

  return localStorage.getItem(key);
};

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

  if (
    !token ||
    token === "undefined" ||
    token === "null" ||
    token === "[object Object]"
  ) {
    return "";
  }

  return token;
};

const getToken = (...keys) => {
  for (const key of keys) {
    const token = cleanToken(readStorage(key));
    if (token) return token;
  }

  return "";
};

const getSellerToken = () => {
  return getToken("sellerToken", "token", "userToken", "adminToken");
};

const getAuthHeaders = () => {
  const token = getSellerToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const normalizeListResponse = (data) => {
  if (Array.isArray(data)) return data;

  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.Data)) return data.Data;
  if (Array.isArray(data?.result)) return data.result;
  if (Array.isArray(data?.Result)) return data.Result;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.Items)) return data.Items;
  if (Array.isArray(data?.value)) return data.value;
  if (Array.isArray(data?.Value)) return data.Value;

  if (Array.isArray(data?.data?.items)) return data.data.items;
  if (Array.isArray(data?.data?.Items)) return data.data.Items;
  if (Array.isArray(data?.Data?.items)) return data.Data.items;
  if (Array.isArray(data?.Data?.Items)) return data.Data.Items;
  if (Array.isArray(data?.result?.items)) return data.result.items;
  if (Array.isArray(data?.result?.Items)) return data.result.Items;
  if (Array.isArray(data?.Result?.items)) return data.Result.items;
  if (Array.isArray(data?.Result?.Items)) return data.Result.Items;

  return [];
};

const pickObject = (data) => {
  if (!data || typeof data !== "object") return {};

  if (data.data && typeof data.data === "object" && !Array.isArray(data.data)) {
    return data.data;
  }

  if (data.Data && typeof data.Data === "object" && !Array.isArray(data.Data)) {
    return data.Data;
  }

  if (
    data.result &&
    typeof data.result === "object" &&
    !Array.isArray(data.result)
  ) {
    return data.result;
  }

  if (
    data.Result &&
    typeof data.Result === "object" &&
    !Array.isArray(data.Result)
  ) {
    return data.Result;
  }

  return data;
};

const firstDefined = (...values) =>
  values.find((value) => value !== undefined && value !== null && value !== "");

const hasUsefulValue = (value) => {
  if (value === undefined || value === null || value === "") return false;
  if (typeof value === "number" && value === 0) return false;
  if (typeof value === "string" && value.trim() === "") return false;
  if (typeof value === "string" && value.trim() === "0") return false;
  return true;
};

const preferUseful = (...values) => {
  const found = values.find(hasUsefulValue);
  return found !== undefined ? found : firstDefined(...values);
};

const toNumber = (value, fallback = 0) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
};

const toStringValue = (value) => {
  if (value === undefined || value === null) return "";
  return String(value).trim();
};

const isFileValue = (value) => {
  return typeof File !== "undefined" && value instanceof File;
};

const extractErrorMessage = (
  data,
  fallback = "One or more validation errors occurred."
) => {
  if (!data) return fallback;

  if (typeof data === "string") {
    return data.trim() || fallback;
  }

  const direct =
    data.message ||
    data.Message ||
    data.title ||
    data.Title ||
    data.error ||
    data.Error ||
    "";

  if (typeof direct === "string" && direct.trim()) {
    return direct.trim();
  }

  if (Array.isArray(data.errors)) {
    const first = data.errors.find(
      (item) => typeof item === "string" && item.trim()
    );
    if (first) return first.trim();
  }

  if (data.errors && typeof data.errors === "object") {
    const messages = [];

    Object.entries(data.errors).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        value.forEach((item) => {
          if (typeof item === "string" && item.trim()) {
            messages.push(`${key}: ${item.trim()}`);
          }
        });
      } else if (typeof value === "string" && value.trim()) {
        messages.push(`${key}: ${value.trim()}`);
      }
    });

    if (messages.length) return messages.join(" | ");
  }

  return fallback;
};

const normalizeBackendError = (error, fallback) => {
  const isNetworkError =
    !error?.response &&
    String(error?.message || "").toLowerCase().includes("network");

  const message = isNetworkError
    ? "Server returned 500 before CORS headers. The API crashed while processing the auction data."
    : extractErrorMessage(error?.response?.data, fallback);

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
      data: { message },
    };
  }

  return error;
};

const formatApiDateTime = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const pad = (v) => String(v).padStart(2, "0");

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate()
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(
    date.getSeconds()
  )}`;
};

const formatInputDateTime = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const pad = (v) => String(v).padStart(2, "0");

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate()
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const formatApiDateOnly = (value = new Date()) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const pad = (v) => String(v).padStart(2, "0");

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate()
  )}`;
};

const normalizeAttribute = (item) => ({
  id: toNumber(
    firstDefined(
      item?.categoryAttributeId,
      item?.CategoryAttributeId,
      item?.id,
      item?.Id,
      item?.attributeId,
      item?.AttributeId
    )
  ),
  name: toStringValue(
    firstDefined(
      item?.name,
      item?.Name,
      item?.attributeName,
      item?.AttributeName
    )
  ),
  dataType: toNumber(
    firstDefined(item?.dataType, item?.DataType, item?.type, item?.Type),
    ATTRIBUTE_DATA_TYPES.TEXT
  ),
  unit: toNumber(firstDefined(item?.unit, item?.Unit), 0),
  isRequired: Boolean(
    firstDefined(
      item?.isRequired,
      item?.IsRequired,
      item?.required,
      item?.Required,
      false
    )
  ),
});

const getDefaultAttributeValue = (attribute, payload) => {
  const dataType = Number(attribute?.dataType || 0);

  if (dataType === ATTRIBUTE_DATA_TYPES.NUMBER) return "1";
  if (dataType === ATTRIBUTE_DATA_TYPES.BOOLEAN) return "true";
  if (dataType === ATTRIBUTE_DATA_TYPES.DATE) {
    return formatApiDateOnly(payload?.startDate || new Date());
  }
  if (dataType === ATTRIBUTE_DATA_TYPES.DATETIME) {
    return formatApiDateTime(payload?.startDate || new Date());
  }

  return toStringValue(payload?.title) || "Default";
};

const normalizeCreateAttribute = (attr) => ({
  categoryAttributeId: toNumber(
    firstDefined(
      attr?.categoryAttributeId,
      attr?.CategoryAttributeId,
      attr?.id,
      attr?.Id
    )
  ),
  value:
    toStringValue(firstDefined(attr?.value, attr?.Value, "Default")) ||
    "Default",
});

const normalizeCreateItems = (payload) => {
  const rawItems =
    Array.isArray(payload?.items) && payload.items.length
      ? payload.items
      : [
          {
            title: payload?.title,
            description: payload?.description,
            categoryId: payload?.categoryId,
            image: payload?.image,
            count: 1,
            warrantyInfo: "N/A",
            condition: 1,
          },
        ];

  return rawItems
    .map((rawItem, index) => {
      const images = Array.isArray(rawItem?.images)
        ? rawItem.images
        : Array.isArray(rawItem?.Images)
        ? rawItem.Images
        : [];

      const imageFile = firstDefined(
        rawItem?.image,
        rawItem?.Image,
        rawItem?.imageFile,
        rawItem?.ImageFile,
        images.find(isFileValue),
        index === 0 ? payload?.image : null,
        null
      );

      return {
        id: toNumber(firstDefined(rawItem?.id, rawItem?.Id, rawItem?.itemId, rawItem?.ItemId), 0),
        title: toStringValue(
          firstDefined(rawItem?.title, rawItem?.Title, payload?.title)
        ),
        description: toStringValue(
          firstDefined(
            rawItem?.description,
            rawItem?.Description,
            payload?.description
          )
        ),
        count: toNumber(firstDefined(rawItem?.count, rawItem?.Count, 1), 1),
        warrantyInfo:
          toStringValue(
            firstDefined(rawItem?.warrantyInfo, rawItem?.WarrantyInfo, "N/A")
          ) || "N/A",
        condition: toNumber(
          firstDefined(rawItem?.condition, rawItem?.Condition, 1),
          1
        ),
        categoryId: toNumber(
          firstDefined(rawItem?.categoryId, rawItem?.CategoryId, payload?.categoryId),
          0
        ),
        imageFile,
        images: images.filter(isFileValue),
        attributes: Array.isArray(rawItem?.attributes)
          ? rawItem.attributes
              .map(normalizeCreateAttribute)
              .filter((item) => item.categoryAttributeId > 0)
          : Array.isArray(rawItem?.Attributes)
          ? rawItem.Attributes
              .map(normalizeCreateAttribute)
              .filter((item) => item.categoryAttributeId > 0)
          : [],
      };
    })
    .filter((item) => item.title && item.description);
};

const validateAuctionPayload = (payload, { requireDates = true } = {}) => {
  const title = toStringValue(payload?.title);
  const description = toStringValue(payload?.description);
  const startingPrice = Number(payload?.startingPrice);
  const bidIncrement = Number(payload?.bidIncrement);
  const startDate = formatApiDateTime(payload?.startDate);
  const endDate = formatApiDateTime(payload?.endDate);
  const categoryId = Number(payload?.categoryId);

  if (!title) throw new Error("Title is required.");
  if (!description) throw new Error("Description is required.");

  if (!categoryId) throw new Error("Category is required.");

  if (payload?.startingPrice !== undefined && payload?.startingPrice !== "") {
    if (!Number.isFinite(startingPrice) || startingPrice <= 0) {
      throw new Error("Starting price must be greater than 0.");
    }

    if (startingPrice > MAX_STARTING_PRICE) {
      throw new Error(
        `Starting price is too large. Maximum allowed is ${MAX_STARTING_PRICE}.`
      );
    }
  }

  if (payload?.bidIncrement !== undefined && payload?.bidIncrement !== "") {
    if (!Number.isFinite(bidIncrement) || bidIncrement <= 0) {
      throw new Error("Bid increment must be greater than 0.");
    }

    if (!Number.isInteger(bidIncrement)) {
      throw new Error("Bid increment must be a whole number.");
    }

    if (bidIncrement > MAX_BID_INCREMENT) {
      throw new Error(
        `Bid increment is too large. Maximum allowed is ${MAX_BID_INCREMENT}.`
      );
    }
  }

  if (requireDates) {
    if (!startDate) throw new Error("Start date is required.");
    if (!endDate) throw new Error("End date is required.");

    if (new Date(endDate).getTime() <= new Date(startDate).getTime()) {
      throw new Error("End date must be after start date.");
    }
  }

  const items = normalizeCreateItems(payload);

  if (!items.length) {
    throw new Error("At least one auction item is required.");
  }

  items.forEach((item, index) => {
    if (!item.title) throw new Error(`Item ${index + 1} title is required.`);
    if (!item.description) throw new Error(`Item ${index + 1} description is required.`);
    if (!Number(item.count) || Number(item.count) <= 0) {
      throw new Error(`Item ${index + 1} count must be greater than 0.`);
    }
  });
};

const loadHiddenAttributesForCreate = async (categoryId, payload) => {
  try {
    const attrs = await getCategoryAttributes(categoryId);

    return attrs
      .map((attr) => ({
        categoryAttributeId: Number(attr.id),
        value: getDefaultAttributeValue(attr, payload),
      }))
      .filter((attr) => attr.categoryAttributeId > 0 && attr.value !== "");
  } catch {
    return [];
  }
};

const appendToParamsAndForm = (params, formData, key, value) => {
  if (value === undefined || value === null) return;

  const finalValue = String(value);

  params.append(key, finalValue);
  formData.append(key, finalValue);
};

const buildAuctionParamsAndFormData = async (payload, { includeCreateFields = true } = {}) => {
  const params = new URLSearchParams();
  const formData = new FormData();
  const items = normalizeCreateItems(payload);

  appendToParamsAndForm(params, formData, "Title", toStringValue(payload?.title));
  appendToParamsAndForm(params, formData, "Description", toStringValue(payload?.description));
  appendToParamsAndForm(params, formData, "CategoryId", String(Number(payload?.categoryId || 0)));

  if (includeCreateFields || payload?.startingPrice !== undefined) {
    appendToParamsAndForm(params, formData, "StartingPrice", String(Number(payload?.startingPrice || 0)));
  }

  if (includeCreateFields || payload?.bidIncrement !== undefined) {
    appendToParamsAndForm(params, formData, "BidIncrement", String(Number(payload?.bidIncrement || 0)));
  }

  if (includeCreateFields || payload?.startDate) {
    appendToParamsAndForm(params, formData, "StartDate", formatApiDateTime(payload?.startDate));
  }

  if (includeCreateFields || payload?.endDate) {
    appendToParamsAndForm(params, formData, "EndDate", formatApiDateTime(payload?.endDate));
  }

  if (isFileValue(payload?.image)) {
    formData.append("Image", payload.image);
  }

  for (let itemIndex = 0; itemIndex < items.length; itemIndex += 1) {
    const item = items[itemIndex];

    let itemAttributes = item.attributes;

    if (!itemAttributes.length && item.categoryId) {
      itemAttributes = await loadHiddenAttributesForCreate(item.categoryId, payload);
    }

    if (item.id) {
      appendToParamsAndForm(params, formData, `Items[${itemIndex}].Id`, item.id);
    }

    appendToParamsAndForm(params, formData, `Items[${itemIndex}].Title`, item.title);
    appendToParamsAndForm(params, formData, `Items[${itemIndex}].Description`, item.description);
    appendToParamsAndForm(params, formData, `Items[${itemIndex}].Count`, item.count || 1);
    appendToParamsAndForm(params, formData, `Items[${itemIndex}].WarrantyInfo`, item.warrantyInfo || "N/A");
    appendToParamsAndForm(params, formData, `Items[${itemIndex}].Condition`, item.condition || 1);

    if (item.categoryId) {
      appendToParamsAndForm(params, formData, `Items[${itemIndex}].CategoryId`, item.categoryId);
    }

    if (isFileValue(item.imageFile)) {
      formData.append(`Items[${itemIndex}].Image`, item.imageFile);
      formData.append(`Items[${itemIndex}].Images`, item.imageFile);
      formData.append(`Items[${itemIndex}].images`, item.imageFile);
    }

    item.images.forEach((file) => {
      if (isFileValue(file)) {
        formData.append(`Items[${itemIndex}].Images`, file);
        formData.append(`Items[${itemIndex}].images`, file);
      }
    });

    itemAttributes.forEach((attr, attrIndex) => {
      appendToParamsAndForm(
        params,
        formData,
        `Items[${itemIndex}].Attributes[${attrIndex}].CategoryAttributeId`,
        attr.categoryAttributeId
      );

      appendToParamsAndForm(
        params,
        formData,
        `Items[${itemIndex}].Attributes[${attrIndex}].Value`,
        attr.value || "Default"
      );

      appendToParamsAndForm(
        params,
        formData,
        `Items[${itemIndex}].attributes[${attrIndex}].categoryAttributeId`,
        attr.categoryAttributeId
      );

      appendToParamsAndForm(
        params,
        formData,
        `Items[${itemIndex}].attributes[${attrIndex}].value`,
        attr.value || "Default"
      );
    });
  }

  return { params, formData };
};

const getCurrentAccountKey = () => {
  if (typeof window === "undefined") return "guest";

  return String(
    localStorage.getItem("currentUserEmail") ||
      sessionStorage.getItem("currentUserEmail") ||
      localStorage.getItem("pendingEmail") ||
      sessionStorage.getItem("pendingEmail") ||
      "guest"
  )
    .trim()
    .toLowerCase();
};

const CREATED_AUCTIONS_CACHE_KEY = `created_auctions_cache:${getCurrentAccountKey()}`;

const getResponseId = (data) => {
  const root = pickObject(data);

  return toNumber(
    firstDefined(
      root?.auctionId,
      root?.AuctionId,
      root?.id,
      root?.Id,
      root?.data?.auctionId,
      root?.data?.AuctionId,
      root?.data?.id,
      root?.data?.Id,
      data?.auctionId,
      data?.AuctionId,
      data?.id,
      data?.Id
    ),
    0
  );
};

const readCreatedAuctionCache = () => {
  if (typeof window === "undefined") return [];

  try {
    const raw = localStorage.getItem(CREATED_AUCTIONS_CACHE_KEY);
    const parsed = JSON.parse(raw || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeCreatedAuctionCache = (items) => {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(
      CREATED_AUCTIONS_CACHE_KEY,
      JSON.stringify(items.slice(0, 60))
    );
  } catch {
    //
  }
};

const rememberCreatedAuction = (payload, responseData) => {
  const items = normalizeCreateItems(payload);
  const responseId = getResponseId(responseData);

  const cached = {
    id: responseId || 0,
    title: toStringValue(payload?.title),
    description: toStringValue(payload?.description),
    categoryId: Number(payload?.categoryId || items[0]?.categoryId || 0),
    startingPrice: Number(payload?.startingPrice || 0),
    currentPrice: Number(payload?.startingPrice || 0),
    bidIncrement: Number(payload?.bidIncrement || 0),
    startDate: formatApiDateTime(payload?.startDate),
    endDate: formatApiDateTime(payload?.endDate),
    itemCount: items.length,
    totalBids: 0,
    cachedAt: Date.now(),
  };

  const oldItems = readCreatedAuctionCache();

  const withoutDuplicate = oldItems.filter((item) => {
    if (cached.id && Number(item.id) === cached.id) return false;

    return !(
      String(item.title || "").trim().toLowerCase() === cached.title.toLowerCase() &&
      String(item.description || "").trim().toLowerCase() ===
        cached.description.toLowerCase()
    );
  });

  writeCreatedAuctionCache([cached, ...withoutDuplicate]);
};

const normalizeViewItem = (item, fallbackCategoryId, fallbackDescription) => {
  const rawAttributes = normalizeListResponse(
    item?.attributes || item?.Attributes || item?.categoryAttributes || []
  );

  return {
    id: toNumber(firstDefined(item?.id, item?.Id, item?.itemId, item?.ItemId), 0),
    title: toStringValue(firstDefined(item?.title, item?.Title)),
    count: toNumber(firstDefined(item?.count, item?.Count), 1),
    description: toStringValue(
      firstDefined(item?.description, item?.Description, fallbackDescription, "")
    ),
    warrantyInfo: toStringValue(
      firstDefined(item?.warrantyInfo, item?.WarrantyInfo)
    ),
    condition: toNumber(firstDefined(item?.condition, item?.Condition), 1),
    categoryId: toNumber(
      firstDefined(item?.categoryId, item?.CategoryId, fallbackCategoryId),
      0
    ),
    categoryName: toStringValue(
      firstDefined(
        item?.categoryName,
        item?.CategoryName,
        item?.category?.name,
        item?.Category?.Name
      )
    ),
    startingPrice: firstDefined(
      item?.startingPrice,
      item?.StartingPrice,
      item?.startPrice,
      item?.StartPrice,
      item?.price,
      item?.Price,
      null
    ),
    image: toStringValue(
      firstDefined(
        item?.image,
        item?.Image,
        item?.mainImage,
        item?.MainImage,
        item?.itemImage,
        item?.ItemImage
      )
    ),
    images: Array.isArray(item?.images)
      ? item.images
      : Array.isArray(item?.Images)
      ? item.Images
      : [],
    attributes: rawAttributes
      .map((attr) => ({
        categoryAttributeId: toNumber(
          firstDefined(
            attr?.categoryAttributeId,
            attr?.CategoryAttributeId,
            attr?.id,
            attr?.Id
          )
        ),
        name: toStringValue(
          firstDefined(
            attr?.name,
            attr?.Name,
            attr?.attributeName,
            attr?.AttributeName
          )
        ),
        value: toStringValue(firstDefined(attr?.value, attr?.Value)),
      }))
      .filter((attr) => attr.categoryAttributeId > 0),
  };
};

const normalizeAuctionView = (data, fallbackId = 0) => {
  const root = pickObject(data);

  const itemsRaw = normalizeListResponse(
    firstDefined(root?.items, root?.Items, data?.items, data?.Items)
  );

  const items = itemsRaw.map((item) =>
    normalizeViewItem(
      item,
      toNumber(firstDefined(root?.categoryId, root?.CategoryId), 0),
      toStringValue(firstDefined(root?.description, root?.Description))
    )
  );

  const firstItem = items[0] || {};

  return {
    id: toNumber(
      firstDefined(root?.id, root?.auctionId, root?.Id, root?.AuctionId, fallbackId),
      fallbackId
    ),
    title: toStringValue(firstDefined(root?.title, root?.Title)),
    description: toStringValue(firstDefined(root?.description, root?.Description)),
    categoryId: toNumber(
      firstDefined(root?.categoryId, root?.CategoryId, firstItem.categoryId),
      0
    ),
    categoryName: toStringValue(
      firstDefined(
        root?.categoryName,
        root?.CategoryName,
        root?.category?.name,
        root?.Category?.Name,
        firstItem.categoryName
      )
    ),
    image: toStringValue(
      firstDefined(
        root?.image,
        root?.Image,
        root?.mainImage,
        root?.MainImage,
        firstItem.image
      )
    ),
    startDate: toStringValue(
      firstDefined(
        root?.startDate,
        root?.StartDate,
        root?.startsAt,
        root?.StartsAt,
        root?.startTime,
        root?.StartTime
      )
    ),
    endDate: toStringValue(
      firstDefined(
        root?.endDate,
        root?.EndDate,
        root?.endsAt,
        root?.EndsAt,
        root?.endTime,
        root?.EndTime
      )
    ),
    startingPrice: preferUseful(
      root?.startingPrice,
      root?.StartingPrice,
      root?.startPrice,
      root?.StartPrice,
      root?.openingPrice,
      root?.OpeningPrice,
      root?.price,
      root?.Price,
      firstItem.startingPrice,
      null
    ),
    bidIncrement: preferUseful(
      root?.bidIncrement,
      root?.BidIncrement,
      root?.increment,
      root?.Increment,
      1
    ),
    currentPrice: preferUseful(
      root?.currentPrice,
      root?.CurrentPrice,
      root?.finalPrice,
      root?.FinalPrice,
      root?.startingPrice,
      root?.StartingPrice,
      null
    ),
    totalBids: firstDefined(
      root?.totalBids,
      root?.TotalBids,
      root?.bidsCount,
      root?.BidsCount,
      root?.bidCount,
      root?.BidCount,
      0
    ),
    status: firstDefined(
      root?.status,
      root?.Status,
      root?.auctionStatus,
      root?.AuctionStatus,
      null
    ),
    itemCount: toNumber(
      firstDefined(
        root?.itemCount,
        root?.ItemCount,
        root?.itemsCount,
        root?.ItemsCount,
        items.length
      ),
      items.length
    ),
    items,
  };
};

const normalizeHistoryAuction = (item, index) => {
  const root = pickObject(item);

  const nestedAuction = pickObject(
    firstDefined(
      root?.auction,
      root?.Auction,
      root?.auctionDto,
      root?.AuctionDto,
      root?.auctionData,
      root?.AuctionData,
      null
    )
  );

  const source =
    nestedAuction && Object.keys(nestedAuction).length ? nestedAuction : root;

  const itemsRaw = normalizeListResponse(
    firstDefined(
      source?.items,
      source?.Items,
      root?.items,
      root?.Items,
      source?.auctionItems,
      source?.AuctionItems,
      root?.auctionItems,
      root?.AuctionItems
    )
  );

  const firstItem = itemsRaw[0] || {};

  const categoryId = toNumber(
    firstDefined(
      source?.categoryId,
      source?.CategoryId,
      root?.categoryId,
      root?.CategoryId,
      firstItem?.categoryId,
      firstItem?.CategoryId
    ),
    0
  );

  const startingPrice = preferUseful(
    source?.startingPrice,
    source?.StartingPrice,
    source?.startPrice,
    source?.StartPrice,
    source?.openingPrice,
    source?.OpeningPrice,
    source?.minimumPrice,
    source?.MinimumPrice,
    source?.initialPrice,
    source?.InitialPrice,
    source?.price,
    source?.Price,
    root?.startingPrice,
    root?.StartingPrice,
    root?.price,
    root?.Price,
    0
  );

  return {
    id: toNumber(
      firstDefined(
        source?.id,
        source?.auctionId,
        source?.Id,
        source?.AuctionId,
        root?.id,
        root?.auctionId,
        root?.Id,
        root?.AuctionId
      ),
      index + 1
    ),
    title: toStringValue(
      firstDefined(
        source?.title,
        source?.auctionTitle,
        source?.Title,
        source?.AuctionTitle,
        root?.title,
        root?.Title,
        "Auction"
      )
    ),
    description: toStringValue(
      firstDefined(
        source?.description,
        source?.Description,
        root?.description,
        root?.Description,
        source?.details,
        root?.details,
        ""
      )
    ),
    categoryId,
    categoryName: toStringValue(
      firstDefined(
        source?.categoryName,
        source?.CategoryName,
        root?.categoryName,
        root?.CategoryName,
        source?.category?.name,
        source?.Category?.Name,
        root?.category?.name,
        root?.Category?.Name,
        firstItem?.categoryName,
        firstItem?.CategoryName,
        firstItem?.category?.name,
        firstItem?.Category?.Name
      )
    ),
    image: toStringValue(
      firstDefined(
        source?.image,
        source?.Image,
        source?.mainImage,
        source?.MainImage,
        root?.image,
        root?.Image,
        firstItem?.image,
        firstItem?.Image,
        firstItem?.mainImage,
        firstItem?.MainImage
      )
    ),
    startDate: toStringValue(
      firstDefined(
        source?.startDate,
        source?.StartDate,
        source?.startsAt,
        source?.StartsAt,
        source?.startTime,
        source?.StartTime,
        root?.startDate,
        root?.StartDate,
        root?.startsAt,
        root?.StartsAt,
        root?.startTime,
        root?.StartTime
      )
    ),
    endDate: toStringValue(
      firstDefined(
        source?.endDate,
        source?.EndDate,
        source?.endsAt,
        source?.EndsAt,
        source?.endTime,
        source?.EndTime,
        root?.endDate,
        root?.EndDate,
        root?.endsAt,
        root?.EndsAt,
        root?.endTime,
        root?.EndTime
      )
    ),
    status: firstDefined(
      source?.status,
      source?.Status,
      source?.auctionStatus,
      source?.AuctionStatus,
      root?.status,
      root?.Status,
      ""
    ),
    startingPrice,
    currentPrice: preferUseful(
      source?.currentPrice,
      source?.CurrentPrice,
      source?.finalPrice,
      source?.FinalPrice,
      root?.currentPrice,
      root?.CurrentPrice,
      startingPrice,
      0
    ),
    totalBids: firstDefined(
      source?.totalBids,
      source?.TotalBids,
      source?.bidsCount,
      source?.BidsCount,
      source?.bidCount,
      source?.BidCount,
      root?.totalBids,
      root?.TotalBids,
      0
    ),
    itemCount: toNumber(
      firstDefined(
        source?.itemCount,
        source?.ItemCount,
        source?.itemsCount,
        source?.ItemsCount,
        source?.auctionItemsCount,
        source?.AuctionItemsCount,
        root?.itemCount,
        root?.ItemCount,
        root?.itemsCount,
        root?.ItemsCount,
        itemsRaw.length
      ),
      itemsRaw.length
    ),
  };
};

const findCachedAuction = (historyItem) => {
  const cache = readCreatedAuctionCache();

  const byId = cache.find(
    (item) => Number(item.id || 0) > 0 && Number(item.id) === Number(historyItem.id)
  );

  if (byId) return byId;

  const historyTitle = String(historyItem.title || "").trim().toLowerCase();
  const historyDescription = String(historyItem.description || "")
    .trim()
    .toLowerCase();

  return cache.find((item) => {
    const cacheTitle = String(item.title || "").trim().toLowerCase();
    const cacheDescription = String(item.description || "").trim().toLowerCase();

    return cacheTitle === historyTitle && cacheDescription === historyDescription;
  });
};

const mergeHistoryWithExtra = (historyItem, extraItem) => {
  if (!extraItem) return historyItem;

  const extraItems = Array.isArray(extraItem.items) ? extraItem.items : [];
  const firstExtraItem = extraItems[0] || {};

  return {
    ...historyItem,
    title: toStringValue(
      preferUseful(historyItem.title, extraItem.title, firstExtraItem.title)
    ),
    description: toStringValue(
      preferUseful(
        historyItem.description,
        extraItem.description,
        firstExtraItem.description
      )
    ),
    categoryId: toNumber(
      preferUseful(historyItem.categoryId, extraItem.categoryId, firstExtraItem.categoryId),
      0
    ),
    categoryName: toStringValue(
      preferUseful(
        historyItem.categoryName,
        extraItem.categoryName,
        firstExtraItem.categoryName
      )
    ),
    image: toStringValue(
      preferUseful(historyItem.image, extraItem.image, firstExtraItem.image)
    ),
    startDate: toStringValue(
      preferUseful(historyItem.startDate, extraItem.startDate)
    ),
    endDate: toStringValue(preferUseful(historyItem.endDate, extraItem.endDate)),
    startingPrice: preferUseful(
      historyItem.startingPrice,
      extraItem.startingPrice,
      firstExtraItem.startingPrice,
      0
    ),
    currentPrice: preferUseful(
      historyItem.currentPrice,
      extraItem.currentPrice,
      extraItem.startingPrice,
      historyItem.startingPrice,
      0
    ),
    totalBids: firstDefined(historyItem.totalBids, extraItem.totalBids, 0),
    itemCount: toNumber(
      preferUseful(
        historyItem.itemCount,
        extraItem.itemCount,
        extraItem.itemsCount,
        extraItems.length
      ),
      extraItems.length
    ),
  };
};

export const getAuctionCategories = async () => {
  const res = await sellerApi.get("/Auction/Get-Categories", {
    headers: getAuthHeaders(),
  });

  return normalizeListResponse(res.data)
    .map((item) => ({
      id: toNumber(
        firstDefined(item?.id, item?.Id, item?.categoryId, item?.CategoryId)
      ),
      name: toStringValue(
        firstDefined(
          item?.name,
          item?.Name,
          item?.categoryName,
          item?.CategoryName
        )
      ),
    }))
    .filter((item) => item.id && item.name);
};

export const getCategoryAttributes = async (categoryId) => {
  const token = getSellerToken();
  const numericCategoryId = Number(categoryId || 0);

  if (!token) {
    throw new Error("Authentication token not found. Please login again.");
  }

  if (!numericCategoryId) return [];

  const res = await sellerApi.get(
    `/Auction/Get-Attributes/${numericCategoryId}`,
    {
      headers: getAuthHeaders(),
    }
  );

  return normalizeListResponse(res.data)
    .map(normalizeAttribute)
    .filter((item) => item.id && item.name);
};

export const createAuction = async (payload) => {
  const token = getSellerToken();

  if (!token) {
    throw new Error("Authentication token not found. Please login again.");
  }

  validateAuctionPayload(payload, { requireDates: true });

  try {
    const { params, formData } = await buildAuctionParamsAndFormData(payload, {
      includeCreateFields: true,
    });

    console.log("CREATE AUCTION QUERY VALUES:", Object.fromEntries(params.entries()));
    console.log("CREATE AUCTION FORMDATA VALUES:");
    for (const [key, value] of formData.entries()) {
      if (value instanceof File) {
        console.log(key, {
          fileName: value.name,
          fileType: value.type,
          fileSize: value.size,
        });
      } else {
        console.log(key, value);
      }
    }

    const res = await sellerApi.post(
      `/Auction/Create-Auction?${params.toString()}`,
      formData,
      {
        headers: getAuthHeaders(),
      }
    );

    console.log("CREATE AUCTION API RESPONSE:", res.data);

    rememberCreatedAuction(payload, res?.data);

    return {
      ...(res?.data && typeof res.data === "object" ? res.data : {}),
      message:
        res?.data?.message ||
        res?.data?.Message ||
        "Auction created successfully.",
    };
  } catch (error) {
    console.log("CREATE AUCTION ERROR:", error?.response?.data || error);
    throw normalizeBackendError(error, "Failed to create auction.");
  }
};

export const getAuctionHistory = async ({
  status = "",
  page = 1,
  pageSize = 10,
} = {}) => {
  const token = getSellerToken();

  if (!token) {
    throw new Error("Authentication token not found. Please login again.");
  }

  const params = {
    page: Number(page || 1),
    pageSize: Number(pageSize || 10),
  };

  if (status !== "" && status !== undefined && status !== null) {
    params.status = Number(status);
  }

  const res = await sellerApi.get("/Auction/Get-History", {
    params,
    headers: getAuthHeaders(),
  });

  const root = pickObject(res.data);
  let list = normalizeListResponse(res.data).map(normalizeHistoryAuction);

  let categoryMap = new Map();

  try {
    const categories = await getAuctionCategories();
    categoryMap = new Map(
      categories.map((category) => [Number(category.id), category.name])
    );
  } catch {
    categoryMap = new Map();
  }

  list = await Promise.all(
    list.map(async (auction) => {
      let merged = auction;

      if (auction.id) {
        try {
          const view = await getAuctionView(auction.id);
          merged = mergeHistoryWithExtra(merged, view);
        } catch {
          //
        }
      }

      const cached = findCachedAuction(merged);
      merged = mergeHistoryWithExtra(merged, cached);

      return {
        ...merged,
        categoryName:
          merged.categoryName ||
          categoryMap.get(Number(merged.categoryId)) ||
          (merged.categoryId ? `Category #${merged.categoryId}` : ""),
      };
    })
  );

  return {
    items: list,
    currentPage: Number(firstDefined(root?.currentPage, root?.page, page, 1)),
    totalPages: Number(firstDefined(root?.totalPages, root?.pages, 1)),
    pageSize: Number(firstDefined(root?.pageSize, root?.PageSize, pageSize, 10)),
    totalCount: Number(firstDefined(root?.totalCount, root?.count, list.length)),
    hasNextPage: Boolean(
      firstDefined(
        root?.hasNextPage,
        Number(firstDefined(root?.currentPage, page, 1)) <
          Number(firstDefined(root?.totalPages, 1))
      )
    ),
  };
};

export const getAuctionView = async (id) => {
  const token = getSellerToken();

  if (!token) {
    throw new Error("Authentication token not found. Please login again.");
  }

  const auctionId = Number(id || 0);

  if (!auctionId) {
    throw new Error("Invalid auction id.");
  }

  try {
    const res = await sellerApi.get(`/Auction/View/${auctionId}`, {
      headers: getAuthHeaders(),
    });

    console.log("VIEW AUCTION API RESPONSE:", res.data);

    return normalizeAuctionView(res.data, auctionId);
  } catch (error) {
    throw normalizeBackendError(error, "Failed to load auction details.");
  }
};

export const editAuction = async (id, payload) => {
  const token = getSellerToken();

  if (!token) {
    throw new Error("Authentication token not found. Please login again.");
  }

  const auctionId = Number(id || 0);

  if (!auctionId) {
    throw new Error("Invalid auction id.");
  }

  validateAuctionPayload(payload, { requireDates: false });

  try {
    const { params, formData } = await buildAuctionParamsAndFormData(payload, {
      includeCreateFields: false,
    });

    console.log("EDIT AUCTION QUERY VALUES:", Object.fromEntries(params.entries()));
    console.log("EDIT AUCTION FORMDATA VALUES:");
    for (const [key, value] of formData.entries()) {
      if (value instanceof File) {
        console.log(key, {
          fileName: value.name,
          fileType: value.type,
          fileSize: value.size,
        });
      } else {
        console.log(key, value);
      }
    }

    const res = await sellerApi.put(
      `/Auction/edit/${auctionId}?${params.toString()}`,
      formData,
      {
        headers: getAuthHeaders(),
      }
    );

    console.log("EDIT AUCTION API RESPONSE:", res.data);

    return {
      ...(res?.data && typeof res.data === "object" ? res.data : {}),
      message:
        res?.data?.message ||
        res?.data?.Message ||
        "Auction updated successfully.",
    };
  } catch (error) {
    console.log("EDIT AUCTION ERROR:", error?.response?.data || error);
    throw normalizeBackendError(error, "Failed to update auction.");
  }
};

export const deleteAuction = async (id) => {
  const token = getSellerToken();

  if (!token) {
    throw new Error("Authentication token not found. Please login again.");
  }

  const auctionId = Number(id || 0);

  if (!auctionId) {
    throw new Error("Invalid auction id.");
  }

  try {
    const res = await sellerApi.delete(`/Auction/Delete/${auctionId}`, {
      headers: getAuthHeaders(),
    });

    console.log("DELETE AUCTION API RESPONSE:", res.data);

    return {
      ...(res?.data && typeof res.data === "object" ? res.data : {}),
      message:
        res?.data?.message ||
        res?.data?.Message ||
        "Deleted Successfully",
    };
  } catch (error) {
    console.log("DELETE AUCTION ERROR:", error?.response?.data || error);
    throw normalizeBackendError(error, "Failed to delete auction.");
  }
};

export const prepareAuctionForEditForm = (auction) => {
  return {
    title: auction?.title || "",
    description: auction?.description || "",
    categoryId: Number(auction?.categoryId || 0),
    categoryName: auction?.categoryName || "",
    image: null,
    existingImage: auction?.image || "",
    startingPrice: Number(auction?.startingPrice || 0),
    bidIncrement: Number(auction?.bidIncrement || 1),
    startDate: formatInputDateTime(auction?.startDate),
    endDate: formatInputDateTime(auction?.endDate),
    items: Array.isArray(auction?.items)
      ? auction.items.map((item) => ({
          id: Number(item?.id || 0),
          title: item?.title || "",
          description: item?.description || "",
          count: Number(item?.count || 1),
          condition: Number(item?.condition || 1),
          warrantyInfo: item?.warrantyInfo || "",
          categoryId: Number(item?.categoryId || auction?.categoryId || 0),
          image: null,
          images: [],
          existingImages: Array.isArray(item?.images) ? item.images : [],
          attributes: Array.isArray(item?.attributes)
            ? item.attributes.map((attr) => ({
                categoryAttributeId: Number(attr?.categoryAttributeId || attr?.id || 0),
                name: attr?.name || "",
                value: attr?.value || "",
              }))
            : [],
        }))
      : [],
  };
};