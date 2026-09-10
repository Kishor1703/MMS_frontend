import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { machineApi } from "../api/endpoints";
import { useAuth } from "../context/AuthContext";

export default function EquipmentList({ assetType }) {
  const { hasRole, isAdmin } = useAuth();
  const canOpenEquipment = hasRole("employee");
  const [searchParams, setSearchParams] = useSearchParams();
  const company = searchParams.get("company") || "";
  const [equipment, setEquipment] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [companiesLoading, setCompaniesLoading] = useState(isAdmin);
  const [deletingId, setDeletingId] = useState(null);
  const title = assetType === "Compressor" ? "Compressors" : "Air Dryers";
  const basePath = assetType === "Compressor" ? "/compressors" : "/air-dryers";
  const companyPicker = isAdmin && !company;

  useEffect(() => {
    if (!isAdmin) return undefined;
    machineApi.companies().then((response) => setCompanies(response.data.data || [])).finally(() => setCompaniesLoading(false));
    return undefined;
  }, [isAdmin]);

  const load = () => {
    if (companyPicker) return;
    setLoading(true);
    machineApi.list({ assetType, search, company, limit: 500 })
      .then((response) => setEquipment(response.data.data || []))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    const timer = setTimeout(load, 250);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assetType, search, company, companyPicker]);

  const remove = async (item) => {
    if (!window.confirm(`Delete ${item.machineName}? This will hide the ${assetType.toLowerCase()} from the system.`)) return;
    setDeletingId(item._id);
    try {
      await machineApi.remove(item._id);
      load();
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>{title}</h1>
          <p className="muted">{company ? `${company} ${title.toLowerCase()}` : `Manage ${title.toLowerCase()} by company.`}</p>
        </div>
        {isAdmin && company && <Link className="btn-primary" to={`${basePath}/new?company=${encodeURIComponent(company)}`}>+ Add {assetType}</Link>}
      </div>

      {companyPicker ? (
        companiesLoading ? <p>Loading companies...</p> : (
          <div className="card-grid">
            {companies.map((companyName) => (
              <button type="button" className="company-card" key={companyName} onClick={() => setSearchParams({ company: companyName })}>
                {companyName}
              </button>
            ))}
            {!companies.length && <p>No companies found.</p>}
          </div>
        )
      ) : (
        <>
          <div className="filter-bar">
            <input placeholder={`Search ${title.toLowerCase()} by name or ID...`} value={search} onChange={(event) => setSearch(event.target.value)} />
            {isAdmin && <button type="button" className="company-filter" onClick={() => setSearchParams({})}>Back to Companies</button>}
          </div>
          {loading ? <p>Loading...</p> : equipment.length === 0 ? <p>No {title.toLowerCase()} found for this company.</p> : (
            <div className="card-grid equipment-grid">
              {equipment.map((item) => (
                <div className="equipment-card" key={item._id}>
                  {canOpenEquipment ? (
                    <Link to={`${basePath}/${item._id}`} className="equipment-card-link">
                      <div className="machine-card-header">
                        <h3>{item.machineName}</h3>
                        <span className={`status-badge ${item.status === "Running" ? "green" : item.status === "Breakdown" ? "red" : "orange"}`}>{item.status}</span>
                      </div>
                      <p><strong>ID:</strong> {item.machineId}</p>
                      <p><strong>Purchased:</strong> {item.purchaseDate ? new Date(item.purchaseDate).toLocaleDateString() : "-"}</p>
                      <p><strong>Installed:</strong> {item.installationDate ? new Date(item.installationDate).toLocaleDateString() : "-"}</p>
                      <p className="muted"><strong>Assigned:</strong> {item.assignedEmployees?.map((employee) => employee.name).join(", ") || "Not assigned"}</p>
                    </Link>
                  ) : (
                    <div className="equipment-card-link" aria-disabled="true">
                      <div className="machine-card-header">
                        <h3>{item.machineName}</h3>
                        <span className={`status-badge ${item.status === "Running" ? "green" : item.status === "Breakdown" ? "red" : "orange"}`}>{item.status}</span>
                      </div>
                      <p><strong>ID:</strong> {item.machineId}</p>
                      <p><strong>Purchased:</strong> {item.purchaseDate ? new Date(item.purchaseDate).toLocaleDateString() : "-"}</p>
                      <p><strong>Installed:</strong> {item.installationDate ? new Date(item.installationDate).toLocaleDateString() : "-"}</p>
                      <p className="muted"><strong>Assigned:</strong> {item.assignedEmployees?.map((employee) => employee.name).join(", ") || "Not assigned"}</p>
                    </div>
                  )}
                  {isAdmin && (
                    <div className="form-actions equipment-actions">
                      <Link className="btn-secondary" to={`${basePath}/${item._id}/edit?company=${encodeURIComponent(company)}`}>Edit</Link>
                      <button type="button" className="btn-secondary" onClick={() => remove(item)} disabled={deletingId === item._id}>{deletingId === item._id ? "Deleting..." : "Delete"}</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
