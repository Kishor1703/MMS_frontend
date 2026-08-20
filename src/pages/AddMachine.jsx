import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { machineApi } from "../api/endpoints";

const empty = {
  machineId: "",
  machineName: "",
  machineNumber: "",
  machineType: "",
  company: "",
  modelNumber: "",
  serialNumber: "",
  purchaseDate: "",
  installationDate: "",
  warrantyExpiry: "",
};

export default function AddMachine() {
  const navigate = useNavigate();
  const [form, setForm] = useState(empty);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [companies, setCompanies] = useState([]);

  useEffect(() => {
    machineApi
      .companies()
      .then((res) => setCompanies(res.data.data))
      .catch(() => setError("Failed to load companies"));
  }, []);

  const handleChange = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await machineApi.create(form);
      navigate(`/machines/${res.data.data._id}`);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create machine");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <h1>Add Machine</h1>
      {error && <div className="error-banner">{error}</div>}
      <form className="detail-form" onSubmit={submit}>
        <label>Machine ID</label>
        <input value={form.machineId} onChange={handleChange("machineId")} required />

        <label>Machine Name</label>
        <input value={form.machineName} onChange={handleChange("machineName")} required />

        <label>Machine Number</label>
        <input value={form.machineNumber} onChange={handleChange("machineNumber")} required />

        <label>Machine Type</label>
        <input value={form.machineType} onChange={handleChange("machineType")} />

        <label>Company</label>
        <select value={form.company} onChange={handleChange("company")} required>
          <option value="">Select company</option>
          {companies.map((company) => (
            <option key={company} value={company}>{company}</option>
          ))}
        </select>

        <label>Model Number</label>
        <input value={form.modelNumber} onChange={handleChange("modelNumber")} />

        <label>Serial Number</label>
        <input value={form.serialNumber} onChange={handleChange("serialNumber")} />

        <label>Purchase Date</label>
        <input type="date" value={form.purchaseDate} onChange={handleChange("purchaseDate")} />

        <label>Installation Date</label>
        <input type="date" value={form.installationDate} onChange={handleChange("installationDate")} />

        <label>Warranty Expiry</label>
        <input type="date" value={form.warrantyExpiry} onChange={handleChange("warrantyExpiry")} />

        <button type="submit" disabled={saving}>
          {saving ? "Saving..." : "Create Machine"}
        </button>
      </form>
    </div>
  );
}
