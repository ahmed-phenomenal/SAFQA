import { useEffect, useRef, useState } from "react";
import i18n from "./i18n";
import { createBrowserRouter, RouterProvider } from "react-router-dom";

import Splash from "./Components/Splash";
import Layout from "./Components/Layout/Layout";
import ProtectedRoute from "./Components/ProtectedRoute/ProtectedRoute";

import Signin from "./Components/Sign-in/Sign-in";
import Register from "./Components/Register/Register";
import Forget from "./Components/ForgetPassword/Forget";
import ResetCode from "./Components/ForgetPassword/ResetCode";
import ResetPassword from "./Components/ForgetPassword/ResetPassword";
import Home from "./Components/Home/Home";
import Error from "./Components/Error/Error";
import Search from "./Components/Home/Search";
import Notifications from "./Components/Home/Notifications";
import Profile from "./Components/Home/Profile";
import Favorite from "./Components/Home/Favorite";
import Account from "./Components/Home/Account";
import ChangePassword from "./Components/Home/change_password";
import Terms_Conditions from "./Components/Home/Terms_Conditions";
import Order from "./Components/Home/order";
import Wallet from "./Components/Home/wallet";
import Privacy_Policy from "./Components/Home/Privacy_Policy";
import How_To_Bid from "./Components/Home/How_To_Bid";
import ConfirmLogin from "./Components/Register/ConfirmLogin";
import SellerReview from "./Components/Home/SellerReview";
import AuctionDetails from "./Components/Home/auction_details";
import Track_Status from "./Components/Home/Track_Status";
import Chat from "./Components/Home/Chat";
import Transactions from "./Components/Home/transactions";
import Withdraw from "./Components/Home/withdraw";
import Deposit from "./Components/Home/deposit";
import Saved_Cards from "./Components/Home/Saved_Cards";
import Account_edit from "./Components/Home/Account_edit";
import Tracking from "./Components/Home/Tracking";
import Help_support from "./Components/Home/Help_support";

/* Seller */
import SellerStatistics from "./Components/Seller/SellerStatistics";
import Seller from "./Components/Seller/Home/Seller";
import SellerProfile from "./Components/Seller/Home/seller-profile";
import Seller_plans from "./Components/Seller/Home/Seller_plans";
import SellerShippingOrders from "./Components/Seller/Home/seller_Shipping_Orders";
import SellerReviews from "./Components/Seller/Home/seller_reviews";
import SellerWallet from "./Components/Seller/Home/seller_wallet";
import SellerTransactions from "./Components/Seller/Home/seller_transactions";
import SellerWithdraw from "./Components/Seller/Home/seller_withdraw";
import SellerDeposit from "./Components/Seller/Home/seller_deposit";
import Seller_Account from "./Components/Seller/Home/seller_account";
import Verification from "./Components/Seller/Home/Verification";
import Seller_Notifications from "./Components/Seller/Home/Seller_Notifications";
import Seller_Chat from "./Components/Seller/Home/Seller_Chat";
import Seller_Saved_Cards from "./Components/Seller/Home/Seller_Saved_Cards";
import Lot_Auction from "./Components/Seller/Home/Lot_Auction";
import Single_Auction from "./Components/Seller/Home/Single_Auction";
import Seller_History from "./Components/Seller/Home/Seller_History";
import Seller_account_edit from "./Components/Seller/Home/seller_account_edit";
import ViewAuction from "./Components/Seller/Home/ViewAuction";

/* Admin */
import Admin from "./Components/Admin/Admin";
import Users from "./Components/Admin/Pages/Users";
import Sellers from "./Components/Admin/Pages/Sellers";
import Auctions from "./Components/Admin/Pages/Auctions";
import Payments from "./Components/Admin/Pages/Payments";
import Reports from "./Components/Admin/Pages/reports";
import Announcements from "./Components/Admin/Pages/announcements";
import Admin_delivery from "./Components/Admin/Pages/admin_delivery";
import TrackChatsAdmin from "./Components/Admin/Pages/TrackChatsAdmin";

import Delivery from "./Delivery/Delivery";

const router = createBrowserRouter([
  {
    path: "/",
    element: <Splash />,
  },

  {
    path: "/",
    element: <Layout />,
    children: [
      /* Public auth pages */
      { path: "login", element: <Signin /> },
      { path: "sign-up", element: <Register /> },
      { path: "confirm_login", element: <ConfirmLogin /> },
      { path: "forget", element: <Forget /> },
      { path: "code", element: <ResetCode /> },
      { path: "reset-password", element: <ResetPassword /> },

      /*
        ADMIN ROUTES ARE PUBLIC.
        They are treated like login/register.
        No ProtectedRoute here.
      */
      { path: "admin", element: <Admin /> },
      { path: "admin_users", element: <Users /> },
      { path: "admin_sellers", element: <Sellers /> },
      { path: "admin_announcements", element: <Announcements /> },
      { path: "admin_reports", element: <Reports /> },
      { path: "admin_auctions", element: <Auctions /> },
      { path: "admin_payments", element: <Payments /> },
      { path: "admin_delivery", element: <Admin_delivery /> },
      { path: "admin_track_chats", element: <TrackChatsAdmin /> },

      /* Public delivery pages */
      { path: "delivery", element: <Delivery /> },
      { path: "delivery/:accessKey", element: <Delivery /> },

      /* Buyer/User protected routes */
      {
        element: <ProtectedRoute allowedRoles={["user"]} />,
        children: [
          { path: "home", element: <Home /> },
          { path: "search", element: <Search /> },
          { path: "notifications", element: <Notifications /> },
          { path: "profile", element: <Profile /> },
          { path: "favorite", element: <Favorite /> },
          { path: "account", element: <Account /> },
          { path: "change-password", element: <ChangePassword /> },
          { path: "Terms&Conditions", element: <Terms_Conditions /> },
          { path: "orders", element: <Order /> },
          { path: "wallet", element: <Wallet /> },
          { path: "Privacy_Policy", element: <Privacy_Policy /> },
          { path: "How_To_Bid", element: <How_To_Bid /> },
          { path: "auction-details", element: <AuctionDetails /> },
          { path: "seller-Review", element: <SellerReview /> },
          { path: "tracking", element: <Tracking /> },
          { path: "chat", element: <Chat /> },
          { path: "transactions", element: <Transactions /> },
          { path: "withdraw", element: <Withdraw /> },
          { path: "deposit", element: <Deposit /> },
          { path: "saved-cards", element: <Saved_Cards /> },
          { path: "account-edit", element: <Account_edit /> },
          { path: "track-status", element: <Track_Status /> },
          { path: "help-&-support", element: <Help_support /> },
        ],
      },

      /* Seller protected routes */
      {
        element: <ProtectedRoute allowedRoles={["seller"]} />,
        children: [
          { path: "seller", element: <Seller /> },
          { path: "seller-profile", element: <SellerProfile /> },
          { path: "seller-plans", element: <Seller_plans /> },
          { path: "seller-Shipping-Orders", element: <SellerShippingOrders /> },
          { path: "seller-reviews", element: <SellerReviews /> },
          { path: "seller-wallet", element: <SellerWallet /> },
          { path: "seller-transactions", element: <SellerTransactions /> },
          { path: "seller-withdraw", element: <SellerWithdraw /> },
          { path: "seller-deposit", element: <SellerDeposit /> },
          { path: "seller-account", element: <Seller_Account /> },
          { path: "seller-notifications", element: <Seller_Notifications /> },
          { path: "seller-chat", element: <Seller_Chat /> },
          { path: "seller-saved-cards", element: <Seller_Saved_Cards /> },
          { path: "lot-Auction", element: <Lot_Auction /> },
          { path: "single-Auction", element: <Single_Auction /> },
          { path: "seller-history", element: <Seller_History /> },
          { path: "seller-verification", element: <Verification /> },
          { path: "seller-account-edit", element: <Seller_account_edit /> },
          { path: "seller-change-password", element: <ChangePassword /> },
          { path: "seller-view-auction", element: <ViewAuction /> },
          { path: "seller-statistics", element: <SellerStatistics /> },
        ],
      },
    ],
  },

  {
    path: "*",
    element: <Error />,
  },
]);

function App() {
  const [bootLoading, setBootLoading] = useState(true);
  const idleTimerRef = useRef(null);

  useEffect(() => {
    const lang = localStorage.getItem("lang") || "en";

    i18n.changeLanguage(lang);
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
  }, []);

  useEffect(() => {
    const AUTH_KEYS = [
      "token",
      "userToken",
      "sellerToken",
      "adminToken",
      "refreshToken",
      "role",
      "accountType",
      "userRole",
      "sellerId",
      "currentUserEmail",
      "pendingEmail",
      "authLoginHintAccountType",
    ];

    const INACTIVITY_LIMIT_MS = 30 * 60 * 1000;

    const hasAnyAuth = () => {
      return AUTH_KEYS.some(
        (key) => localStorage.getItem(key) || sessionStorage.getItem(key)
      );
    };

    const clearAuthStorage = () => {
      AUTH_KEYS.forEach((key) => {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
      });
    };

    const saveLastActivity = () => {
      localStorage.setItem("lastActivityAt", String(Date.now()));
    };

    const logoutUser = () => {
      clearAuthStorage();
      localStorage.removeItem("lastActivityAt");

      const publicPaths = [
        "/admin",
        "/admin_users",
        "/admin_sellers",
        "/admin_announcements",
        "/admin_reports",
        "/admin_auctions",
        "/admin_payments",
        "/admin_delivery",
        "/admin_track_chats",
        "/login",
        "/sign-up",
        "/forget",
        "/code",
        "/reset-password",
        "/confirm_login",
        "/delivery",
      ];

      const isPublicPath = publicPaths.some((path) =>
        window.location.pathname.startsWith(path)
      );

      if (!isPublicPath) {
        window.location.replace("/login");
      }
    };

    const startIdleTimer = () => {
      if (!hasAnyAuth()) return;

      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
      }

      idleTimerRef.current = setTimeout(() => {
        logoutUser();
      }, INACTIVITY_LIMIT_MS);
    };

    const handleUserActivity = () => {
      if (!hasAnyAuth()) return;

      saveLastActivity();
      startIdleTimer();
    };

    const checkInactivityOnOpen = () => {
      if (!hasAnyAuth()) return;

      const lastActivityAt = Number(localStorage.getItem("lastActivityAt") || 0);

      if (!lastActivityAt) {
        saveLastActivity();
        startIdleTimer();
        return;
      }

      const now = Date.now();
      const inactiveFor = now - lastActivityAt;

      if (inactiveFor >= INACTIVITY_LIMIT_MS) {
        logoutUser();
        return;
      }

      startIdleTimer();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        checkInactivityOnOpen();
      }
    };

    checkInactivityOnOpen();

    const events = [
      "mousemove",
      "mousedown",
      "keydown",
      "scroll",
      "touchstart",
      "click",
    ];

    events.forEach((eventName) => {
      window.addEventListener(eventName, handleUserActivity);
    });

    document.addEventListener("visibilitychange", handleVisibilityChange);

    setBootLoading(false);

    return () => {
      events.forEach((eventName) => {
        window.removeEventListener(eventName, handleUserActivity);
      });

      document.removeEventListener("visibilitychange", handleVisibilityChange);

      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
      }
    };
  }, []);

  if (bootLoading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f7f8fc",
          color: "#0b4aa2",
          fontSize: "18px",
          fontWeight: "700",
        }}
      >
        Loading...
      </div>
    );
  }

  return <RouterProvider router={router} />;
}

export default App;