import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const ownerLinks = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/machines", label: "Machines" },
  { to: "/general-managers", label: "General Managers" },
  { to: "/notifications", label: "Notifications" },
  { to: "/reports", label: "Reports" },
];

const adminLinks = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/machines", label: "Machines" },
  { to: "/owners", label: "Company Owners" },
  { to: "/notifications", label: "Notifications" },
];

const generalManagerLinks = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/machines", label: "Machines" },
  { to: "/employees", label: "Employees" },
  { to: "/notifications", label: "Notifications" },
  { to: "/reports", label: "Reports" },
];

const employeeLinks = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/machines", label: "My Machines" },
  { to: "/notifications", label: "Notifications" },
];

export default function Sidebar() {
  const { user, hasRole } = useAuth();
  const links = hasRole("admin")
    ? adminLinks
    : hasRole("owner")
      ? ownerLinks
      : hasRole("general_manager")
        ? generalManagerLinks
        : employeeLinks;

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
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) => `sidebar-link${isActive ? " active" : ""}`}
          >
            {link.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
