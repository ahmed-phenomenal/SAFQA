import express from "express";

const router = express.Router();

function shouldSkipTranslation(value, key = "") {
  if (typeof value !== "string") return true;

  const text = value.trim();
  if (!text) return true;

  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text)) return true;
  if (/^https?:\/\//i.test(text)) return true;
  if (/^[0-9+\-().\s]+$/.test(text)) return true;
  if (/^[A-Z0-9_-]{2,}$/i.test(text) && text.length < 12) return true;

  const lowerKey = String(key || "").toLowerCase();
  const blockedKeys = [
    "id",
    "email",
    "phone",
    "mobile",
    "image",
    "imageurl",
    "logo",
    "avatar",
    "slug",
    "url",
    "sku",
    "iban",
    "token",
    "code",
  ];

  return blockedKeys.includes(lowerKey);
}

async function translateText(text, target = "ar") {
  const response = await fetch("http://localhost:5001/translate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      q: text,
      source: "auto",
      target,
      format: "text",
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`LibreTranslate failed: ${response.status} ${errText}`);
  }

  const data = await response.json();
  return data.translatedText;
}

async function translateDeep(value, target = "ar", key = "") {
  if (value == null) return value;

  if (typeof value === "string") {
    if (shouldSkipTranslation(value, key)) return value;
    return await translateText(value, target);
  }

  if (Array.isArray(value)) {
    const result = [];
    for (const item of value) {
      result.push(await translateDeep(item, target, key));
    }
    return result;
  }

  if (typeof value === "object") {
    const result = {};
    for (const [childKey, childValue] of Object.entries(value)) {
      result[childKey] = await translateDeep(childValue, target, childKey);
    }
    return result;
  }

  return value;
}

router.post("/translate-json", async (req, res) => {
  try {
    const { data, target = "ar" } = req.body || {};

    if (data === undefined) {
      return res.status(400).json({
        success: false,
        message: "Missing data to translate",
      });
    }

    const translated = await translateDeep(data, target);

    return res.json({
      success: true,
      translated,
    });
  } catch (error) {
    console.error("translate-json error:", error);

    return res.status(500).json({
      success: false,
      message: "Translation failed",
      error: error?.message || "Unknown server error",
    });
  }
});

export default router;