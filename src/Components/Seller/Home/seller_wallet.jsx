import { useEffect, useMemo, useState } from "react";
import icon from "../../../assets/wallet.png";
import visa from "../../../assets/cardVisa.png";
import visa2 from "../../../assets/cardVisa2.png";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  getWalletBalance,
  getWalletTransactionHistory,
  getSellerSavedCards,
} from "../../../API/seller";

export default function SellerWallet() {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === "ar";
  const navigate = useNavigate();

  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    document.title = t("sellerWalletDocTitle");
  }, [t]);

  useEffect(() => {
    const link = document.querySelector("link[rel~='icon']");
    if (link) link.href = icon;
  }, []);

  useEffect(() => {
    let mounted = true;

    const loadWalletData = async () => {
      try {
        setLoading(true);
        setError("");

        const [balanceRes, historyRes, cardsRes] = await Promise.allSettled([
          getWalletBalance(),
          getWalletTransactionHistory(),
          getSellerSavedCards(),
        ]);

        if (!mounted) return;

        const results = [balanceRes, historyRes, cardsRes];
        const verificationError = results.find((result) => {
          if (result.status !== "rejected") return false;

          const err = result.reason;
          const statusCode = err?.response?.status;
          const apiMessage =
            err?.response?.data?.message ||
            err?.response?.data?.Message ||
            err?.response?.data?.title ||
            "";

          const normalizedApiMessage = String(apiMessage).toLowerCase();

          return (
            statusCode === 403 ||
            normalizedApiMessage.includes("not verified") ||
            normalizedApiMessage.includes("verification") ||
            normalizedApiMessage.includes("verify")
          );
        });

        if (verificationError) {
          setError(t("verificationRequiredHistory"));
        }

        setBalance(
          balanceRes.status === "fulfilled"
            ? Number(balanceRes.value?.balance || 0)
            : 0
        );

        setTransactions(
          historyRes.status === "fulfilled" && Array.isArray(historyRes.value)
            ? historyRes.value
            : []
        );

        setCards(
          cardsRes.status === "fulfilled" && Array.isArray(cardsRes.value)
            ? cardsRes.value
            : []
        );
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadWalletData();

    return () => {
      mounted = false;
    };
  }, [t]);

  const balanceText = useMemo(() => {
    const amount = Number(balance || 0).toFixed(2);
    const [main, decimal] = amount.split(".");
    return {
      main,
      decimal: `.${decimal}`,
    };
  }, [balance]);

  const card = useMemo(() => {
    if (cards.length > 0) {
      const firstCard = cards[0];
      return {
        number: "**** **** **** ****",
        name: firstCard.holderName || "CARD HOLDER",
        expiry: "**/**",
        brand: firstCard.brand || "CARD",
        type: firstCard.label || "Saved",
        savedName: firstCard.label || firstCard.holderName || "Saved Card",
      };
    }

    return {
      number: "**** **** **** ****",
      name: "AHMED TAMER",
      expiry: "**/**",
      brand: "VISA",
      type: "Credit",
      savedName: "Saved Card",
    };
  }, [cards]);

  const latestTransactions = transactions.slice(0, 3);

  const goSavedCards = () => navigate("/seller-saved-cards");
  const goDeposit = () => navigate("/seller-deposit");
  const goWithdraw = () => navigate("/seller-withdraw");

  const formatTransactionDate = (item) => {
    if (!item?.date) return "-";
    const d = new Date(item.date);
    if (Number.isNaN(d.getTime())) return "-";
    return d.toLocaleDateString(isArabic ? "ar-EG" : "en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatAmount = (item) => {
    const amount = Number(item?.amount || 0);
    const isDeposit = String(item?.type || "").toLowerCase() === "deposit";
    return `${isDeposit ? "+" : "-"} EGP ${amount.toLocaleString()}`;
  };

  return (
    <div className="wallet" dir={isArabic ? "rtl" : "ltr"}>
      <div className="container">
        <h1 className="wallet-title">{t("sellerWalletTitle")}</h1>

        {error && (
          <div
            style={{
              background: "#fdecea",
              color: "#b3261e",
              padding: "12px 14px",
              borderRadius: "10px",
              marginBottom: "18px",
            }}
          >
            {error}
          </div>
        )}

        <div className="wallet-topRow">
          <div className="wallet-balanceBox">
            <div className="wallet-balanceLabel">{t("walletBalance")}</div>

            <div className="wallet-balanceValue">
              <span className="wallet-balanceMain">
                {loading ? "0" : balanceText.main}
              </span>
              <span className="wallet-balanceDecimal">
                {loading ? ".00" : balanceText.decimal}
              </span>
            </div>
          </div>

          <div className="wallet-actionsRow">
            <button
              className="wallet-actionBtn wallet-actionBtn--primary"
              type="button"
              onClick={goDeposit}
            >
              <span className="wallet-actionIcon wallet-actionIcon--plus">+</span>
              <span className="wallet-actionText">{t("depositMoney")}</span>
            </button>

            <button className="wallet-actionBtn" type="button" onClick={goWithdraw}>
              <span className="wallet-actionIcon">
                <i className="fa-solid fa-money-bill-transfer"></i>
              </span>
              <span className="wallet-actionText">{t("withdrawalMoney")}</span>
            </button>
          </div>
        </div>

        <div className="wallet-sectionHead">
          <h2 className="wallet-sectionTitle">{t("savedCards")}</h2>
        </div>

        <div className="wallet-cardLink">
          <div
            className="wallet-visaCard"
            role="link"
            tabIndex={0}
            onClick={goSavedCards}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                goSavedCards();
              }
            }}
          >
            <div className="wallet-visaTop">
              <div className="wallet-chipRow">
                <div className="wallet-chip">
                  <img src={visa} alt="visa" />
                </div>

                <div className="wallet-chip wallet-chip--absolute">
                  <img src={visa2} alt="brand" />
                </div>
              </div>

              <div className="wallet-visaBrand">
                <div className="wallet-visaBrandBig">{card.brand}</div>
                <div className="wallet-visaBrandSmall">{card.type}</div>
              </div>
            </div>

            <div className="wallet-cardNumber">{card.number}</div>

            <div className="wallet-visaBottom">
              <div className="wallet-cardMeta">
                <div className="wallet-cardMetaLabel">{card.savedName}</div>
                <div className="wallet-cardMetaValue">{card.name}</div>
              </div>

              <div className="wallet-cardMeta">
                <div className="wallet-cardMetaLabel">{t("expires")}</div>
                <div className="wallet-cardMetaValue">{card.expiry}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="wallet-historyHead">
          <h2 className="wallet-sectionTitle">{t("transactionHistory")}</h2>
          <Link to="/seller-transactions" className="wallet-seeAll">
            {t("seeAll")}
          </Link>
        </div>

        {latestTransactions.length > 0 ? (
          <>
            <div className="wallet-date">
              {formatTransactionDate(latestTransactions[0])}
            </div>

            <div className="wallet-historyList">
              {latestTransactions.map((item, index) => {
                const isDeposit =
                  String(item?.type || "").toLowerCase() === "deposit";

                return (
                  <div className="wallet-txItem" key={index}>
                    <div className="wallet-txLeft">
                      <div className="wallet-txTitle">
                        {item?.type || t("transaction")}
                      </div>
                      <div className="wallet-txSub">{formatTransactionDate(item)}</div>
                    </div>
                    <div
                      className={`wallet-txAmount ${
                        isDeposit
                          ? "wallet-txAmount--pos"
                          : "wallet-txAmount--neg"
                      }`}
                    >
                      {formatAmount(item)}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <div className="wallet-historyList">
            <div className="wallet-txItem">
              <div className="wallet-txLeft">
                <div className="wallet-txTitle">{t("noTransactionsYet")}</div>
                <div className="wallet-txSub">-</div>
              </div>
              <div className="wallet-txAmount">-</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}