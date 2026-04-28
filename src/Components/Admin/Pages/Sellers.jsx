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
  getTotalSellers,
  getVerifiedSellers,
  getPendingSellersPage,
  getSellersPage,
  getSellerDetailsByUserId,
  suspendSeller,
  restoreSeller,
  approveSeller,
  rejectSeller,
  findUserIdByEmail,
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

const normalizePendingSeller = (item) => ({
  id: item?.userId || item?.id || "",
  userId: item?.userId || item?.id || "",
  business: item?.businessName || item?.business || item?.storeName || "-",
  owner: item?.ownerName || item?.owner || item?.fullName || "-",
  email: item?.email || "-",
  raw: item,
});

const normalizeSeller = (item) => ({
  id: item?.userId || item?.id || item?.sellerId || "",
  userId: item?.userId || item?.id || "",
  sellerId: item?.sellerId || item?.id || "",
  business: item?.business || item?.businessName || item?.storeName || "-",
  owner: item?.owner || item?.ownerName || item?.fullName || "-",
  email: item?.email || "-",
  status: String(item?.status || item?.storeStatus || "Active").toLowerCase(),
  raw: item,
});

const SkeletonBlock = ({ width = "100%", height = 16, radius = 8 }) => (
  <span
    style={{
      display: "block",
      width,
      height,
      borderRadius: radius,
      background:
        "linear-gradient(90deg, #eceff4 25%, #f8fafc 37%, #eceff4 63%)",
      backgroundSize: "400% 100%",
      animation: "adminSellerSkeleton 1.3s ease-in-out infinite",
    }}
  />
);

const SkeletonDashboard = () => (
  <>
    <style>
      {`
        @keyframes adminSellerSkeleton {
          0% { background-position: 100% 50%; }
          100% { background-position: 0 50%; }
        }
      `}
    </style>

    <section className="dashboard-section">
      <div className="grid">
        {[1, 2, 3].map((item) => (
          <div className="dashboard-card" key={item}>
            <SkeletonBlock width={42} height={42} radius={12} />
            <div style={{ width: "100%" }}>
              <SkeletonBlock width="65%" height={13} />
              <div style={{ height: 12 }} />
              <SkeletonBlock width="38%" height={25} />
            </div>
          </div>
        ))}
      </div>

      <div className="admin-analysis-row" style={{ marginTop: "20px" }}>
        <div className="admin-chart-scroll admin-skeleton-chart-box">
          <div style={{ width: 650, maxWidth: "100%" }}>
            <SkeletonBlock width="100%" height={260} radius={16} />
          </div>
        </div>

        <div className="admin-pie-scroll admin-skeleton-pie-box">
          <SkeletonBlock width={180} height={180} radius="50%" />
        </div>
      </div>
    </section>
  </>
);

const SkeletonTableRows = ({ rows = 6, cols = 5 }) => (
  <>
    {Array.from({ length: rows }).map((_, rowIndex) => (
      <tr key={rowIndex}>
        {Array.from({ length: cols }).map((__, colIndex) => (
          <td key={colIndex}>
            <SkeletonBlock
              width={colIndex === 0 ? 28 : colIndex === cols - 1 ? 82 : "85%"}
              height={colIndex === cols - 1 ? 32 : 14}
              radius={colIndex === cols - 1 ? 8 : 7}
            />
          </td>
        ))}
      </tr>
    ))}
  </>
);

export default function Sellers() {
  const navigate = useNavigate();
  const location = useLocation();

  const currentYear = new Date().getFullYear();
  const [selectedYear] = useState(currentYear);

  useEffect(() => {
    document.title = `Admin | Sellers ${selectedYear}`;
  }, [selectedYear]);

  useEffect(() => {
    const link =
      document.querySelector("link[rel~='icon']") ||
      document.createElement("link");

    link.rel = "icon";
    link.href = icon;
    document.head.appendChild(link);
  }, []);

  const [pendingSellers, setPendingSellers] = useState([]);
  const [sellers, setSellers] = useState([]);

  const [stats, setStats] = useState({
    total: 0,
    verified: 0,
    pending: 0,
  });

  const [pendingPage, setPendingPage] = useState(1);
  const [pendingTotalPages, setPendingTotalPages] = useState(1);

  const [sellerPage, setSellerPage] = useState(1);
  const [sellerTotalPages, setSellerTotalPages] = useState(1);

  const pageSize = 10;

  const [loading, setLoading] = useState(true);
  const [tableLoading, setTableLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");

  const [sidebarShrinked, setSidebarShrinked] = useState(false);
  const [confirmBox, setConfirmBox] = useState(false);
  const [selectedSeller, setSelectedSeller] = useState(null);
  const [actionType, setActionType] = useState("");

  const [detailsOpen, setDetailsOpen] = useState(false);
  const [sellerDetails, setSellerDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  const toggleSidebar = () => setSidebarShrinked((prev) => !prev);

  const isActive = (path) => (location.pathname === path ? "active" : "");

  function handleLogout() {
    localStorage.removeItem("userToken");
    // navigate("/login");
  }

  const resolveSellerUserId = async (seller) => {
    const directId =
      seller?.userId ||
      seller?.raw?.userId ||
      seller?.raw?.UserId ||
      seller?.raw?.userID ||
      seller?.raw?.id ||
      seller?.id ||
      "";

    if (directId && String(directId).includes("-")) {
      return directId;
    }

    const email = seller?.email || seller?.raw?.email || "";

    if (email && email !== "-") {
      const foundUserId = await findUserIdByEmail(email);
      if (foundUserId) return foundUserId;
    }

    return directId || "";
  };

  const loadStats = async () => {
    const [totalRes, verifiedRes, pendingRes] = await Promise.all([
      getTotalSellers(),
      getVerifiedSellers(),
      getPendingSellersPage(1, pageSize),
    ]);

    const pendingRoot = pendingRes?.data || {};

    setStats({
      total: getNumber(totalRes),
      verified: getNumber(verifiedRes),
      pending: Number(pendingRoot?.totalCount || 0),
    });
  };

  const loadPending = async (targetPage = pendingPage) => {
    const res = await getPendingSellersPage(targetPage, pageSize);
    const root = res?.data || {};

    const list = Array.isArray(root?.data)
      ? root.data
      : Array.isArray(root)
      ? root
      : [];

    setPendingSellers(list.map(normalizePendingSeller));
    setPendingPage(Number(root?.currentPage || targetPage));
    setPendingTotalPages(Number(root?.totalPages || 1));
  };

  const loadSellers = async (targetPage = sellerPage) => {
    const res = await getSellersPage(targetPage, pageSize);
    const root = res?.data || {};

    const list = Array.isArray(root?.data)
      ? root.data
      : Array.isArray(root)
      ? root
      : [];

    setSellers(list.map(normalizeSeller));
    setSellerPage(Number(root?.currentPage || targetPage));
    setSellerTotalPages(Number(root?.totalPages || 1));
  };

  const loadAll = async () => {
    try {
      setLoading(true);
      setTableLoading(true);
      setError("");

      await Promise.all([loadStats(), loadPending(1), loadSellers(1)]);
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.response?.data?.Message ||
          err?.message ||
          "Failed to load sellers."
      );
    } finally {
      setLoading(false);
      setTableLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openConfirm = (seller, action) => {
    setSelectedSeller(seller);
    setActionType(action);
    setConfirmBox(true);
  };

  const closeConfirm = () => {
    if (actionLoading) return;
    setConfirmBox(false);
    setSelectedSeller(null);
    setActionType("");
  };

  const confirmAction = async () => {
    if (!selectedSeller) return;

    try {
      setActionLoading(true);

      const userId = await resolveSellerUserId(selectedSeller);

      if (!userId) {
        alert("Seller userId is missing from API response.");
        return;
      }

      if (actionType === "approve") {
        await approveSeller(userId);
        await Promise.all([loadStats(), loadPending(pendingPage), loadSellers(1)]);
      }

      if (actionType === "reject") {
        await rejectSeller(userId);
        await Promise.all([loadStats(), loadPending(pendingPage), loadSellers(1)]);
      }

      if (actionType === "suspend") {
        await suspendSeller(userId);
        await Promise.all([loadStats(), loadSellers(sellerPage)]);
      }

      if (actionType === "restore") {
        await restoreSeller(userId);
        await Promise.all([loadStats(), loadSellers(sellerPage)]);
      }

      closeConfirm();
    } catch (err) {
      alert(
        err?.response?.data?.message ||
          err?.response?.data?.Message ||
          err?.message ||
          "Failed to update seller."
      );
    } finally {
      setActionLoading(false);
    }
  };

  const openDetails = async (seller) => {
    try {
      setDetailsOpen(true);
      setDetailsLoading(true);
      setSellerDetails(null);

      const userId = await resolveSellerUserId(seller);

      if (!userId) {
        setSellerDetails({
          error: "Seller userId is missing from API response.",
        });
        return;
      }

      const res = await getSellerDetailsByUserId(userId);
      setSellerDetails(res?.data || null);
    } catch (err) {
      setSellerDetails({
        error:
          err?.response?.data?.message ||
          err?.response?.data?.Message ||
          err?.message ||
          "Failed to load seller details.",
      });
    } finally {
      setDetailsLoading(false);
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

  const sellersData = useMemo(() => {
    return months.map((month) => ({
      month,
      verified: stats.verified,
      pending: stats.pending,
    }));
  }, [stats.verified, stats.pending]);

  const sellersAnalysis = [
    { name: "Verified", value: stats.verified },
    { name: "Pending", value: stats.pending },
  ];

  return (
    <div className="admin-layout">
      <header className="admin-navbar">
        <div className="left">
          <button className="toggle-btn" onClick={toggleSidebar}>
            <i className="fa fa-bars"></i>
          </button>

          <div className="brand">
            <i className="fa fa-user-secret"></i>
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
            <Link className={isActive("/admin_sellers")} to="/admin_sellers">
              <i style={{ color: "#023E8A" }} className="fa fa-user-secret"></i>
              <span style={{ color: "#023E8A" }}>All Sellers</span>
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
        <h2 className="page-title">Sellers Management</h2>

        {error ? <div className="alert alert-danger">{error}</div> : null}

        {loading ? (
          <SkeletonDashboard />
        ) : (
          <section className="dashboard-section">
            <div className="grid">
              <Card title="Total Sellers" value={stats.total} icon="building" />
              <Card title="Verified Sellers" value={stats.verified} icon="check" />
              <Card
                title="Pending Sellers"
                value={stats.pending}
                icon="hourglass-half"
              />
            </div>

<div className="admin-analysis-row">
  <div className="admin-chart-scroll seller-chart-scroll">
    <LineChart width={650} height={260} data={sellersData}>
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis dataKey="month" />
      <YAxis />
      <Tooltip />
      <Legend
        align="center"
        verticalAlign="bottom"
        wrapperStyle={{
          width: "100%",
          left: 0,
          bottom: 0,
          textAlign: "center",
        }}
      />
      <Line type="monotone" dataKey="verified" stroke="#2d6a4f" />
      <Line type="monotone" dataKey="pending" stroke="#ffb703" />
    </LineChart>
  </div>

  <div className="admin-pie-scroll">
    <CircleChart data={sellersAnalysis} colors={["#2d6a4f", "#ffb703"]} />
  </div>
</div>
          </section>
        )}

        <h3 className="section-title">Pending Seller Requests</h3>

        <div className="users-table-container">
          <table className="users-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Business</th>
                <th>Owner</th>
                <th>Email</th>
                <th>Docs</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {tableLoading ? (
                <SkeletonTableRows rows={6} cols={6} />
              ) : pendingSellers.length === 0 ? (
                <tr>
                  <td colSpan="6">No pending sellers found.</td>
                </tr>
              ) : (
                pendingSellers.map((s, i) => (
                  <tr key={s.id || i}>
                    <td>{(pendingPage - 1) * pageSize + i + 1}</td>
                    <td>{s.business}</td>
                    <td>{s.owner}</td>
                    <td>{s.email}</td>
                    <td>
                      <button className="action-btn view" onClick={() => openDetails(s)}>
                        View
                      </button>
                    </td>
                    <td>
                      <button
                        className="action-btn mx-2 activate"
                        onClick={() => openConfirm(s, "approve")}
                      >
                        Approve
                      </button>

                      <button
                        className="action-btn suspend"
                        onClick={() => openConfirm(s, "reject")}
                      >
                        Reject
                      </button>
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
              disabled={pendingPage <= 1 || tableLoading}
              onClick={() => loadPending(pendingPage - 1)}
            >
              Previous
            </button>

            <strong>
              Page {pendingPage} of {pendingTotalPages}
            </strong>

            <button
              className="action-btn view"
              disabled={pendingPage >= pendingTotalPages || tableLoading}
              onClick={() => loadPending(pendingPage + 1)}
            >
              Next
            </button>
          </div>
        </div>

        <h3 className="section-title">All Sellers</h3>

        <div className="users-table-container">
          <table className="users-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Business</th>
                <th>Owner</th>
                <th>Email</th>
                <th>Status</th>
                <th>Docs</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {tableLoading ? (
                <SkeletonTableRows rows={8} cols={7} />
              ) : sellers.length === 0 ? (
                <tr>
                  <td colSpan="7">No sellers found.</td>
                </tr>
              ) : (
                sellers.map((s, i) => (
                  <tr key={`${s.email}-${i}`}>
                    <td>{(sellerPage - 1) * pageSize + i + 1}</td>
                    <td>{s.business}</td>
                    <td>{s.owner}</td>
                    <td>{s.email}</td>
                    <td>
                      <span className={`status ${s.status}`}>{s.status}</span>
                    </td>
                    <td>
                      <button className="action-btn view" onClick={() => openDetails(s)}>
                        View
                      </button>
                    </td>
                    <td>
                      {s.status === "active" ? (
                        <button
                          className="action-btn suspend"
                          onClick={() => openConfirm(s, "suspend")}
                        >
                          Suspend
                        </button>
                      ) : (
                        <button
                          className="action-btn activate"
                          onClick={() => openConfirm(s, "restore")}
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
              disabled={sellerPage <= 1 || tableLoading}
              onClick={() => loadSellers(sellerPage - 1)}
            >
              Previous
            </button>

            <strong>
              Page {sellerPage} of {sellerTotalPages}
            </strong>

            <button
              className="action-btn view"
              disabled={sellerPage >= sellerTotalPages || tableLoading}
              onClick={() => loadSellers(sellerPage + 1)}
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
              <strong
                className={
                  actionType === "reject" || actionType === "suspend"
                    ? "danger"
                    : "success"
                }
              >
                {actionType}
              </strong>{" "}
              <strong>{selectedSeller?.business}</strong>?
            </p>

            <div className="confirm-actions">
              <button className="btn cancel" onClick={closeConfirm}>
                Cancel
              </button>

              <button
                className={`btn ${
                  actionType === "reject" || actionType === "suspend"
                    ? "danger"
                    : "success"
                }`}
                onClick={confirmAction}
                disabled={actionLoading}
              >
                {actionLoading ? "Loading..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}

      {detailsOpen && (
        <div className="confirm-overlay" onClick={() => setDetailsOpen(false)}>
          <div className="confirm-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Seller Details</h3>

            {detailsLoading ? (
              <div style={{ display: "grid", gap: 10 }}>
                <SkeletonBlock width="70%" height={15} />
                <SkeletonBlock width="85%" height={15} />
                <SkeletonBlock width="60%" height={15} />
                <SkeletonBlock width="75%" height={15} />
                <SkeletonBlock width="65%" height={15} />
              </div>
            ) : sellerDetails?.error ? (
              <p className="danger">{sellerDetails.error}</p>
            ) : sellerDetails ? (
              <div style={{ textAlign: "left", lineHeight: 1.8 }}>
                <p>
                  <strong>ID:</strong> {sellerDetails.id || "-"}
                </p>
                <p>
                  <strong>Store:</strong> {sellerDetails.storeName || "-"}
                </p>
                <p>
                  <strong>Description:</strong> {sellerDetails.description || "-"}
                </p>
                <p>
                  <strong>Phone:</strong> {sellerDetails.phoneNumber || "-"}
                </p>
                <p>
                  <strong>City:</strong> {sellerDetails.cityName || "-"}
                </p>
                <p>
                  <strong>Verification:</strong>{" "}
                  {sellerDetails.verificationStatus || "-"}
                </p>
                <p>
                  <strong>Status:</strong> {sellerDetails.storeStatus || "-"}
                </p>
              </div>
            ) : null}

            <div className="confirm-actions">
              <button className="btn cancel" onClick={() => setDetailsOpen(false)}>
                Close
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