import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import icon from "../../../assets/Person at the Center of Circles.png";

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
import "../admin.css"

/* ================= MOCK DATA ================= */

const initialDeliveries = [
  { id: 1, title: "BMW X5 2022", winner: "Ahmed Tamer", business: "BMW Motors", price: 45000, status: "pending" },
  { id: 2, title: "iPhone 15 Pro Max", winner: "John Smith", business: "Apple Store", price: 1300, status: "in_progress" },
  { id: 3, title: "Diamond Necklace", winner: "Sara Ali", business: "Luxury Jewelry", price: 8500, status: "delivered" },
  { id: 4, title: "MacBook Pro M3", winner: "Michael Brown", business: "Apple Store", price: 2800, status: "failed" },
  { id: 5, title: "Rolex Submariner", winner: "Omar Khaled", business: "Rolex Boutique", price: 12000, status: "pending" },
];

/* ================= COMPONENT ================= */

export default function AdminDelivery() {

  const navigate = useNavigate();
  const location = useLocation();

  const [sidebarShrinked, setSidebarShrinked] = useState(false);

  const toggleSidebar = () => setSidebarShrinked((prev) => !prev);

  const isActive = (path) => (location.pathname === path ? "active" : "");

  /* ================= YEAR ================= */

  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);

  const years = [];
  for (let y = 2025; y <= currentYear; y++) years.push(y);

  useEffect(() => {
    document.title = `Admin | Delivery ${selectedYear}`;
  }, [selectedYear]);

  /* ================= FAVICON ================= */

  useEffect(() => {
    const link =
      document.querySelector("link[rel~='icon']") ||
      document.createElement("link");

    link.rel = "icon";
    link.href = icon;
    document.head.appendChild(link);
  }, []);

  /* ================= DELIVERY STATE ================= */

  const [deliveries, setDeliveries] = useState(initialDeliveries);

  const delivered = deliveries.filter((d) => d.status === "delivered");
  const pending = deliveries.filter((d) => d.status === "pending");
  const progress = deliveries.filter((d) => d.status === "in_progress");
  const failed = deliveries.filter((d) => d.status === "failed");

  const updateStatus = (id, newStatus) => {
    setDeliveries((prev) =>
      prev.map((d) => (d.id === id ? { ...d, status: newStatus } : d))
    );
  };

  /* ================= ANALYTICS ================= */

  const stats = {
    total: deliveries.length,
    delivered: delivered.length,
    pending: pending.length,
    progress: progress.length,
    failed: failed.length,
  };

  const pieData = [
    { name: "Delivered", value: stats.delivered },
    { name: "Pending", value: stats.pending },
    { name: "In Progress", value: stats.progress },
    { name: "Failed", value: stats.failed },
  ];

  const chartData = [
    { month: "Jan", delivered: 4, failed: 1, pending: 2 },
    { month: "Feb", delivered: 6, failed: 2, pending: 3 },
    { month: "Mar", delivered: 8, failed: 1, pending: 4 },
    { month: "Apr", delivered: 7, failed: 2, pending: 2 },
  ];

  function handleLogout() {
    localStorage.removeItem("userToken");
    // navigate("/login");
  }

  /* ================= CARD ================= */

  function Card({ title, value }) {
    return (
      <div className="dashboard-card">
        <h4>{title}</h4>
        <h2>{value}</h2>
      </div>
    );
  }

  return (

    <div className="admin-layout">

      {/* NAVBAR */}

      <header className="admin-navbar">

        <div className="left">

          <button className="toggle-btn" onClick={toggleSidebar}>
            <i className="fa fa-bars"></i>
          </button>

          <div className="brand">
            <i className="fa fa-truck"></i>
            <span>Safqa Admin</span>
          </div>

        </div>

        <div className="right">

          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            style={{ marginRight: "15px", padding: "4px" }}
          >
            {years.map((y) => (
              <option key={y}>{y}</option>
            ))}
          </select>

          <button onClick={handleLogout} className="logout-btn">
            <i className="fa fa-sign-out"></i>
            Logout
          </button>

        </div>

      </header>

      {/* SIDEBAR */}

      <aside className={`admin-sidebar ${sidebarShrinked ? "shrinked" : ""}`}>

        <ul>

          <li className={isActive("/admin")}>
            <Link to="/admin">
              <i className="fa fa-dashboard"></i>
              <span>Dashboard</span>
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

          <li className={isActive("/admin_delivery")}>
            <Link to="/admin_delivery">
              <i style={{color:"#023E8A"}} className="fa fa-truck"></i>
              <span style={{color:"#023E8A"}}>Admin Delivery</span>
            </Link>
          </li>
          <li>
            <Link className={isActive("/admin_track_chats")} to="/admin_track_chats">
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

      {/* CONTENT */}

      <main className={`admin-content ${sidebarShrinked ? "active" : ""}`}>

        <h2 className="page-title">
          Delivery Tracking ({selectedYear})
        </h2>

        {/* ANALYTICS */}

        <div className="grid">

          <Card title="Total Deliveries" value={stats.total} />
          <Card title="Delivered" value={stats.delivered} />
          <Card title="Pending" value={stats.pending} />
          <Card title="In Progress" value={stats.progress} />
          <Card title="Failed" value={stats.failed} />

        </div>

        <div style={{display:"flex",gap:"40px",marginTop:"30px"}}>

          <LineChart width={600} height={250} data={chartData}>
            <CartesianGrid strokeDasharray="3 3"/>
            <XAxis dataKey="month"/>
            <YAxis/>
            <Tooltip/>
            <Legend/>

            <Line type="monotone" dataKey="delivered" stroke="#2d6a4f"/>
            <Line type="monotone" dataKey="failed" stroke="#e63946"/>
            <Line type="monotone" dataKey="pending" stroke="#ffb703"/>

          </LineChart>

          <PieChart width={300} height={260}>
            <Pie data={pieData} cx="50%" cy="50%" outerRadius={100} dataKey="value">

              <Cell fill="#2d6a4f"/>
              <Cell fill="#ffb703"/>
              <Cell fill="#219ebc"/>
              <Cell fill="#e63946"/>

            </Pie>

            <Tooltip/>

          </PieChart>

        </div>

        {/* DELIVERY LIST */}

        <h3 className="delivery-title">Pending</h3>
        <div className="delivery-grid">
          {pending.map((d)=>(
            <DeliveryCard key={d.id} delivery={d} updateStatus={updateStatus}/>
          ))}
        </div>

        <h3 className="delivery-title">In Progress</h3>
        <div className="delivery-grid">
          {progress.map((d)=>(
            <DeliveryCard key={d.id} delivery={d} updateStatus={updateStatus}/>
          ))}
        </div>

        <h3 className="delivery-title">Delivered</h3>
        <div className="delivery-grid">
          {delivered.map((d)=>(
            <DeliveryCard key={d.id} delivery={d}/>
          ))}
        </div>

        <h3 className="delivery-title">Failed</h3>
        <div className="delivery-grid">
          {failed.map((d)=>(
            <DeliveryCard key={d.id} delivery={d}/>
          ))}
        </div>

      </main>

    </div>

  );
}

/* ================= DELIVERY CARD ================= */

function DeliveryCard({ delivery, updateStatus }) {

  const handleDelete = () => {
    if (updateStatus) {
      updateStatus(delivery.id, "deleted");
    }
  };

  if (delivery.status === "deleted") return null;

  return (

    <div className="delivery-card">

      <h4 className="delivery-card-title">
        {delivery.title}
      </h4>

      <p><b>Business:</b> {delivery.business}</p>

      <p><b>Winner:</b> {delivery.winner}</p>

      <p><b>Final Price:</b> ${delivery.price}</p>

      <p>
        <b>Status:</b>
        <span className={`status ${delivery.status}`}>
          {delivery.status}
        </span>
      </p>

      <div className="delivery-actions">

        <button
          className="btn delete"
          onClick={handleDelete}
        >
          Delete
        </button>

      </div>

    </div>

  );
}
