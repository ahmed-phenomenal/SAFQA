import { useEffect, useMemo, useState, useCallback, useContext } from "react";
import { useTranslation } from "react-i18next";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
  BarChart,
  Bar,
} from "recharts";
import "./seller.css";
import icon from "../../assets/2.png";
import { useTranslatedApiData } from "../../Hooks/useTranslatedApiData";
import { auth } from "../../Context/AuthContext";
import { jwtDecode } from "jwt-decode";

import {
  getSellerProducts,
  getSellerProductsByCategory,
  getPendingTransactionsSummary,
  getSellerRevenue,
  getMonthlyRevenue,
  getActiveAuctionsCount,
  getTotalAuctionsCount,
  getTotalBidsCountForSeller,
  getTotalBidsCountByCategory,
  getTop4AuctionsByBids,
  getAuctionCategoryPercentages,
  getTopCustomers,
  getAuctionWinners,
  getMostPopularProductsForSeller,
} from "../../API/sellerstatistics";

const COLORS = ["#023E8A", "#00B4D8", "#FFB703", "#E63946", "#8D99AE", "#6A4C93"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/* ─────────────────────────────────────────────────────────────────
   Read seller identity from storage.

   Priority order:
     1. "sellerId"   — numeric string (e.g. "221")
     2. "sellerUuid" — UUID
     3. JWT token claims
───────────────────────────────────────────────────────────────── */
const readStoredSellerId = () => {
  if (typeof window === "undefined") return null;

  const directNumeric =
    localStorage.getItem("sellerId") ||
    sessionStorage.getItem("sellerId");
  if (directNumeric) {
    const num = Number(directNumeric);
    if (!isNaN(num) && num > 0) return num;
    if (directNumeric.trim().length > 4) return directNumeric.trim();
  }

  const directUuid =
    localStorage.getItem("sellerUuid") ||
    sessionStorage.getItem("sellerUuid");
  if (directUuid && directUuid.trim().length > 8) return directUuid.trim();

  const tokenKeys = ["sellerToken", "token", "userToken", "adminToken"];
  for (const key of tokenKeys) {
    const raw = localStorage.getItem(key) || sessionStorage.getItem(key);
    if (!raw) continue;
    try {
      const parts = raw.split(".");
      if (parts.length < 2) continue;
      const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
      const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
      const payload = JSON.parse(atob(padded));

      const candidates = [
        payload?.SellerId,
        payload?.sellerId,
        payload?.UserId,
        payload?.userId,
        payload?.nameid,
        payload?.sub,
        payload?.id,
        payload?.["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"],
      ];

      for (const id of candidates) {
        if (id === null || id === undefined) continue;
        const str = String(id).trim();
        if (!str || str === "0") continue;
        const num = Number(str);
        if (!isNaN(num) && num > 0) return num;
        if (str.length > 4) return str;
      }
    } catch {}
  }

  return null;
};

// ✅ FIX: Also rehydrate the auth context from storage.
//         This is called on mount so that pressing the back button
//         (which causes a remount but does NOT re-run Signin.jsx)
//         still results in a valid logged-in state.
const rehydrateAuthFromStorage = (setlogin) => {
  if (!setlogin) return;
  try {
    const role = localStorage.getItem("role") || sessionStorage.getItem("role");
    const accountType = localStorage.getItem("accountType") || sessionStorage.getItem("accountType");
    if (!role) return; // Not logged in — nothing to rehydrate

    const tokenKey = role === "admin" ? "adminToken" : role === "seller" ? "sellerToken" : "userToken";
    const token =
      localStorage.getItem(tokenKey) ||
      sessionStorage.getItem(tokenKey) ||
      localStorage.getItem("token") ||
      sessionStorage.getItem("token");

    if (!token) return;

    let decoded = null;
    try { decoded = jwtDecode(token); } catch {}

    setlogin(decoded
      ? { ...decoded, role, accountType: accountType || role }
      : { role, accountType: accountType || role }
    );
  } catch {}
};

const TEST_CATEGORY_ID   = 1;
const TEST_CATEGORY_NAME = "cars";

function SkeletonBlock({ width = "100%", height = 16, radius = 8 }) {
  return (
    <span
      style={{
        display: "block", width, height, borderRadius: radius,
        background: "linear-gradient(90deg, #e9eef6 25%, #f8fafc 37%, #e9eef6 63%)",
        backgroundSize: "400% 100%",
        animation: "sellerStatsSkeleton 1.25s ease-in-out infinite",
      }}
    />
  );
}

function SkeletonTable({ rows = 5, cols = 4 }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {Array.from({ length: cols }).map((_, i) => (
              <th key={i}><SkeletonBlock width="70%" height={14} /></th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, r) => (
            <tr key={r}>
              {Array.from({ length: cols }).map((__, c) => (
                <td key={c}>
                  <SkeletonBlock width={c === 0 ? "82%" : c === cols - 1 ? "60%" : "72%"} height={14} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SellerStatisticsSkeleton() {
  return (
    <div className="seller-statistics">
      <style>{`
        @keyframes sellerStatsSkeleton {
          0%   { background-position: 100% 50%; }
          100% { background-position: 0 50%; }
        }
      `}</style>
      <div className="dashboard-header">
        <div className="dashboard-title-wrap"><SkeletonBlock width={260} height={34} radius={10} /></div>
        <div className="header-actions"><SkeletonBlock width={150} height={42} radius={12} /></div>
      </div>
      <div className="stats-grid">
        {Array.from({ length: 5 }).map((_, i) => (
          <div className="stat-card" key={i}>
            <SkeletonBlock width={48} height={48} radius={14} />
            <div style={{ width: "100%" }}>
              <SkeletonBlock width="70%" height={14} />
              <div style={{ height: 12 }} />
              <SkeletonBlock width="45%" height={26} />
            </div>
          </div>
        ))}
      </div>
      <div className="grid-2">
        <div className="card chart-card">
          <div className="card-header"><SkeletonBlock width={170} height={22} /></div>
          <div className="chart-wrap"><SkeletonBlock width="100%" height="100%" radius={16} /></div>
        </div>
        <div className="card chart-card">
          <div className="card-header">
            <SkeletonBlock width={190} height={22} />
            <SkeletonBlock width={135} height={14} />
          </div>
          <div className="chart-wrap pie-chart-wrap">
            <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <SkeletonBlock width={210} height={210} radius="50%" />
            </div>
          </div>
          <div className="legend-list">
            {Array.from({ length: 4 }).map((_, i) => (
              <div className="legend-item" key={i}>
                <SkeletonBlock width={14} height={14} radius="50%" />
                <SkeletonBlock width="42%" height={14} />
                <SkeletonBlock width={50} height={14} />
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="grid-2">
        <div className="card chart-card fixed-chart-card">
          <div className="card-header"><SkeletonBlock width={210} height={22} /></div>
          <div className="chart-wrap bar-chart-wrap"><SkeletonBlock width="100%" height="100%" radius={16} /></div>
        </div>
        <div className="card">
          <div className="card-header winners-header">
            <SkeletonBlock width={190} height={22} />
            <SkeletonBlock width={94} height={36} radius={10} />
          </div>
          <SkeletonTable rows={5} cols={3} />
        </div>
      </div>
      <div className="card">
        <div className="card-header"><SkeletonBlock width={180} height={22} /></div>
        <SkeletonTable rows={5} cols={5} />
      </div>
      <div className="grid-2">
        <div className="card chart-card fixed-chart-card">
          <div className="card-header"><SkeletonBlock width={230} height={22} /></div>
          <div className="chart-wrap bar-chart-wrap"><SkeletonBlock width="100%" height="100%" radius={16} /></div>
          <SkeletonTable rows={4} cols={4} />
        </div>
        <div className="card">
          <div className="card-header winners-header">
            <SkeletonBlock width={130} height={22} />
            <SkeletonBlock width={94} height={36} radius={10} />
          </div>
          <SkeletonTable rows={5} cols={5} />
        </div>
      </div>
      <div className="card">
        <div className="card-header winners-header">
          <SkeletonBlock width={190} height={22} />
          <SkeletonBlock width={94} height={36} radius={10} />
        </div>
        <SkeletonTable rows={5} cols={5} />
      </div>
      <div className="grid-2">
        <div className="card">
          <div className="card-header"><SkeletonBlock width={190} height={22} /></div>
          <SkeletonTable rows={5} cols={3} />
        </div>
        <div className="card">
          <div className="card-header"><SkeletonBlock width={190} height={22} /></div>
          <ul className="recommend-list">
            {Array.from({ length: 5 }).map((_, i) => (
              <li key={i}><SkeletonBlock width={`${85 - i * 8}%`} height={16} /></li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon }) {
  return (
    <div className="stat-card">
      <div className="stat-icon">{icon}</div>
      <div><p>{title}</p><h3>{value}</h3></div>
    </div>
  );
}

function formatAuctionLabel(name = "") {
  const cleaned = String(name).replace(/\s+#\d+$/, "").trim();
  if (cleaned.length <= 14) return cleaned;
  return `${cleaned.slice(0, 14)}...`;
}

function inferCategoryFromTitle(title = "", availableCategories = []) {
  const value = String(title || "").toLowerCase();
  const findAvailable = (target) =>
    availableCategories.find((c) => String(c).toLowerCase() === String(target).toLowerCase()) || target;
  if (value.includes("villa") || value.includes("estate") || value.includes("apartment") || value.includes("property")) return findAvailable("Real Estate");
  if (value.includes("tv") || value.includes("laptop") || value.includes("smart") || value.includes("gaming") || value.includes("camera")) return findAvailable("Electronics");
  if (value.includes("car") || value.includes("vehicle") || value.includes("bmw") || value.includes("mercedes")) return findAvailable("Vehicles");
  if (value.includes("watch") || value.includes("sport") || value.includes("fitness")) return findAvailable("Sports");
  if (value.includes("sofa") || value.includes("home") || value.includes("garden") || value.includes("chair") || value.includes("table")) return findAvailable("Home & Garden");
  return "";
}

export default function SellerStatistics() {
  const { t } = useTranslation();

  // ✅ FIX: Pull setlogin from AuthContext so we can rehydrate it on mount.
  //         This fixes the back-button logout bug — when the user presses back,
  //         React remounts this component but Signin.jsx does NOT re-run,
  //         so the auth context state is empty. We restore it from localStorage here.
  const { setlogin } = useContext(auth);

  // ✅ FIX: Read sellerId on init AND rehydrate auth in a single early effect.
  const [SELLER_ID, setSELLER_ID] = useState(() => readStoredSellerId());

  useEffect(() => {
    // 1. Rehydrate auth context from storage (fixes back-button logout)
    rehydrateAuthFromStorage(setlogin);

    // 2. Re-read sellerId if not already set (handles rare race on first redirect)
    if (!SELLER_ID) {
      const id = readStoredSellerId();
      if (id) setSELLER_ID(id);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ✅ FIX: Also retry reading sellerId with a short delay to handle any
  //         remaining race condition where navigate() fired slightly before
  //         localStorage.setItem() completed in an older browser.
  useEffect(() => {
    if (SELLER_ID) return;
    const timer = setTimeout(() => {
      const id = readStoredSellerId();
      if (id) setSELLER_ID(id);
    }, 150);
    return () => clearTimeout(timer);
  }, [SELLER_ID]);

  // Listen to storage events (cross-tab and same-tab via dispatchEvent in Signin)
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === "sellerId" && e.newValue) {
        const num = Number(e.newValue);
        const id = (!isNaN(num) && num > 0) ? num : e.newValue;
        setSELLER_ID(id);
      } else if (!SELLER_ID) {
        const id = readStoredSellerId();
        if (id) setSELLER_ID(id);
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [SELLER_ID]);

  const [selectedCategory, setSelectedCategory]             = useState("All");
  const [showAllWinners, setShowAllWinners]                 = useState(false);
  const [showAllBids, setShowAllBids]                       = useState(false);
  const [showAllSellerProducts, setShowAllSellerProducts]   = useState(false);
  const [isLoading, setIsLoading]                           = useState(true);

  const [apiSellerProducts, setApiSellerProducts]           = useState([]);
  const [apiProductsByCategory, setApiProductsByCategory]   = useState([]);
  const [apiPendingTransactions, setApiPendingTransactions] = useState(0);
  const [apiRevenue, setApiRevenue]                         = useState(0);
  const [apiMonthlyRevenue, setApiMonthlyRevenue]           = useState([]);
  const [apiActiveAuctionsCount, setApiActiveAuctionsCount] = useState(0);
  const [apiTotalAuctionsCount, setApiTotalAuctionsCount]   = useState(0);
  const [apiTotalBidsCount, setApiTotalBidsCount]           = useState(0);
  const [apiTotalBidsByCategory, setApiTotalBidsByCategory] = useState(0);
  const [apiTop4Auctions, setApiTop4Auctions]               = useState([]);
  const [apiCategoryPercentages, setApiCategoryPercentages] = useState([]);
  const [apiTopCustomers, setApiTopCustomers]               = useState([]);
  const [apiWinners, setApiWinners]                         = useState([]);
  const [apiPopularProducts, setApiPopularProducts]         = useState([]);

  const { translatedData: sellerProductsData }      = useTranslatedApiData(apiSellerProducts);
  const { translatedData: categoryPercentagesData } = useTranslatedApiData(apiCategoryPercentages);
  const { translatedData: topCustomersData }        = useTranslatedApiData(apiTopCustomers);
  const { translatedData: winnersData }             = useTranslatedApiData(apiWinners);
  const { translatedData: popularProductsData }     = useTranslatedApiData(apiPopularProducts);
  const { translatedData: top4AuctionsData }        = useTranslatedApiData(apiTop4Auctions);

  useEffect(() => { document.title = t("sellerStatisticsDocTitle"); }, [t]);
  useEffect(() => {
    const link = document.querySelector("link[rel~='icon']");
    if (link) { link.href = icon; } else {
      const newLink = document.createElement("link");
      newLink.rel = "icon"; newLink.href = icon;
      document.head.appendChild(newLink);
    }
  }, []);

  const fetchDashboard = useCallback(async (sellerId) => {
    setIsLoading(true);
    try {
      const [
        sellerProductsRes,
        productsByCategoryRes,
        pendingTransactionsRes,
        revenueRes,
        monthlyRevenueRes,
        activeAuctionsRes,
        totalAuctionsRes,
        totalBidsRes,
        totalBidsByCategoryRes,
        top4AuctionsRes,
        categoryPercentagesRes,
        topCustomersRes,
        winnersRes,
        popularProductsRes,
      ] = await Promise.allSettled([
        getSellerProducts(sellerId),
        getSellerProductsByCategory(sellerId, TEST_CATEGORY_NAME),
        getPendingTransactionsSummary(sellerId),
        getSellerRevenue(sellerId),
        getMonthlyRevenue(sellerId),
        getActiveAuctionsCount(sellerId),
        getTotalAuctionsCount(sellerId),
        getTotalBidsCountForSeller(sellerId),
        getTotalBidsCountByCategory(sellerId, TEST_CATEGORY_ID),
        getTop4AuctionsByBids(sellerId),
        getAuctionCategoryPercentages(sellerId),
        getTopCustomers(sellerId),
        getAuctionWinners(sellerId),
        getMostPopularProductsForSeller(sellerId, 5),
      ]);

      if (sellerProductsRes.status     === "fulfilled") setApiSellerProducts(Array.isArray(sellerProductsRes.value)         ? sellerProductsRes.value     : []);
      if (productsByCategoryRes.status === "fulfilled") setApiProductsByCategory(Array.isArray(productsByCategoryRes.value) ? productsByCategoryRes.value : []);
      if (pendingTransactionsRes.status=== "fulfilled") setApiPendingTransactions(Number(pendingTransactionsRes.value)       || 0);
      if (revenueRes.status            === "fulfilled") setApiRevenue(Number(revenueRes.value)                               || 0);
      if (monthlyRevenueRes.status     === "fulfilled") setApiMonthlyRevenue(Array.isArray(monthlyRevenueRes.value)         ? monthlyRevenueRes.value     : []);
      if (activeAuctionsRes.status     === "fulfilled") setApiActiveAuctionsCount(Number(activeAuctionsRes.value)           || 0);
      if (totalAuctionsRes.status      === "fulfilled") setApiTotalAuctionsCount(Number(totalAuctionsRes.value)             || 0);
      if (totalBidsRes.status          === "fulfilled") setApiTotalBidsCount(Number(totalBidsRes.value)                     || 0);
      if (totalBidsByCategoryRes.status=== "fulfilled") setApiTotalBidsByCategory(Number(totalBidsByCategoryRes.value)     || 0);
      if (top4AuctionsRes.status       === "fulfilled") setApiTop4Auctions(Array.isArray(top4AuctionsRes.value)            ? top4AuctionsRes.value       : []);
      if (categoryPercentagesRes.status=== "fulfilled") setApiCategoryPercentages(Array.isArray(categoryPercentagesRes.value) ? categoryPercentagesRes.value : []);
      if (topCustomersRes.status       === "fulfilled") setApiTopCustomers(Array.isArray(topCustomersRes.value)            ? topCustomersRes.value       : []);
      if (winnersRes.status            === "fulfilled") setApiWinners(Array.isArray(winnersRes.value)                      ? winnersRes.value            : []);
      if (popularProductsRes.status    === "fulfilled") setApiPopularProducts(Array.isArray(popularProductsRes.value)      ? popularProductsRes.value    : []);
    } catch (err) {
      console.error("Dashboard API error:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!SELLER_ID) {
      setIsLoading(true);
      return;
    }
    fetchDashboard(SELLER_ID);
  }, [SELLER_ID, fetchDashboard]);

  // ✅ FIX: Timeout increased slightly and only fires if SELLER_ID truly never arrived
  useEffect(() => {
    if (SELLER_ID) return;
    const timer = setTimeout(() => {
      // Last-chance read before giving up
      const id = readStoredSellerId();
      if (id) {
        setSELLER_ID(id);
      } else {
        setIsLoading(false); // Show error state
      }
    }, 3000);
    return () => clearTimeout(timer);
  }, [SELLER_ID]);

  const apiCategoryNames = useMemo(() => (
    categoryPercentagesData.map((item) => String(item?.categoryName || "").trim()).filter(Boolean)
  ), [categoryPercentagesData]);

  const categoryAnalysis = useMemo(() => (
    categoryPercentagesData.map((item, index) => ({
      id:    `${item?.categoryName || "category"}-${index}`,
      name:  String(item?.categoryName || t("category")),
      value: Number(item?.percentage) || 0,
    }))
  ), [categoryPercentagesData, t]);

  const totalCategoryValue = useMemo(() => (
    categoryAnalysis.reduce((sum, item) => sum + item.value, 0)
  ), [categoryAnalysis]);

  const monthlyRevenueData = useMemo(() => {
    const revenueMap = {};
    apiMonthlyRevenue.forEach((item) => {
      const monthIndex =
        Number(item?.month ?? item?.Month ?? item?.monthNumber ?? item?.MonthNumber) - 1;
      const revenueValue =
        Number(item?.revenue ?? item?.Revenue ?? item?.amount ?? item?.Amount ?? item?.totalRevenue) || 0;
      if (monthIndex >= 0 && monthIndex <= 11) revenueMap[MONTHS[monthIndex]] = revenueValue;
    });
    return MONTHS.map((month) => ({ month, revenue: revenueMap[month] || 0 }));
  }, [apiMonthlyRevenue]);

  const bidsAuctionsDataRaw = useMemo(() => (
    top4AuctionsData.map((a, index) => ({
      auctionId:   a?.auctionId ?? index,
      auctionName: a?.auctionTitle || a?.title || t("auction"),
      shortName:   formatAuctionLabel(a?.auctionTitle || a?.title || t("auction")),
      totalBids:   Number(a?.totalBids) || 0,
      date:        a?.startDate ? String(a.startDate).slice(0, 10) : "-",
      category:    inferCategoryFromTitle(a?.auctionTitle || a?.title || "", apiCategoryNames),
    }))
  ), [top4AuctionsData, apiCategoryNames, t]);

  const bidsAuctionsData = useMemo(() => (
    selectedCategory === "All" ? bidsAuctionsDataRaw
      : bidsAuctionsDataRaw.filter((item) => item.category === selectedCategory)
  ), [bidsAuctionsDataRaw, selectedCategory]);

  const visibleBidsAuctions = showAllBids ? bidsAuctionsData : bidsAuctionsData.slice(0, 5);
  const chartBidsAuctions   = useMemo(() => bidsAuctionsData.slice(0, 5), [bidsAuctionsData]);

  const customersTable = useMemo(() => (
    topCustomersData.map((row, index) => ({
      id:           index,
      name:         row?.buyerName || row?.name || t("customerName"),
      companyName:  row?.sellerCompanyName || row?.companyName || t("customerName"),
      email:        row?.email || "-",
      participated: Number(row?.participatedAuctionsCount ?? row?.participated ?? row?.auctionsWonCount ?? 0),
      totalPaid:    Number(row?.totalPaidAmount ?? row?.totalPaid ?? 0),
    }))
  ), [topCustomersData, t]);

  const winnersTable = useMemo(() => (
    winnersData.map((row, index) => ({
      id:          index,
      buyerName:   row?.buyerName || t("customerName"),
      companyName: row?.sellerCompanyName || row?.companyName || t("customerName"),
      email:       row?.email || "-",
      wins:        Number(row?.auctionsWonCount) || 0,
      totalValue:  Number(row?.totalPaidAmount) || 0,
    }))
  ), [winnersData, t]);

  const visibleWinners = showAllWinners ? winnersTable : winnersTable.slice(0, 5);

  const popularProductsRaw = useMemo(() => (
    popularProductsData.map((item, index) => {
      const title = item?.title || item?.productName || t("product");
      return {
        id:            item?.id ?? index,
        productName:   title,
        category:      item?.categoryName || item?.category || inferCategoryFromTitle(title, apiCategoryNames) || "-",
        totalAuctions: Number(item?.viewCount ?? item?.count ?? 0),
        description:   item?.description || "",
      };
    })
  ), [popularProductsData, apiCategoryNames, t]);

  const popularProducts = useMemo(() => (
    selectedCategory === "All" ? popularProductsRaw
      : popularProductsRaw.filter((item) => item.category === selectedCategory)
  ), [popularProductsRaw, selectedCategory]);

  const sellerProductsTableRaw = useMemo(() => (
    sellerProductsData.map((item, index) => {
      const title = item?.title || t("product");
      return {
        id:            item?.id ?? index,
        productName:   title,
        category:      item?.categoryName || item?.category || inferCategoryFromTitle(title, apiCategoryNames) || "-",
        totalAuctions: Number(item?.count ?? 0),
        description:   item?.description || "",
        condition:     item?.condition,
      };
    })
  ), [sellerProductsData, apiCategoryNames, t]);

  const sellerProductsTable = useMemo(() => (
    selectedCategory === "All" ? sellerProductsTableRaw
      : sellerProductsTableRaw.filter((item) => item.category === selectedCategory)
  ), [sellerProductsTableRaw, selectedCategory]);

  const visibleSellerProducts = showAllSellerProducts ? sellerProductsTable : sellerProductsTable.slice(0, 5);

  const revenuePerAuctionData = useMemo(() => (
    winnersTable.map((row, index) => ({
      auctionName: row.companyName || `${t("auction")} ${index + 1}`,
      shortName:   formatAuctionLabel(row.companyName || `${t("auction")} ${index + 1}`),
      startPrice:  0,
      endPrice:    row.totalValue,
      revenue:     row.totalValue,
      winnerName:  row.buyerName,
    }))
  ), [winnersTable, t]);

  const chartRevenuePerAuction = useMemo(() => revenuePerAuctionData.slice(0, 5), [revenuePerAuctionData]);

  const activeAuctionsCount = apiActiveAuctionsCount;
  const totalAuctionsCount  = apiTotalAuctionsCount;
  const totalRevenue        = apiRevenue;
  const totalBids           = selectedCategory !== "All" ? apiTotalBidsByCategory : apiTotalBidsCount;
  const pendingPayments     = apiPendingTransactions;

  const recommendations = useMemo(() => {
    const recs              = [];
    const strongestCategory = [...categoryAnalysis].sort((a, b) => b.value - a.value)[0];
    const highestBidAuction = [...bidsAuctionsDataRaw].sort((a, b) => b.totalBids - a.totalBids)[0];
    const bestProduct       = [...popularProductsRaw].sort((a, b) => b.totalAuctions - a.totalAuctions)[0];
    if (strongestCategory) recs.push(t("focusMarketingRecommendation", { category: strongestCategory.name, value: strongestCategory.value.toFixed(2) }));
    if (highestBidAuction) recs.push(t("highestBidRecommendation",     { auction: highestBidAuction.auctionName, bids: highestBidAuction.totalBids }));
    if (bestProduct)       recs.push(t("popularProductRecommendation", { product: bestProduct.productName, views: bestProduct.totalAuctions }));
    if (winnersData.length > 0)         recs.push(t("winnersRecommendation",         { count: winnersData.length }));
    if (sellerProductsTable.length > 0) recs.push(t("sellerProductsRecommendation",  { count: sellerProductsTable.length, categoryText: selectedCategory !== "All" ? ` ${t("category")}: ${selectedCategory}` : "" }));
    return recs.slice(0, 6);
  }, [categoryAnalysis, bidsAuctionsDataRaw, popularProductsRaw, winnersData.length, sellerProductsTable.length, selectedCategory, t]);

  const handlePieClick = (data) => {
    if (!data?.name) return;
    setSelectedCategory((prev) => (prev === data.name ? "All" : data.name));
  };

  // Guard: no seller ID found after timeout
  if (!SELLER_ID && !isLoading) {
    return (
      <div className="seller-statistics" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
        <div style={{ textAlign: "center", color: "#6c757d" }}>
          <i className="fa-solid fa-triangle-exclamation" style={{ fontSize: 48, color: "#FFB703", marginBottom: 16 }}></i>
          <h3>{t("sellerDashboard")}</h3>
          <p>Seller ID not found. Please log out and log in again as a seller.</p>
        </div>
      </div>
    );
  }

  if (isLoading) return <SellerStatisticsSkeleton />;

  return (
    <div className="seller-statistics">
      <div className="dashboard-header">
        <div className="dashboard-title-wrap">
          <h2 className="page-title">
            <i className="fa-solid fa-chart-column page-title-icon"></i>
            {t("sellerDashboard")}
          </h2>
        </div>
        <div className="header-actions">
          <button className="filter-btn active-filter">
            {t("category")}:{" "}
            {selectedCategory === "All" ? t("all", { defaultValue: "All" }) : selectedCategory}
          </button>
          {selectedCategory !== "All" && (
            <button className="clear-btn" onClick={() => setSelectedCategory("All")}>
              {t("clearFilter")}
            </button>
          )}
        </div>
      </div>

      <div className="stats-grid">
        <StatCard title={t("activeAuctions")} value={activeAuctionsCount} icon={<i className="fa-solid fa-gavel"></i>} />
        <StatCard title={t("totalAuctions")}  value={totalAuctionsCount}  icon={<i className="fa-solid fa-layer-group"></i>} />
        <StatCard title={t("totalRevenue")}   value={`EGP ${Number(totalRevenue).toLocaleString()}`} icon={<i className="fa-solid fa-sack-dollar"></i>} />
        <StatCard title={t("totalBids")}      value={totalBids}            icon={<i className="fa-solid fa-chart-line"></i>} />
        <StatCard title={t("pendingPayment")} value={pendingPayments}      icon={<i className="fa-solid fa-clock"></i>} />
      </div>

      <div className="grid-2">
        <div className="card chart-card">
          <div className="card-header"><h4>{t("monthlyRevenue")}</h4></div>
          <div className="chart-wrap">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <LineChart data={monthlyRevenueData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value) => [`EGP ${Number(value).toLocaleString()}`, t("totalRevenue")]} />
                <Line type="monotone" dataKey="revenue" stroke="#023E8A" strokeWidth={3} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card chart-card">
          <div className="card-header">
            <h4>{t("productCategories")}</h4>
            <span className="hint-text">{t("clickCategoryFilter")}</span>
          </div>
          <div className="chart-wrap pie-chart-wrap">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <PieChart>
                <Pie data={categoryAnalysis} cx="50%" cy="50%" innerRadius={55} outerRadius={100} paddingAngle={4} dataKey="value" onClick={handlePieClick}>
                  {categoryAnalysis.map((entry, index) => (
                    <Cell key={entry.id} fill={COLORS[index % COLORS.length]}
                      stroke={selectedCategory === entry.name ? "#111827" : "#fff"}
                      strokeWidth={selectedCategory === entry.name ? 3 : 1}
                      style={{ cursor: "pointer" }}
                    />
                  ))}
                </Pie>
                <Tooltip formatter={(value, _, props) => {
                  const percent = totalCategoryValue ? ((props.payload.value / totalCategoryValue) * 100).toFixed(1) : 0;
                  return [`${Number(value).toFixed(2)}%`, `${props.payload.name} (${percent}%)`];
                }} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="legend-list">
            {categoryAnalysis.map((item, index) => (
              <button key={item.id} className={`legend-item ${selectedCategory === item.name ? "selected-legend" : ""}`} onClick={() => handlePieClick(item)}>
                <span className="color-dot" style={{ backgroundColor: COLORS[index % COLORS.length] }}></span>
                <span>{item.name}</span>
                <strong>{Number(item.value).toFixed(2)}%</strong>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid-2">
        <div className="card chart-card fixed-chart-card">
          <div className="card-header"><h4>{t("totalBidsPerAuction")}</h4></div>
          <div className="chart-wrap bar-chart-wrap">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <BarChart data={chartBidsAuctions} margin={{ top: 10, right: 20, left: 0, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="shortName" interval={0} angle={0} tickLine={false} axisLine={false} height={50} tick={{ fontSize: 12, fill: "#475569" }} />
                <YAxis />
                <Tooltip formatter={(value) => [value, t("totalBids")]} labelFormatter={(_, payload) => payload?.[0]?.payload?.auctionName || ""} />
                <Bar dataKey="totalBids" fill="#023E8A" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <div className="card-header winners-header">
            <h4>{t("auctionsBidsTable")}</h4>
            <button className="toggle-btn" onClick={() => setShowAllBids((prev) => !prev)}>
              {showAllBids ? t("showLess") : t("showMore")}
            </button>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>{t("auctionName")}</th><th>{t("date")}</th><th>{t("totalBids")}</th></tr>
              </thead>
              <tbody>
                {visibleBidsAuctions.map((row, index) => (
                  <tr key={row.auctionId || index}>
                    <td>{row.auctionName}</td>
                    <td>{row.date || "-"}</td>
                    <td>{row.totalBids}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header"><h4>{t("topCustomersTitle")}</h4></div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>{t("customerName")}</th><th>{t("companyName")}</th>
                <th>{t("email")}</th><th>{t("participatedAuctions")}</th><th>{t("totalPaid")}</th>
              </tr>
            </thead>
            <tbody>
              {customersTable.map((row, index) => (
                <tr key={row.id || index}>
                  <td>{row.name}</td><td>{row.companyName}</td>
                  <td>{row.email}</td><td>{row.participated}</td>
                  <td>EGP {Number(row.totalPaid).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid-2">
        <div className="card chart-card fixed-chart-card">
          <div className="card-header"><h4>{t("totalRevenuePerAuction")}</h4></div>
          <div className="chart-wrap bar-chart-wrap">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <BarChart data={chartRevenuePerAuction} margin={{ top: 10, right: 20, left: 0, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="shortName" interval={0} angle={0} tickLine={false} axisLine={false} height={50} tick={{ fontSize: 12, fill: "#475569" }} />
                <YAxis />
                <Tooltip
                  formatter={(value, key) => key === "revenue" ? [`EGP ${Number(value).toLocaleString()}`, t("endPrice")] : [value, key]}
                  labelFormatter={(_, payload) => payload?.[0]?.payload?.auctionName || ""}
                />
                <Bar dataKey="revenue" fill="#023E8A" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="table-wrap mini-top-table">
            <table>
              <thead>
                <tr><th>{t("auction")}</th><th>{t("startPrice")}</th><th>{t("endPrice")}</th><th>{t("winner")}</th></tr>
              </thead>
              <tbody>
                {chartRevenuePerAuction.map((row, index) => (
                  <tr key={index}>
                    <td>{row.auctionName}</td>
                    <td>EGP {Number(row.startPrice).toLocaleString()}</td>
                    <td>EGP {Number(row.endPrice).toLocaleString()}</td>
                    <td>{row.winnerName}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <div className="card-header winners-header">
            <h4>{t("topWinners")}</h4>
            <button className="toggle-btn" onClick={() => setShowAllWinners((prev) => !prev)}>
              {showAllWinners ? t("showLess") : t("showMore")}
            </button>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>{t("buyerName")}</th><th>{t("companyName")}</th>
                  <th>{t("email")}</th><th>{t("wins")}</th><th>{t("totalValue")}</th>
                </tr>
              </thead>
              <tbody>
                {visibleWinners.map((row, index) => (
                  <tr key={row.id || index}>
                    <td>{row.buyerName}</td><td>{row.companyName || t("customerName")}</td>
                    <td>{row.email}</td><td>{row.wins}</td>
                    <td>EGP {Number(row.totalValue).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header winners-header">
          <h4>{t("allSellerProducts")}</h4>
          <button className="toggle-btn" onClick={() => setShowAllSellerProducts((prev) => !prev)}>
            {showAllSellerProducts ? t("showLess") : t("showMore")}
          </button>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>{t("product")}</th><th>{t("category")}</th>
                <th>{t("totalProductAuctions")}</th><th>{t("condition")}</th><th>{t("description")}</th>
              </tr>
            </thead>
            <tbody>
              {visibleSellerProducts.map((item, index) => (
                <tr key={item.id || index}>
                  <td>{item.productName}</td><td>{item.category}</td>
                  <td>{item.totalAuctions}</td><td>{item.condition ?? "-"}</td>
                  <td>{item.description || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-header"><h4>{t("mostPopularProducts")}</h4></div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>{t("product")}</th><th>{t("category")}</th><th>{t("totalProductAuctions")}</th></tr>
              </thead>
              <tbody>
                {popularProducts.map((item, index) => (
                  <tr key={item.id || index}>
                    <td>{item.productName}</td><td>{item.category}</td><td>{item.totalAuctions}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <div className="card-header"><h4>{t("aiRecommendations")}</h4></div>
          <ul className="recommend-list">
            {recommendations.map((rec, index) => (
              <li key={index}>💡 {rec}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}