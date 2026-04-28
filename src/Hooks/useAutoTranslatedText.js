import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { translateApiData } from "../utiles/translateApiData";

export function useAutoTranslatedText(textObject) {
  const { i18n } = useTranslation();

  const [translatedText, setTranslatedText] = useState(textObject);
  const [translatingText, setTranslatingText] = useState(false);

  const serializedText = useMemo(() => {
    try {
      return JSON.stringify(textObject);
    } catch {
      return "";
    }
  }, [textObject]);

  useEffect(() => {
    let cancelled = false;

    async function translateText() {
      if (!textObject) {
        setTranslatedText(textObject);
        return;
      }

      if (i18n.language === "en") {
        setTranslatedText(textObject);
        return;
      }

      try {
        setTranslatingText(true);

        const result = await translateApiData(textObject, i18n.language);

        if (!cancelled) {
          setTranslatedText(result);
        }
      } catch (error) {
        console.error("useAutoTranslatedText error:", error);

        if (!cancelled) {
          setTranslatedText(textObject);
        }
      } finally {
        if (!cancelled) {
          setTranslatingText(false);
        }
      }
    }

    translateText();

    return () => {
      cancelled = true;
    };
  }, [serializedText, textObject, i18n.language]);

  return { translatedText, translatingText };
}