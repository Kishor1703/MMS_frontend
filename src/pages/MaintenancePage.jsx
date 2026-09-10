import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { maintenanceApi } from "../api/endpoints";
import { CATEGORY_OPTIONS } from "../constants/machineCategories";

const fmtDate = (d) => (d ? new Date(d).toLocaleString() : "—");

const APPROVAL_BADGE = {
  Submitted: "orange",
  Approved: "green",
  Rejected: "red",
};

const DUE_BUCKETS = [
  { key: "", label: "All" },
  { key: "overdue", label: "Overdue" },
  { key: "today", label: "Due Today" },
  { key: "week", label: "Due This Week" },
  { key: "upcoming", label: "Upcoming" },
];

const CATEGORY_LABEL = Object.fromEntries(CATEGORY_OPTIONS.map((o) => [o.value, o.label]));

export default function MaintenancePage() {
  const [category, setCategory] = useState("");
  const [type, setType] = useState("");
  const [due, setDue] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [records, setRecords] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    maintenanceApi
      .list({ category: category || undefined, type: type || undefined, due: due || undefined, from: from || undefined, to: to || undefined, page, limit: 20 })
      .then((res) => {
        if (!active) return;
        setRecords(res.data.data);
        setPagination(res.data.pagination);
        setError("");
      })
      .catch((err) => active && setError(err.response?.data?.message || "Failed to load maintenance"))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [category, type, due, from, to, page]);

  const applyFilter = (field, value) => {
    if (field === "category") setCategory(value);
    if (field === "type") setType(value);
    if (field === "due") setDue(value);
    if (field === "from") setFrom(value);
    if (field === "to") setTo(value);
    setPage(1);
  };

  return (
    <div className="mon-page">
      <div className="page-header">
        <div>
          <h1>Maintenance</h1>
          <p className="muted">Maintenance records and schedules for all machine types</p>
        </div>
        <Link className="btn-primary" to="/machines">Open Machine</Link>
      </div>

      <div className="seg-toggle mainteance-buckets">
        {DUE_BUCKETS.map((b) => (
          <button key={b.key || "all"} type="button" className={due === b.key ? "active" : ""} onClick={() => applyFilter("due", b.key)}>
            {b.label}
          </button>
        ))}
      </div>

      <div className="filter-bar">
        <select value={category} onChange={(e) => applyFilter("category", e.target.value)}>
          {CATEGORY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select value={type} onChange={(e) => applyFilter("type", e.target.value)}>
          <option value="">All Types</option>
          <option>Preventive</option>
          <option>Breakdown</option>
          <option>Corrective</option>
          <option>Inspection</option>
          <option>Idle</option>
          <option>Other</option>
        </select>
        <input type="date" aria-label="From date" value={from} onChange={(e) => applyFilter("from", e.target.value)} />
        <input type="date" aria-label="To date" value={to} onChange={(e) => applyFilter("to", e.target.value)} />
      </div>

      {error && <div className="error-banner">{error}</div>}

      {loading ? (
        <div className="skeleton-panel" />
      ) : (
        <div className="table-scroll card-panel">
          <table className="dash-table">
            <thead>
              <tr>
                <th>Machine</th>
                <th>Type</th>
                <th>Maintenance Type</th>
                <th>Date</th>
                <th>Work Performed</th>
                <th>Approval</th>
                <th>Employee</th>
                <th>Next Maintenance</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {records.map((r) => (
                <tr key={r._id}>
                  <td className="nowrap">
                    {r.machine ? (
                      <Link className="table-link strong" to={`/machines/${r.machine._id}`}>
                        {r.machine.machineName || r.machine.machineNumber}
                      </Link>
                    ) : "—"}
                  </td>
                  <td>{r.machine?.machineCategory ? CATEGORY_LABEL[r.machine.machineCategory] : "—"}</td>
                  <td>{r.maintenanceType}</td>
                  <td className="muted">{fmtDate(r.maintenanceDate)}</td>
                  <td>{r.description || "—"}</td>
                  <td>
                    <span className={`status-badge ${APPROVAL_BADGE[r.approvalStatus] || "gray"}`}>
                      {r.approvalStatus}
                    </span>
                  </td>
                  <td>{r.performedBy?.name || "—"}</td>
                  <td className="muted">{r.nextMaintenanceDate ? new Date(r.nextMaintenanceDate).toLocaleDateString() : "—"}</td>
                  <td className="nowrap">
                    {r.machine && <Link className="btn-secondary-sm" to={`/machines/${r.machine._id}`}>View Machine</Link>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {records.length === 0 && <p className="dash-empty">No maintenance records found.</p>}
        </div>
      )}

      {pagination && pagination.pages > 1 && (
        <div className="pagination-bar">
          <button type="button" className="btn-secondary btn-secondary-sm" disabled={pagination.page <= 1} onClick={() => setPage((p) => p - 1)}>
            Previous
          </button>
          <span className="muted">Page {pagination.page} of {pagination.pages}</span>
          <button type="button" className="btn-secondary btn-secondary-sm" disabled={pagination.page >= pagination.pages} onClick={() => setPage((p) => p + 1)}>
            Next
          </button>
        </div>
      )}
    </div>
  );
}