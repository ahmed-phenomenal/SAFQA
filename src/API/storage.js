export const authStorage =
  typeof window !== "undefined" ? window.sessionStorage : null;

export const persistentStorage =
  typeof window !== "undefined" ? window.localStorage : null;

export const getAuthItem = (key) => {
  if (!authStorage) return null;
  return authStorage.getItem(key);
};

export const setAuthItem = (key, value) => {
  if (!authStorage) return;
  authStorage.setItem(key, value);
};

export const removeAuthItem = (key) => {
  if (!authStorage) return;
  authStorage.removeItem(key);
};

export const clearAuthStorage = () => {
  if (!authStorage) return;
  authStorage.clear();
};