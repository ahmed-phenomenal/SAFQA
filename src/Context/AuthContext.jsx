import { createContext, useEffect, useState } from "react";
import { jwtDecode } from "jwt-decode";

export const auth = createContext(null);

export default function AuthContextProvider({ children }) {
  const [islogin, setlogin] = useState(null);

  useEffect(() => {
    try {
      const token = localStorage.getItem("userToken");
      if (token) {
        setlogin(jwtDecode(token));
      }
    } catch (error) {
      console.error("Failed to decode token:", error);
      localStorage.removeItem("userToken");
      setlogin(null);
    }
  }, []);

  return (
    <auth.Provider value={{ islogin, setlogin }}>{children}</auth.Provider>
  );
}