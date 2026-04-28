import i18n from "../i18n";

export const setLanguage = async (lang) => {
  const nextLang = String(lang || "en").toLowerCase() === "ar" ? "ar" : "en";

  await i18n.changeLanguage(nextLang);

  if (typeof window !== "undefined") {
    localStorage.setItem("lang", nextLang);
  }

  if (typeof document !== "undefined") {
    document.documentElement.lang = nextLang;
    document.documentElement.dir = nextLang === "ar" ? "rtl" : "ltr";
  }
};