import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const managementLinks = [
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
  const links = hasRole("admin", "owner")
    ? managementLinks
    : user?.role === "general_manager"
      ? managementLinks
      : employeeLinks;

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">MMS</div>
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
