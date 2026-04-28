import { Link, useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import icon from "../../../assets/Person at the Center of Circles.png";
import "../admin.css"


export default function Announcements() {


      // Year selection
      const currentYear = new Date().getFullYear();
      const [selectedYear, setSelectedYear] = useState(currentYear);
      const years = [];
      for (let y = 2025; y <= currentYear; y++) years.push(y);
    
          useEffect(() => {
            document.title = `Admin | Announcements ${selectedYear}`;
          }, [selectedYear]);
        
          // favicon
          const [favicon, setFavicon] = useState(icon);
          useEffect(() => {
            const link = document.querySelector("link[rel~='icon']") || document.createElement("link");
            link.rel = "icon";
            link.href = favicon;
            document.head.appendChild(link);
          }, [favicon]);
  const [sidebarShrinked, setSidebarShrinked] = useState(false);
  const [announcements, setAnnouncements] = useState([]);
  const [message, setMessage] = useState("");

  const toggleSidebar = () => setSidebarShrinked((prev) => !prev);

  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path) => (location.pathname === path ? "active" : "");

  function handleLogout() {
    localStorage.removeItem("userToken");
    // navigate("/login");
  }

  /* ================= SEND ANNOUNCEMENT ================= */

  const sendAnnouncement = () => {
    if (!message.trim()) return;

    const newAnnouncement = {
      id: Date.now(),
      content: message,
      date: new Date().toLocaleString(),
    };

    setAnnouncements((prev) => [newAnnouncement, ...prev]);
    setMessage("");
  };

  return (
    <div className="admin-layout">
      {/* NAVBAR */}
      <header className="admin-navbar">
        <div className="left">
          <button className="toggle-btn" onClick={toggleSidebar}>
            <i className="fa fa-bars"></i>
          </button>
          <div className="brand">
            <i className="fa fa-bullhorn"></i>
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
          <li>
            <Link className={isActive("/admin")} to="/admin">
              <i className="fa fa-dashboard"></i><span>Dashboard</span>
            </Link>
          </li>

          <li>
            <Link to="/admin_users">
              <i className="fa fa-users"></i><span>All Users</span>
            </Link>
          </li>

          <li>
            <Link to="/admin_sellers">
              <i className="fa fa-user-secret"></i><span>All Sellers</span>
            </Link>
          </li>

          <li>
            <Link to="/admin_auctions">
              <i className="fa fa-gavel"></i><span>All Auctions</span>
            </Link>
          </li>

          <li>
            <Link to="/admin_payments">
              <i className="fa fa-credit-card"></i><span>Payment Logs</span>
            </Link>
          </li>
          <li><Link to="/admin_delivery"><i className="fa fa-truck"></i><span>Admin Delivery</span></Link></li>
          <li>
            <Link className={isActive("/admin_track_chats")} to="/admin_track_chats">
            <i className="fa fa-comments"></i>
            <span>Track Chats</span>
            </Link>
          </li>

          <li>
            <Link to="/admin_reports">
              <i className="fa-solid fa-clipboard-list"></i><span>Reports</span>
            </Link>
          </li>

          <li>
            <Link className={isActive("/admin_announcements")} to="/admin_announcements">
              <i style={{color:"#023E8A"}} className="fa fa-bullhorn"></i><span style={{color:"#023E8A"}}>Announcements</span>
            </Link>
          </li>
        </ul>
      </aside>

      {/* CONTENT */}
      <main className={`admin-content ${sidebarShrinked ? "active" : ""}`}>
        <h2 className="page-title">Global Announcements</h2>

        {/* SEND ANNOUNCEMENT */}
<section className="dashboard-section announcement-box">
  <h4>Send Global Announcement</h4>

  <textarea
    className="announcement-textarea big"
    placeholder="Write your global announcement message here..."
    value={message}
    onChange={(e) => setMessage(e.target.value)}
  ></textarea>

  <div className="announcement-btn-wrapper">
    <button className="btn send-btn" onClick={sendAnnouncement}>
      <i className="fa fa-paper-plane"></i> Send Announcement
    </button>
  </div>
</section>
        {/* ANNOUNCEMENTS STATS */}
        <section className="dashboard-section">
          <h4>Announcements Summary</h4>

          <div className="grid">
            <Card title="Total Announcements" value={announcements.length} icon="bullhorn" />
          </div>
        </section>

        {/* ANNOUNCEMENTS TABLE */}
        <div className="users-table-container">
          <table className="users-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Message</th>
                <th>Date</th>
              </tr>
            </thead>

            <tbody>
              {announcements.length === 0 ? (
                <tr>
                  <td colSpan="3" style={{ textAlign: "center", padding: "20px" }}>
                    No announcements sent yet.
                  </td>
                </tr>
              ) : (
                announcements.map((a, i) => (
                  <tr key={a.id}>
                    <td>{i + 1}</td>
                    <td style={{ maxWidth: "600px", whiteSpace: "pre-wrap" }}>
                      {a.content}
                    </td>
                    <td>{a.date}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
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
