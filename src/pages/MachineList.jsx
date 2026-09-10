import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { machineApi } from "../api/endpoints";
import { useAuth } from "../context/AuthContext";

const statusColors = {
  Running: "green",
  Stopped: "blue",
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
  const { isAdmin } = useAuth();
  const canOpenMachine = true;
  const [machines, setMachines] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [search, setSearch] = useState("");
  const [searchParams, setSearchParams] = useSearchParams();
  const company = searchParams.get("company") || "";
  const status = searchParams.get("status") || "";
  const section = searchParams.get("section") || "";
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [companiesLoaded, setCompaniesLoaded] = useState(false);
  const [companyLayoutData, setCompanyLayoutData] = useState(null);
  const companyLayout = company ? companyLayoutData : null;
  const loadingCompanies = isAdmin && !companiesLoaded;

  const updateParams = (patch) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(patch || {}).forEach(([key, value]) => {
      if (value) next.set(key, value);
      else next.delete(key);
    });
    setSearchParams(next);
  };

  const selectCompany = (companyName) => {
    setSearchParams({ ...Object.fromEntries(searchParams), company: companyName });
  };

  const clearCompany = () => {
    setSearchParams({ status: status || undefined, section: section || undefined });
  };

  const deleteMachine = async (machine) => {
    if (!window.confirm(`Delete ${machine.machineName} (${machine.machineNumber})?`)) return;

    setDeletingId(machine._id);
    try {
      await machineApi.remove(machine._id);
      loadMachines();
    } catch (err) {
      window.alert(err.response?.data?.message || "Failed to delete machine");
    } finally {
      setDeletingId(null);
    }
  };

  const loadMachines = () => {
    setLoading(true);
    machineApi
      .list({ search, status, company, section, category: "loom" })
      .then((res) => setMachines(res.data.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (isAdmin && !company) return undefined;
    const timeout = setTimeout(loadMachines, 300);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, search, status, company, section]);

  useEffect(() => {
    if (!isAdmin) return undefined;
    machineApi
      .companies()
      .then((res) => setCompanies(res.data.data))
      .finally(() => {
        setCompaniesLoaded(true);
      });
  }, [isAdmin]);

  useEffect(() => {
    if (!company) return undefined;

    machineApi
      .companyLayout(company)
      .then((res) => setCompanyLayoutData(res.data.data))
      .catch(() => setCompanyLayoutData(null));
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
        {machine.section && <p className="muted">Section: {machine.section}</p>}
        {isAdmin && (
          <div className="machine-card-actions" onClick={(e) => e.preventDefault()}>
            <Link
              to={`/machines/${machine._id}/edit`}
              className="btn-secondary-sm"
              onClick={(e) => e.stopPropagation()}
            >
              Edit
            </Link>
            <button
              type="button"
              className="btn-danger-sm"
              onClick={(e) => {
                e.stopPropagation();
                deleteMachine(machine);
              }}
            >
              Delete
            </button>
          </div>
        )}
      </>
    );

    return (
      <>
        {canOpenMachine ? (
          <Link to={`/machines/${machine._id}`} className="machine-card machine-card-main">
            {card}
          </Link>
        ) : (
          <div className="machine-card machine-card-main" aria-disabled="true">
            {card}
          </div>
        )}
        {isAdmin && (
          <button
            type="button"
            className="btn-secondary machine-delete-link"
            onClick={() => deleteMachine(machine)}
            disabled={deletingId === machine._id}
          >
            {deletingId === machine._id ? "Deleting..." : "Delete machine"}
          </button>
        )}
      </>
    );
  };

  return (
    <div>
      <div className="page-header">
        <h1>Machine Layout</h1>
        {isAdmin && company && (
          <Link to={`/machines/new?company=${encodeURIComponent(company)}`} className="btn-primary">+ Add Machine</Link>
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
              placeholder="Search machines by name, number, section or shed..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select value={status} onChange={(e) => updateParams({ status: e.target.value })}>
              <option value="">All Statuses</option>
              <option value="Running">Running</option>
              <option value="Stopped">Stopped</option>
              <option value="Under Maintenance">Under Maintenance</option>
              <option value="Breakdown">Breakdown</option>
              <option value="Idle">Idle</option>
            </select>
            {section && (
              <button type="button" className="company-filter" onClick={() => updateParams({ section: "" })}>
                Section: {section} ✕
              </button>
            )}
            {isAdmin && (
              <button type="button" className="company-filter" onClick={clearCompany}>
                Back to Companies
              </button>
            )}
          </div>

          {loading ? (
            <div>Loading...</div>
          ) : company && (companyLayout || machines[0]?.layout) ? (
            (() => {
              const layoutWidth = companyLayout?.width || machines[0]?.layout?.width || 2;
              const layoutLength = companyLayout?.length || machines[0]?.layout?.length || 2;
              const layoutMachineCount =
                companyLayout?.machineCount ||
                machines[0]?.layout?.machineCount ||
                layoutWidth * layoutLength;

              return (
            <div
              className="machine-layout-list"
              style={{
                "--layout-columns": layoutWidth,
              }}
            >
              {Array.from({
                length: layoutMachineCount,
              }).map((_, index) => {
                const row = Math.floor(index / layoutWidth) + 1;
                const column = (index % layoutWidth) + 1;
                const machineNumber = String(getLayoutMachineNumber(row, column, layoutWidth));
                const machine = machines.find((item) => String(item.machineNumber) === machineNumber);

                return (
                  <div className="machine-layout-slot" key={machineNumber}>
                    <div className="machine-layout-slot-number">Machine {machineNumber}</div>
                    {machine ? renderMachineCard(machine) : <div className="machine-layout-empty">Empty position</div>}
                  </div>
                );
              })}
            </div>
              );
            })()
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
