import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { machineApi } from "../api/endpoints";
import { useAuth } from "../context/AuthContext";

const statusColors = {
  Running: "green",
  "Under Maintenance": "orange",
  Breakdown: "red",
  Idle: "gray",
};

const getLayoutMachineNumber = (row, column, width) => {
  const rowBand = Math.floor((row - 1) / 2);
  const rowInBand = (row - 1) % 2;
  return rowBand * width * 2 + (width - column) * 2 + rowInBand + 1;
};

export default function MachineList() {
  const { isAdmin, isOwner } = useAuth();
  const canOpenMachine = !isAdmin && !isOwner;
  const [machines, setMachines] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [searchParams, setSearchParams] = useSearchParams();
  const company = searchParams.get("company") || "";
  const [loading, setLoading] = useState(false);
  const [loadingCompanies, setLoadingCompanies] = useState(isAdmin);
  const [companyLayout, setCompanyLayout] = useState(null);

  const selectCompany = (companyName) => {
    setSearchParams({ company: companyName });
  };

  const clearCompany = () => {
    setSearchParams({});
  };

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

  useEffect(() => {
    if (!company) {
      setCompanyLayout(null);
      return undefined;
    }

    machineApi
      .companyLayout(company)
      .then((res) => setCompanyLayout(res.data.data))
      .catch(() => setCompanyLayout(null));
    return undefined;
  }, [company]);

  const renderMachineCard = (machine) => {
    const card = (
      <>
        <div className="machine-card-header">
          <h3>{machine.machineName}</h3>
          <span className={`status-badge ${statusColors[machine.status]}`}>{machine.status}</span>
        </div>
        <p>{machine.machineNumber}</p>
        <p className="muted">{machine.machineType}</p>
      </>
    );

    return canOpenMachine ? (
      <Link to={`/machines/${machine._id}`} className="machine-card machine-card-main">
        {card}
      </Link>
    ) : (
      <div className="machine-card machine-card-main" aria-disabled="true">
        {card}
      </div>
    );
  };

  return (
    <div>
      <div className="page-header">
        <h1>{isAdmin || isOwner ? "Machines" : "My Assigned Machines"}</h1>
        {isAdmin && company && (
          <Link to={`/machines/new?company=${encodeURIComponent(company)}`} className="btn-primary">
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
                onClick={() => selectCompany(companyName)}
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
              <button type="button" className="company-filter" onClick={clearCompany}>
                Back to Companies
              </button>
            )}
          </div>

          {loading ? (
            <div>Loading...</div>
          ) : company && (companyLayout || machines[0]?.layout) ? (
            <div
              className="machine-layout-list"
              style={{
                "--layout-columns": companyLayout?.width || machines[0]?.layout?.width || 2,
              }}
            >
              {Array.from({
                length:
                  (companyLayout?.width || machines[0]?.layout?.width || 2) *
                  (companyLayout?.length || machines[0]?.layout?.length || 2),
              }).map((_, index) => {
                const width = companyLayout?.width || machines[0]?.layout?.width || 2;
                const row = Math.floor(index / width) + 1;
                const column = (index % width) + 1;
                const machineNumber = String(getLayoutMachineNumber(row, column, width));
                const machine = machines.find((item) => String(item.machineNumber) === machineNumber);

                return (
                  <div className="machine-layout-slot" key={machineNumber}>
                    <div className="machine-layout-slot-number">Machine {machineNumber}</div>
                    {machine ? renderMachineCard(machine) : <div className="machine-layout-empty">Empty position</div>}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="card-grid">
              {machines.map((machine) => (
                <div key={machine._id}>{renderMachineCard(machine)}</div>
              ))}
              {machines.length === 0 && <p>No machines found.</p>}
            </div>
          )}
        </>
      )}
    </div>
  );
}
