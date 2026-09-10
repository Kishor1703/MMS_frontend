import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { machineApi } from "../api/endpoints";
import { MACHINE_TYPE_OPTIONS } from "../constants/machineCategories";

export default function EditMachine() {
  const { id } = useParams();
  const [form, setForm] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    machineApi
      .getById(id)
      .then((res) => {
        const m = res.data.data.machine;
        setForm({
          machineId: m.machineId || "",
          machineName: m.machineName || "",
          machineNumber: m.machineNumber || "",
          machineType: m.machineType || "",
          machineCategory: m.machineCategory || "loom",
          company: m.company || "",
          modelNumber: m.modelNumber || "",
          serialNumber: m.serialNumber || "",
          purchaseDate: m.purchaseDate ? m.purchaseDate.split("T")[0] : "",
          installationDate: m.installationDate ? m.installationDate.split("T")[0] : "",
          warrantyExpiry: m.warrantyExpiry ? m.warrantyExpiry.split("T")[0] : "",
          section: m.section || "",
          shed: m.shed || "",
          brand: m.brand || "",
          rpm: m.rpm || "",
          width: m.width || "",
          assignedEngineer: m.assignedEngineer || "",
          notes: m.notes || "",
          status: m.status || "Running",
          pressure: m.pressure || "",
          temperature: m.temperature || "",
          oilLevel: m.oilLevel || "",
          oilFilterStatus: m.oilFilterStatus || "",
          airFilterStatus: m.airFilterStatus || "",
          separatorCondition: m.separatorCondition || "",
          differentialPressure: m.differentialPressure || "",
          oilCarryoverStatus: m.oilCarryoverStatus || "",
          separatorElementStatus: m.separatorElementStatus || "",
          oRingOrSealStatus: m.oRingOrSealStatus || "",
          coolantLevel: m.coolantLevel || "",
          inletPressure: m.inletPressure || "",
          outletPressure: m.outletPressure || "",
          dewPoint: m.dewPoint || "",
          drainStatus: m.drainStatus || "",
          filterCondition: m.filterCondition || "",
          cleaningStatus: m.cleaningStatus || "",
        });
      })
      .catch((err) =>
        setError(err.response?.data?.message || "Failed to load machine")
      )
      .finally(() => setLoading(false));
  }, [id]);

  const handleChange = (field) => (e) =>
    setForm({ ...form, [field]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await machineApi.update(id, form);
      setSaved(true);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update machine");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (error && !form) return <div className="error-banner">{error}</div>;

  return (
    <div>
      <h1>Edit Machine</h1>
      {error && <div className="error-banner">{error}</div>}
      {saved && <div className="success-banner">Machine updated successfully.</div>}

      {form && (
        <form className="detail-form add-machine-form" onSubmit={submit}>
          <label>Machine Category</label>
          <select value={form.machineCategory} onChange={handleChange("machineCategory")} required>
            {MACHINE_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <label>Machine ID</label>
          <input value={form.machineId} onChange={handleChange("machineId")} required />

          <label>Machine Name</label>
          <input value={form.machineName} onChange={handleChange("machineName")} required />

          <label>Machine Number</label>
          <input value={form.machineNumber} onChange={handleChange("machineNumber")} required />

          {form.machineCategory === "loom" && (
            <>
              <label>Machine Type</label>
              <input value={form.machineType} onChange={handleChange("machineType")} />
            </>
          )}

          <label>Company</label>
          <input value={form.company} onChange={handleChange("company")} />

          <label>Brand</label>
          <input value={form.brand} onChange={handleChange("brand")} />

          <label>Model Number</label>
          <input value={form.modelNumber} onChange={handleChange("modelNumber")} />

          <label>Serial Number</label>
          <input value={form.serialNumber} onChange={handleChange("serialNumber")} />

          <label>Section</label>
          <input value={form.section} onChange={handleChange("section")} />

          <label>Shed</label>
          <input value={form.shed} onChange={handleChange("shed")} />

          {form.machineCategory === "loom" && (
            <>
              <label>RPM</label>
              <input type="number" value={form.rpm} onChange={handleChange("rpm")} />
              <label>Width (cm)</label>
              <input type="number" value={form.width} onChange={handleChange("width")} />
            </>
          )}

          {form.machineCategory === "compressor" && (
            <>
              <label>Pressure (bar)</label>
              <input type="number" step="0.1" value={form.pressure} onChange={handleChange("pressure")} />
              <label>Temperature (°C)</label>
              <input type="number" step="0.1" value={form.temperature} onChange={handleChange("temperature")} />
              <label>Oil Level</label>
              <input value={form.oilLevel} onChange={handleChange("oilLevel")} />
              <label>Oil Filter Status</label>
              <input value={form.oilFilterStatus} onChange={handleChange("oilFilterStatus")} />
              <label>Air Filter Status</label>
              <input value={form.airFilterStatus} onChange={handleChange("airFilterStatus")} />
              <label>Separator Condition</label>
              <input value={form.separatorCondition} onChange={handleChange("separatorCondition")} />
              <label>Differential Pressure</label>
              <input type="number" step="0.1" value={form.differentialPressure} onChange={handleChange("differentialPressure")} />
              <label>Oil Carryover Status</label>
              <input value={form.oilCarryoverStatus} onChange={handleChange("oilCarryoverStatus")} />
              <label>Separator Element Status</label>
              <input value={form.separatorElementStatus} onChange={handleChange("separatorElementStatus")} />
              <label>O-ring / Seal Status</label>
              <input value={form.oRingOrSealStatus} onChange={handleChange("oRingOrSealStatus")} />
              <label>Coolant Level</label>
              <input value={form.coolantLevel} onChange={handleChange("coolantLevel")} />
            </>
          )}

          {form.machineCategory === "air_dryer" && (
            <>
              <label>Inlet Pressure (bar)</label>
              <input type="number" step="0.1" value={form.inletPressure} onChange={handleChange("inletPressure")} />
              <label>Outlet Pressure (bar)</label>
              <input type="number" step="0.1" value={form.outletPressure} onChange={handleChange("outletPressure")} />
              <label>Dew Point (°C)</label>
              <input type="number" step="0.1" value={form.dewPoint} onChange={handleChange("dewPoint")} />
              <label>Drain Status</label>
              <input value={form.drainStatus} onChange={handleChange("drainStatus")} />
              <label>Filter Condition</label>
              <input value={form.filterCondition} onChange={handleChange("filterCondition")} />
              <label>Cleaning Status</label>
              <input value={form.cleaningStatus} onChange={handleChange("cleaningStatus")} />
            </>
          )}

          <label>Purchase Date</label>
          <input type="date" value={form.purchaseDate} onChange={handleChange("purchaseDate")} />

          <label>Installation Date</label>
          <input type="date" value={form.installationDate} onChange={handleChange("installationDate")} />

          <label>Warranty Expiry</label>
          <input type="date" value={form.warrantyExpiry} onChange={handleChange("warrantyExpiry")} />

          <label>Assigned Engineer</label>
          <input value={form.assignedEngineer} onChange={handleChange("assignedEngineer")} />

          <label>Notes</label>
          <textarea rows={3} value={form.notes} onChange={handleChange("notes")} />

          <button type="submit" disabled={saving || saved}>
            {saving ? "Saving..." : saved ? "Saved" : "Update Machine"}
          </button>

          <Link to={`/machines/${id}`} className="btn-secondary">
            Back to Machine
          </Link>
        </form>
      )}
    </div>
  );
}