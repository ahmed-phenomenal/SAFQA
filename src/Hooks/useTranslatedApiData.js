import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { translateApiData } from "../utiles/translateApiData";

export function useTranslatedApiData(originalData) {
  const { i18n } = useTranslation();

  const [translatedData, setTranslatedData] = useState(originalData);
  const [translating, setTranslating] = useState(false);

  const serializedData = useMemo(() => {
    try {
      return JSON.stringify(originalData);
    } catch {
      return "";
    }
  }, [originalData]);

  useEffect(() => {
    let cancelled = false;

    async function runTranslation() {
      if (!originalData) {
        setTranslatedData(originalData);
        return;
      }

      if (i18n.language === "en") {
        setTranslatedData(originalData);
        return;
      }

      try {
        setTranslating(true);

        const result = await translateApiData(originalData, i18n.language);

        if (!cancelled) {
          setTranslatedData(result);
        }
      } catch (error) {
        console.error("Translation error:", error);

        if (!cancelled) {
          setTranslatedData(originalData);
        }
      } finally {
        if (!cancelled) {
          setTranslating(false);
        }
      }
    }

    runTranslation();

    return () => {
      cancelled = true;
    };
  }, [serializedData, originalData, i18n.language]);

  return { translatedData, translating };
}