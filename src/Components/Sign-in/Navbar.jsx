import { NavLink, Link, useLocation } from "react-router-dom";
import { useContext, useMemo } from "react";
import { auth } from "../../Context/AuthContext";
import { useTranslation } from "react-i18next";
import { setLanguage } from "../../utiles/setLanguage";
import icon from "../../assets/2.png";
import icon2 from "../../assets/1.png";

const readStorage = (key) => {
  const fromSession =
    typeof window !== "undefined" ? sessionStorage.getItem(key) : null;

  if (fromSession !== null && fromSession !== undefined && fromSession !== "") {
    return fromSession;
  }

  const fromLocal =
    typeof window !== "undefined" ? localStorage.getItem(key) : null;

  return fromLocal;
};

const hasAnyAuthToken = () => {
  return Boolean(
    readStorage("token") ||
      readStorage("userToken") ||
      readStorage("sellerToken") ||
      readStorage("adminToken")
  );
};

export default function Navbar() {
  const location = useLocation();
  const { i18n, t } = useTranslation();
  const authContext = useContext(auth);

  const isArabic = i18n.language === "ar";

  const isAuthenticated =
    Boolean(authContext?.login) ||
    Boolean(authContext?.user) ||
    Boolean(authContext?.isAuthenticated) ||
    hasAnyAuthToken();

  const currentPath = String(location.pathname || "").toLowerCase();

  const isSellerGuestPage =
    currentPath === "/login-seller" ||
    currentPath === "/sign-up-seller" ||
    currentPath === "/confirm-seller";

  const guestLinks = useMemo(() => {
    if (isSellerGuestPage) {
      return [
        {
          to: "/sign-up-seller",
          label: t("sellerSignUp"),
        },
        {
          to: "/login-seller",
          label: t("sellerSignIn"),
        },
      ];
    }

    return [
      {
        to: "/sign-up",
        label: t("signUp"),
      },
      {
        to: "/login",
        label: t("signIn"),
      },
    ];
  }, [isSellerGuestPage, t]);

  if (isAuthenticated) {
    return (
      <nav className="icon-navbar" dir="ltr">
        <button
          type="button"
          className={`lang-btn ${isArabic ? "left" : "right"}`}
          onClick={() => setLanguage(isArabic ? "en" : "ar")}
        >
          {isArabic ? "EN" : "ع"}
        </button>

        <NavLink to="/notifications" className="icon-link">
          {({ isActive }) => (
            <div className={`icon-item ${isActive ? "active" : ""}`}>
              <i className="fa-regular fa-bell"></i>
              {isActive && <span className="active-bar"></span>}
            </div>
          )}
        </NavLink>

        <NavLink to="/search" className="icon-link">
          {({ isActive }) => (
            <div className={`icon-item ${isActive ? "active" : ""}`}>
              <i className="fa-solid fa-magnifying-glass"></i>
              {isActive && <span className="active-bar"></span>}
            </div>
          )}
        </NavLink>

        <NavLink to="/home" className="icon-link">
          {({ isActive }) => (
            <div className={`icon-item ${isActive ? "active" : ""}`}>
              <i className="fa-solid fa-house"></i>
              {isActive && <span className="active-bar"></span>}
            </div>
          )}
        </NavLink>

        <NavLink to="/favorite" className="icon-link">
          {({ isActive }) => (
            <div className={`icon-item ${isActive ? "active" : ""}`}>
              <i className="fa-regular fa-heart"></i>
              {isActive && <span className="active-bar"></span>}
            </div>
          )}
        </NavLink>

        <NavLink to="/profile" className="icon-link">
          {({ isActive }) => (
            <div className={`icon-item ${isActive ? "active" : ""}`}>
              <i className="fa-regular fa-user"></i>
              {isActive && <span className="active-bar"></span>}
            </div>
          )}
        </NavLink>
      </nav>
    );
  }

  return (
    <nav className="login-navbar" dir="ltr">
      <button
        type="button"
        className={`lang-btn ${isArabic ? "left" : "right"}`}
        onClick={() => setLanguage(isArabic ? "en" : "ar")}
      >
        {isArabic ? "EN" : "ع"}
      </button>

      <div className="login-navbar-container">
        <Link to="/home" className="login-navbar-brand">
          <img src={icon} alt="logo" className="brand-icon" />
          <img src={icon2} alt="brand" className="brand-text" />
        </Link>

        <div className="login-navbar-links">
          {guestLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `login-nav-link ${isActive ? "active" : ""}`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </div>
      </div>
    </nav>
  );
}