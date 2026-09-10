import { useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { machineApi } from "../api/endpoints";

export default function AddEquipment({ assetType }) {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const isEditMode = Boolean(id);
  const title = assetType === "Compressor" ? "Compressor" : "Air Dryer";
  const companyParam = searchParams.get("company") || "";
  const [form, setForm] = useState({ machineName: "", machineId: "", purchaseDate: "", installationDate: "" });
  const [selectedCompany, setSelectedCompany] = useState(companyParam);
  const [companies, setCompanies] = useState([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (companyParam) return undefined;
    machineApi.companies().then((response) => setCompanies(response.data.data || [])).catch(() => setError("Failed to load companies"));
    return undefined;
  }, [companyParam]);

  useEffect(() => {
    if (!isEditMode) return undefined;
    let active = true;
    machineApi.getById(id).then((response) => {
      if (!active) return;
      const equipment = response.data.data.machine;
      setForm({
        machineName: equipment.machineName || "",
        machineId: equipment.machineId || "",
        purchaseDate: equipment.purchaseDate?.slice(0, 10) || "",
        installationDate: equipment.installationDate?.slice(0, 10) || "",
      });
      if (!selectedCompany) setSelectedCompany(equipment.company || "");
    }).catch((err) => setError(err.response?.data?.message || `Failed to load ${title.toLowerCase()}`));
    return () => { active = false; };
  }, [id, isEditMode, title, selectedCompany]);

  const change = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value }));

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    if (!selectedCompany) {
      setError("Select a company before saving");
      setSaving(false);
      return;
    }
    try {
      if (isEditMode) {
        await machineApi.update(id, { ...form, company: selectedCompany });
      } else {
        await machineApi.create({ ...form, assetType, company: selectedCompany });
      }
      navigate((assetType === "Compressor" ? "/compressors" : "/air-dryers") + "?company=" + encodeURIComponent(selectedCompany));
    } catch (err) {
      setError(err.response?.data?.message || `Failed to ${isEditMode ? "update" : "add"} ${title.toLowerCase()}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <h1>{isEditMode ? `Edit ${title}` : `Add ${title}`}</h1>
      {error && <div className="error-banner">{error}</div>}
      <form className="detail-form equipment-form" onSubmit={submit}>
        <label>Company</label>
        {companyParam || isEditMode ? (
          <input value={selectedCompany} readOnly required />
        ) : (
          <select value={selectedCompany} onChange={(event) => setSelectedCompany(event.target.value)} required>
            <option value="">Select company</option>
            {companies.map((company) => <option key={company} value={company}>{company}</option>)}
          </select>
        )}
        <label>Name</label>
        <input value={form.machineName} onChange={change("machineName")} required />
        <label>ID</label>
        <input value={form.machineId} onChange={change("machineId")} required />
        <label>Purchased Date</label>
        <input type="date" value={form.purchaseDate} onChange={change("purchaseDate")} />
        <label>Installed Date</label>
        <input type="date" value={form.installationDate} onChange={change("installationDate")} />
        <button type="submit" className="btn-primary" disabled={saving}>{saving ? "Saving..." : isEditMode ? `Update ${title}` : `Save ${title}`}</button>
        <Link to={(assetType === "Compressor" ? "/compressors" : "/air-dryers") + (selectedCompany ? "?company=" + encodeURIComponent(selectedCompany) : "")} className="btn-secondary">Back to {title}s</Link>
      </form>
    </div>
  );
}
