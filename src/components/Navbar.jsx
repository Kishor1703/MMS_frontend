import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { notificationApi } from "../api/endpoints";
import apiClient from "../api/client";

const profilePhotoUrl = (photo) => (photo ? new URL(photo, apiClient.defaults.baseURL).href : "");

const ROLE_LABEL = {
  admin: "ADMIN",
  owner: "OWNER",
  general_manager: "MANAGER",
  employee: "EMPLOYEE",
};

const todayLabel = () =>
  new Date().toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });

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
      <div className="navbar-brand">
        <strong>MMS</strong>
        <span className="navbar-brand-sub">Loom Monitoring System</span>
      </div>
      <div className="navbar-right">
        <span className="navbar-date">{todayLabel()}</span>
        <Link to="/notifications" className="notification-bell" aria-label="Notifications">
          🔔 {unreadCount > 0 && <span className="badge">{unreadCount}</span>}
        </Link>
        <div className="profile-menu">
          {user?.profilePhoto && (
            <img className="profile-photo" src={profilePhotoUrl(user.profilePhoto)} alt={`${user.name}'s profile`} />
          )}
          <Link className="profile-link" to="/profile">{user?.name}</Link>
          <span className="role-tag">{ROLE_LABEL[user?.role] || user?.role}</span>
          <button onClick={logout}>Logout</button>
        </div>
      </div>
    </header>
  );
}