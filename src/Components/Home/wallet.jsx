import { useEffect, useMemo, useState } from "react";
import icon from "../../assets/2.png";
import visa from "../../assets/cardVisa.png";
import visa2 from "../../assets/cardVisa2.png";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  getUserWalletBalance,
  getUserWalletTransactionHistory,
  getUserSavedCards,
} from "../../API/userWallet";

export default function Wallet() {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === "ar";
  const navigate = useNavigate();

  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    document.title = t("walletDocTitle");
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
          getUserWalletBalance(),
          getUserWalletTransactionHistory(),
          getUserSavedCards(),
        ]);

        if (!mounted) return;

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
      } catch (err) {
        if (!mounted) return;
        setError(
          err?.response?.data?.message ||
            err?.message ||
            t("failedToLoadWalletData")
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
        expiry: firstCard.expiry || "**/**",
        brand: firstCard.brand || "CARD",
        type: firstCard.label || "Saved",
        savedName: firstCard.label || firstCard.holderName || "Saved Card",
      };
    }

    return {
      number: "**** **** **** ****",
      name: t("yourNameHere"),
      expiry: "**/**",
      brand: "VISA",
      type: t("credit"),
      savedName: t("savedCard"),
    };
  }, [cards, t]);

  const latestTransactions = transactions.slice(0, 3);

  const goSavedCards = () => navigate("/saved-cards");
  const goDeposit = () => navigate("/deposit");
  const goWithdraw = () => navigate("/withdraw");

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
    return `${isDeposit ? "+" : "-"} $${amount.toLocaleString()}`;
  };

  const getTransactionTypeLabel = (type) => {
    const value = String(type || "").toLowerCase();
    if (value === "deposit") return t("deposit");
    if (value === "withdraw" || value === "withdrawal") return t("withdrawTitle");
    return type || t("transaction");
  };

  return (
    <div className="wallet" dir={isArabic ? "rtl" : "ltr"}>
      <div className="container">
        <h1 className="wallet-title">{t("walletTitle")}</h1>

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
            <div className="wallet-balanceLabel">
              {t("walletBalance")}
            </div>

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
              <span className="wallet-actionText">
                {t("depositMoney")}
              </span>
            </button>

            <button
              className="wallet-actionBtn"
              type="button"
              onClick={goWithdraw}
            >
              <span className="wallet-actionIcon">
                <i className="fa-solid fa-money-bill-transfer"></i>
              </span>
              <span className="wallet-actionText">
                {t("withdrawalMoney")}
              </span>
            </button>
          </div>
        </div>

        <div className="wallet-sectionHead">
          <h2 className="wallet-sectionTitle">
            {t("savedCards")}
          </h2>
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
                <div className="wallet-cardMetaLabel">
                  {t("expires")}
                </div>
                <div className="wallet-cardMetaValue">{card.expiry}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="wallet-historyHead">
          <h2 className="wallet-sectionTitle">
            {t("transactionHistory")}
          </h2>
          <Link to="/transactions" className="wallet-seeAll">
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
                        {getTransactionTypeLabel(item?.type)}
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