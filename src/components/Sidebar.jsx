import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const categoryLinks = [
  { to: "/machines", label: "All Machines", end: false },
  { to: "/looms", label: "Looms" },
  { to: "/compressors", label: "Compressors" },
  { to: "/air-dryers", label: "Air Dryers" },
];

const adminAccountLinks = [
  { to: "/owners", label: "Company Owners" },
];

const ownerAccountLinks = [
  { to: "/general-managers", label: "General Managers" },
];

export default function Sidebar() {
  const { hasRole } = useAuth();
  const isAdmin = hasRole("admin");
  const isOwner = hasRole("owner");
  const accountLinks = isAdmin ? adminAccountLinks : isOwner ? ownerAccountLinks : [];

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <svg
          className="sidebar-logo-mark"
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
          <path
            d="M4.5 8.5c3 1.4 12 1.4 15 0M4.5 15.5c3-1.4 12-1.4 15 0"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
          <circle cx="12" cy="12" r="2" fill="currentColor" />
        </svg>
        LoomTrack
      </div>
      <nav>
        <NavLink
          to="/dashboard"
          end
          className={({ isActive }) => `sidebar-link${isActive ? " active" : ""}`}
        >
          Dashboard
        </NavLink>

        <div className="sidebar-group-label">Machine Monitoring</div>
        {categoryLinks.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.end}
            className={({ isActive }) => `sidebar-link sidebar-link-sub${isActive ? " active" : ""}`}
          >
            {link.label}
          </NavLink>
        ))}

        <NavLink
          to="/breakdowns"
          className={({ isActive }) => `sidebar-link${isActive ? " active" : ""}`}
        >
          Breakdown
        </NavLink>
        <NavLink
          to="/maintenance"
          className={({ isActive }) => `sidebar-link${isActive ? " active" : ""}`}
        >
          Maintenance
        </NavLink>
        {hasRole("admin", "general_manager") && (
          <NavLink
            to="/employees"
            className={({ isActive }) => `sidebar-link${isActive ? " active" : ""}`}
          >
            Employees
          </NavLink>
        )}
        <NavLink
          to="/reports"
          className={({ isActive }) => `sidebar-link${isActive ? " active" : ""}`}
        >
          Reports
        </NavLink>
        <NavLink
          to="/notifications"
          className={({ isActive }) => `sidebar-link${isActive ? " active" : ""}`}
        >
          Notifications
        </NavLink>
        {accountLinks.length > 0 && (
          <>
            <div className="sidebar-group-label">Settings</div>
            {accountLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) => `sidebar-link sidebar-link-sub${isActive ? " active" : ""}`}
              >
                {link.label}
              </NavLink>
            ))}
          </>
        )}
      </nav>
    </aside>
  );
}