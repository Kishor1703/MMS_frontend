import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { notificationApi } from "../api/endpoints";

export default function Navbar() {
  const { user, logout } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    notificationApi
      .list({ unreadOnly: "true", limit: 1 })
      .then((res) => setUnreadCount(res.data.pagination?.total || 0))
      .catch(() => {});
  }, []);

  return (
    <header className="navbar">
      <div className="navbar-title">Machine Maintenance Management System</div>
      <div className="navbar-right">
        <div className="notification-bell">
          🔔 {unreadCount > 0 && <span className="badge">{unreadCount}</span>}
        </div>
        <div className="profile-menu">
          <span>{user?.name}</span>
          <span className="role-tag">{user?.role}</span>
          <button onClick={logout}>Logout</button>
        </div>
      </div>
    </header>
  );
}
