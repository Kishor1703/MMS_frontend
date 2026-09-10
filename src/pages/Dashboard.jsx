import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { dashboardApi, notificationApi } from "../api/endpoints";
import { useAuth } from "../context/AuthContext";
import apiClient from "../api/client";
import { MACHINE_CATEGORIES, MACHINE_TYPE_OPTIONS, STATUS_META } from "../constants/machineCategories";

const profilePhotoUrl = (photo) => (photo ? new URL(photo, apiClient.defaults.baseURL).href : "");

const fmtMinutes = (mins) => {
  const value = Number(mins) || 0;
  const h = Math.floor(value / 60);
  const m = value % 60;
  return h ? `${h}h ${String(m).padStart(2, "0")}m` : `${m}m`;
};

const fmtAgo = (minutes) => {
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const h = Math.floor(minutes / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
};

const fmtDate = (date) => {
  if (!date) return "—";
  return new Date(date).toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const todayLabel = () =>
  new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long", year: "numeric" });

const breakPriority = (minutes) =>
  minutes >= 120 ? { label: "HIGH", cls: "high" } : minutes >= 60 ? { label: "MEDIUM", cls: "medium" } : { label: "LOW", cls: "low" };

function KpiCard({ label, value, sub, icon, tone }) {
  return (
    <div className={`kpi-card kpi-${tone || "default"}`}>
      <div className="kpi-icon">{icon}</div>
      <div className="kpi-body">
        <div className="kpi-label">{label}</div>
        <div className="kpi-value">{value}</div>
        {sub && <div className="kpi-sub">{sub}</div>}
      </div>
    </div>
  );
}

function SkeletonDashboard() {
  return (
    <div>
      <div className="dash-header-skeleton" />
      <div className="kpi-grid">
        {Array.from({ length: 6 }).map((_, i) => (
          <div className="skeleton-card" key={i} />
        ))}
      </div>
      <div className="skeleton-panel" />
    </div>
  );
}

export default function Dashboard() {
  const { user, isAdmin, isOwner, isGeneralManager } = useAuth();
  const [stats, setStats] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [error, setError] = useState("");
  const [days, setDays] = useState("today");
  const [category, setCategory] = useState("");

  const role = user?.role;
  const isEmployee = role === "employee";

  const load = useCallback(() => {
    dashboardApi
      .getStats()
      .then((res) => {
        setStats(res.data.data);
        setError("");
      })
      .catch((err) => setError(err.response?.data?.message || "Unable to load dashboard data."));
  }, []);

  useEffect(() => {
    load();
    notificationApi
      .list({ limit: 5 })
      .then((res) => setNotifications(res.data.data || []))
      .catch(() => {});
    const timer = setInterval(load, 60000);
    return () => clearInterval(timer);
  }, [load]);

  const categoryStats = useMemo(
    () => (stats && Array.isArray(stats.categoryStats) ? stats.categoryStats : []),
    [stats]
  );
  const selectedCategory = category
    ? categoryStats.find((c) => c.category === category)
    : null;

  // Scoped view: when a machine type is selected, numbers/tables reflect only
  // that category; otherwise the factory-wide totals are used.
  const view = useMemo(() => {
    if (selectedCategory) {
      return {
        totalMachines: selectedCategory.total,
        runningMachines: selectedCategory.running,
        stoppedMachines: selectedCategory.stopped,
        breakdownMachines: selectedCategory.breakdown,
        underMaintenanceMachines: selectedCategory.maintenance,
        idleMachines: selectedCategory.idle,
        efficiency: selectedCategory.efficiency,
      };
    }
    return stats
      ? {
          totalMachines: stats.totalLooms || stats.totalMachines,
          runningMachines: stats.runningMachines,
          stoppedMachines: stats.stoppedMachines,
          breakdownMachines: stats.breakdownMachines,
          underMaintenanceMachines: stats.underMaintenanceMachines,
          idleMachines: stats.idleMachines,
          efficiency: stats.efficiency,
        }
      : null;
  }, [selectedCategory, stats]);

  const liveLooms = useMemo(
    () => (stats?.liveLooms || []).filter((m) => !category || m.machineCategory === category),
    [stats, category]
  );
  const activeBreakdowns = useMemo(
    () => (stats?.activeBreakdowns || []).filter((m) => !category || m.machineCategory === category),
    [stats, category]
  );

  const statusCounts = useMemo(() => {
    if (!view) return {};
    return {
      Running: view.runningMachines,
      Stopped: view.stoppedMachines,
      "Under Maintenance": view.underMaintenanceMachines,
      Breakdown: view.breakdownMachines,
      Idle: view.idleMachines,
    };
  }, [view]);

  const donutStyle = useMemo(() => {
    const total = view?.totalMachines || 0;
    if (!total) return {};
    let acc = 0;
    const segs = Object.keys(STATUS_META)
      .map((key) => {
        const value = statusCounts[key] || 0;
        const start = acc;
        acc += (value / total) * 100;
        return { color: STATUS_META[key].color, start, end: acc };
      })
      .filter((s) => s.end > s.start)
      .map((s) => `${s.color} ${s.start}% ${s.end}%`);
    return { background: `conic-gradient(${segs.join(", ")})` };
  }, [statusCounts, view]);

  if (error && !stats) {
    return (
      <div className="error-banner dashboard-error">
        <span>{error}</span>
        <button type="button" className="btn-primary" onClick={load}>
          Retry
        </button>
      </div>
    );
  }

  if (!stats) return <SkeletonDashboard />;

  const total = view?.totalMachines || 0;
  const share = (value) => (total ? Math.round(((value || 0) / total) * 100) : 0);
  const machineLabel = (m) => m.machineName || `${m.machineCategory === "loom" ? "L" : "M"}-${m.machineNumber}`;
  // liveLooms / activeBreakdowns come from the memoized scoped arrays above
  const sectionStats = Array.isArray(stats.sectionStats) ? stats.sectionStats : [];
  const recentMaintenance = Array.isArray(stats.recentMaintenance) ? stats.recentMaintenance : [];
  const recentWorkReports = Array.isArray(stats.recentWorkReports) ? stats.recentWorkReports : [];
  const recentActivity = Array.isArray(stats.recentActivity) ? stats.recentActivity : [];
  const ms = stats.maintenanceStatus || {};
  const ws = stats.workStatus || {};
  const analytics = stats.downtimeAnalytics || [];
  const range = analytics.find((r) => r.days === (days === "today" ? 1 : days === "days7" ? 7 : 30)) || analytics[0];

  const maxAnalytic = Math.max(range?.breakdown || 0, range?.idle || 0, range?.maintenance || 0, 1);
  const maxSection = Math.max(...sectionStats.map((s) => s.total || 0), 1);
  const plannedShare = (value) => Math.round(((value || 0) / maxAnalytic) * 100);
  const sectionShare = (value) => Math.round(((value || 0) / maxSection) * 100);

  const barRow = (key, label, count, cls, pct) => (
    <div className="downtime-bar-row" key={key}>
      <span className="downtime-bar-label">{label}</span>
      <div className="downtime-bar-track">
        <div className={`downtime-bar-fill ${cls}`} style={{ width: `${Math.max(pct, count ? 4 : 0)}%` }} />
      </div>
      <span className="downtime-bar-count">{count}</span>
    </div>
  );

  const kpis = isAdmin
    ? [
        { label: "Total Equipment", value: view.totalMachines, sub: category ? "selected type" : "all types", icon: "🏭", tone: "default" },
        { label: "Running", value: view.runningMachines, sub: `${view.efficiency ?? 0}% efficiency`, icon: "▶", tone: "green" },
        { label: "Stopped", value: view.stoppedMachines, sub: `${share(view.stoppedMachines)}% of total`, icon: "⏸", tone: "blue" },
        { label: "Breakdown", value: view.breakdownMachines, sub: `${share(view.breakdownMachines)}% of total`, icon: "⚠", tone: "red" },
        { label: "Maintenance", value: view.underMaintenanceMachines, sub: `${share(view.underMaintenanceMachines)}% of total`, icon: "🛠", tone: "orange" },
        { label: "Idle", value: view.idleMachines, sub: `${share(view.idleMachines)}% of total`, icon: "⊙", tone: "gray" },
      ]
    : isOwner
      ? [
          { label: "Total Equipment", value: view.totalMachines, sub: category ? "selected type" : "all types", icon: "🏭", tone: "default" },
          { label: "Running", value: view.runningMachines, sub: `${view.efficiency ?? 0}% efficiency`, icon: "▶", tone: "green" },
          { label: "Stopped", value: view.stoppedMachines, sub: `${share(view.stoppedMachines)}% of total`, icon: "⏸", tone: "blue" },
          { label: "Breakdown", value: view.breakdownMachines, sub: `${share(view.breakdownMachines)}% of total`, icon: "⚠", tone: "red" },
          { label: "Maintenance", value: view.underMaintenanceMachines, sub: `${share(view.underMaintenanceMachines)}% of total`, icon: "🛠", tone: "orange" },
          { label: "Idle", value: view.idleMachines, sub: `${share(view.idleMachines)}% of total`, icon: "⊙", tone: "gray" },
        ]
      : isGeneralManager
        ? [
            { label: "Total Equipment", value: view.totalMachines, sub: category ? "selected type" : "all types", icon: "🏭", tone: "default" },
            { label: "Running", value: view.runningMachines, sub: `${view.efficiency ?? 0}% efficiency`, icon: "▶", tone: "green" },
            { label: "Stopped", value: view.stoppedMachines, sub: `${share(view.stoppedMachines)}% of total`, icon: "⏸", tone: "blue" },
            { label: "Breakdown", value: view.breakdownMachines, sub: `${share(view.breakdownMachines)}% of total`, icon: "⚠", tone: "red" },
            { label: "Maintenance", value: view.underMaintenanceMachines, sub: `${share(view.underMaintenanceMachines)}% of total`, icon: "🛠", tone: "orange" },
            { label: "Idle", value: view.idleMachines, sub: `${share(view.idleMachines)}% of total`, icon: "⊙", tone: "gray" },
          ]
        : [
            { label: "My Machines", value: view.totalMachines, icon: "🏭", tone: "default" },
            { label: "Running", value: view.runningMachines, icon: "▶", tone: "green" },
            { label: "Breakdown", value: view.breakdownMachines, icon: "⚠", tone: "red" },
            { label: "Downtime Today", value: stats.todayDowntimeEvents ?? 0, icon: "⏱", tone: "orange" },
            { label: "Maintenance Due", value: stats.maintenanceDue, icon: "🛠", tone: "blue" },
            { label: "Pending Work", value: ws.submitted ?? 0, icon: "📋", tone: "gray" },
          ];

  return (
    <div className="dashboard">
      <header className="dash-header">
        <div>
          <h1 className="dash-title">Loom Tracking &amp; Factory Monitoring</h1>
          <p className="dash-live">
            <span className="live-dot" /> Live overview · {todayLabel()}
          </p>
        </div>
        {isEmployee && user && (
          <div className="employee-profile-card dash-profile">
            {user?.profilePhoto && (
              <img className="employee-profile-photo" src={profilePhotoUrl(user.profilePhoto)} alt={`${user.name}'s profile`} />
            )}
            <div>
              <h2>{user.name}</h2>
              <p className="employee-role">Employee</p>
            </div>
          </div>
        )}
        {(isAdmin || isOwner) && (
          <div className="dash-header-stats">
            <div><strong>{stats.efficiency ?? 0}%</strong><span>Efficiency</span></div>
            <div><strong>{fmtMinutes(stats.totalDowntimeMinutes ?? 0)}</strong><span>Total Downtime</span></div>
            <div><strong>{stats.totalEmployees ?? 0}</strong><span>Employees</span></div>
          </div>
        )}
      </header>

      <div className="kpi-grid">
        {kpis.map((k) => (
          <KpiCard key={`${k.label}-${k.tone}`} {...k} />
        ))}
      </div>

      {!isEmployee && (
        <>
          <div className="seg-toggle dash-category-tabs">
            <button type="button" className={!category ? "active" : ""} onClick={() => setCategory("")}>
              ALL TYPES
            </button>
            {MACHINE_TYPE_OPTIONS.map((c) => (
              <button key={c.value} type="button" className={category === c.value ? "active" : ""} onClick={() => setCategory(c.value)}>
                {c.label.toUpperCase()}
              </button>
            ))}
          </div>

          <div className="category-card-grid">
            {MACHINE_TYPE_OPTIONS.map((c) => {
              const meta = MACHINE_CATEGORIES[c.value];
              const row = categoryStats.find((s) => s.category === c.value) || {};
              return (
                <Link className="category-card" to={`/${meta?.layoutRoute || c.route}`} key={c.value}>
                  <span className="category-card-name">{meta?.icon ? `${meta.icon} ${c.label}` : c.label}</span>
                  <span className="category-card-total">{row.total ?? 0}</span>
                  <span className="category-card-sub">
                    {row.running ?? 0} running · {row.breakdown ?? 0} breakdown
                  </span>
                </Link>
              );
            })}
          </div>
        </>
      )}

      <div className="dash-grid">
        {/* ── Machine status overview ─────────────────────────── */}
        <section className="dash-panel status-overview">
          <div className="dash-panel-head">
            <h2>Machine Status Overview</h2>
            <Link className="panel-link" to="/machines">View Machines</Link>
          </div>
          <div className="status-overview-body">
            <div className="donut-wrap">
              <div className="donut" style={donutStyle}>
                <div className="donut-hole">
                  <strong>{total}</strong>
                  <span>Machines</span>
                </div>
              </div>
            </div>
            <div className="status-legend">
              {Object.keys(STATUS_META).map((key) => (
                <Link key={key} className="status-legend-row" to={`/machines?status=${encodeURIComponent(key)}`}>
                  <span className={`dot ${STATUS_META[key].dot}`} />
                  <span className="status-legend-label">{STATUS_META[key].label}</span>
                  <span className="status-legend-count">{statusCounts[key] || 0}</span>
                  <span className={`status-legend-pct ${share(statusCounts[key]) === 0 ? "muted" : ""}`}>
                    {share(statusCounts[key])}%
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* ── Active breakdowns ────────────────────────────── */}
        <section className="dash-panel breakdown-panel">
          <div className="dash-panel-head">
            <h2>Active Breakdowns</h2>
            <span className={`panel-badge cancel ${activeBreakdowns.length ? "warn" : ""}`}>
              {activeBreakdowns.length} active
            </span>
          </div>
          {activeBreakdowns.length === 0 ? (
            <p className="dash-empty">No active breakdowns. All machines accounted for.</p>
          ) : (
            <ul className="breakdown-list">
              {activeBreakdowns.slice(0, 8).map((b) => {
                const p = breakPriority(b.breakdownMinutes);
                return (
                  <li key={b._id}>
                    <Link to={`/machines/${b._id}`} className="breakdown-main">
                      <span className="bd-id">L-{b.machineNumber}</span>
                      <span className="bd-section">{b.section || "Unassigned"}</span>
                      <span className={`priority ${p.cls}`}>{p.label}</span>
                      <span className={`bd-time ${b.breakdownMinutes >= 90 ? "long" : ""}`}>
                        {fmtMinutes(b.breakdownMinutes)}
                      </span>
                    </Link>
                    <p className="bd-meta">
                      {b.currentEmployee || b.assignedEngineer || "Unassigned"} · {fmtAgo(Math.round(b.breakdownMinutes))} stopped
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      {!isEmployee && (
        <div className="dash-grid dash-grid-third">
          {/* ── Maintenance status ─────────────────────────── */}
          <section className="dash-panel">
            <div className="dash-panel-head">
              <h2>Maintenance Status</h2>
              <Link className="panel-link" to="/maintenance">Open Maintenance</Link>
            </div>
            <div className="maint-cards">
              <Link className="maint-card overdue" to="/machines">
                <span className="maint-count">{ms.overdue ?? 0}</span>
                <span className="maint-label">Overdue</span>
              </Link>
              <Link className="maint-card due-today" to="/machines">
                <span className="maint-count">{ms.dueToday ?? 0}</span>
                <span className="maint-label">Due Today</span>
              </Link>
              <Link className="maint-card due-week" to="/machines">
                <span className="maint-count">{ms.dueThisWeek ?? 0}</span>
                <span className="maint-label">Due This Week</span>
              </Link>
              <Link className="maint-card upcoming" to="/machines">
                <span className="maint-count">{ms.upcoming ?? 0}</span>
                <span className="maint-label">Upcoming</span>
              </Link>
            </div>
            {(isAdmin || isOwner) && (
              <div className="maint-mini">
                <span>Oil Change Due: <strong>{stats.oilChangeDue ?? 0}</strong></span>
                <span>Compressor Due: <strong>{stats.compressorDue ?? 0}</strong></span>
                <span>Air Dryer Due: <strong>{stats.airDryerDue ?? 0}</strong></span>
              </div>
            )}
          </section>

          {/* ── Employee work status ───────────────────────── */}
          <section className="dash-panel">
            <div className="dash-panel-head">
              <h2>Employee Work Status</h2>
              {(isAdmin || isGeneralManager) && <Link className="panel-link" to="/employees">Employees</Link>}
            </div>
            <div className="maint-cards">
              <div className="maint-card pending"><span className="maint-count">{ws.submitted ?? 0}</span><span className="maint-label">Pending Review</span></div>
              <div className="maint-card completed"><span className="maint-count">{ws.approved ?? 0}</span><span className="maint-label">Completed</span></div>
              <div className="maint-card rejected"><span className="maint-count">{ws.rejected ?? 0}</span><span className="maint-label">Rejected</span></div>
              {(isAdmin || isOwner) && <div className="maint-card due-week"><span className="maint-count">{stats.totalEmployees ?? 0}</span><span className="maint-label">Employees</span></div>}
            </div>
          </section>

          {/* ── Downtime analytics ─────────────────────────── */}
          <section className="dash-panel">
            <div className="dash-panel-head">
              <h2>Downtime Analytics</h2>
              <div className="seg-toggle">
                {[["today", "Today"], ["days7", "7 Days"], ["days30", "30 Days"]].map(([key, label]) => (
                  <button key={key} type="button" className={days === key ? "active" : ""} onClick={() => setDays(key)}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
            {!range || range.total === 0 ? (
              <p className="dash-empty">No downtime events in this period.</p>
            ) : (
              <div className="downtime-bars">
                <div className="downtime-total"><span>Events</span><strong>{range.total}</strong></div>
                {barRow("breakdown", "Breakdown", range.breakdown, "breakdown", plannedShare(range.breakdown))}
                {barRow("idle", "Idle / Stopped", range.idle, "idle", plannedShare(range.idle))}
                {barRow("maint", "Maintenance", range.maintenance, "maint", plannedShare(range.maintenance))}
              </div>
            )}
          </section>
        </div>
      )}

      {/* ── Section performance ───────────────────────────── */}
      {!isEmployee && sectionStats.length > 0 && (
        <section className="dash-panel">
          <div className="dash-panel-head">
            <h2>Section Performance</h2>
            <Link className="panel-link" to="/machines">Open Machines</Link>
          </div>
          <div className="section-bars">
            {sectionStats.map((s) => (
              <Link className="section-bar-row clickable" key={s._id} to={`/machines?section=${encodeURIComponent(s._id)}`}>
                <span className="section-bar-label">{s._id}</span>
                <div className="section-sub">
                  <span className="section-bar-track">
                    <span className="section-bar-fill" style={{ width: `${Math.max(sectionShare(s.total), 4)}%` }} />
                  </span>
                </div>
                <span className="section-bar-count">{s.total}</span>
                <span className="section-efficiency">✦ {s.efficiency ?? 0}%</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {!isEmployee && (
        <div className="dash-panel">
          {/* ── Live machine monitoring ─────────────────────── */}
          <div className="dash-panel-head">
            <h2>Live Machine Monitoring</h2>
            <Link className="panel-link" to="/machines">All Machines</Link>
          </div>
          <div className="table-scroll">
            <table className="dash-table live-table">
              <thead>
                <tr>
                  <th>Machine</th>
                  <th>Section</th>
                  <th>Status</th>
                  <th>Running Time</th>
                  <th>Downtime</th>
                  <th>Current Employee</th>
                  <th>Last Updated</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {liveLooms.slice(0, 12).map((m) => (
                  <tr key={m._id}>
                    <td className="nowrap">
                      <Link className="table-link strong" to={`/machines/${m._id}`}>{machineLabel(m)}</Link>
                    </td>
                    <td>{m.section || m.shed || "—"}</td>
                    <td><span className={`status-badge ${STATUS_META[m.status]?.dot || "gray"}`}>{m.status}</span></td>
                    <td>{fmtMinutes(m.runningHours)}</td>
                    <td>{fmtMinutes(m.totalDowntime)}</td>
                    <td>{m.currentEmployee || m.assignedEngineer || "—"}</td>
                    <td className="muted">{fmtAgo(m.lastUpdatedAgo)}</td>
                    <td><Link className="btn-secondary-sm" to={`/machines/${m._id}`}>View</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {liveLooms.length === 0 && <p className="dash-empty">No machines found.</p>}
          </div>
        </div>
      )}

      {/* Employee live looms (their scope) */}
      {isEmployee && (
        <>
          {activeBreakdowns.length > 0 && (
            <section className="dash-panel">
              <div className="dash-panel-head"><h2>My Machine Breakdowns</h2></div>
              <p className="dash-empty warn-text">{activeBreakdowns.length} assigned machine(s) currently in breakdown.</p>
            </section>
          )}
          <section className="dash-panel">
            <div className="dash-panel-head">
              <h2>My Assigned Machines</h2>
              <Link className="panel-link" to="/machines">View All</Link>
            </div>
            <div className="table-scroll">
              <table className="dash-table live-table">
                <thead>
                  <tr>
                    <th>Machine</th>
                    <th>Section</th>
                    <th>Status</th>
                    <th>Running Time</th>
                    <th>Downtime</th>
                    <th>Last Updated</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {liveLooms.map((m) => (
                    <tr key={m._id}>
                      <td className="nowrap"><Link className="table-link strong" to={`/machines/${m._id}`}>{machineLabel(m)}</Link></td>
                      <td>{m.section || "—"}</td>
                      <td><span className={`status-badge ${STATUS_META[m.status]?.dot || "gray"}`}>{m.status}</span></td>
                      <td>{fmtMinutes(m.runningHours)}</td>
                      <td>{fmtMinutes(m.totalDowntime)}</td>
                      <td className="muted">{fmtAgo(m.lastUpdatedAgo)}</td>
                      <td><Link className="btn-secondary-sm" to={`/machines/${m._id}`}>View</Link></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {liveLooms.length === 0 && <p className="dash-empty">No machines assigned to you.</p>}
            </div>
          </section>
        </>
      )}

      {/* ── Activity + notifications ──────────────────────── */}
      <div className="dash-grid dash-grid-activity">
        {(recentMaintenance.length > 0 || recentWorkReports.length > 0) && (
          <section className="dash-panel">
            <div className="dash-panel-head"><h2>Recent Activity</h2></div>
            <ul className="activity-list">
              {recentMaintenance.map((m) => (
                <li key={m._id}>
                  <span className="activity-module maint">MAINT</span>
                  <div>
                    <strong>{m.machine?.machineName || "Loom"}</strong> — {m.maintenanceType || "Maintenance"}
                    <span className="muted">{fmtDate(m.maintenanceDate)}</span>
                  </div>
                </li>
              ))}
              {recentWorkReports.map((r) => (
                <li key={r._id}>
                  <span className="activity-module work">WORK</span>
                  <div>
                    <strong>{r.performedBy?.name || "Employee"}</strong> reported {r.machine?.machineNumber ? `L-${r.machine.machineNumber}` : "loom"} — "{String(r.whyStopped || "").slice(0, 60)}"
                    <span className="muted">{fmtDate(r.createdAt)}</span>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        {recentActivity.length > 0 && (isAdmin || isOwner) && (
          <section className="dash-panel">
            <div className="dash-panel-head"><h2>System Activity</h2></div>
            <ul className="activity-list">
              {recentActivity.map((log) => (
                <li key={log._id}>
                  <span className="activity-module sys">SYS</span>
                  <div>
                    <strong>{log.user?.name || "System"}</strong> — {log.action?.replace(/_/g, " ").toLowerCase()}
                    <span className="muted">{fmtDate(log.createdAt)}</span>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        {notifications.length > 0 && (
          <section className="dash-panel">
            <div className="dash-panel-head">
              <h2>Notifications</h2>
              <Link className="panel-link" to="/notifications">All</Link>
            </div>
            <ul className="activity-list">
              {notifications.map((n) => (
                <li key={n._id}>
                  <Link className="notification-line" to={n.machine ? `/machines/${n.machine}` : "/notifications"}>
                    <div>
                      <strong>{n.title}</strong>
                      <p>{n.message}</p>
                    </div>
                    <span className="muted">{fmtDate(n.createdAt)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}