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
import img2 from "../../../IMG/2.jpeg";
import "../admin.css";

import {
  getTotalAuctions,
  getActiveAuctions,
  getExpiredAuctions,
  getActiveAuctionsPage,
  getExpiredAuctionsPage,
  getRejectedDeletedAuctionsPage,
  forceExpireAuction,
  deleteAuction,
  permanentDeleteAuction,
} from "../../../API/admindashboard";

const DEADLINE = new Date("2026-06-30T23:59:59");

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

const toImageSrc = (value) => {
  const raw = String(value || "").trim();

  if (!raw || raw === " ") return img2;
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
  if (raw.startsWith("data:image/")) return raw;

  const cleaned = raw.replace(/\s/g, "");
  const looksLikeBase64 =
    cleaned.length > 20 &&
    /^[A-Za-z0-9+/=]+$/.test(cleaned) &&
    !cleaned.includes("{") &&
    !cleaned.includes("}");

  if (!looksLikeBase64) return img2;

  return `data:image/png;base64,${cleaned}`;
};

const normalizeActiveAuction = (item) => ({
  id: item?.id || item?.auctionId || 0,
  title: item?.title || "-",
  desc: item?.description || "-",
  price: Number(item?.currentPrice || item?.price || 0),
  img: toImageSrc(item?.imageBase64 || item?.image || item?.headImage),
  deadline: item?.endDate ? String(item.endDate).slice(0, 10) : "-",
});

const normalizeExpiredAuction = (item) => ({
  id: item?.id || item?.auctionId || 0,
  title: item?.title || "-",
  desc: item?.description || "-",
  price: Number(item?.price || item?.currentPrice || 0),
  img: toImageSrc(item?.image || item?.imageBase64 || item?.headImage),
  deadline: item?.endDate ? String(item.endDate).slice(0, 10) : "-",
});

export default function Auctions() {
  const currentYear = new Date().getFullYear();
  const [selectedYear] = useState(currentYear);

  useEffect(() => {
    document.title = `Admin | Auctions ${selectedYear}`;
  }, [selectedYear]);

  useEffect(() => {
    const link =
      document.querySelector("link[rel~='icon']") ||
      document.createElement("link");

    link.rel = "icon";
    link.href = icon;
    document.head.appendChild(link);
  }, []);

  const [pendingAuctions] = useState([]);
  const [activeAuctions, setActiveAuctions] = useState([]);
  const [expiredAuctions, setExpiredAuctions] = useState([]);
  const [rejectedAuctions, setRejectedAuctions] = useState([]);

  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    expired: 0,
    rejectedDeleted: 0,
  });

  const [activePage, setActivePage] = useState(1);
  const [activeTotalPages, setActiveTotalPages] = useState(1);

  const [expiredPage, setExpiredPage] = useState(1);
  const [expiredTotalPages, setExpiredTotalPages] = useState(1);

  const [rejectedPage, setRejectedPage] = useState(1);
  const [rejectedTotalPages, setRejectedTotalPages] = useState(1);

  const pageSize = 10;

  const [loading, setLoading] = useState(true);
  const [sectionLoading, setSectionLoading] = useState(false);
  const [error, setError] = useState("");

  const [timeLeft, setTimeLeft] = useState(DEADLINE - new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      const diff = DEADLINE - new Date();
      setTimeLeft(diff > 0 ? diff : 0);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatTime = (ms) => {
    const d = Math.floor(ms / (1000 * 60 * 60 * 24));
    const h = Math.floor((ms / (1000 * 60 * 60)) % 24);
    const m = Math.floor((ms / (1000 * 60)) % 60);
    const s = Math.floor((ms / 1000) % 60);

    return `${d}d ${h}h ${m}m ${s}s`;
  };

  const [sidebarShrinked, setSidebarShrinked] = useState(false);
  const toggleSidebar = () => setSidebarShrinked((prev) => !prev);

  const navigate = useNavigate();
  const location = useLocation();
  const isActive = (path) => (location.pathname === path ? "active" : "");

  function handleLogout() {
    localStorage.removeItem("userToken");
    // navigate("/login");
  }

  const [confirmBox, setConfirmBox] = useState(false);
  const [selectedAuction, setSelectedAuction] = useState(null);
  const [actionType, setActionType] = useState("");

  const loadStats = async () => {
    const [totalRes, activeRes, expiredRes, rejectedRes] = await Promise.all([
      getTotalAuctions(),
      getActiveAuctions(),
      getExpiredAuctions(),
      getRejectedDeletedAuctionsPage(1, pageSize),
    ]);

    const rejectedRoot = rejectedRes?.data || {};

    setStats({
      total: getNumber(totalRes),
      active: getNumber(activeRes),
      expired: getNumber(expiredRes),
      rejectedDeleted: Number(rejectedRoot?.totalCount || 0),
    });
  };

  const loadActiveAuctions = async (targetPage = activePage) => {
    const res = await getActiveAuctionsPage(targetPage, pageSize);
    const root = res?.data || {};

    const list = Array.isArray(root?.data)
      ? root.data
      : Array.isArray(root)
      ? root
      : [];

    setActiveAuctions(list.map(normalizeActiveAuction));
    setActivePage(Number(root?.currentPage || targetPage));
    setActiveTotalPages(Number(root?.totalPages || 1));
  };

  const loadExpiredAuctions = async (targetPage = expiredPage) => {
    const res = await getExpiredAuctionsPage(targetPage, pageSize);
    const root = res?.data || {};

    const list = Array.isArray(root?.data)
      ? root.data
      : Array.isArray(root)
      ? root
      : [];

    setExpiredAuctions(list.map(normalizeExpiredAuction));
    setExpiredPage(Number(root?.currentPage || targetPage));
    setExpiredTotalPages(Number(root?.totalPages || 1));
  };

  const loadRejectedAuctions = async (targetPage = rejectedPage) => {
    const res = await getRejectedDeletedAuctionsPage(targetPage, pageSize);
    const root = res?.data || {};

    const list = Array.isArray(root?.data)
      ? root.data
      : Array.isArray(root)
      ? root
      : [];

    setRejectedAuctions(list.map(normalizeExpiredAuction));
    setRejectedPage(Number(root?.currentPage || targetPage));
    setRejectedTotalPages(Number(root?.totalPages || 1));
  };

  const loadAll = async () => {
    try {
      setLoading(true);
      setSectionLoading(true);
      setError("");

      await Promise.all([
        loadStats(),
        loadActiveAuctions(1),
        loadExpiredAuctions(1),
        loadRejectedAuctions(1),
      ]);
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.response?.data?.Message ||
          err?.message ||
          "Failed to load auctions."
      );
    } finally {
      setLoading(false);
      setSectionLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openConfirm = (auction, action) => {
    setSelectedAuction(auction);
    setActionType(action);
    setConfirmBox(true);
  };

  const closeConfirm = () => {
    setConfirmBox(false);
    setSelectedAuction(null);
    setActionType("");
  };

  const confirmAction = async () => {
    if (!selectedAuction?.id) return;

    try {
      if (actionType === "expire") {
        await forceExpireAuction(selectedAuction.id);
      }

      if (actionType === "delete") {
        await deleteAuction(selectedAuction.id);
      }

      if (actionType === "deletePermanent") {
        await permanentDeleteAuction(selectedAuction.id);
      }

      await Promise.all([
        loadStats(),
        loadActiveAuctions(activePage),
        loadExpiredAuctions(expiredPage),
        loadRejectedAuctions(rejectedPage),
      ]);

      closeConfirm();
    } catch (err) {
      alert(
        err?.response?.data?.message ||
          err?.response?.data?.Message ||
          err?.message ||
          "Failed to update auction."
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

  const auctionsData = useMemo(() => {
    return months.map((month) => ({
      month,
      active: stats.active,
      expired: stats.expired,
      rejectedDeleted: stats.rejectedDeleted,
    }));
  }, [stats.active, stats.expired, stats.rejectedDeleted]);

  const auctionsAnalysis = [
    { name: "Active", value: stats.active },
    { name: "Expired", value: stats.expired },
    { name: "Rejected / Deleted", value: stats.rejectedDeleted },
  ];

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

  return (
    <div className="admin-layout">
      <header className="admin-navbar">
        <div className="left">
          <button className="toggle-btn" onClick={toggleSidebar}>
            <i className="fa fa-bars"></i>
          </button>

          <div className="brand">
            <i className="fa fa-gavel"></i>
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
            <Link to="/admin_sellers">
              <i className="fa fa-user-secret"></i>
              <span>All Sellers</span>
            </Link>
          </li>

          <li>
            <Link className={isActive("/admin_auctions")} to="/admin_auctions">
              <i style={{ color: "#023E8A" }} className="fa fa-gavel"></i>
              <span style={{ color: "#023E8A" }}>All Auctions</span>
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
        <h2 className="page-title">Auctions Management</h2>

        {error ? <div className="alert alert-danger">{error}</div> : null}

        <section className="dashboard-section">
          <h4>Auctions Analytics</h4>

          <div className="grid">
            <Card
              title="Total Auctions"
              value={loading ? "Loading..." : stats.total}
              icon="gavel"
            />
            <Card
              title="Active Auctions"
              value={loading ? "Loading..." : stats.active}
              icon="check-circle"
            />
            <Card
              title="Expired Auctions"
              value={loading ? "Loading..." : stats.expired}
              icon="clock"
            />
            <Card
              title="Rejected / Deleted"
              value={loading ? "Loading..." : stats.rejectedDeleted}
              icon="trash"
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
            <LineChart width={650} height={260} data={auctionsData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="active" stroke="#2d6a4f" />
              <Line type="monotone" dataKey="expired" stroke="#e63946" />
              <Line type="monotone" dataKey="rejectedDeleted" stroke="#ffb703" />
            </LineChart>

            <CircleChart
              data={auctionsAnalysis}
              colors={["#2d6a4f", "#e63946", "#ffb703"]}
            />
          </div>

          <div style={{ marginTop: "16px", fontWeight: "600", color: "#023E8A" }}>
            Global Active Deadline Countdown: {formatTime(timeLeft)}
          </div>
        </section>

        <h3 className="section-title">Pending Auction Requests</h3>

        <div className="auction-cards-grid">
          {pendingAuctions.length === 0 ? (
            <p>No pending auction API endpoint provided.</p>
          ) : (
            pendingAuctions.map((a) => (
              <AuctionCard key={a.id} auction={a} openConfirm={openConfirm} />
            ))
          )}
        </div>

        <hr className="big-divider" />

        <h3 className="section-title">Active Auctions</h3>

        <div className="auction-cards-grid">
          {sectionLoading ? (
            <p>Loading...</p>
          ) : activeAuctions.length === 0 ? (
            <p>No active auctions found.</p>
          ) : (
            activeAuctions.map((a) => (
              <AuctionCard
                key={a.id}
                auction={a}
                active
                openConfirm={openConfirm}
              />
            ))
          )}
        </div>

        <Pagination
          page={activePage}
          totalPages={activeTotalPages}
          loading={sectionLoading}
          onPrev={() => loadActiveAuctions(activePage - 1)}
          onNext={() => loadActiveAuctions(activePage + 1)}
        />

        <hr className="big-divider" />

        <h3 className="section-title">Expired Auctions</h3>

        <div className="auction-cards-grid">
          {sectionLoading ? (
            <p>Loading...</p>
          ) : expiredAuctions.length === 0 ? (
            <p>No expired auctions found.</p>
          ) : (
            expiredAuctions.map((a) => (
              <AuctionCard
                key={a.id}
                auction={a}
                expired
                openConfirm={openConfirm}
              />
            ))
          )}
        </div>

        <Pagination
          page={expiredPage}
          totalPages={expiredTotalPages}
          loading={sectionLoading}
          onPrev={() => loadExpiredAuctions(expiredPage - 1)}
          onNext={() => loadExpiredAuctions(expiredPage + 1)}
        />

        <hr className="big-divider" />

        <h3 className="section-title">Rejected / Deleted Auctions</h3>

        <div className="auction-cards-grid">
          {sectionLoading ? (
            <p>Loading...</p>
          ) : rejectedAuctions.length === 0 ? (
            <p>No rejected/deleted auctions found.</p>
          ) : (
            rejectedAuctions.map((a) => (
              <AuctionCard
                key={a.id}
                auction={a}
                rejected
                openConfirm={openConfirm}
              />
            ))
          )}
        </div>

        <Pagination
          page={rejectedPage}
          totalPages={rejectedTotalPages}
          loading={sectionLoading}
          onPrev={() => loadRejectedAuctions(rejectedPage - 1)}
          onNext={() => loadRejectedAuctions(rejectedPage + 1)}
        />
      </main>

      {confirmBox && (
        <div className="confirm-overlay">
          <div className="confirm-modal">
            <h3>Confirm Action</h3>

            <p>
              Are you sure you want to{" "}
              <span
                className={
                  actionType === "expire" ? "success" : "danger"
                }
              >
                {actionType === "deletePermanent"
                  ? "delete permanently"
                  : actionType === "delete"
                  ? "delete"
                  : "force expire"}
              </span>{" "}
              <strong>{selectedAuction?.title}</strong>?
            </p>

            <div className="confirm-actions">
              <button className="btn cancel" onClick={closeConfirm}>
                Cancel
              </button>

              <button
                className={`btn ${
                  actionType === "expire" ? "success" : "danger"
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

  function Pagination({ page, totalPages, loading, onPrev, onNext }) {
    return (
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
          disabled={page <= 1 || loading}
          onClick={onPrev}
        >
          Previous
        </button>

        <strong>
          Page {page} of {totalPages}
        </strong>

        <button
          className="action-btn view"
          disabled={page >= totalPages || loading}
          onClick={onNext}
        >
          Next
        </button>
      </div>
    );
  }
}

function AuctionCard({ auction, openConfirm, active, expired, rejected }) {
  return (
    <div
      className={`auction-card ${expired ? "expired" : ""} ${
        rejected ? "rejected" : ""
      }`}
    >
      <div className="auction-img-wrap">
        <img src={auction.img} alt={auction.title} />
      </div>

      <div className="auction-info">
        <h4>{auction.title}</h4>
        <p className="desc">{auction.desc}</p>
        <p className="price">${Number(auction.price || 0).toLocaleString()}</p>
        <span className="deadline">Deadline: {auction.deadline}</span>
      </div>

      <div className="auction-actions">
        {active && (
          <button
            className="action-btn suspend"
            onClick={() => openConfirm(auction, "expire")}
          >
            Force Expire
          </button>
        )}

        {expired && (
          <button
            className="action-btn suspend"
            onClick={() => openConfirm(auction, "delete")}
          >
            Delete
          </button>
        )}

        {rejected && (
          <button
            className="action-btn suspend"
            onClick={() => openConfirm(auction, "deletePermanent")}
          >
            Delete Permanently
          </button>
        )}
      </div>
    </div>
  );
}

function CircleChart({ data, colors }) {
  const total = data.reduce((s, i) => s + Number(i.value || 0), 0);

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
