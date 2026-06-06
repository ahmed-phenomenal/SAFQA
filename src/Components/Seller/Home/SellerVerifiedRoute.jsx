import { useCallback, useEffect, useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { getSellerVerificationStatus } from "../../../API/seller";
import {
  markSellerVerifiedAccess,
} from "../../../API/authAccess";

const isBackendVerified = (data) => {
  const rawStatus = String(data?.verificationStatus || "")
    .trim()
    .toLowerCase();

  const negativeStatus =
    rawStatus.includes("not verified") ||
    rawStatus.includes("not_verified") ||
    rawStatus.includes("notverified") ||
    rawStatus.includes("unverified") ||
    rawStatus.includes("not approved") ||
    rawStatus.includes("not_approved") ||
    rawStatus.includes("not accepted") ||
    rawStatus.includes("not_accepted");

  if (negativeStatus) return false;

  return (
    data?.isVerified === true ||
    rawStatus === "verified" ||
    rawStatus === "approved" ||
    rawStatus === "accepted" ||
    rawStatus === "admin approved" ||
    rawStatus === "fully verified"
  );
};

export default function SellerVerifiedRoute() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [checking, setChecking] = useState(true);
  const [allowed, setAllowed] = useState(false);

  const checkVerification = useCallback(async () => {
    try {
      setChecking(true);

      // REMOVED: hasSellerVerifiedAccess check - always get fresh from backend
      const data = await getSellerVerificationStatus();
      
      console.log("Verification status:", data); // For debugging

      if (isBackendVerified(data)) {
        markSellerVerifiedAccess();
        setAllowed(true);
        return;
      }

      // If seller account exists but isn't verified, don't allow access
      // They need to go through verification
      setAllowed(false);
    } catch (error) {
      console.error("Verification check error:", error);
      setAllowed(false);
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    checkVerification();
  }, [checkVerification]);

  if (checking) {
    return (
      <div
        style={{
          minHeight: "70vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f7f8fc",
          color: "#023E8A",
          fontSize: "18px",
          fontWeight: 800,
        }}
      >
        {t("checking", { defaultValue: "Checking..." })}
      </div>
    );
  }

  if (!allowed) {
    return (
      <div
        style={{
          minHeight: "80vh",
          background: "#f7f8fc",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 16,
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: 430,
            background: "#fff",
            borderRadius: 18,
            padding: 24,
            boxShadow: "0 20px 50px rgba(0,0,0,0.18)",
            textAlign: "center",
          }}
        >
          <h3
            style={{
              margin: 0,
              marginBottom: 12,
              color: "#023E8A",
              fontWeight: 800,
              fontSize: 22,
            }}
          >
            {t("verificationRequired", {
              defaultValue: "Verification Required",
            })}
          </h3>

          <p
            style={{
              margin: 0,
              color: "#5f6c7b",
              lineHeight: 1.7,
              fontSize: 15,
            }}
          >
            {t("youHaveToVerifyToContinue", {
              defaultValue: "You have to verify to continue.",
            })}
          </p>

          <div
            style={{
              display: "flex",
              gap: 10,
              justifyContent: "center",
              marginTop: 22,
              flexWrap: "wrap",
            }}
          >
            <button
              type="button"
              onClick={() =>
                navigate("/seller-verification", {
                  state: { mode: "verify" },
                })
              }
              style={{
                border: "none",
                background: "#023E8A",
                color: "#fff",
                borderRadius: 10,
                padding: "10px 18px",
                fontWeight: 800,
                cursor: "pointer",
                minWidth: 120,
              }}
            >
              {t("verifyNow", { defaultValue: "Verify Now" })}
            </button>

            <button
              type="button"
              onClick={() => navigate("/seller-profile")}
              style={{
                border: "1px solid #d9d9d9",
                background: "#fff",
                color: "#444",
                borderRadius: 10,
                padding: "10px 18px",
                fontWeight: 800,
                cursor: "pointer",
                minWidth: 120,
              }}
            >
              {t("cancel", { defaultValue: "Cancel" })}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <Outlet />;
}