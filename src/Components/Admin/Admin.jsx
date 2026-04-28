import { Link, useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import icon from "../../assets/Person at the Center of Circles.png";
import "./admin.css";
import api from "../../API/axios";
import Skelaton from "../../Components/Skelaton"; // change path only if your file is in another folder

export default function Admin() {
  const navigate = useNavigate();
  const location = useLocation();

  const [sidebarShrinked, setSidebarShrinked] = useState(false);
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const years = [];
  for (let y = 2025; y <= currentYear; y++) years.push(y);

  const [favicon] = useState(icon);
  const [loading, setLoading] = useState(true);

  const [users, setUsers] = useState({
    total: 0,
    active: 0,
    blocked: 0,
  });

  const [sellers, setSellers] = useState({
    total: 0,
    verified: 0,
    pending: 0,
  });

  const [auctions, setAuctions] = useState({
    total: 0,
    active: 0,
    expired: 0,
    upcoming: 0,
  });

  const [payments, setPayments] = useState({
    total: 0,
    success: 0,
    failed: 0,
  });

  useEffect(() => {
    document.title = `Admin | Dashboard ${selectedYear}`;
  }, [selectedYear]);

  useEffect(() => {
    const link =
      document.querySelector("link[rel~='icon']") ||
      document.createElement("link");
    link.rel = "icon";
    link.href = favicon;
    document.head.appendChild(link);
  }, [favicon]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);

    const requests = [
      {
        label: "GET /User/total-users",
        urls: ["/User/total-users"],
        onSuccess: (value) => setUsers((prev) => ({ ...prev, total: value })),
      },
      {
        label: "GET /User/active-count",
        urls: ["/User/active-count"],
        onSuccess: (value) => setUsers((prev) => ({ ...prev, active: value })),
      },
      {
        label: "GET /User/blocked-count",
        urls: ["/User/blocked-count"],
        onSuccess: (value) => setUsers((prev) => ({ ...prev, blocked: value })),
      },

      {
        label: "GET /seller/total-sellers",
        urls: ["/seller/total-sellers"],
        onSuccess: (value) => setSellers((prev) => ({ ...prev, total: value })),
      },
      {
        label: "GET /seller/verified-sellers",
        urls: ["/seller/verified-sellers"],
        onSuccess: (value) =>
          setSellers((prev) => ({ ...prev, verified: value })),
      },
      {
        label: "GET /seller/pending-sellers",
        urls: ["/seller/pending-sellers"],
        onSuccess: (value) =>
          setSellers((prev) => ({ ...prev, pending: value })),
      },

      {
        label: "GET /Auction/total-auctions",
        urls: ["/Auction/total-auctions", "/auction/total-auctions"],
        onSuccess: (value) =>
          setAuctions((prev) => ({ ...prev, total: value })),
      },
      {
        label: "GET /Auction/active-auctions",
        urls: ["/Auction/active-auctions", "/auction/active-auctions"],
        onSuccess: (value) =>
          setAuctions((prev) => ({ ...prev, active: value })),
      },
      {
        label: "GET /Auction/expired-auctions",
        urls: ["/Auction/expired-auctions", "/auction/expired-auctions"],
        onSuccess: (value) =>
          setAuctions((prev) => ({ ...prev, expired: value })),
      },
      {
        label: "GET /Auction/upcoming-auctions",
        urls: ["/Auction/upcoming-auctions", "/auction/upcoming-auctions"],
        onSuccess: (value) =>
          setAuctions((prev) => ({ ...prev, upcoming: value })),
      },

      {
        label: "GET /Transaction/Total-Transactions",
        urls: ["/Transaction/Total-Transactions"],
        onSuccess: (value) =>
          setPayments((prev) => ({ ...prev, total: value })),
      },
      {
        label: "GET /Transaction/successful",
        urls: ["/Transaction/successful"],
        onSuccess: (value) =>
          setPayments((prev) => ({ ...prev, success: value })),
      },
      {
        label: "GET /Transaction/failed",
        urls: ["/Transaction/failed"],
        onSuccess: (value) =>
          setPayments((prev) => ({ ...prev, failed: value })),
      },
    ];

    console.clear();
    console.log("========== DASHBOARD API START ==========");
    console.log("BASE URL =>", api?.defaults?.baseURL);

    try {
      const results = await Promise.allSettled(
        requests.map((req) => fetchOne(req.label, req.urls, req.onSuccess))
      );

      const summary = results.map((result, index) => {
        if (result.status === "fulfilled") {
          return result.value;
        }

        return {
          label: requests[index].label,
          success: false,
          finalUrl: requests[index].urls[0],
          status: "PROMISE_REJECTED",
          value: 0,
        };
      });

      console.log("========== DASHBOARD API SUMMARY ==========");
      console.table(summary);
      console.log("========== DASHBOARD API END ==========");
    } finally {
      setLoading(false);
    }
  };

  const fetchOne = async (label, urls, onSuccess) => {
    const urlList = Array.isArray(urls) ? urls : [urls];

    for (const url of urlList) {
      const fullUrl = buildFullUrl(api?.defaults?.baseURL, url);

      try {
        console.groupCollapsed(label);
        console.log("REQUEST =>", fullUrl);

        const res = await api.get(url, {
          timeout: 15000,
        });

        const value = extractNumber(res.data);

        console.log("SUCCESS URL =>", fullUrl);
        console.log("STATUS =>", res.status);
        console.log("DATA =>", res.data);
        console.log("EXTRACTED VALUE =>", value);
        console.groupEnd();

        onSuccess(value);

        return {
          label,
          success: true,
          finalUrl: fullUrl,
          status: res.status,
          value,
        };
      } catch (error) {
        console.error(`${label} ERROR URL =>`, fullUrl);
        console.error(`${label} STATUS =>`, error?.response?.status);
        console.error(`${label} CODE =>`, error?.code);
        console.error(`${label} MESSAGE =>`, error?.message);
        console.error(`${label} RESPONSE DATA =>`, error?.response?.data);
        console.error(`${label} FULL ERROR =>`, error);

        if (!error?.response) {
          console.error(
            `${label} NOTE => No HTTP response received. Check backend route / CORS / SSL / server availability.`
          );
        }

        console.groupEnd();
      }
    }

    onSuccess(0);

    return {
      label,
      success: false,
      finalUrl: buildFullUrl(api?.defaults?.baseURL, urlList[0]),
      status: "FAILED_ALL_URLS",
      value: 0,
    };
  };

  const toggleSidebar = () => setSidebarShrinked((prev) => !prev);

  function handleLogout() {
    localStorage.removeItem("token");
    navigate("/login");
  }

  const usersAnalysis = [
    { name: "Active", value: users.active },
    { name: "Blocked", value: users.blocked },
  ];

  const sellersAnalysis = [
    { name: "Verified", value: sellers.verified },
    { name: "Pending", value: sellers.pending },
  ];

  const auctionsAnalysis = [
    { name: "Active", value: auctions.active },
    { name: "Expired", value: auctions.expired },
    { name: "Upcoming", value: auctions.upcoming },
  ];

  const paymentsAnalysis = [
    { name: "Success", value: payments.success },
    { name: "Failed", value: payments.failed },
  ];

  const isActive = (path) => (location.pathname === path ? "active" : "");

  return (
    <div className="admin-layout">
      <header className="admin-navbar">
        <div className="left">
          <button className="toggle-btn" onClick={toggleSidebar}>
            <i className="fa fa-bars"></i>
          </button>

          <div className="brand">
            <i className="fa fa-dashboard"></i>
            <span>Safqa Admin</span>
          </div>
        </div>

        <div className="right">
          <span
            style={{
              marginRight: "15px",
              padding: "6px 12px",
              background: "#f1f5f9",
              borderRadius: "6px",
              fontWeight: "600",
            }}
          >
            {selectedYear}
          </span>

          <button onClick={handleLogout} className="logout-btn">
            <i className="fa fa-sign-out"></i>
            Logout
          </button>
        </div>
      </header>

      <aside className={`admin-sidebar ${sidebarShrinked ? "shrinked" : ""}`}>
        <ul>
          <li className={isActive("/admin")}>
            <Link to="/admin">
              <i style={{ color: "#023E8A" }} className="fa fa-dashboard"></i>
              <span style={{ color: "#023E8A" }}>Dashboard</span>
            </Link>
          </li>
          <li>
            <Link to="/admin_users">
              <i className="fa fa-users"></i>
              <span>All Users</span>
            </Link>
          </li>
          <li>
            <Link to="/admin_sellers">
              <i className="fa fa-user-secret"></i>
              <span>All Sellers</span>
            </Link>
          </li>
          <li>
            <Link to="/admin_auctions">
              <i className="fa fa-gavel"></i>
              <span>All Auctions</span>
            </Link>
          </li>
          <li>
            <Link to="/admin_payments">
              <i className="fa fa-credit-card"></i>
              <span>Payment Logs</span>
            </Link>
          </li>
          <li>
            <Link to="/admin_delivery">
              <i className="fa fa-truck"></i>
              <span>Admin Delivery</span>
            </Link>
          </li>
          <li>
            <Link
              className={isActive("/admin_track_chats")}
              to="/admin_track_chats"
            >
              <i className="fa fa-comments"></i>
              <span>Track Chats</span>
            </Link>
          </li>
          <li>
            <Link to="/admin_reports">
              <i className="fa-solid fa-clipboard-list"></i>
              <span>Reports</span>
            </Link>
          </li>
          <li>
            <Link to="/admin_announcements">
              <i className="fa fa-bullhorn"></i>
              <span>Announcements</span>
            </Link>
          </li>
        </ul>
      </aside>

      <main className={`admin-content ${sidebarShrinked ? "active" : ""}`}>
        <div className="dashboard-wrapper">
          <h2 className="page-title">Admin Dashboard Analysis ({selectedYear})</h2>

          {loading ? (
            <Skelaton />
          ) : (
            <>
              <section className="dashboard-section">
                <h4>Users Analytics</h4>
                <div className="grid" style={{ marginBottom: "30px" }}>
                  <Card title="Total Users" value={users.total} icon="users" />
                  <Card title="Active Users" value={users.active} icon="user-check" />
                  <Card title="Blocked Users" value={users.blocked} icon="user-times" />
                </div>

                <div style={{ display: "flex", gap: "40px", flexWrap: "wrap" }}>
                  <SimpleBarChart
                    data={usersAnalysis}
                    dataKey="value"
                    title="Users Overview"
                  />
                  <CircleChart
                    data={usersAnalysis}
                    colors={["#2d6a4f", "#e63946"]}
                  />
                </div>
              </section>

              <section className="dashboard-section">
                <h4>Sellers Analytics</h4>
                <div className="grid" style={{ marginBottom: "30px" }}>
                  <Card title="Total Sellers" value={sellers.total} icon="store" />
                  <Card
                    title="Verified Sellers"
                    value={sellers.verified}
                    icon="check-circle"
                  />
                  <Card title="Pending Sellers" value={sellers.pending} icon="clock" />
                </div>

                <div style={{ display: "flex", gap: "40px", flexWrap: "wrap" }}>
                  <SimpleBarChart
                    data={sellersAnalysis}
                    dataKey="value"
                    title="Sellers Overview"
                  />
                  <CircleChart
                    data={sellersAnalysis}
                    colors={["#2d6a4f", "#ffb703"]}
                  />
                </div>
              </section>

              <section className="dashboard-section">
                <h4>Auctions Analytics</h4>
                <div className="grid" style={{ marginBottom: "30px" }}>
                  <Card title="Total Auctions" value={auctions.total} icon="gavel" />
                  <Card title="Active Auctions" value={auctions.active} icon="play" />
                  <Card
                    title="Expired Auctions"
                    value={auctions.expired}
                    icon="times-circle"
                  />
                  <Card
                    title="Upcoming Auctions"
                    value={auctions.upcoming}
                    icon="calendar"
                  />
                </div>

                <div style={{ display: "flex", gap: "40px", flexWrap: "wrap" }}>
                  <SimpleBarChart
                    data={auctionsAnalysis}
                    dataKey="value"
                    title="Auctions Overview"
                  />
                  <CircleChart
                    data={auctionsAnalysis}
                    colors={["#2196F3", "#9C27B0", "#FF9800"]}
                  />
                </div>
              </section>

              <section className="dashboard-section">
                <h4>Payments Analytics</h4>
                <div className="grid" style={{ marginBottom: "30px" }}>
                  <Card
                    title="Total Transactions"
                    value={payments.total}
                    icon="credit-card"
                  />
                  <Card title="Successful" value={payments.success} icon="check" />
                  <Card title="Failed" value={payments.failed} icon="times" />
                </div>

                <div style={{ display: "flex", gap: "40px", flexWrap: "wrap" }}>
                  <SimpleBarChart
                    data={paymentsAnalysis}
                    dataKey="value"
                    title="Payments Overview"
                  />
                  <CircleChart
                    data={paymentsAnalysis}
                    colors={["#2d6a4f", "#e63946"]}
                  />
                </div>
              </section>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

function buildFullUrl(baseURL, url) {
  if (!baseURL) return url;
  if (/^https?:\/\//i.test(url)) return url;
  return `${String(baseURL).replace(/\/+$/, "")}/${String(url).replace(/^\/+/, "")}`;
}

function extractNumber(data) {
  if (typeof data === "number") return data;

  if (typeof data === "string") {
    const parsed = Number(data);
    return Number.isNaN(parsed) ? 0 : parsed;
  }

  if (data && typeof data === "object") {
    const firstValue = Object.values(data)[0];
    const parsed = Number(firstValue);
    return Number.isNaN(parsed) ? 0 : parsed;
  }

  return 0;
}

function Card({ title, value, icon }) {
  return (
    <div className="dashboard-card">
      <i className={`fa fa-${icon}`}></i>
      <div>
        <p>{title}</p>
        <h3>{value}</h3>
      </div>
    </div>
  );
}

function SimpleBarChart({ data, dataKey, title }) {
  return (
    <BarChart width={650} height={250} data={data}>
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis dataKey="name" stroke="#023E8A" tick={{ fill: "#023E8A" }} />
      <YAxis stroke="#023E8A" tick={{ fill: "#023E8A" }} />
      <Tooltip />
      <Legend wrapperStyle={{ color: "#023E8A" }} />
      <Bar dataKey={dataKey} name={title} fill="#023E8A" />
    </BarChart>
  );
}

function CircleChart({ data, colors }) {
  const total = data.reduce((s, i) => s + i.value, 0);

  return (
    <PieChart width={220} height={220}>
      <Pie
        data={data}
        cx="50%"
        cy="50%"
        innerRadius={65}
        outerRadius={95}
        paddingAngle={2}
        dataKey="value"
      >
        {data.map((_, i) => (
          <Cell key={i} fill={colors[i]} />
        ))}
      </Pie>
      <Tooltip
        formatter={(v) =>
          `${v} (${total ? ((v / total) * 100).toFixed(1) : 0}%)`
        }
      />
    </PieChart>
  );
}