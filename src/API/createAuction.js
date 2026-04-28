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

const readStorage = (key) => {
  const fromSession =
    typeof window !== "undefined" ? sessionStorage.getItem(key) : null;

  if (fromSession !== null && fromSession !== undefined && fromSession !== "") {
    return fromSession;
  }

  const fromLocal =
    typeof window !== "undefined" ? localStorage.getItem(key) : null;

  return fromLocal;
};

const cleanToken = (value) => {
  if (!value) return "";

  let token = String(value).trim();

  try {
    const parsed = JSON.parse(token);
    if (typeof parsed === "string") {
      token = parsed.trim();
    }
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

const normalizeListResponse = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.Data)) return data.Data;
  if (Array.isArray(data?.result)) return data.result;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.value)) return data.value;
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
  return data;
};

const firstDefined = (...values) =>
  values.find((value) => value !== undefined && value !== null);

const toNumber = (value, fallback = 0) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
};

const toStringValue = (value) => {
  if (value === undefined || value === null) return "";
  return String(value).trim();
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
      item?.Required
    )
  ),
});

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
    for (const value of Object.values(data.errors)) {
      if (Array.isArray(value)) {
        const first = value.find(
          (item) => typeof item === "string" && item.trim()
        );
        if (first) return first.trim();
      }

      if (typeof value === "string" && value.trim()) {
        return value.trim();
      }
    }
  }

  return fallback;
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

const normalizeItem = (item, fallbackCategoryId, fallbackDescription) => {
  const attributes = Array.isArray(item?.attributes) ? item.attributes : [];

  return {
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
    imageFile: firstDefined(item?.image, item?.imageFile, null),
    attributes: attributes
      .map((attr) => ({
        categoryAttributeId: toNumber(
          firstDefined(attr?.categoryAttributeId, attr?.CategoryAttributeId)
        ),
        value: toStringValue(firstDefined(attr?.value, attr?.Value)),
      }))
      .filter((attr) => attr.categoryAttributeId > 0 && attr.value !== ""),
  };
};

const appendIfHasValue = (formData, key, value) => {
  if (value === undefined || value === null || value === "") return;
  formData.append(key, value);
};

const buildCreateAuctionFormData = (payload, items) => {
  const formData = new FormData();

  appendIfHasValue(formData, "Title", toStringValue(payload?.title));
  appendIfHasValue(formData, "Description", toStringValue(payload?.description));
  appendIfHasValue(formData, "categoryId", Number(payload?.categoryId));
  appendIfHasValue(formData, "StartingPrice", Number(payload?.startingPrice));
  appendIfHasValue(formData, "BidIncrement", Number(payload?.bidIncrement));
  appendIfHasValue(formData, "StartDate", formatApiDateTime(payload?.startDate));
  appendIfHasValue(formData, "EndDate", formatApiDateTime(payload?.endDate));

  if (payload?.image instanceof File) {
    formData.append("Image", payload.image);
  }

  items.forEach((item, itemIndex) => {
    appendIfHasValue(formData, `Items[${itemIndex}].title`, item.title);
    appendIfHasValue(formData, `Items[${itemIndex}].count`, item.count);
    appendIfHasValue(formData, `Items[${itemIndex}].description`, item.description);
    appendIfHasValue(
      formData,
      `Items[${itemIndex}].warrantyInfo`,
      item.warrantyInfo
    );
    appendIfHasValue(formData, `Items[${itemIndex}].condition`, item.condition);
    appendIfHasValue(formData, `Items[${itemIndex}].categoryId`, item.categoryId);

    if (item.imageFile instanceof File) {
      formData.append(`Items[${itemIndex}].images`, item.imageFile);
    }

    item.attributes.forEach((attr, attrIndex) => {
      appendIfHasValue(
        formData,
        `Items[${itemIndex}].attributes[${attrIndex}].categoryAttributeId`,
        attr.categoryAttributeId
      );
      appendIfHasValue(
        formData,
        `Items[${itemIndex}].attributes[${attrIndex}].value`,
        attr.value
      );
    });
  });

  return formData;
};

const normalizeViewItem = (item, fallbackCategoryId, fallbackDescription) => {
  const rawAttributes = normalizeListResponse(
    item?.attributes || item?.Attributes || item?.categoryAttributes || []
  );

  return {
    id: toNumber(firstDefined(item?.id, item?.itemId, item?.ItemId), 0),
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

const normalizeAuctionView = (data) => {
  const root = pickObject(data);

  const itemsRaw = normalizeListResponse(
    firstDefined(root?.items, root?.Items, data?.items, data?.Items)
  );

  return {
    id: toNumber(
      firstDefined(root?.id, root?.auctionId, root?.Id, root?.AuctionId),
      0
    ),
    title: toStringValue(firstDefined(root?.title, root?.Title)),
    description: toStringValue(
      firstDefined(root?.description, root?.Description)
    ),
    categoryId: toNumber(firstDefined(root?.categoryId, root?.CategoryId), 0),
    categoryName: toStringValue(
      firstDefined(root?.categoryName, root?.CategoryName)
    ),
    image: toStringValue(
      firstDefined(root?.image, root?.Image, root?.mainImage, root?.MainImage)
    ),
    startDate: toStringValue(firstDefined(root?.startDate, root?.StartDate)),
    endDate: toStringValue(firstDefined(root?.endDate, root?.EndDate)),
    startingPrice: firstDefined(
      root?.startingPrice,
      root?.StartingPrice,
      root?.price,
      root?.Price,
      null
    ),
    currentPrice: firstDefined(
      root?.currentPrice,
      root?.CurrentPrice,
      root?.finalPrice,
      root?.FinalPrice,
      null
    ),
    totalBids: firstDefined(root?.totalBids, root?.TotalBids, null),
    status: firstDefined(root?.status, root?.Status, root?.auctionStatus, null),
    items: itemsRaw.map((item) =>
      normalizeViewItem(
        item,
        toNumber(firstDefined(root?.categoryId, root?.CategoryId), 0),
        toStringValue(firstDefined(root?.description, root?.Description))
      )
    ),
  };
};

const normalizeHistoryAuction = (item, index) => ({
  id: toNumber(
    firstDefined(item?.id, item?.auctionId, item?.Id, item?.AuctionId),
    index + 1
  ),
  title: toStringValue(
    firstDefined(item?.title, item?.auctionTitle, item?.Title, "Auction")
  ),
  description: toStringValue(
    firstDefined(item?.description, item?.Description, item?.details, "")
  ),
  categoryName: toStringValue(
    firstDefined(item?.categoryName, item?.CategoryName)
  ),
  image: toStringValue(
    firstDefined(item?.image, item?.Image, item?.mainImage, item?.MainImage)
  ),
  startDate: toStringValue(firstDefined(item?.startDate, item?.StartDate)),
  endDate: toStringValue(firstDefined(item?.endDate, item?.EndDate)),
  status: firstDefined(item?.status, item?.Status, item?.auctionStatus, ""),
  startingPrice: firstDefined(
    item?.startingPrice,
    item?.StartingPrice,
    item?.price,
    item?.Price,
    null
  ),
  currentPrice: firstDefined(
    item?.currentPrice,
    item?.CurrentPrice,
    item?.finalPrice,
    item?.FinalPrice,
    null
  ),
  totalBids: firstDefined(item?.totalBids, item?.TotalBids, 0),
  itemCount: firstDefined(item?.itemCount, item?.ItemsCount, 0),
});

export const getAuctionCategories = async () => {
  const token = getSellerToken();

  const res = await sellerApi.get("/Auction/Get-Categories", {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
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

  if (!numericCategoryId) return [];

  const res = await sellerApi.get(`/Auction/Get-Attributes/${numericCategoryId}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  return normalizeListResponse(res.data)
    .map(normalizeAttribute)
    .filter((item) => item.id && item.name);
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
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const list = normalizeListResponse(res.data).map(normalizeHistoryAuction);
  const root = pickObject(res.data);

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

export const createAuction = async (payload) => {
  const token = getSellerToken();

  if (!token) {
    throw new Error("Authentication token not found. Please login again.");
  }

  const rawItems = Array.isArray(payload?.items) ? payload.items : [];

  const items = rawItems
    .map((item) =>
      normalizeItem(item, Number(payload?.categoryId), payload?.description)
    )
    .filter(
      (item) =>
        item.title &&
        item.count > 0 &&
        item.description &&
        item.warrantyInfo &&
        item.categoryId > 0
    );

  if (!items.length) {
    const error = new Error("At least one item is required");
    error.response = {
      status: 400,
      data: {
        message: "At least one item is required",
        errors: {
          Items: ["At least one item is required"],
        },
      },
    };
    throw error;
  }

  const title = toStringValue(payload?.title);
  const description = toStringValue(payload?.description);
  const startingPrice = Number(payload?.startingPrice);
  const bidIncrement = Number(payload?.bidIncrement);
  const startDate = formatApiDateTime(payload?.startDate);
  const endDate = formatApiDateTime(payload?.endDate);
  const categoryId = Number(payload?.categoryId);

  if (!title) throw new Error("Title is required.");
  if (!description) throw new Error("Description is required.");
  if (!Number.isFinite(startingPrice) || startingPrice <= 0) {
    throw new Error("Starting price must be greater than 0.");
  }
  if (!Number.isFinite(bidIncrement) || bidIncrement <= 0) {
    throw new Error("Bid increment must be greater than 0.");
  }
  if (!startDate) throw new Error("Start date is required.");
  if (!endDate) throw new Error("End date is required.");
  if (!categoryId) throw new Error("Category is required.");

  const formData = buildCreateAuctionFormData(payload, items);

  try {
    const res = await sellerApi.post("/Auction/Create-Auction", formData, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    return res.data;
  } catch (error) {
    const message = extractErrorMessage(
      error?.response?.data,
      "Failed to create auction."
    );

    if (error?.response) {
      error.response.data = {
        ...(typeof error.response.data === "object" && error.response.data
          ? error.response.data
          : {}),
        message,
      };
    }

    throw error;
  }
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
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    return normalizeAuctionView(res.data);
  } catch (error) {
    const message = extractErrorMessage(
      error?.response?.data,
      "Failed to load auction details."
    );

    if (error?.response) {
      error.response.data = {
        ...(typeof error.response.data === "object" && error.response.data
          ? error.response.data
          : {}),
        message,
      };
    }

    throw error;
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

  const rawItems = Array.isArray(payload?.items) ? payload.items : [];

  const items = rawItems
    .map((item) =>
      normalizeItem(item, Number(payload?.categoryId), payload?.description)
    )
    .filter(
      (item) =>
        item.title &&
        item.count > 0 &&
        item.description &&
        item.warrantyInfo &&
        item.categoryId > 0
    );

  if (!items.length) {
    throw new Error("At least one item is required.");
  }

  const formData = new FormData();

  appendIfHasValue(formData, "Title", toStringValue(payload?.title));
  appendIfHasValue(formData, "Description", toStringValue(payload?.description));
  appendIfHasValue(formData, "categoryId", Number(payload?.categoryId));

  if (payload?.image instanceof File) {
    formData.append("Image", payload.image);
  }

  items.forEach((item, itemIndex) => {
    appendIfHasValue(formData, `Items[${itemIndex}].title`, item.title);
    appendIfHasValue(formData, `Items[${itemIndex}].count`, item.count);
    appendIfHasValue(formData, `Items[${itemIndex}].description`, item.description);
    appendIfHasValue(
      formData,
      `Items[${itemIndex}].warrantyInfo`,
      item.warrantyInfo
    );
    appendIfHasValue(formData, `Items[${itemIndex}].condition`, item.condition);
    appendIfHasValue(formData, `Items[${itemIndex}].categoryId`, item.categoryId);

    if (item.imageFile instanceof File) {
      formData.append(`Items[${itemIndex}].images`, item.imageFile);
    }

    item.attributes.forEach((attr, attrIndex) => {
      appendIfHasValue(
        formData,
        `Items[${itemIndex}].attributes[${attrIndex}].categoryAttributeId`,
        attr.categoryAttributeId
      );
      appendIfHasValue(
        formData,
        `Items[${itemIndex}].attributes[${attrIndex}].value`,
        attr.value
      );
    });
  });

  try {
    const res = await sellerApi.put(`/Auction/edit/${auctionId}`, formData, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    return res.data;
  } catch (error) {
    const message = extractErrorMessage(
      error?.response?.data,
      "Failed to update auction."
    );

    if (error?.response) {
      error.response.data = {
        ...(typeof error.response.data === "object" && error.response.data
          ? error.response.data
          : {}),
        message,
      };
    }

    throw error;
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
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    return res.data;
  } catch (error) {
    const message = extractErrorMessage(
      error?.response?.data,
      "Failed to delete auction."
    );

    if (error?.response) {
      error.response.data = {
        ...(typeof error.response.data === "object" && error.response.data
          ? error.response.data
          : {}),
        message,
      };
    }

    throw error;
  }
};