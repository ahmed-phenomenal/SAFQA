const LIBRETRANSLATE_URL =
  import.meta.env.VITE_LIBRETRANSLATE_URL || "https://libretranslate.de";

const translationCache = new Map();

const shouldSkipString = (value) => {
  const text = String(value || "").trim();

  if (!text) return true;
  if (/^https?:\/\//i.test(text)) return true;
  if (/^data:image\//i.test(text)) return true;
  if (/^[\d\s.,:;+\-()/$%#]+$/.test(text)) return true;
  if (/^[A-Z0-9_-]{8,}$/i.test(text) && !text.includes(" ")) return true;

  return false;
};

const translateText = async (text, targetLanguage) => {
  const cleanText = String(text || "");

  if (shouldSkipString(cleanText)) {
    return cleanText;
  }

  const cacheKey = `${targetLanguage}:${cleanText}`;

  if (translationCache.has(cacheKey)) {
    return translationCache.get(cacheKey);
  }

  const response = await fetch(`${LIBRETRANSLATE_URL.replace(/\/$/, "")}/translate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      q: cleanText,
      source: "auto",
      target: targetLanguage,
      format: "text",
    }),
  });

  if (!response.ok) {
    throw new Error(`LibreTranslate failed with status ${response.status}`);
  }

  const data = await response.json();
  const translated = data?.translatedText || cleanText;

  translationCache.set(cacheKey, translated);
  return translated;
};

export async function translateApiData(data, targetLanguage) {
  if (!targetLanguage || targetLanguage === "en") {
    return data;
  }

  if (data === null || data === undefined) {
    return data;
  }

  if (typeof data === "string") {
    return translateText(data, targetLanguage);
  }

  if (typeof data === "number" || typeof data === "boolean") {
    return data;
  }

  if (data instanceof File || data instanceof Blob || data instanceof Date) {
    return data;
  }

  if (Array.isArray(data)) {
    const translatedArray = await Promise.all(
      data.map((item) => translateApiData(item, targetLanguage))
    );

    return translatedArray;
  }

  if (typeof data === "object") {
    const entries = await Promise.all(
      Object.entries(data).map(async ([key, value]) => {
        return [key, await translateApiData(value, targetLanguage)];
      })
    );

    return Object.fromEntries(entries);
  }

  return data;
}