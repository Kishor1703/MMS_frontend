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

const layoutOptions = [[2, 3, 4, 5], [6, 7, 8], [9, 10]];

export default function AddMachine() {
  const navigate = useNavigate();
  const [form, setForm] = useState(empty);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [companies, setCompanies] = useState([]);
  const [layoutSize, setLayoutSize] = useState(2);
  const [layoutLength, setLayoutLength] = useState(2);

  useEffect(() => {
    machineApi
      .companies()
      .then((res) => setCompanies(res.data.data))
      .catch(() => setError("Failed to load companies"));
  }, []);

  const handleChange = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const length = Number(layoutLength) || 1;
  const layoutCells = Array.from({ length: layoutSize * length }, (_, index) => {
    const row = Math.floor(index / layoutSize) + 1;
    const column = (index % layoutSize) + 1;
    return { row, column };
  });

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
      <div className="add-machine-layout">
      <form className="detail-form add-machine-form" onSubmit={submit}>
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

      <section className="machine-layout-card" aria-labelledby="machine-layout-title">
        <div className="machine-layout-heading">
          <div>
            <h2 id="machine-layout-title">Machine Layout</h2>
            <p>Choose a layout to preview the machine positions.</p>
          </div>
          <span className="layout-size-badge">{layoutSize} × {length}</span>
        </div>

        <div className="layout-selector" aria-label="Select machine layout size">
          {layoutOptions.map((row) => (
            <div className="layout-option-row" key={row[0]}>
              {row.map((size) => (
                <button
                  key={size}
                  type="button"
                  className={`layout-option ${layoutSize === size ? "active" : ""}`}
                  onClick={() => {
                    setLayoutSize(size);
                    setLayoutLength(size);
                  }}
                  aria-pressed={layoutSize === size}
                >
                  Layout {size}
                </button>
              ))}
            </div>
          ))}
        </div>

        <label className="layout-length-input">
          <span>Length (North → South)</span>
          <input
            type="number"
            min="1"
            max="50"
            value={layoutLength}
            onChange={(event) => {
              const value = event.target.value;
              setLayoutLength(value === "" ? "" : Math.min(50, Math.max(1, Number(value))));
            }}
          />
          <small>Enter the number of rows. Width stays at {layoutSize} columns.</small>
        </label>

        <div className="orientation-key" aria-label="Layout orientation">
          <span><strong>N</strong> North (top)</span>
          <span><strong>E</strong> East (right)</span>
          <span><strong>S</strong> South (bottom)</span>
          <span><strong>W</strong> West (left)</span>
        </div>

        <div className="layout-preview-scroll">
          <div className="machine-layout-preview">
            <div className="width-direction"><span>W</span><strong>Width →</strong><span>E</span></div>
            <div className="layout-map-row">
              <div className="north-south-label north">N</div>
              <div
                className="machine-grid"
                style={{ "--layout-size": layoutSize }}
                aria-label={`${layoutSize} columns by ${length} rows machine grid. North is at the top and West is on the left.`}
              >
                {layoutCells.map(({ row, column }) => (
                  <div className="machine-layout-cell" key={`${row}-${column}`}>
                    <span>R{row}</span>
                    <strong>{row}-{column}</strong>
                    <span>C{column}</span>
                  </div>
                ))}
              </div>
              <div className="north-south-label south">S</div>
            </div>
            <div className="length-direction"><span>N</span><strong>Length ↓</strong><span>S</span></div>
          </div>
        </div>
      </section>
      </div>
    </div>
  );
}
