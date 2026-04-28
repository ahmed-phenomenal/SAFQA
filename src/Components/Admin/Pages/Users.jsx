import { Link, useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect, useMemo } from "react";

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
import "../admin.css";

import {
  getTotalUsers,
  getActiveUsers,
  getBlockedUsers,
  getUsersPage,
  changeUserStatus,
} from "../../../API/admindashboard";

const getNumber = (res) => {
  const data = res?.data;

  if (typeof data === "number") return data;
  if (typeof data === "string") return Number(data) || 0;

  return Number(
    data?.value ||
      data?.count ||
      data?.total ||
      data?.totalCount ||
      data?.data ||
      0
  );
};

const normalizeUser = (item) => ({
  id: item?.id || item?.userId || "",
  name: item?.fullName || item?.name || "-",
  email: item?.email || "-",
  status: String(item?.status || "Active").toLowerCase(),
  action: item?.action || "",
});

function SkeletonBlock({ width = "100%", height = 16, radius = 8 }) {
  return (
    <span
      style={{
        display: "block",
        width,
        height,
        borderRadius: radius,
        background:
          "linear-gradient(90deg, #eceff3 25%, #f7f9fb 37%, #eceff3 63%)",
        backgroundSize: "400% 100%",
        animation: "adminSkeletonPulse 1.4s ease-in-out infinite",
      }}
    />
  );
}

function StatsSkeleton() {
  return (
    <div className="grid">
      {[1, 2, 3].map((item) => (
        <div className="dashboard-card" key={item}>
          <SkeletonBlock width={42} height={42} radius={12} />

          <div style={{ width: "100%" }}>
            <SkeletonBlock width="70%" height={14} />
            <div style={{ marginTop: 10 }}>
              <SkeletonBlock width="45%" height={26} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function ChartsSkeleton() {
  return (
    <div
      style={{
        display: "flex",
        gap: "40px",
        flexWrap: "wrap",
        marginTop: "20px",
      }}
    >
      <div
        style={{
          width: 650,
          height: 260,
          border: "1px solid #eef2f7",
          borderRadius: 12,
          padding: 18,
          background: "#fff",
        }}
      >
        <SkeletonBlock width="30%" height={16} />

        <div style={{ marginTop: 24, display: "grid", gap: 16 }}>
          <SkeletonBlock width="95%" height={18} />
          <SkeletonBlock width="86%" height={18} />
          <SkeletonBlock width="92%" height={18} />
          <SkeletonBlock width="78%" height={18} />
          <SkeletonBlock width="88%" height={18} />
          <SkeletonBlock width="72%" height={18} />
        </div>
      </div>

      <div
        style={{
          width: 220,
          height: 220,
          borderRadius: "50%",
          padding: 30,
          background: "#fff",
          border: "1px solid #eef2f7",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <SkeletonBlock width={150} height={150} radius="50%" />
      </div>
    </div>
  );
}

function TableSkeleton({ rows = 10 }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, index) => (
        <tr key={index}>
          <td>
            <SkeletonBlock width={28} height={14} />
          </td>
          <td>
            <SkeletonBlock width="75%" height={14} />
          </td>
          <td>
            <SkeletonBlock width="90%" height={14} />
          </td>
          <td>
            <SkeletonBlock width={76} height={24} radius={999} />
          </td>
          <td>
            <SkeletonBlock width={92} height={34} radius={8} />
          </td>
        </tr>
      ))}
    </>
  );
}

export default function Users() {
  const currentYear = new Date().getFullYear();
  const [selectedYear] = useState(currentYear);

  useEffect(() => {
    document.title = `Admin | Users ${selectedYear}`;
  }, [selectedYear]);

  useEffect(() => {
    const link =
      document.querySelector("link[rel~='icon']") ||
      document.createElement("link");

    link.rel = "icon";
    link.href = icon;
    document.head.appendChild(link);
  }, []);

  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    blocked: 0,
  });

  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [tableLoading, setTableLoading] = useState(false);
  const [error, setError] = useState("");

  const [confirmBox, setConfirmBox] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [actionType, setActionType] = useState("");

  const [sidebarShrinked, setSidebarShrinked] = useState(false);

  const toggleSidebar = () => setSidebarShrinked((prev) => !prev);

  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path) => (location.pathname === path ? "active" : "");

  function handleLogout() {
    localStorage.removeItem("userToken");
    localStorage.removeItem("adminToken");
    sessionStorage.removeItem("userToken");
    sessionStorage.removeItem("adminToken");
    navigate("/login");
  }

  const loadStats = async () => {
    const [totalRes, activeRes, blockedRes] = await Promise.all([
      getTotalUsers(),
      getActiveUsers(),
      getBlockedUsers(),
    ]);

    setStats({
      total: getNumber(totalRes),
      active: getNumber(activeRes),
      blocked: getNumber(blockedRes),
    });
  };

  const loadUsers = async (targetPage = page) => {
    try {
      setTableLoading(true);

      const res = await getUsersPage(targetPage, pageSize);
      const root = res?.data || {};

      const list = Array.isArray(root?.data)
        ? root.data
        : Array.isArray(root)
        ? root
        : [];

      setUsers(list.map(normalizeUser));
      setPage(Number(root?.currentPage || targetPage));
      setTotalPages(Number(root?.totalPages || 1));
    } finally {
      setTableLoading(false);
    }
  };

  const loadAll = async () => {
    try {
      setLoading(true);
      setError("");

      await Promise.all([loadStats(), loadUsers(1)]);
    } catch (err) {
      const status = Number(err?.response?.status || 0);

      setError(
        status === 401
          ? "Unauthorized. Please login as admin again."
          : status === 404
          ? "Users list endpoint was not found on the deployed server. Check that /api/User exists on runasp, not only localhost."
          : err?.response?.data?.message ||
            err?.response?.data?.Message ||
            err?.message ||
            "Failed to load users."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openConfirm = (user, action) => {
    setSelectedUser(user);
    setActionType(action);
    setConfirmBox(true);
  };

  const closeConfirm = () => {
    setConfirmBox(false);
    setSelectedUser(null);
    setActionType("");
  };

  const confirmAction = async () => {
    if (!selectedUser?.id) return;

    try {
      await changeUserStatus(selectedUser.id);
      await Promise.all([loadStats(), loadUsers(page)]);
      closeConfirm();
    } catch (err) {
      alert(
        err?.response?.data?.message ||
          err?.response?.data?.Message ||
          err?.message ||
          "Failed to update user status."
      );
    }
  };

  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  const usersData = useMemo(() => {
    return months.map((month) => ({
      month,
      active: stats.active,
      blocked: stats.blocked,
    }));
  }, [stats.active, stats.blocked]);

  const usersAnalysis = [
    { name: "Active", value: stats.active },
    { name: "Blocked", value: stats.blocked },
  ];

  return (
    <div className="admin-layout">
      <style>
        {`
          @keyframes adminSkeletonPulse {
            0% { background-position: 100% 50%; }
            100% { background-position: 0 50%; }
          }
        `}
      </style>

      <header className="admin-navbar">
        <div className="left">
          <button className="toggle-btn" onClick={toggleSidebar}>
            <i className="fa fa-bars"></i>
          </button>

          <div className="brand">
            <i className="fa fa-users"></i>
            <span>Safqa Admin</span>
          </div>
        </div>

        <button onClick={handleLogout} className="logout-btn">
          <i className="fa fa-sign-out"></i> Logout
        </button>
      </header>

      <aside className={`admin-sidebar ${sidebarShrinked ? "shrinked" : ""}`}>
        <ul>
          <li>
            <Link className={isActive("/admin")} to="/admin">
              <i className="fa fa-dashboard"></i>
              <span>Dashboard</span>
            </Link>
          </li>

          <li>
            <Link className={isActive("/admin_users")} to="/admin_users">
              <i style={{ color: "#023E8A" }} className="fa fa-users"></i>
              <span style={{ color: "#023E8A" }}>All Users</span>
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

      <main className={`admin-content ${sidebarShrinked ? "active" : ""}`}>
        <h2 className="page-title">Users Management</h2>

        {error ? <div className="alert alert-danger">{error}</div> : null}

        <section className="dashboard-section">
          <h4>Users Analytics</h4>

          {loading ? (
            <>
              <StatsSkeleton />
              <ChartsSkeleton />
            </>
          ) : (
            <>
              <div className="grid">
                <Card title="Total Users" value={stats.total} icon="users" />

                <Card
                  title="Active Users"
                  value={stats.active}
                  icon="user-check"
                />

                <Card
                  title="Blocked Users"
                  value={stats.blocked}
                  icon="user-times"
                />
              </div>

              <div
                style={{
                  display: "flex",
                  gap: "40px",
                  flexWrap: "wrap",
                  marginTop: "20px",
                }}
              >
                <LineChart width={650} height={260} data={usersData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="active" stroke="#2d6a4f" />
                  <Line type="monotone" dataKey="blocked" stroke="#e63946" />
                </LineChart>

                <CircleChart
                  data={usersAnalysis}
                  colors={["#2d6a4f", "#e63946"]}
                />
              </div>
            </>
          )}
        </section>

        <div className="users-table-container">
          <table className="users-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Name</th>
                <th>Email</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {loading || tableLoading ? (
                <TableSkeleton rows={10} />
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan="5">No users found.</td>
                </tr>
              ) : (
                users.map((user, i) => (
                  <tr key={user.id || i}>
                    <td>{(page - 1) * pageSize + i + 1}</td>
                    <td>{user.name}</td>
                    <td>{user.email}</td>
                    <td>
                      <span className={`status ${user.status}`}>
                        {user.status}
                      </span>
                    </td>
                    <td>
                      {user.status === "active" ? (
                        <button
                          className="action-btn suspend"
                          onClick={() => openConfirm(user, "suspend")}
                        >
                          Suspend
                        </button>
                      ) : (
                        <button
                          className="action-btn activate"
                          onClick={() => openConfirm(user, "restore")}
                        >
                          Restore
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              gap: 12,
              marginTop: 16,
            }}
          >
            <button
              className="action-btn view"
              disabled={page <= 1 || tableLoading || loading}
              onClick={() => loadUsers(page - 1)}
            >
              Previous
            </button>

            <strong>
              Page {page} of {totalPages}
            </strong>

            <button
              className="action-btn view"
              disabled={page >= totalPages || tableLoading || loading}
              onClick={() => loadUsers(page + 1)}
            >
              Next
            </button>
          </div>
        </div>
      </main>

      {confirmBox && (
        <div className="confirm-overlay">
          <div className="confirm-modal">
            <h3>Confirm Action</h3>

            <p>
              Are you sure you want to{" "}
              <span className={actionType === "suspend" ? "danger" : "success"}>
                {actionType}
              </span>{" "}
              <strong>{selectedUser?.name}</strong>?
            </p>

            <div className="confirm-actions">
              <button className="btn cancel" onClick={closeConfirm}>
                Cancel
              </button>

              <button
                className={`btn ${
                  actionType === "suspend" ? "danger" : "success"
                }`}
                onClick={confirmAction}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
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

function CircleChart({ data, colors }) {
  const total = data.reduce((sum, item) => sum + Number(item.value || 0), 0);

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