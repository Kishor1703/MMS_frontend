import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { machineApi } from "../api/endpoints";
import { useAuth } from "../context/AuthContext";
import {
  MACHINE_CATEGORIES,
  STATUS_META,
  orNa,
} from "../constants/machineCategories";

const fmtDate = (date) => (date ? new Date(date).toLocaleDateString() : "—");
const fmtMinutes = (mins) => {
  if (mins === null || mins === undefined) return "—";
  const h = Math.floor(mins / 60);
  return h ? `${h}h ${mins % 60}m` : `${mins}m`;
};

const statusBadge = (status) => (
  <span className={`status-badge ${STATUS_META[status]?.dot || "gray"}`}>{status}</span>
);

const machineLink = (m) => (
  <span className="mon-cell-machine">
    <Link className="table-link strong" to={`/machines/${m._id}`}>
      {MACHINE_CATEGORIES[m.machineCategory]?.single || "Machine"} {m.machineNumber}
    </Link>
    <span className="mon-cell-name">{m.machineName}</span>
  </span>
);

const COLUMNS = {
  loom: [
    { label: "Loom", render: machineLink },
    { label: "Section", render: (m) => m.section || "—" },
    { label: "Shed", render: (m) => m.shed || "—" },
    { label: "Brand", render: (m) => m.brand || "—" },
    { label: "Model", render: (m) => m.modelNumber || "—" },
    { label: "Status", render: (m) => statusBadge(m.status) },
    { label: "RPM", render: (m) => m.rpm ?? "—" },
    { label: "Running Hours", render: (m) => fmtMinutes(m.runningHours) },
    { label: "Downtime", render: (m) => fmtMinutes(m.totalDowntime) },
    { label: "Last Maintenance", render: (m) => fmtDate(m.lastMaintenanceDate) },
    { label: "Next Maintenance", render: (m) => fmtDate(m.nextMaintenanceDate) },
    { label: "Assigned", render: (m) => m?.assignedEmployees?.map((e) => e.name).join(", ") || m.assignedEngineer || "—" },
  ],
  compressor: [
    { label: "Compressor", render: machineLink },
    { label: "Section", render: (m) => m.section || "—" },
    { label: "Status", render: (m) => statusBadge(m.status) },
    { label: "Brand", render: (m) => m.brand || "—" },
    { label: "Model", render: (m) => m.modelNumber || "—" },
    { label: "Serial", render: (m) => m.serialNumber || "—" },
    { label: "Running Hours", render: (m) => fmtMinutes(m.runningHours) },
    { label: "Pressure", render: (m) => (m.pressure != null ? `${m.pressure} bar` : orNa(m.pressure)) },
    { label: "Temperature", render: (m) => (m.temperature != null ? `${m.temperature}°C` : orNa(m.temperature)) },
    { label: "Oil Level", render: (m) => orNa(m.oilLevel) },
    { label: "Next Maintenance", render: (m) => fmtDate(m.nextMaintenanceDate) },
    { label: "Assigned", render: (m) => m?.assignedEmployees?.map((e) => e.name).join(", ") || m.assignedEngineer || "—" },
  ],
  air_dryer: [
    { label: "Air Dryer", render: machineLink },
    { label: "Section", render: (m) => m.section || "—" },
    { label: "Status", render: (m) => statusBadge(m.status) },
    { label: "Brand", render: (m) => m.brand || "—" },
    { label: "Model", render: (m) => m.modelNumber || "—" },
    { label: "Running Hours", render: (m) => fmtMinutes(m.runningHours) },
    { label: "Inlet Press.", render: (m) => (m.inletPressure != null ? `${m.inletPressure} bar` : orNa(m.inletPressure)) },
    { label: "Outlet Press.", render: (m) => (m.outletPressure != null ? `${m.outletPressure} bar` : orNa(m.outletPressure)) },
    { label: "Dew Point", render: (m) => (m.dewPoint != null ? `${m.dewPoint}°C` : orNa(m.dewPoint)) },
    { label: "Temperature", render: (m) => (m.temperature != null ? `${m.temperature}°C` : orNa(m.temperature)) },
    { label: "Drain", render: (m) => orNa(m.drainStatus) },
    { label: "Next Maintenance", render: (m) => fmtDate(m.nextMaintenanceDate) },
  ],
  other: [
    { label: "Machine", render: machineLink },
    { label: "Type", render: (m) => m.machineType || "—" },
    { label: "Section", render: (m) => m.section || "—" },
    { label: "Status", render: (m) => statusBadge(m.status) },
    { label: "Brand", render: (m) => m.brand || "—" },
    { label: "Model", render: (m) => m.modelNumber || "—" },
    { label: "Serial", render: (m) => m.serialNumber || "—" },
    { label: "Running Hours", render: (m) => fmtMinutes(m.runningHours) },
    { label: "Install Date", render: (m) => fmtDate(m.installationDate) },
    { label: "Last Maintenance", render: (m) => fmtDate(m.lastMaintenanceDate) },
    { label: "Next Maintenance", render: (m) => fmtDate(m.nextMaintenanceDate) },
    { label: "Notes", render: (m) => m.notes || "—" },
  ],
};

export default function MachineMonitoring({ category }) {
  const { isAdmin } = useAuth();
  const meta = MACHINE_CATEGORIES[category] || MACHINE_CATEGORIES.other;

  const [machines, setMachines] = useState([]);
  const [sections, setSections] = useState([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [section, setSection] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    machineApi
      .list({ category, search, status, section, page, limit: 15 })
      .then((res) => {
        if (!active) return;
        setMachines(res.data.data);
        setPagination(res.data.pagination);
        setSections((prev) => Array.from(new Set([...prev, ...res.data.data.map((m) => m.section).filter(Boolean)])));
        setError("");
      })
      .catch((err) => active && setError(err.response?.data?.message || "Failed to load machines"))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [category, search, status, section, page]);

  const resetFilters = () => {
    setSearch("");
    setStatus("");
    setSection("");
    setPage(1);
  };

  return (
    <div className="mon-page">
      <div className="page-header">
        <div>
          <h1>{meta.label}</h1>
          <p className="muted">{meta.icon} {meta.single} monitoring · {(pagination?.total ?? 0)} {meta.label.toLowerCase()}</p>
        </div>
        {isAdmin && (
          <Link to={`/machines/new?category=${category}`} className="btn-primary">
            + Add {meta.single}
          </Link>
        )}
      </div>

      <div className="filter-bar">
        <input
          placeholder={`Search ${meta.label.toLowerCase()} by name, number, section or shed...`}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
        <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
          <option value="">All Statuses</option>
          <option value="Running">Running</option>
          <option value="Stopped">Stopped</option>
          <option value="Under Maintenance">Under Maintenance</option>
          <option value="Breakdown">Breakdown</option>
          <option value="Idle">Idle</option>
        </select>
        <select value={section} onChange={(e) => { setSection(e.target.value); setPage(1); }}>
          <option value="">All Sections</option>
          {sections.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        {(search || status || section) && (
          <button type="button" className="company-filter" onClick={resetFilters}>
            Clear Filters
          </button>
        )}
      </div>

      {error && <div className="error-banner">{error}</div>}

      {loading ? (
        <div className="skeleton-panel" />
      ) : (
        <div className="table-scroll card-panel">
          <table className="dash-table">
            <thead>
              <tr>{COLUMNS[category].map((c) => <th key={c.label}>{c.label}</th>)}<th>Action</th></tr>
            </thead>
            <tbody>
              {machines.map((m) => (
                <tr key={m._id}>
                  {COLUMNS[category].map((c) => <td key={c.label}>{c.render(m)}</td>)}
                  <td className="nowrap"><Link className="btn-secondary-sm" to={`/machines/${m._id}`}>View</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
          {machines.length === 0 && <p className="dash-empty">No {meta.label.toLowerCase()} found.</p>}
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