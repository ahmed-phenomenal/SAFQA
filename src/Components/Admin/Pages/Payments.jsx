import { Link, useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import icon from "../../../assets/Person at the Center of Circles.png";
import "../admin.css"

export default function Payments() {
    /* ================= YEAR ================= */
      const currentYear = new Date().getFullYear();
      const [selectedYear, setSelectedYear] = useState(currentYear);
      const years = [];
      for (let y = 2025; y <= currentYear; y++) years.push(y);
    
      useEffect(() => {
        document.title = `Admin | Payments ${selectedYear}`;
      }, [selectedYear]);
    
      /* ================= FAVICON ================= */
      useEffect(() => {
        const link = document.querySelector("link[rel~='icon']") || document.createElement("link");
        link.rel = "icon";
        link.href = icon;
        document.head.appendChild(link);
      }, []);

  /* ================= NAV ================= */
  const [sidebarShrinked, setSidebarShrinked] = useState(false);
  const toggleSidebar = () => setSidebarShrinked((prev) => !prev);

  const navigate = useNavigate();
  const location = useLocation();
  const isActive = (path) => (location.pathname === path ? "active" : "");

  function handleLogout() {
    localStorage.removeItem("userToken");
    // navigate("/login");
  }

  /* ================= FILTER ================= */
  const [filter, setFilter] = useState("7");

  /* ================= DATA ================= */

  const successfulPayments = [
    { id: 1, user: "Ahmed Tamer", amount: 4500, method: "Visa", date: "2026-02-21 19:30" },
    { id: 2, user: "Mohamed Adel", amount: 2300, method: "PayPal", date: "2026-02-20 17:45" },
    { id: 3, user: "Omar Hassan", amount: 8200, method: "MasterCard", date: "2026-02-19 14:15" },
  ];

  const failedPayments = [
    { id: 101, user: "Khaled Samir", amount: 1200, method: "Visa", date: "2026-02-21 16:20", reason: "Insufficient Funds" },
    { id: 102, user: "Ali Mostafa", amount: 3000, method: "PayPal", date: "2026-02-20 13:10", reason: "Network Error" },
  ];

  /* ================= ANALYTICS ================= */

  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

  const randomData = (min, max) =>
    months.map((m) => ({
      month: m,
      success: Math.floor(Math.random() * (max - min) + min),
      failed: Math.floor(Math.random() * (max - min) / 4),
    }));

  const paymentsData = randomData(5000, 25000);

  const paymentsStats = {
    total: paymentsData.reduce((s, m) => s + m.success + m.failed, 0),
    success: paymentsData.reduce((s, m) => s + m.success, 0),
    failed: paymentsData.reduce((s, m) => s + m.failed, 0),
  };

  const paymentsAnalysis = [
    { name: "Successful", value: paymentsStats.success },
    { name: "Failed", value: paymentsStats.failed },
  ];

  return (
    <div className="admin-layout">

      {/* NAVBAR */}
      <header className="admin-navbar">
        <div className="left">
          <button className="toggle-btn" onClick={toggleSidebar}>
            <i className="fa fa-bars"></i>
          </button>
          <div className="brand">
            <i className="fa fa-credit-card"></i>
            <span>Safqa Admin</span>
          </div>
        </div>

        <button onClick={handleLogout} className="logout-btn">
          <i className="fa fa-sign-out"></i> Logout
        </button>
      </header>

      {/* SIDEBAR */}
      <aside className={`admin-sidebar ${sidebarShrinked ? "shrinked" : ""}`}>
        <ul>
          <li><Link to="/admin"><i className="fa fa-dashboard"></i><span>Dashboard</span></Link></li>
          <li><Link to="/admin_users"><i className="fa fa-users"></i><span>All Users</span></Link></li>
          <li><Link to="/admin_sellers"><i className="fa fa-user-secret"></i><span>All Sellers</span></Link></li>
          <li><Link to="/admin_auctions"><i className="fa fa-gavel"></i><span>All Auctions</span></Link></li>
          <li><Link className={isActive("/admin_payments")} to="/admin_payments">
            <i style={{color:"#023E8A"}} className="fa fa-credit-card"></i>
            <span style={{color:"#023E8A"}}>Payment Logs</span>
          </Link></li>
          <li><Link to="/admin_delivery"><i className="fa fa-truck"></i><span>Admin Delivery</span></Link></li>
                    <li>
            <Link className={isActive("/admin_track_chats")} to="/admin_track_chats">
            <i className="fa fa-comments"></i>
            <span>Track Chats</span>
            </Link>
          </li>
          <li><Link to="/admin_reports"><i className="fa-solid fa-clipboard-list"></i><span>Reports</span></Link></li>
          <li><Link to="/admin_announcements"><i className="fa fa-bullhorn"></i><span>Announcements</span></Link></li>
        </ul>
      </aside>

      {/* CONTENT */}
      <main className={`admin-content ${sidebarShrinked ? "active" : ""}`}>
        <h2 className="page-title">Payment Logs</h2>

        {/* ANALYTICS */}
        <section className="dashboard-section">
          <div className="grid">
            <Card title="Total Payments" value={`$${paymentsStats.total}`} icon="money" />
            <Card title="Successful" value={`$${paymentsStats.success}`} icon="check-circle" />
            <Card title="Failed" value={`$${paymentsStats.failed}`} icon="times-circle" />
          </div>

          <div style={{ display:"flex", gap:"40px", flexWrap:"wrap", marginTop:"20px" }}>
            <LineChart width={650} height={260} data={paymentsData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="success" stroke="#2d6a4f" />
              <Line type="monotone" dataKey="failed" stroke="#e63946" />
            </LineChart>

            <CircleChart data={paymentsAnalysis} colors={["#2d6a4f","#e63946"]} />
          </div>
        </section>

                {/* FILTER */}
<div className="filter-bar my-4">
  <label className="filter-label">Filter Payments By Period</label>

  <select
    value={filter}
    onChange={(e) => setFilter(e.target.value)}
    className="filter-select"
  >
    <option value="7">Last 7 Days</option>
    <option value="14">Last 14 Days</option>
    <option value="30">Last 30 Days</option>
  </select>
</div>

        {/* SUCCESS TABLE */}
        <h3 className="section-title">Successful Payments</h3>
        <Table data={successfulPayments} success />

        <hr className="big-divider" />

        {/* FAILED TABLE */}
        <h3 className="section-title">Failed Payments</h3>
        <Table data={failedPayments} />
      </main>
    </div>
  );
}

/* ================= CARD ================= */
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

/* ================= TABLE ================= */
function Table({ data, success }) {
  return (
    <div className="users-table-container">
      <table className="users-table">
        <thead>
          <tr>
            <th>#</th>
            <th>User</th>
            <th>Amount</th>
            <th>Method</th>
            <th>Date</th>
            {!success && <th>Reason</th>}
          </tr>
        </thead>
        <tbody>
          {data.map((p, i) => (
            <tr key={p.id}>
              <td>{i + 1}</td>
              <td>{p.user}</td>
              <td>${p.amount}</td>
              <td>{p.method}</td>
              <td>{p.date}</td>
              {!success && <td className="danger">{p.reason}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ================= CIRCLE ANALYSIS ================= */
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
      <Tooltip formatter={(v) => `${v} (${((v / total) * 100).toFixed(1)}%)`} />
    </PieChart>
  );
}
