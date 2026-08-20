import { useEffect, useState } from "react";
import { dashboardApi } from "../api/endpoints";
import { useAuth } from "../context/AuthContext";
import apiClient from "../api/client";

const profilePhotoUrl = (photo) => (photo ? new URL(photo, apiClient.defaults.baseURL).href : "");

export default function Dashboard() {
  const { user, isAdmin, isOwner } = useAuth();
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    dashboardApi
      .getStats()
      .then((res) => setStats(res.data.data))
      .catch((err) => setError(err.response?.data?.message || "Failed to load dashboard"));
  }, []);

  if (error) return <div className="error-banner">{error}</div>;
  if (!stats) return <div>Loading dashboard...</div>;

  const cards = isAdmin
    ? [
        { label: "Company Owners", value: stats.totalOwners },
        { label: "Total Machines", value: stats.totalMachines },
        { label: "Running", value: stats.runningMachines },
        { label: "Under Maintenance", value: stats.underMaintenanceMachines },
        { label: "Breakdown", value: stats.breakdownMachines },
        { label: "Idle", value: stats.idleMachines },
      ]
    : isOwner
    ? [
        { label: "Total Machines", value: stats.totalMachines },
        { label: "Running", value: stats.runningMachines },
        { label: "Under Maintenance", value: stats.underMaintenanceMachines },
        { label: "Breakdown", value: stats.breakdownMachines },
        { label: "Idle", value: stats.idleMachines },
        { label: "Employees", value: stats.totalEmployees },
        { label: "Maintenance Due", value: stats.maintenanceDue },
        { label: "Oil Change Due", value: stats.oilChangeDue },
      ]
    : [
        { label: "Maintenance Due", value: stats.maintenanceDue },
        { label: "Oil Change Due", value: stats.oilChangeDue },
      ];

  const isEmployee = user?.role === "employee";

  return (
    <div>
      <h1>Welcome, {user?.name}</h1>
      {isEmployee && (
        <section className="employee-profile-card">
          {user?.profilePhoto && (
            <img className="employee-profile-photo" src={profilePhotoUrl(user.profilePhoto)} alt={`${user.name}'s profile`} />
          )}
          <div>
            <h2>{user.name}</h2>
            <p className="employee-role">Employee</p>
          </div>
        </section>
      )}
      <div className="stat-grid">
        {cards.map((card) => (
          <div className="stat-card" key={card.label}>
            <div className="stat-value">{card.value}</div>
            <div className="stat-label">{card.label}</div>
          </div>
        ))}
      </div>

      {!isAdmin && isOwner && stats.recentActivity?.length > 0 && (
        <div className="activity-panel">
          <h2>Recent Activity</h2>
          <ul>
            {stats.recentActivity.map((log) => (
              <li key={log._id}>
                <strong>{log.user?.name || "System"}</strong> — {log.action} —{" "}
                {new Date(log.createdAt).toLocaleString()}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
