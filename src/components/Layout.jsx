import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useNotifications } from "../contexts/NotificationContext";
import NotificationPanel from "./NotificationPanel";

const NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard", icon: "⬛", roles: ["admin", "encoder", "viewer"] },
  { id: "new-transaction", label: "New Transaction", icon: "➕", roles: ["admin", "encoder"] },
  { id: "transactions", label: "Transactions", icon: "📋", roles: ["admin", "encoder", "viewer"] },
  { id: "daily-summary", label: "Daily Summary", icon: "📊", roles: ["admin", "encoder"] },
  { id: "audit-log", label: "Audit Log", icon: "📜", roles: ["admin"] },
  { id: "users", label: "Users", icon: "👥", roles: ["admin"] },
  { id: "allocations", label: "Allocations", icon: "🗂️", roles: ["admin"] },
  { id: "categories", label: "Categories", icon: "🏷️", roles: ["admin"] },
  { id: "people", label: "People", icon: "👤", roles: ["admin"] },
  { id: "settings", label: "Settings", icon: "⚙️", roles: ["admin"] },
];

export default function Layout({ children, currentPage, navigate }) {
  const { profile, signOut } = useAuth();
  const { unreadCount } = useNotifications();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  const visibleNav = NAV_ITEMS.filter(item => item.roles.includes(profile?.role));

  const roleBadge = {
    admin: { label: "Admin", color: "#ef4444" },
    encoder: { label: "Encoder", color: "#f59e0b" },
    viewer: { label: "Viewer", color: "#6b7280" },
  }[profile?.role] || { label: "User", color: "#6b7280" };

  return (
    <div className="layout">
      {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}

      <aside className={`sidebar ${sidebarOpen ? "sidebar-open" : ""}`}>
        <div className="sidebar-header">
          <div className="logo">
            <span className="logo-icon">₱</span>
            <div>
              <div className="logo-title">CashFlow</div>
              <div className="logo-sub">Management System</div>
            </div>
          </div>
        </div>

        <div className="sidebar-user">
          <div className="user-avatar">{profile?.full_name?.[0]?.toUpperCase() || "U"}</div>
          <div className="user-info">
            <div className="user-name">{profile?.full_name}</div>
            <span className="role-badge" style={{ background: roleBadge.color }}>{roleBadge.label}</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          {visibleNav.map(item => (
            <button
              key={item.id}
              className={`nav-item ${currentPage === item.id ? "nav-item-active" : ""}`}
              onClick={() => { navigate(item.id); setSidebarOpen(false); }}
            >
              <span className="nav-icon">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <button className="signout-btn" onClick={signOut}>
          <span>🚪</span> Sign Out
        </button>
      </aside>

      <div className="main-content">
        <header className="topbar">
          <button className="menu-btn" onClick={() => setSidebarOpen(true)}>☰</button>
          <h1 className="page-title">
            {NAV_ITEMS.find(n => n.id === currentPage)?.label || "Dashboard"}
          </h1>
          <div className="topbar-actions">
            <button className="notif-btn" onClick={() => setNotifOpen(true)}>
              🔔
              {unreadCount > 0 && <span className="notif-badge">{unreadCount > 9 ? "9+" : unreadCount}</span>}
            </button>
          </div>
        </header>

        <main className="page-content">
          {children}
        </main>
      </div>

      {notifOpen && <NotificationPanel onClose={() => setNotifOpen(false)} />}
    </div>
  );
}
