import { Navigate, Outlet, useLocation } from "react-router-dom";
import Error from "../Error/Error";
import { getAuthState } from "../../API/authAccess";

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

    const from = location.state?.from?.pathname;

    if (from) {
      return <Navigate to={from} replace />;
    }

    if (role === "admin") return <Navigate to="/admin" replace />;
    if (role === "seller") return <Navigate to="/seller" replace />;
    return <Navigate to="/home" replace />;
  }

  if (!isAuthenticated) {
    return (
      <Navigate
        to={redirectTo}
        replace
        state={{ from: location }}
      />
    );
  }

  if (
    allowedRoles.length > 0 &&
    !allowedRoles.includes(role) &&
    role !== "admin"
  ) {
    return forbiddenAs404 ? <Error /> : <Navigate to="/login" replace />;
  }

  return children || <Outlet />;
}