import { Navigate, Outlet, useLocation } from "react-router-dom";

export default function ProtectedRoute({ allowedRoles }) {
  const location = useLocation();

  const getStorageValue = (key) => {
    return localStorage.getItem(key) || sessionStorage.getItem(key);
  };

  const normalizeRole = (role) => {
    if (!role) return "";

    const cleanRole = String(role).toLowerCase().trim();

    if (cleanRole === "administrator") return "admin";
    if (cleanRole === "buyer") return "user";
    if (cleanRole === "customer") return "user";

    return cleanRole;
  };

  const token =
    getStorageValue("token") ||
    getStorageValue("userToken") ||
    getStorageValue("sellerToken") ||
    getStorageValue("adminToken");

  const storedRole =
    getStorageValue("role") ||
    getStorageValue("accountType") ||
    getStorageValue("userRole");

  const role = normalizeRole(storedRole);
  const isLoggedIn = Boolean(token);

  const getDefaultPathByRole = () => {
    if (role === "admin") return "/admin";
    if (role === "seller") return "/seller";
    return "/home";
  };

  if (!isLoggedIn) {
    return (
      <Navigate
        to={`/login?redirect=${encodeURIComponent(
          location.pathname + location.search
        )}`}
        replace
      />
    );
  }

  if (allowedRoles && allowedRoles.length > 0) {
    const normalizedAllowedRoles = allowedRoles.map((item) =>
      normalizeRole(item)
    );

    if (!normalizedAllowedRoles.includes(role)) {
      return <Navigate to={getDefaultPathByRole()} replace />;
    }
  }

  return <Outlet />;
}