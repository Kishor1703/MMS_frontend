import { useEffect, useState } from "react";
import { dashboardApi } from "../api/endpoints";
import { useAuth } from "../context/AuthContext";

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
    ? [{ label: "Company Owners", value: stats.totalOwners }]
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

  return (
    <div>
      <h1>Welcome, {user?.name}</h1>
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
