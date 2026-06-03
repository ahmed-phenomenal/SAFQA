const THEME_KEY = "appTheme";

export const getSystemTheme = () => {
  if (typeof window === "undefined") return "light";

  return window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
};

export const getSavedTheme = () => {
  if (typeof window === "undefined") return "system";

  return localStorage.getItem(THEME_KEY) || "system";
};

export const getResolvedTheme = () => {
  const saved = getSavedTheme();

  if (saved === "dark" || saved === "light") return saved;

  return getSystemTheme();
};

export const applyTheme = (theme = "system") => {
  if (typeof document === "undefined") return;

  const finalTheme =
    theme === "system" ? getSystemTheme() : theme === "dark" ? "dark" : "light";

  document.documentElement.setAttribute("data-theme", finalTheme);
  document.body.setAttribute("data-theme", finalTheme);
};

export const saveTheme = (theme) => {
  if (typeof window === "undefined") return;

  localStorage.setItem(THEME_KEY, theme);
  applyTheme(theme);
};

export const initTheme = () => {
  const saved = getSavedTheme();

  applyTheme(saved);

  if (
    typeof window !== "undefined" &&
    window.matchMedia &&
    saved === "system"
  ) {
    const media = window.matchMedia("(prefers-color-scheme: dark)");

    const listener = () => {
      if (getSavedTheme() === "system") {
        applyTheme("system");
      }
    };

    media.addEventListener?.("change", listener);
  }
};