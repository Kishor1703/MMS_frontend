import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { machineApi, maintenanceApi } from "../api/endpoints";
import { CATEGORY_OPTIONS, STATUS_META } from "../constants/machineCategories";

const fmtDate = (d) => (d ? new Date(d).toLocaleString() : "—");
const fmtMinutes = (mins) => {
  const value = Number(mins) || 0;
  const h = Math.floor(value / 60);
  return h ? `${h}h ${String(value % 60).padStart(2, "0")}m` : `${value}m`;
};
const priority = (mins) =>
  mins >= 120 ? "HIGH" : mins >= 60 ? "MEDIUM" : "LOW";
const priorityClass = (mins) =>
  mins >= 120 ? "high" : mins >= 60 ? "medium" : "low";

const CATEGORY_LABEL = Object.fromEntries(CATEGORY_OPTIONS.map((o) => [o.value, o.label]));

export default function Breakdowns() {
  const [category, setCategory] = useState("");
  const [section, setSection] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [active, setActive] = useState([]);
  const [history, setHistory] = useState([]);
  const [now, setNow] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      machineApi.list({ category, section, status: "Breakdown", limit: 100 }),
      maintenanceApi.list({ category, type: "Breakdown", from: from || undefined, to: to || undefined, limit: 100 }),
    ])
      .then(([machinesRes, maintRes]) => {
        if (cancelled) return;
        setActive(machinesRes.data.data);
        setHistory(maintRes.data.data);
        setNow(Date.now());
        setError("");
      })
      .catch((err) => cancelled || setError(err.response?.data?.message || "Failed to load breakdowns"))
      .finally(() => cancelled || setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [category, section, from, to]);

  const resetFilters = () => {
    setCategory("");
    setSection("");
    setFrom("");
    setTo("");
  };
  if (loading) return <div className="skeleton-panel" />;

  return (
    <div className="mon-page">
      <div className="page-header">
        <div>
          <h1>Breakdown Monitoring</h1>
          <p className="muted">Active breakdowns and breakdown history for all machine types</p>
        </div>
      </div>

      <div className="filter-bar">
        <select value={category} onChange={(e) => setCategory(e.target.value)}>
          {CATEGORY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <input placeholder="Section filter..." value={section} onChange={(e) => setSection(e.target.value)} />
        <input type="date" aria-label="From date" value={from} onChange={(e) => setFrom(e.target.value)} />
        <input type="date" aria-label="To date" value={to} onChange={(e) => setTo(e.target.value)} />
        {(category || section || from || to) && (
          <button type="button" className="company-filter" onClick={resetFilters}>Clear Filters</button>
        )}
      </div>

      {error && <div className="error-banner">{error}</div>}
      {!loading && (
        <>
          <section className="card-panel">
            <div className="dash-panel-head">
              <h2>Active Breakdowns</h2>
              <span className={`panel-badge warn`}>{active.length} active</span>
            </div>
            {active.length === 0 ? (
              <p className="dash-empty">No active breakdowns.</p>
            ) : (
              <div className="table-scroll">
                <table className="dash-table">
                  <thead>
                    <tr>
                      <th>Machine</th>
                      <th>Type</th>
                      <th>Section</th>
                      <th>Status</th>
                      <th>Stopped At</th>
                      <th>Duration</th>
                      <th>Priority</th>
                      <th>Assigned</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {active.map((m) => {
                      const mins = Math.max(0, Math.round((now - new Date(m.updatedAt).getTime()) / 60000));
                      return (
                        <tr key={m._id}>
                          <td className="nowrap"><Link className="table-link strong" to={`/machines/${m._id}`}>{m.machineName || `L-${m.machineNumber}`}</Link></td>
                          <td>{CATEGORY_LABEL[m.machineCategory] || "LOOMS"}</td>
                          <td>{m.section || "—"}</td>
                          <td><span className={`status-badge ${STATUS_META[m.status]?.dot || "gray"}`}>{m.status}</span></td>
                          <td className="muted">{fmtDate(m.updatedAt)}</td>
                          <td className={mins >= 90 ? "bd-time long" : "bd-time"}>{fmtMinutes(mins)}</td>
                          <td><span className={`priority ${priorityClass(mins)}`}>{priority(mins)}</span></td>
                          <td>{m.assignedEmployees?.map((e) => e.name).join(", ") || m.assignedEngineer || "—"}</td>
                          <td className="nowrap"><Link className="btn-secondary-sm" to={`/machines/${m._id}`}>View</Link></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="card-panel">
            <div className="dash-panel-head">
              <h2>Breakdown History</h2>
              <span className="muted">{history.length} records</span>
            </div>
            {history.length === 0 ? (
              <p className="dash-empty">No breakdown history found.</p>
            ) : (
              <div className="table-scroll">
                <table className="dash-table">
                  <thead>
                    <tr>
                      <th>Machine</th>
                      <th>Type</th>
                      <th>Recorded</th>
                      <th>Problem / Description</th>
                      <th>Employee</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((r) => (
                      <tr key={r._id}>
                        <td className="nowrap">
                          {r.machine ? (
                            <Link className="table-link strong" to={`/machines/${r.machine._id}`}>
                              {r.machine.machineName || r.machine.machineNumber}
                            </Link>
                          ) : "—"}
                        </td>
                        <td>{r.machine?.machineCategory ? CATEGORY_LABEL[r.machine.machineCategory] : "—"}</td>
                        <td className="muted">{fmtDate(r.maintenanceDate)}</td>
                        <td>{r.description || "-"}</td>
                        <td>{r.performedBy?.name || "—"}</td>
                        <td className="nowrap">{r.machine && <Link className="btn-secondary-sm" to={`/machines/${r.machine._id}`}>View</Link>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}