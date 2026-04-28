import { Navigate, Outlet, useLocation } from "react-router-dom";
import Error from "../Error/Error";
import { getAuthState } from "../../API/authAccess";

const buildLoginRedirect = (location, redirectTo) => {
  const currentPath = `${location.pathname}${location.search || ""}${
    location.hash || ""
  }`;

  const isSellerPath = location.pathname.toLowerCase().includes("seller");

  const params = new URLSearchParams();
  params.set("redirect", currentPath);

  if (isSellerPath) {
    params.set("accountType", "seller");
  }

  return `${redirectTo}?${params.toString()}`;
};

export default function ProtectedRoute({
  children,
  allowedRoles = [],
  guestOnly = false,
  redirectTo = "/login",
  forbiddenAs404 = true,
}) {
  const location = useLocation();
  const { isAuthenticated, role } = getAuthState();

  if (guestOnly) {
    if (!isAuthenticated) {
      return children || <Outlet />;
    }

    const params = new URLSearchParams(location.search);
    const redirect = params.get("redirect");

    if (redirect) {
      return <Navigate to={redirect} replace />;
    }

    if (role === "admin") return <Navigate to="/admin" replace />;
    if (role === "seller") return <Navigate to="/seller" replace />;
    return <Navigate to="/home" replace />;
  }

  if (!isAuthenticated) {
    return <Navigate to={buildLoginRedirect(location, redirectTo)} replace />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(role) && role !== "admin") {
    return forbiddenAs404 ? <Error /> : <Navigate to="/login" replace />;
  }

  return children || <Outlet />;
}