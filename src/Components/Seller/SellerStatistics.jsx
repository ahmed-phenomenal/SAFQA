import { useEffect, useMemo, useState } from "react";
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
} from "../../api/sellerstatistics";

const COLORS = ["#023E8A", "#00B4D8", "#FFB703", "#E63946", "#8D99AE", "#6A4C93"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const SELLER_ID = 210;
const TEST_CATEGORY_ID = 1;
const TEST_CATEGORY_NAME = "cars";

function SkeletonBlock({ width = "100%", height = 16, radius = 8 }) {
  return (
    <span
      style={{
        display: "block",
        width,
        height,
        borderRadius: radius,
        background:
          "linear-gradient(90deg, #e9eef6 25%, #f8fafc 37%, #e9eef6 63%)",
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
            {Array.from({ length: cols }).map((_, index) => (
              <th key={index}>
                <SkeletonBlock width="70%" height={14} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <tr key={rowIndex}>
              {Array.from({ length: cols }).map((_, colIndex) => (
                <td key={colIndex}>
                  <SkeletonBlock
                    width={colIndex === 0 ? "82%" : colIndex === cols - 1 ? "60%" : "72%"}
                    height={14}
                  />
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
      <style>
        {`
          @keyframes sellerStatsSkeleton {
            0% { background-position: 100% 50%; }
            100% { background-position: 0 50%; }
          }
        `}
      </style>

      <div className="dashboard-header">
        <div className="dashboard-title-wrap">
          <SkeletonBlock width={260} height={34} radius={10} />
        </div>

        <div className="header-actions">
          <SkeletonBlock width={150} height={42} radius={12} />
        </div>
      </div>

      <div className="stats-grid">
        {Array.from({ length: 5 }).map((_, index) => (
          <div className="stat-card" key={index}>
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
          <div className="card-header">
            <SkeletonBlock width={170} height={22} />
          </div>
          <div className="chart-wrap">
            <SkeletonBlock width="100%" height="100%" radius={16} />
          </div>
        </div>

        <div className="card chart-card">
          <div className="card-header">
            <SkeletonBlock width={190} height={22} />
            <SkeletonBlock width={135} height={14} />
          </div>

          <div className="chart-wrap pie-chart-wrap">
            <div
              style={{
                width: "100%",
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <SkeletonBlock width={210} height={210} radius="50%" />
            </div>
          </div>

          <div className="legend-list">
            {Array.from({ length: 4 }).map((_, index) => (
              <div className="legend-item" key={index}>
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
          <div className="card-header">
            <SkeletonBlock width={210} height={22} />
          </div>
          <div className="chart-wrap bar-chart-wrap">
            <SkeletonBlock width="100%" height="100%" radius={16} />
          </div>
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
        <div className="card-header">
          <SkeletonBlock width={180} height={22} />
        </div>
        <SkeletonTable rows={5} cols={5} />
      </div>

      <div className="grid-2">
        <div className="card chart-card fixed-chart-card">
          <div className="card-header">
            <SkeletonBlock width={230} height={22} />
          </div>
          <div className="chart-wrap bar-chart-wrap">
            <SkeletonBlock width="100%" height="100%" radius={16} />
          </div>
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
          <div className="card-header">
            <SkeletonBlock width={190} height={22} />
          </div>
          <SkeletonTable rows={5} cols={3} />
        </div>

        <div className="card">
          <div className="card-header">
            <SkeletonBlock width={190} height={22} />
          </div>

          <ul className="recommend-list">
            {Array.from({ length: 5 }).map((_, index) => (
              <li key={index}>
                <SkeletonBlock width={`${85 - index * 8}%`} height={16} />
              </li>
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
      <div>
        <p>{title}</p>
        <h3>{value}</h3>
      </div>
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
    availableCategories.find(
      (c) => String(c).toLowerCase() === String(target).toLowerCase()
    ) || target;

  if (
    value.includes("villa") ||
    value.includes("estate") ||
    value.includes("apartment") ||
    value.includes("property")
  ) {
    return findAvailable("Real Estate");
  }

  if (
    value.includes("tv") ||
    value.includes("laptop") ||
    value.includes("smart") ||
    value.includes("gaming") ||
    value.includes("camera")
  ) {
    return findAvailable("Electronics");
  }

  if (
    value.includes("car") ||
    value.includes("vehicle") ||
    value.includes("bmw") ||
    value.includes("mercedes")
  ) {
    return findAvailable("Vehicles");
  }

  if (
    value.includes("watch") ||
    value.includes("sport") ||
    value.includes("fitness")
  ) {
    return findAvailable("Sports");
  }

  if (
    value.includes("sofa") ||
    value.includes("home") ||
    value.includes("garden") ||
    value.includes("chair") ||
    value.includes("table")
  ) {
    return findAvailable("Home & Garden");
  }

  return "";
}

export default function SellerStatistics() {
  const { t } = useTranslation();

  const [selectedCategory, setSelectedCategory] = useState("All");
  const [showAllWinners, setShowAllWinners] = useState(false);
  const [showAllBids, setShowAllBids] = useState(false);
  const [showAllSellerProducts, setShowAllSellerProducts] = useState(false);

  const [isLoading, setIsLoading] = useState(true);

  const [apiSellerProducts, setApiSellerProducts] = useState([]);
  const [apiProductsByCategory, setApiProductsByCategory] = useState([]);
  const [apiPendingTransactions, setApiPendingTransactions] = useState(0);
  const [apiRevenue, setApiRevenue] = useState(0);
  const [apiMonthlyRevenue, setApiMonthlyRevenue] = useState([]);
  const [apiActiveAuctionsCount, setApiActiveAuctionsCount] = useState(0);
  const [apiTotalAuctionsCount, setApiTotalAuctionsCount] = useState(0);
  const [apiTotalBidsCount, setApiTotalBidsCount] = useState(0);
  const [apiTotalBidsByCategory, setApiTotalBidsByCategory] = useState(0);
  const [apiTop4Auctions, setApiTop4Auctions] = useState([]);
  const [apiCategoryPercentages, setApiCategoryPercentages] = useState([]);
  const [apiTopCustomers, setApiTopCustomers] = useState([]);
  const [apiWinners, setApiWinners] = useState([]);
  const [apiPopularProducts, setApiPopularProducts] = useState([]);

  const { translatedData: sellerProductsData } = useTranslatedApiData(apiSellerProducts);
  const { translatedData: categoryPercentagesData } = useTranslatedApiData(apiCategoryPercentages);
  const { translatedData: topCustomersData } = useTranslatedApiData(apiTopCustomers);
  const { translatedData: winnersData } = useTranslatedApiData(apiWinners);
  const { translatedData: popularProductsData } = useTranslatedApiData(apiPopularProducts);
  const { translatedData: top4AuctionsData } = useTranslatedApiData(apiTop4Auctions);

  useEffect(() => {
    document.title = t("sellerStatisticsDocTitle");
  }, [t]);

  useEffect(() => {
    const link = document.querySelector("link[rel~='icon']");

    if (link) {
      link.href = icon;
    } else {
      const newLink = document.createElement("link");
      newLink.rel = "icon";
      newLink.href = icon;
      document.head.appendChild(newLink);
    }
  }, []);

  useEffect(() => {
    const fetchBackendDashboardData = async () => {
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
          getSellerProducts(SELLER_ID),
          getSellerProductsByCategory(SELLER_ID, TEST_CATEGORY_NAME),
          getPendingTransactionsSummary(SELLER_ID),
          getSellerRevenue(SELLER_ID),
          getMonthlyRevenue(SELLER_ID),
          getActiveAuctionsCount(SELLER_ID),
          getTotalAuctionsCount(SELLER_ID),
          getTotalBidsCountForSeller(SELLER_ID),
          getTotalBidsCountByCategory(SELLER_ID, TEST_CATEGORY_ID),
          getTop4AuctionsByBids(SELLER_ID),
          getAuctionCategoryPercentages(SELLER_ID),
          getTopCustomers(SELLER_ID),
          getAuctionWinners(SELLER_ID),
          getMostPopularProductsForSeller(SELLER_ID, 5),
        ]);

        if (sellerProductsRes.status === "fulfilled") {
          setApiSellerProducts(
            Array.isArray(sellerProductsRes.value) ? sellerProductsRes.value : []
          );
        }

        if (productsByCategoryRes.status === "fulfilled") {
          setApiProductsByCategory(
            Array.isArray(productsByCategoryRes.value) ? productsByCategoryRes.value : []
          );
        }

        if (pendingTransactionsRes.status === "fulfilled") {
          setApiPendingTransactions(Number(pendingTransactionsRes.value) || 0);
        }

        if (revenueRes.status === "fulfilled") {
          setApiRevenue(Number(revenueRes.value) || 0);
        }

        if (monthlyRevenueRes.status === "fulfilled") {
          setApiMonthlyRevenue(
            Array.isArray(monthlyRevenueRes.value) ? monthlyRevenueRes.value : []
          );
        }

        if (activeAuctionsRes.status === "fulfilled") {
          setApiActiveAuctionsCount(Number(activeAuctionsRes.value) || 0);
        }

        if (totalAuctionsRes.status === "fulfilled") {
          setApiTotalAuctionsCount(Number(totalAuctionsRes.value) || 0);
        }

        if (totalBidsRes.status === "fulfilled") {
          setApiTotalBidsCount(Number(totalBidsRes.value) || 0);
        }

        if (totalBidsByCategoryRes.status === "fulfilled") {
          setApiTotalBidsByCategory(Number(totalBidsByCategoryRes.value) || 0);
        }

        if (top4AuctionsRes.status === "fulfilled") {
          setApiTop4Auctions(
            Array.isArray(top4AuctionsRes.value) ? top4AuctionsRes.value : []
          );
        }

        if (categoryPercentagesRes.status === "fulfilled") {
          setApiCategoryPercentages(
            Array.isArray(categoryPercentagesRes.value)
              ? categoryPercentagesRes.value
              : []
          );
        }

        if (topCustomersRes.status === "fulfilled") {
          setApiTopCustomers(
            Array.isArray(topCustomersRes.value) ? topCustomersRes.value : []
          );
        }

        if (winnersRes.status === "fulfilled") {
          setApiWinners(Array.isArray(winnersRes.value) ? winnersRes.value : []);
        }

        if (popularProductsRes.status === "fulfilled") {
          setApiPopularProducts(
            Array.isArray(popularProductsRes.value) ? popularProductsRes.value : []
          );
        }
      } catch (error) {
        console.error("Dashboard API error:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBackendDashboardData();
  }, []);

  const apiCategoryNames = useMemo(() => {
    return categoryPercentagesData
      .map((item) => String(item?.categoryName || "").trim())
      .filter(Boolean);
  }, [categoryPercentagesData]);

  const categoryAnalysis = useMemo(() => {
    return categoryPercentagesData.map((item, index) => ({
      id: `${item?.categoryName || "category"}-${index}`,
      name: String(item?.categoryName || t("category")),
      value: Number(item?.percentage) || 0,
    }));
  }, [categoryPercentagesData, t]);

  const totalCategoryValue = useMemo(() => {
    return categoryAnalysis.reduce((sum, item) => sum + item.value, 0);
  }, [categoryAnalysis]);

  const monthlyRevenueData = useMemo(() => {
    const revenueMap = {};

    apiMonthlyRevenue.forEach((item) => {
      const monthIndex =
        Number(item?.month ?? item?.Month ?? item?.monthNumber ?? item?.MonthNumber) - 1;

      const revenueValue =
        Number(
          item?.revenue ??
            item?.Revenue ??
            item?.amount ??
            item?.Amount ??
            item?.totalRevenue
        ) || 0;

      if (monthIndex >= 0 && monthIndex <= 11) {
        revenueMap[MONTHS[monthIndex]] = revenueValue;
      }
    });

    return MONTHS.map((month) => ({
      month,
      revenue: revenueMap[month] || 0,
    }));
  }, [apiMonthlyRevenue]);

  const bidsAuctionsDataRaw = useMemo(() => {
    return top4AuctionsData.map((a, index) => ({
      auctionId: a?.auctionId ?? index,
      auctionName: a?.auctionTitle || a?.title || t("auction"),
      shortName: formatAuctionLabel(a?.auctionTitle || a?.title || t("auction")),
      totalBids: Number(a?.totalBids) || 0,
      date: a?.startDate ? String(a.startDate).slice(0, 10) : "-",
      category: inferCategoryFromTitle(a?.auctionTitle || a?.title || "", apiCategoryNames),
    }));
  }, [top4AuctionsData, apiCategoryNames, t]);

  const bidsAuctionsData = useMemo(() => {
    if (selectedCategory === "All") return bidsAuctionsDataRaw;
    return bidsAuctionsDataRaw.filter((item) => item.category === selectedCategory);
  }, [bidsAuctionsDataRaw, selectedCategory]);

  const visibleBidsAuctions = showAllBids
    ? bidsAuctionsData
    : bidsAuctionsData.slice(0, 5);

  const chartBidsAuctions = useMemo(
    () => bidsAuctionsData.slice(0, 5),
    [bidsAuctionsData]
  );

  const customersTable = useMemo(() => {
    return topCustomersData.map((row, index) => ({
      id: index,
      name: row?.buyerName || row?.name || t("customerName"),
      companyName: row?.sellerCompanyName || row?.companyName || t("customerName"),
      email: row?.email || "-",
      participated: Number(
        row?.participatedAuctionsCount ??
          row?.participated ??
          row?.auctionsWonCount ??
          0
      ),
      totalPaid: Number(row?.totalPaidAmount ?? row?.totalPaid ?? 0),
    }));
  }, [topCustomersData, t]);

  const winnersTable = useMemo(() => {
    return winnersData.map((row, index) => ({
      id: index,
      buyerName: row?.buyerName || t("customerName"),
      companyName: row?.sellerCompanyName || row?.companyName || t("customerName"),
      email: row?.email || "-",
      wins: Number(row?.auctionsWonCount) || 0,
      totalValue: Number(row?.totalPaidAmount) || 0,
    }));
  }, [winnersData, t]);

  const visibleWinners = showAllWinners ? winnersTable : winnersTable.slice(0, 5);

  const popularProductsRaw = useMemo(() => {
    return popularProductsData.map((item, index) => {
      const title = item?.title || item?.productName || t("product");

      return {
        id: item?.id ?? index,
        productName: title,
        category:
          item?.categoryName ||
          item?.category ||
          inferCategoryFromTitle(title, apiCategoryNames) ||
          "-",
        totalAuctions: Number(item?.viewCount ?? item?.count ?? 0),
        description: item?.description || "",
      };
    });
  }, [popularProductsData, apiCategoryNames, t]);

  const popularProducts = useMemo(() => {
    if (selectedCategory === "All") return popularProductsRaw;
    return popularProductsRaw.filter((item) => item.category === selectedCategory);
  }, [popularProductsRaw, selectedCategory]);

  const sellerProductsTableRaw = useMemo(() => {
    return sellerProductsData.map((item, index) => {
      const title = item?.title || t("product");

      return {
        id: item?.id ?? index,
        productName: title,
        category:
          item?.categoryName ||
          item?.category ||
          inferCategoryFromTitle(title, apiCategoryNames) ||
          "-",
        totalAuctions: Number(item?.count ?? 0),
        description: item?.description || "",
        condition: item?.condition,
      };
    });
  }, [sellerProductsData, apiCategoryNames, t]);

  const sellerProductsTable = useMemo(() => {
    if (selectedCategory === "All") return sellerProductsTableRaw;
    return sellerProductsTableRaw.filter((item) => item.category === selectedCategory);
  }, [sellerProductsTableRaw, selectedCategory]);

  const visibleSellerProducts = showAllSellerProducts
    ? sellerProductsTable
    : sellerProductsTable.slice(0, 5);

  const revenuePerAuctionData = useMemo(() => {
    return winnersTable.map((row, index) => ({
      auctionName: row.companyName || `${t("auction")} ${index + 1}`,
      shortName: formatAuctionLabel(row.companyName || `${t("auction")} ${index + 1}`),
      startPrice: 0,
      endPrice: row.totalValue,
      revenue: row.totalValue,
      winnerName: row.buyerName,
    }));
  }, [winnersTable, t]);

  const chartRevenuePerAuction = useMemo(
    () => revenuePerAuctionData.slice(0, 5),
    [revenuePerAuctionData]
  );

  const activeAuctionsCount = apiActiveAuctionsCount;
  const totalAuctionsCount = apiTotalAuctionsCount;
  const totalRevenue = apiRevenue;
  const totalBids = selectedCategory !== "All" ? apiTotalBidsByCategory : apiTotalBidsCount;
  const pendingPayments = apiPendingTransactions;

  const recommendations = useMemo(() => {
    const recs = [];

    const strongestCategory = [...categoryAnalysis].sort((a, b) => b.value - a.value)[0];
    const highestBidAuction = [...bidsAuctionsDataRaw].sort(
      (a, b) => b.totalBids - a.totalBids
    )[0];
    const bestProduct = [...popularProductsRaw].sort(
      (a, b) => b.totalAuctions - a.totalAuctions
    )[0];

    if (strongestCategory) {
      recs.push(
        t("focusMarketingRecommendation", {
          category: strongestCategory.name,
          value: strongestCategory.value.toFixed(2),
        })
      );
    }

    if (highestBidAuction) {
      recs.push(
        t("highestBidRecommendation", {
          auction: highestBidAuction.auctionName,
          bids: highestBidAuction.totalBids,
        })
      );
    }

    if (bestProduct) {
      recs.push(
        t("popularProductRecommendation", {
          product: bestProduct.productName,
          views: bestProduct.totalAuctions,
        })
      );
    }

    if (winnersData.length > 0) {
      recs.push(t("winnersRecommendation", { count: winnersData.length }));
    }

    if (sellerProductsTable.length > 0) {
      recs.push(
        t("sellerProductsRecommendation", {
          count: sellerProductsTable.length,
          categoryText:
            selectedCategory !== "All"
              ? ` ${t("category")}: ${selectedCategory}`
              : "",
        })
      );
    }

    return recs.slice(0, 6);
  }, [
    categoryAnalysis,
    bidsAuctionsDataRaw,
    popularProductsRaw,
    winnersData.length,
    sellerProductsTable.length,
    selectedCategory,
    t,
  ]);

  const handlePieClick = (data) => {
    if (!data?.name) return;
    setSelectedCategory((prev) => (prev === data.name ? "All" : data.name));
  };

  if (isLoading) {
    return <SellerStatisticsSkeleton />;
  }

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
            {selectedCategory === "All"
              ? t("all", { defaultValue: "All" })
              : selectedCategory}
          </button>

          {selectedCategory !== "All" && (
            <button className="clear-btn" onClick={() => setSelectedCategory("All")}>
              {t("clearFilter")}
            </button>
          )}
        </div>
      </div>

      <div className="stats-grid">
        <StatCard
          title={t("activeAuctions")}
          value={activeAuctionsCount}
          icon={<i className="fa-solid fa-gavel"></i>}
        />

        <StatCard
          title={t("totalAuctions")}
          value={totalAuctionsCount}
          icon={<i className="fa-solid fa-layer-group"></i>}
        />

        <StatCard
          title={t("totalRevenue")}
          value={`EGP ${Number(totalRevenue).toLocaleString()}`}
          icon={<i className="fa-solid fa-sack-dollar"></i>}
        />

        <StatCard
          title={t("totalBids")}
          value={totalBids}
          icon={<i className="fa-solid fa-chart-line"></i>}
        />

        <StatCard
          title={t("pendingPayment")}
          value={pendingPayments}
          icon={<i className="fa-solid fa-clock"></i>}
        />
      </div>

      <div className="grid-2">
        <div className="card chart-card">
          <div className="card-header">
            <h4>{t("monthlyRevenue")}</h4>
          </div>

          <div className="chart-wrap">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <LineChart data={monthlyRevenueData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip
                  formatter={(value) => [
                    `EGP ${Number(value).toLocaleString()}`,
                    t("totalRevenue"),
                  ]}
                />
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
                <Pie
                  data={categoryAnalysis}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={100}
                  paddingAngle={4}
                  dataKey="value"
                  onClick={handlePieClick}
                >
                  {categoryAnalysis.map((entry, index) => (
                    <Cell
                      key={entry.id}
                      fill={COLORS[index % COLORS.length]}
                      stroke={selectedCategory === entry.name ? "#111827" : "#fff"}
                      strokeWidth={selectedCategory === entry.name ? 3 : 1}
                      style={{ cursor: "pointer" }}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value, _, props) => {
                    const percent = totalCategoryValue
                      ? ((props.payload.value / totalCategoryValue) * 100).toFixed(1)
                      : 0;

                    return [
                      `${Number(value).toFixed(2)}%`,
                      `${props.payload.name} (${percent}%)`,
                    ];
                  }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="legend-list">
            {categoryAnalysis.map((item, index) => (
              <button
                key={item.id}
                className={`legend-item ${
                  selectedCategory === item.name ? "selected-legend" : ""
                }`}
                onClick={() => handlePieClick(item)}
              >
                <span
                  className="color-dot"
                  style={{ backgroundColor: COLORS[index % COLORS.length] }}
                ></span>
                <span>{item.name}</span>
                <strong>{Number(item.value).toFixed(2)}%</strong>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid-2">
        <div className="card chart-card fixed-chart-card">
          <div className="card-header">
            <h4>{t("totalBidsPerAuction")}</h4>
          </div>

          <div className="chart-wrap bar-chart-wrap">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <BarChart
                data={chartBidsAuctions}
                margin={{ top: 10, right: 20, left: 0, bottom: 40 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="shortName"
                  interval={0}
                  angle={0}
                  tickLine={false}
                  axisLine={false}
                  height={50}
                  tick={{ fontSize: 12, fill: "#475569" }}
                />
                <YAxis />
                <Tooltip
                  formatter={(value) => [value, t("totalBids")]}
                  labelFormatter={(_, payload) =>
                    payload?.[0]?.payload?.auctionName || ""
                  }
                />
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
                <tr>
                  <th>{t("auctionName")}</th>
                  <th>{t("date")}</th>
                  <th>{t("totalBids")}</th>
                </tr>
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
        <div className="card-header">
          <h4>{t("topCustomersTitle")}</h4>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>{t("customerName")}</th>
                <th>{t("companyName")}</th>
                <th>{t("email")}</th>
                <th>{t("participatedAuctions")}</th>
                <th>{t("totalPaid")}</th>
              </tr>
            </thead>
            <tbody>
              {customersTable.map((row, index) => (
                <tr key={row.id || index}>
                  <td>{row.name}</td>
                  <td>{row.companyName}</td>
                  <td>{row.email}</td>
                  <td>{row.participated}</td>
                  <td>EGP {Number(row.totalPaid).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid-2">
        <div className="card chart-card fixed-chart-card">
          <div className="card-header">
            <h4>{t("totalRevenuePerAuction")}</h4>
          </div>

          <div className="chart-wrap bar-chart-wrap">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <BarChart
                data={chartRevenuePerAuction}
                margin={{ top: 10, right: 20, left: 0, bottom: 40 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="shortName"
                  interval={0}
                  angle={0}
                  tickLine={false}
                  axisLine={false}
                  height={50}
                  tick={{ fontSize: 12, fill: "#475569" }}
                />
                <YAxis />
                <Tooltip
                  formatter={(value, key) => {
                    if (key === "revenue") {
                      return [`EGP ${Number(value).toLocaleString()}`, t("endPrice")];
                    }
                    return [value, key];
                  }}
                  labelFormatter={(_, payload) =>
                    payload?.[0]?.payload?.auctionName || ""
                  }
                />
                <Bar dataKey="revenue" fill="#023E8A" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="table-wrap mini-top-table">
            <table>
              <thead>
                <tr>
                  <th>{t("auction")}</th>
                  <th>{t("startPrice")}</th>
                  <th>{t("endPrice")}</th>
                  <th>{t("winner")}</th>
                </tr>
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
            <button
              className="toggle-btn"
              onClick={() => setShowAllWinners((prev) => !prev)}
            >
              {showAllWinners ? t("showLess") : t("showMore")}
            </button>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>{t("buyerName")}</th>
                  <th>{t("companyName")}</th>
                  <th>{t("email")}</th>
                  <th>{t("wins")}</th>
                  <th>{t("totalValue")}</th>
                </tr>
              </thead>
              <tbody>
                {visibleWinners.map((row, index) => (
                  <tr key={row.id || index}>
                    <td>{row.buyerName}</td>
                    <td>{row.companyName || t("customerName")}</td>
                    <td>{row.email}</td>
                    <td>{row.wins}</td>
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
          <button
            className="toggle-btn"
            onClick={() => setShowAllSellerProducts((prev) => !prev)}
          >
            {showAllSellerProducts ? t("showLess") : t("showMore")}
          </button>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>{t("product")}</th>
                <th>{t("category")}</th>
                <th>{t("totalProductAuctions")}</th>
                <th>{t("condition")}</th>
                <th>{t("description")}</th>
              </tr>
            </thead>
            <tbody>
              {visibleSellerProducts.map((item, index) => (
                <tr key={item.id || index}>
                  <td>{item.productName}</td>
                  <td>{item.category}</td>
                  <td>{item.totalAuctions}</td>
                  <td>{item.condition ?? "-"}</td>
                  <td>{item.description || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-header">
            <h4>{t("mostPopularProducts")}</h4>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>{t("product")}</th>
                  <th>{t("category")}</th>
                  <th>{t("totalProductAuctions")}</th>
                </tr>
              </thead>
              <tbody>
                {popularProducts.map((item, index) => (
                  <tr key={item.id || index}>
                    <td>{item.productName}</td>
                    <td>{item.category}</td>
                    <td>{item.totalAuctions}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h4>{t("aiRecommendations")}</h4>
          </div>

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