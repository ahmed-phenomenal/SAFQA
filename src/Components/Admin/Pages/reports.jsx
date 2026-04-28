import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect, useMemo } from "react";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  Cell,
} from "recharts";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import icon from "../../../assets/Person at the Center of Circles.png";
import "../admin.css"


export default function Reports() {

  /* ================= DATE SYSTEM ================= */

  const today = new Date();
  const minDate = "2025-01-01";

  const [selectedDate, setSelectedDate] = useState(
    today.toISOString().split("T")[0]
  );

useEffect(() => {
            document.title = `Admin | Reports ${selectedDate}`;
          }, [selectedDate]);
        
          // favicon
          const [favicon, setFavicon] = useState(icon);
          useEffect(() => {
            const link = document.querySelector("link[rel~='icon']") || document.createElement("link");
            link.rel = "icon";
            link.href = favicon;
            document.head.appendChild(link);
          }, [favicon]);

  /* ================= SIDEBAR ================= */

  const [sidebarShrinked, setSidebarShrinked] = useState(false);
  const navigate = useNavigate();

  const toggleSidebar = () => setSidebarShrinked((prev) => !prev);

  const handleLogout = () => {
    localStorage.removeItem("userToken");
    navigate("/login");
  };

  /* ================= DAILY DATA ================= */

  const generateDailyData = (date) => {
    const seed = new Date(date).getTime();

    const random = (min, max, offset = 0) =>
      Math.floor(
        (Math.abs(Math.sin(seed + offset)) * 10000) % (max - min) + min
      );

    return {
      userActivity: [
        { name: "Logins", value: random(200, 1000, 1) },
        { name: "Actions", value: random(500, 2000, 2) },
      ],
      sellerActivity: [
        { name: "Listings", value: random(100, 500, 3) },
        { name: "Sales", value: random(60, 300, 4) },
      ],
      revenueByCategory: [
        { name: "Electronics", value: random(10000, 60000, 5) },
        { name: "Vehicles", value: random(30000, 90000, 6) },
        { name: "Real Estate", value: random(70000, 200000, 7) },
        { name: "Fashion", value: random(5000, 40000, 8) },
        { name: "Others", value: random(3000, 20000, 9) },
      ],
      problems: [
        {
          id: 1,
          email: "ahmed.tamer@gmail.com",
          role: "Buyer",
          issue: "Payment failed during checkout",
          date: date,
          status: "open",
        },
        {
          id: 2,
          email: "sara.ali@gmail.com",
          role: "Seller",
          issue: "Account verification delay",
          date: date,
          status: "resolved",
        },
        {
          id: 3,
          email: "omar.hassan@gmail.com",
          role: "Buyer",
          issue: "Auction dispute",
          date: date,
          status: "open",
        },
      ],
    };
  };

  const dailyData = useMemo(
    () => generateDailyData(selectedDate),
    [selectedDate]
  );

  /* ================= RESPONSE ================= */

  const [selectedProblem, setSelectedProblem] = useState(null);
  const [responseText, setResponseText] = useState("");

  const handleSendResponse = () => {
    alert(`Response sent to ${selectedProblem.email}`);
    setSelectedProblem(null);
    setResponseText("");
  };

  /* ================= EXPORT ================= */

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.text(`Safqa Daily Report - ${selectedDate}`, 14, 15);

    autoTable(doc, {
      startY: 25,
      head: [["User Activity", "Value"]],
      body: dailyData.userActivity.map((d) => [d.name, d.value]),
    });

    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 10,
      head: [["Seller Activity", "Value"]],
      body: dailyData.sellerActivity.map((d) => [d.name, d.value]),
    });

    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 10,
      head: [["Category", "Revenue"]],
      body: dailyData.revenueByCategory.map((d) => [d.name, d.value]),
    });

    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 10,
      head: [["Email", "Role", "Issue", "Status"]],
      body: dailyData.problems.map((p) => [
        p.email,
        p.role,
        p.issue,
        p.status,
      ]),
    });

    doc.save(`Safqa_Report_${selectedDate}.pdf`);
  };

  const exportExcel = () => {
    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(dailyData.userActivity),
      "User Activity"
    );

    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(dailyData.sellerActivity),
      "Seller Activity"
    );

    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(dailyData.revenueByCategory),
      "Revenue"
    );

    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(dailyData.problems),
      "Problems"
    );

    const excelBuffer = XLSX.write(workbook, {
      bookType: "xlsx",
      type: "array",
    });

    saveAs(
      new Blob([excelBuffer], {
        type:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      }),
      `Safqa_Report_${selectedDate}.xlsx`
    );
  };

  return (
    <div className="admin-layout">

      <header className="admin-navbar">
        <div className="left">
          <button className="toggle-btn" onClick={toggleSidebar}>
            <i className="fa fa-bars"></i>
          </button>

          <div className="brand">
            <i className="fa fa-file-text"></i>
            <span>Safqa Admin</span>
          </div>
        </div>

        <button onClick={handleLogout} className="logout-btn">
          <i className="fa fa-sign-out"></i> Logout
        </button>
      </header>

      <aside className={`admin-sidebar ${sidebarShrinked ? "shrinked" : ""}`}>
        <ul>
          <li><Link to="/admin"><i className="fa fa-dashboard"></i><span>Dashboard</span></Link></li>
          <li><Link to="/admin_users"><i className="fa fa-users"></i><span>All Users</span></Link></li>
          <li><Link to="/admin_sellers"><i className="fa fa-user-secret"></i><span>All Sellers</span></Link></li>
          <li><Link to="/admin_auctions"><i className="fa fa-gavel"></i><span>All Auctions</span></Link></li>
          <li><Link to="/admin_payments"><i className="fa fa-credit-card"></i><span>Payment Logs</span></Link></li>
          <li><Link to="/admin_delivery"><i className="fa fa-truck"></i><span>Admin Delivery</span></Link></li>
          <li>
            <Link to="/admin_track_chats">
            <i className="fa fa-comments"></i>
            <span>Track Chats</span>
            </Link>
          </li>
          <li><Link to="/admin_reports"><i style={{color:"#023E8A"}} className="fa fa-file-text"></i><span style={{color:"#023E8A"}}>Reports</span></Link></li>
          <li><Link to="/admin_announcements"><i className="fa fa-bullhorn"></i><span>Announcements</span></Link></li>
        </ul>
      </aside>

      <main className={`admin-content ${sidebarShrinked ? "active" : ""}`}>

        <h2 className="page-title">System Reports & Analytics</h2>

        {/* DATE */}
        <div className="mb-3">
          <label className="me-2">Select Day:</label>
          <input
            type="date"
            min={minDate}
            max={today.toISOString().split("T")[0]}
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          />
        </div>

        {/* EXPORT */}
        <div className="export-actions my-2">
          <button className="btn success mx-2" onClick={exportExcel}>
            <i className="fa fa-file-excel"></i> Export Excel
          </button>

          <button className="btn danger" onClick={exportPDF}>
            <i className="fa fa-file-pdf"></i> Export PDF
          </button>
        </div>

        {/* USER ACTIVITY */}
        <section className="dashboard-section">
          <h4>User Activity</h4>
          <BarChart width={900} height={260} data={dailyData.userActivity}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="value" fill="#023E8A" />
          </BarChart>
        </section>

        {/* SELLER ACTIVITY */}
        <section className="dashboard-section">
          <h4>Seller Activity</h4>
          <BarChart width={900} height={260} data={dailyData.sellerActivity}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="value" fill="#2d6a4f" />
          </BarChart>
        </section>

        {/* REVENUE */}
        <section className="dashboard-section">
          <h4>Revenue by Category</h4>
          <PieChart width={420} height={320}>
            <Pie
              data={dailyData.revenueByCategory}
              dataKey="value"
              cx="50%"
              cy="50%"
              outerRadius={120}
            >
              {dailyData.revenueByCategory.map((_, i) => (
                <Cell key={i} fill={["#023E8A","#2d6a4f","#ffb703","#e63946","#6c757d"][i]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </section>

        {/* PROBLEMS */}
        <section className="dashboard-section">
          <h4>User Problems</h4>
          <table className="table table-striped">
            <thead>
              <tr>
                <th>Email</th>
                <th>Role</th>
                <th>Problem</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {dailyData.problems.map((problem) => (
                <tr key={problem.id}>
                  <td>{problem.email}</td>
                  <td>{problem.role}</td>
                  <td>{problem.issue}</td>
                  <td>{problem.status}</td>
                  <td>
                    <button
                      className="btn btn-sm btn-primary"
                      onClick={() => setSelectedProblem(problem)}
                      disabled={problem.status === "resolved"}
                    >
                      Respond
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* MODAL */}
        {selectedProblem && (
          <div className="modal-overlay">
            <div className="modal-box">
              <h4>Respond to {selectedProblem.email}</h4>
              <textarea
                rows="5"
                className="form-control mb-3"
                value={responseText}
                onChange={(e) => setResponseText(e.target.value)}
              />
              <div className="text-end">
                <button
                  className="btn btn-secondary mx-2"
                  onClick={() => setSelectedProblem(null)}
                >
                  Cancel
                </button>
                <button
                  className="btn btn-success"
                  onClick={handleSendResponse}
                >
                  Send
                </button>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
