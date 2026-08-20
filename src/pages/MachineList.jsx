import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { machineApi } from "../api/endpoints";
import { useAuth } from "../context/AuthContext";

const statusColors = {
  Running: "green",
  "Under Maintenance": "orange",
  Breakdown: "red",
  Idle: "gray",
};

export default function MachineList() {
  const { isAdmin, isOwner } = useAuth();
  const [machines, setMachines] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [company, setCompany] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingCompanies, setLoadingCompanies] = useState(isAdmin);

  const loadMachines = () => {
    setLoading(true);
    machineApi
      .list({ search, status, company })
      .then((res) => setMachines(res.data.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (isAdmin && !company) return undefined;
    const timeout = setTimeout(loadMachines, 300);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, search, status, company]);

  useEffect(() => {
    if (!isAdmin) return undefined;
    setLoadingCompanies(true);
    machineApi
      .companies()
      .then((res) => setCompanies(res.data.data))
      .finally(() => setLoadingCompanies(false));
  }, [isAdmin]);

  return (
    <div>
      <div className="page-header">
        <h1>{isAdmin || isOwner ? "Machines" : "My Assigned Machines"}</h1>
        {isAdmin && (
          <Link to="/machines/new" className="btn-primary">
            + Add Machine
          </Link>
        )}
      </div>

      {isAdmin && !company ? (
        loadingCompanies ? <div>Loading companies...</div> : (
          <div className="card-grid">
            {companies.map((companyName) => (
              <button
                type="button"
                key={companyName}
                className="company-card"
                onClick={() => setCompany(companyName)}
              >
                {companyName}
              </button>
            ))}
            {companies.length === 0 && <p>No companies found.</p>}
          </div>
        )
      ) : (
        <>
          <div className="filter-bar">
            <input
              placeholder="Search by name or number..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">All Statuses</option>
              <option value="Running">Running</option>
              <option value="Under Maintenance">Under Maintenance</option>
              <option value="Breakdown">Breakdown</option>
              <option value="Idle">Idle</option>
            </select>
            {isAdmin && (
              <button type="button" className="company-filter" onClick={() => setCompany("")}>
                Back to Companies
              </button>
            )}
          </div>

          {loading ? (
            <div>Loading...</div>
          ) : (
            <div className="card-grid">
              {machines.map((m) => (
                <Link to={`/machines/${m._id}`} key={m._id} className="machine-card machine-card-main">
                  <div className="machine-card-header">
                    <h3>{m.machineName}</h3>
                    <span className={`status-badge ${statusColors[m.status]}`}>{m.status}</span>
                  </div>
                  <p>{m.machineNumber}</p>
                  <p className="muted">{m.machineType}</p>
                </Link>
              ))}
              {machines.length === 0 && <p>No machines found.</p>}
            </div>
          )}
        </>
      )}
    </div>
  );
}
