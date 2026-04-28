import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import "../admin.css"
import icon from "../../../assets/Person at the Center of Circles.png";

/* ================= MOCK CHATS ================= */

const initialChats = [

{
id:1,
business:"BMW Motors",
customer:"Ahmed Tamer",
product:"BMW X5 2022",
status:"in_progress",
messages:[
{sender:"customer",text:"Is the car still available?"},
{sender:"business",text:"Yes it is available."},
{sender:"customer",text:"Can we negotiate the price?"},
{sender:"business",text:"Sure, what is your offer?"}
]
},

{
id:2,
business:"Apple Store",
customer:"John Smith",
product:"MacBook Pro M3",
status:"in_progress",
messages:[
{sender:"customer",text:"What is the battery health?"},
{sender:"business",text:"100% brand new."}
]
},

{
id:3,
business:"Tesla Motors",
customer:"Omar Ali",
product:"Tesla Model Y",
status:"in_progress",
messages:[
{sender:"customer",text:"Is autopilot included?"},
{sender:"business",text:"Yes it is included."}
]
},

{
id:4,
business:"Samsung Store",
customer:"Adam Hassan",
product:"Samsung S24 Ultra",
status:"in_progress",
messages:[
{sender:"customer",text:"Is this new or used?"},
{sender:"business",text:"Brand new sealed."}
]
},

{
id:5,
business:"Rolex Store",
customer:"Khaled Tarek",
product:"Rolex Submariner",
status:"in_progress",
messages:[
{sender:"customer",text:"Is the warranty valid?"},
{sender:"business",text:"Yes 5 years warranty."}
]
},

{
id:6,
business:"Luxury Jewelry",
customer:"Sara Ali",
product:"Diamond Necklace",
status:"done",
messages:[
{sender:"customer",text:"I accept the price."},
{sender:"business",text:"Deal confirmed."}
]
},

{
id:7,
business:"Audi Motors",
customer:"Mona Adel",
product:"Audi A6",
status:"done",
messages:[
{sender:"customer",text:"Let's finalize the deal."},
{sender:"business",text:"Confirmed."}
]
},

{
id:8,
business:"Nike Store",
customer:"Ali Mostafa",
product:"Nike Air Jordan",
status:"done",
messages:[
{sender:"customer",text:"I'll take them."},
{sender:"business",text:"Order confirmed."}
]
},

{
id:9,
business:"Sony Store",
customer:"Hassan Omar",
product:"PlayStation 5",
status:"done",
messages:[
{sender:"customer",text:"Price accepted."},
{sender:"business",text:"Deal completed."}
]
},

{
id:10,
business:"Cartier",
customer:"Nada Samy",
product:"Gold Bracelet",
status:"done",
messages:[
{sender:"customer",text:"Okay I agree."},
{sender:"business",text:"Confirmed."}
]
}

];

export default function AdminTrackChats(){

const navigate = useNavigate();
const location = useLocation();

const [sidebarShrinked,setSidebarShrinked] = useState(false);
const toggleSidebar = ()=>setSidebarShrinked(prev=>!prev);
const isActive = (path)=>(location.pathname===path?"active":"");

 /* ================= YEAR ================= */

  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);

  const years = [];
  for (let y = 2025; y <= currentYear; y++) years.push(y);

  useEffect(() => {
    document.title = `Admin Chats ${selectedYear}`;
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

/* STATE */

const [chats,setChats] = useState(initialChats);
const [selectedChat,setSelectedChat] = useState(null);

const [confirmBox,setConfirmBox] = useState(false);
const [chatToDelete,setChatToDelete] = useState(null);

/* FILTER */

const inProgress = chats.filter(c=>c.status==="in_progress");
const done = chats.filter(c=>c.status==="done");

/* DELETE */

const openDeleteConfirm=(chat)=>{
setChatToDelete(chat);
setConfirmBox(true);
};

const closeConfirm=()=>{
setConfirmBox(false);
setChatToDelete(null);
};

const confirmDelete=()=>{
setChats(prev=>prev.filter(c=>c.id!==chatToDelete.id));
closeConfirm();
};

/* LOGOUT */

function handleLogout(){
localStorage.removeItem("userToken");
navigate("/login");
}

/* CARD */

function Card({title,value,icon}){

return(
<div className="dashboard-card">
<i className={`fa fa-${icon}`}></i>
<div>
<p>{title}</p>
<h3>{value}</h3>
</div>
</div>
);
}

/* AVATAR */

const avatar="https://i.pravatar.cc/40";

/* JSX */

return(

<div className="admin-layout">

<header className="admin-navbar">

<div className="left">

<button className="toggle-btn" onClick={toggleSidebar}>
<i className="fa fa-bars"></i>
</button>

<div className="brand">
<i className="fa fa-comments"></i>
<span>Safqa Admin</span>
</div>

</div>

<button onClick={handleLogout} className="logout-btn">
<i className="fa fa-sign-out"></i> Logout
</button>

</header>

{/* SIDEBAR */}

<aside className={`admin-sidebar ${sidebarShrinked?"shrinked":""}`}>
<ul>

<li>
<Link className={isActive("/admin")} to="/admin">
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

<li>
<Link to="/admin_delivery">
<i className="fa fa-truck"></i>
<span>Admin Delivery</span>
</Link>
</li>

<li>
<Link className={isActive("/admin_track_chats")} to="/admin_track_chats">
<i style={{color:"#023E8A"}} className="fa fa-comments"></i>
<span style={{color:"#023E8A"}}>Track Chats</span>
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

<main className={`admin-content ${sidebarShrinked?"active":""}`}>

<h2 className="page-title">Negotiations Monitoring</h2>

<div className="grid">
<Card title="Total Chats" value={chats.length} icon="comments"/>
<Card title="In Progress" value={inProgress.length} icon="clock"/>
<Card title="Done" value={done.length} icon="check"/>
</div>

<h3 className="delivery-title">In Progress</h3>

<div className="delivery-grid">

{inProgress.map(chat=>(

<div key={chat.id} className="delivery-card">

<h4>{chat.product}</h4>

<p><b>Business:</b> {chat.business}</p>
<p><b>Customer:</b> {chat.customer}</p>

<div className="delivery-actions">

<button className="btn start" onClick={()=>setSelectedChat(chat)}>
Open Chat
</button>

<button className="btn delete" onClick={()=>openDeleteConfirm(chat)}>
Delete
</button>

</div>

</div>

))}

</div>

<h3 className="delivery-title">Done</h3>

<div className="delivery-grid">

{done.map(chat=>(

<div key={chat.id} className="delivery-card">

<h4>{chat.product}</h4>

<p><b>Business:</b> {chat.business}</p>
<p><b>Customer:</b> {chat.customer}</p>

<div className="delivery-actions">

<button className="btn start" onClick={()=>setSelectedChat(chat)}>
View Chat
</button>

<button className="btn delete" onClick={()=>openDeleteConfirm(chat)}>
Delete
</button>

</div>

</div>

))}

</div>

</main>

{/* CHAT WINDOW */}

{selectedChat &&(

<div style={{
position:"fixed",
top:0,
left:0,
width:"100%",
height:"100%",
background:"rgba(0,0,0,0.7)",
display:"flex",
justifyContent:"center",
alignItems:"center",
zIndex:9999
}}>

<div style={{
background:"white",
width:"420px",
padding:"20px",
borderRadius:"10px"
}}>

<h3>{selectedChat.product}</h3>

<div style={{maxHeight:"300px",overflowY:"auto",marginTop:"15px"}}>

{selectedChat.messages.map((m,i)=>{

const isBusiness = m.sender==="business";

return(

<div
key={i}
style={{
display:"flex",
alignItems:"center",
justifyContent:isBusiness?"flex-end":"flex-start",
marginBottom:"12px"
}}
>

{!isBusiness && (
<img
src={avatar}
alt="avatar"
style={{
width:"32px",
height:"32px",
borderRadius:"50%",
marginRight:"8px"
}}
/>
)}

<div style={{
background:isBusiness?"#0077b6":"#eee",
color:isBusiness?"white":"black",
padding:"10px",
borderRadius:"8px",
maxWidth:"70%"
}}>
{m.text}
</div>

{isBusiness && (
<img
src={avatar}
alt="avatar"
style={{
width:"32px",
height:"32px",
borderRadius:"50%",
marginLeft:"8px"
}}
/>
)}

</div>

);

})}

</div>

<button
className="btn cancel"
style={{marginTop:"15px"}}
onClick={()=>setSelectedChat(null)}
>
Close
</button>

</div>

</div>

)}

{/* DELETE CONFIRM */}

{confirmBox &&(

<div className="confirm-overlay">

<div className="confirm-modal">

<h3>Delete Chat</h3>

<p>
Delete chat between
<strong> {chatToDelete?.business}</strong> and
<strong> {chatToDelete?.customer}</strong>?
</p>

<div className="confirm-actions">

<button className="btn cancel" onClick={closeConfirm}>
Cancel
</button>

<button className="btn danger" onClick={confirmDelete}>
Delete
</button>

</div>

</div>

</div>

)}

</div>

);

}