const LIBRE_BASE_URL =
  import.meta.env.VITE_LIBRETRANSLATE_URL || "http://localhost:5000";

const LIBRE_API_KEY = import.meta.env.VITE_LIBRETRANSLATE_API_KEY || "";

const translationCache = new Map();

const getCacheKey = ({ text, source, target }) =>
  `${source}:${target}:${String(text || "").trim()}`;

const isArabicText = (text) => /[\u0600-\u06FF]/.test(String(text || ""));

const shouldTranslateText = (text) => {
  const value = String(text || "").trim();
  return value.length > 0;
};

export const translateText = async ({
  text,
  source = "auto",
  target = "ar",
  format = "text",
}) => {
  const value = String(text || "").trim();

  if (!shouldTranslateText(value)) return value;
  if (source === target) return value;

  const cacheKey = getCacheKey({ text: value, source, target });

  if (translationCache.has(cacheKey)) {
    return translationCache.get(cacheKey);
  }

  const body = {
    q: value,
    source,
    target,
    format,
  };

  if (LIBRE_API_KEY) {
    body.api_key = LIBRE_API_KEY;
  }

  const res = await fetch(`${LIBRE_BASE_URL}/translate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(`LibreTranslate failed with status ${res.status}`);
  }

  const data = await res.json();
  const translated = String(data?.translatedText || value);

  translationCache.set(cacheKey, translated);
  return translated;
};

export const translateManyTexts = async ({
  texts = [],
  source = "auto",
  target = "ar",
}) => {
  const safeTexts = Array.isArray(texts)
    ? texts.map((item) => String(item || "").trim())
    : [];

  const results = await Promise.all(
    safeTexts.map((text) =>
      translateText({
        text,
        source,
        target,
      }).catch(() => text)
    )
  );

  return results;
};

export const translateObjectFields = async ({
  item,
  fields = [],
  source = "auto",
  target = "ar",
}) => {
  if (!item || typeof item !== "object") return item;

  const cloned = { ...item };

  await Promise.all(
    fields.map(async (field) => {
      const rawValue = cloned[field];

      if (typeof rawValue !== "string") return;
      if (!rawValue.trim()) return;

      cloned[field] = await translateText({
        text: rawValue,
        source,
        target,
      }).catch(() => rawValue);
    })
  );

  return cloned;
};

export const translateArrayFields = async ({
  items = [],
  fields = [],
  source = "auto",
  target = "ar",
}) => {
  if (!Array.isArray(items) || !items.length) return [];

  const translated = await Promise.all(
    items.map((item) =>
      translateObjectFields({
        item,
        fields,
        source,
        target,
      }).catch(() => item)
    )
  );

  return translated;
};

export const clearTranslationCache = () => {
  translationCache.clear();
};

export const detectLikelySourceLanguage = (text) => {
  if (isArabicText(text)) return "ar";
  return "en";
};