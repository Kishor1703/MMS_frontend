import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const ownerLinks = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/machines", label: "Machines" },
  { to: "/compressors", label: "Compressors" },
  { to: "/air-dryers", label: "Air Dryers" },
  { to: "/general-managers", label: "General Managers" },
  { to: "/reports", label: "Reports" },
  { to: "/leaves", label: "Leaves" },
  { to: "/notifications", label: "Notifications" },
];

const adminLinks = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/machines", label: "Machines" },
  { to: "/compressors", label: "Compressors" },
  { to: "/air-dryers", label: "Air Dryers" },
  { to: "/owners", label: "Company Owners" },
  { to: "/reports", label: "Reports" },
  { to: "/notifications", label: "Notifications" },
];

const generalManagerLinks = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/machines", label: "Machines" },
  { to: "/compressors", label: "Compressors" },
  { to: "/air-dryers", label: "Air Dryers" },
  { to: "/employees", label: "Employees" },
  { to: "/notifications", label: "Notifications" },
  { to: "/reports", label: "Reports" },
  { to: "/leaves", label: "Leaves" },
];

const employeeLinks = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/machines", label: "My Machines" },
  { to: "/compressors", label: "My Compressors" },
  { to: "/air-dryers", label: "My Air Dryers" },
  { to: "/notifications", label: "Notifications" },
  { to: "/reports", label: "Reports" },
  { to: "/leaves", label: "Leaves" },
];

export default function Sidebar() {
  const { hasRole } = useAuth();
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
