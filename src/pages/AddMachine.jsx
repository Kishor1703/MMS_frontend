import { useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { authApi, machineApi } from "../api/endpoints";

const empty = {
  assetType: "Machine",
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
  machineImage: "",
};

const layoutOptions = [[2, 3, 4, 5], [6, 7, 8], [9, 10]];
const DEFAULT_LAYOUT_SIZE = 2;
const DEFAULT_LAYOUT_MACHINE_COUNT = DEFAULT_LAYOUT_SIZE * DEFAULT_LAYOUT_SIZE;

const getLayoutMachineCount = (layout) => {
  const width = Number(layout?.width) || DEFAULT_LAYOUT_SIZE;
  const length = Number(layout?.length) || DEFAULT_LAYOUT_SIZE;
  const machineCount = Number(layout?.machineCount);
  return Number.isInteger(machineCount) && machineCount > 0 ? machineCount : width * length;
};

export default function AddMachine() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isEditMode = Boolean(id);
  const companyParam = searchParams.get("company") || "";
  const [form, setForm] = useState({ ...empty, assetType: "Machine" });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [usedMachineNumbers, setUsedMachineNumbers] = useState([]);
  const [layoutSaved, setLayoutSaved] = useState(false);
  const [layoutSize, setLayoutSize] = useState(DEFAULT_LAYOUT_SIZE);
  const [layoutMachineCount, setLayoutMachineCount] = useState(DEFAULT_LAYOUT_MACHINE_COUNT);
  const [layoutUnlocked, setLayoutUnlocked] = useState(false);
  const [layoutPassword, setLayoutPassword] = useState("");
  const [layoutPasswordError, setLayoutPasswordError] = useState("");
  const [layoutSaving, setLayoutSaving] = useState(false);
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);

  const company = isEditMode ? form.company : companyParam;
  const machineCount = Math.max(1, Number(layoutMachineCount) || 1);
  const layoutLength = Math.max(1, Math.ceil(machineCount / layoutSize));
  const layoutCells = Array.from({ length: machineCount }, (_, index) => {
    const row = Math.floor(index / layoutSize) + 1;
    const column = (index % layoutSize) + 1;
    const rowBand = Math.floor((row - 1) / 2);
    const rowInBand = (row - 1) % 2;
    const machineNumber = rowBand * layoutSize * 2 + (layoutSize - column) * 2 + rowInBand + 1;
    return { row, column, machineNumber };
  });

  const availableMachineNumbers = layoutCells
    .map(({ machineNumber }) => String(machineNumber))
    .filter((machineNumber) => !usedMachineNumbers.includes(machineNumber) || machineNumber === form.machineNumber);

  const handleChange = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value }));
  const resetLayoutAccess = () => {
    setLayoutUnlocked(false);
    setLayoutPassword("");
    setLayoutPasswordError("");
    setShowPasswordPrompt(false);
  };

  useEffect(() => {
    if (!isEditMode) return undefined;

    let active = true;
    machineApi
      .getById(id)
      .then((response) => {
        if (!active) return;
        const machine = response.data.data.machine;
        setForm({
          assetType: machine.assetType || "Machine",
          machineId: machine.machineId || "",
          machineName: machine.machineName || "",
          machineNumber: machine.machineNumber || "",
          machineType: machine.machineType || "",
          company: machine.company || "",
          modelNumber: machine.modelNumber || "",
          serialNumber: machine.serialNumber || "",
          purchaseDate: machine.purchaseDate ? machine.purchaseDate.slice(0, 10) : "",
          installationDate: machine.installationDate ? machine.installationDate.slice(0, 10) : "",
          warrantyExpiry: machine.warrantyExpiry ? machine.warrantyExpiry.slice(0, 10) : "",
          machineImage: machine.machineImage || "",
        });
      })
      .catch(() => setError("Failed to load machine data"));

    return () => {
      active = false;
    };
  }, [id, isEditMode]);

  useEffect(() => {
    if (isEditMode || !companyParam) return undefined;

    let active = true;
    Promise.all([
      machineApi.companyLayout(companyParam).catch(() => ({ data: { data: null } })),
      machineApi.list({ company: companyParam, limit: 1000 }).catch(() => ({ data: { data: [] } })),
    ])
      .then(([layoutRes, machinesRes]) => {
        if (!active) return;
        const layout = layoutRes.data.data;
        const machines = machinesRes.data.data || [];
        setUsedMachineNumbers(machines.map((machine) => String(machine.machineNumber)).filter(Boolean));
        if (layout) {
          setLayoutSize(layout.width || DEFAULT_LAYOUT_SIZE);
          setLayoutMachineCount(getLayoutMachineCount(layout));
          setLayoutSaved(true);
        } else {
          setLayoutSaved(false);
        }
        resetLayoutAccess();
      })
      .catch(() => setError("Failed to load machine form data"));

    return () => {
      active = false;
    };
  }, [companyParam, isEditMode]);

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");

    try {
      const payload = {
        ...form,
        company,
      };
      if (isEditMode) {
        await machineApi.update(id, payload);
        navigate("/machines");
        return;
      }

      await machineApi.create({
        ...payload,
        layoutWidth: layoutSize,
        layoutLength,
        machineCount,
      });
      navigate("/machines");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save machine");
    } finally {
      setSaving(false);
    }
  };

  const requestLayoutEdit = () => {
    setLayoutPassword("");
    setLayoutPasswordError("");
    setShowPasswordPrompt(true);
  };

  const confirmAdminPassword = async (event) => {
    event.preventDefault();
    setLayoutSaving(true);
    setLayoutPasswordError("");

    try {
      await authApi.verifyPassword({ password: layoutPassword });
      setLayoutUnlocked(true);
      setShowPasswordPrompt(false);
    } catch (err) {
      setLayoutPasswordError(err.response?.data?.message || "Admin password is incorrect");
    } finally {
      setLayoutSaving(false);
    }
  };

  const saveLayout = async () => {
    if (!company) {
      setError("Select a company before saving the layout");
      return;
    }

    setLayoutSaving(true);
    setError("");

    try {
      await machineApi.saveCompanyLayout({
        company,
        layoutWidth: layoutSize,
        layoutLength,
        machineCount,
        adminPassword: layoutPassword || undefined,
      });
      setLayoutSaved(true);
      resetLayoutAccess();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update layout");
    } finally {
      setLayoutSaving(false);
    }
  };

  return (
    <div>
      <h1>{isEditMode ? "Edit Machine" : "Add Machine"}</h1>
      {error && <div className="error-banner">{error}</div>}

      <div className={isEditMode ? "" : "add-machine-layout"}>
        <form className="detail-form add-machine-form" onSubmit={submit}>
          <label>Machine ID</label>
          <input value={form.machineId} onChange={handleChange("machineId")} required />

          <label>Machine Name</label>
          <input value={form.machineName} onChange={handleChange("machineName")} required />

          <label>Machine Number</label>
          {isEditMode ? (
            <input value={form.machineNumber} onChange={handleChange("machineNumber")} required />
          ) : (
            <select value={form.machineNumber} onChange={handleChange("machineNumber")} required>
              <option value="">Select layout number</option>
              {availableMachineNumbers.map((machineNumber) => (
                <option key={machineNumber} value={machineNumber}>
                  Machine {machineNumber}
                </option>
              ))}
            </select>
          )}

          <label>Machine Type</label>
          <input value={form.machineType} onChange={handleChange("machineType")} />

          <label>Company</label>
          <input value={company} readOnly required placeholder="Select a company first" />

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

          <label>Machine Image URL</label>
          <input value={form.machineImage} onChange={handleChange("machineImage")} />

          <button type="submit" disabled={saving}>
            {saving ? "Saving..." : isEditMode ? "Update Machine" : "Save Machine"}
          </button>

          <Link to="/machines" className="btn-secondary">
            Back to Machines
          </Link>
        </form>

        {!isEditMode && (
          <section className="machine-layout-card" aria-labelledby="machine-layout-title">
            <div className="machine-layout-heading">
              <div>
                <h2 id="machine-layout-title">Machine Layout</h2>
                <p>Choose a layout to preview the machine positions.</p>
              </div>
              <span className="layout-size-badge">
                {layoutSize} x {layoutLength} | {machineCount} slots
              </span>
            </div>

            {layoutSaved && (
              <div className="layout-lock-banner">
                <span>
                  {layoutUnlocked
                    ? "Layout unlocked for editing."
                    : "Layout saved. Use the password flow to edit it."}
                </span>
                <button type="button" className="btn-ghost" onClick={requestLayoutEdit} disabled={layoutUnlocked}>
                  {layoutUnlocked ? "Already unlocked" : "Edit with Admin Password"}
                </button>
              </div>
            )}

            <div className="layout-selector" aria-label="Select machine layout size">
              {layoutOptions.map((row) => (
                <div className="layout-option-row" key={row[0]}>
                  {row.map((size) => (
                    <button
                      key={size}
                      type="button"
                      className={`layout-option ${layoutSize === size ? "active" : ""}`}
                      onClick={() => {
                        if (!layoutUnlocked && layoutSaved) return;
                        setLayoutSize(size);
                        setLayoutMachineCount(size * size);
                      }}
                      aria-pressed={layoutSize === size}
                      disabled={layoutSaved && !layoutUnlocked}
                    >
                      Layout {size}
                    </button>
                  ))}
                </div>
              ))}
            </div>

            <label className="layout-length-input">
              <span>Machine slots</span>
              <div className="layout-stepper">
                <button
                  type="button"
                  className="layout-stepper-btn"
                  onClick={() => {
                    if (!layoutUnlocked && layoutSaved) return;
                    setLayoutMachineCount((current) => Math.max(1, Number(current) - 1));
                  }}
                  disabled={layoutSaved && !layoutUnlocked}
                >
                  -
                </button>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={machineCount}
                  onChange={(event) => {
                    if (!layoutUnlocked && layoutSaved) return;
                    const value = event.target.value;
                    setLayoutMachineCount(value === "" ? "" : Math.min(50, Math.max(1, Number(value))));
                  }}
                  disabled={layoutSaved && !layoutUnlocked}
                />
                <button
                  type="button"
                  className="layout-stepper-btn"
                  onClick={() => {
                    if (!layoutUnlocked && layoutSaved) return;
                    setLayoutMachineCount((current) => Math.min(50, Number(current) + 1));
                  }}
                  disabled={layoutSaved && !layoutUnlocked}
                >
                  +
                </button>
              </div>
              <small>Add one machine at a time. Width stays at {layoutSize} columns.</small>
            </label>

            <div className="orientation-key" aria-label="Layout orientation">
              <span><strong>N</strong> North (top)</span>
              <span><strong>E</strong> East (right)</span>
              <span><strong>S</strong> South (bottom)</span>
              <span><strong>W</strong> West (left)</span>
            </div>

            <div className="layout-preview-scroll">
              <div className="machine-layout-preview">
                <div className="width-direction"><span>W</span><strong>Width -&gt;</strong><span>E</span></div>
                <div className="layout-map-row">
                  <div className="north-south-label north">N</div>
                  <div
                    className="machine-grid"
                    style={{ "--layout-size": layoutSize }}
                    aria-label={`${layoutSize} columns and ${layoutLength} rows, with ${machineCount} machine slots.`}
                  >
                    {layoutCells.map(({ row, column, machineNumber }) => (
                      <div className="machine-layout-cell" key={`${row}-${column}`}>
                        <span>R{row}</span>
                        <strong>{machineNumber}</strong>
                        <span>C{column}</span>
                      </div>
                    ))}
                  </div>
                  <div className="north-south-label south">S</div>
                </div>
                <div className="length-direction"><span>N</span><strong>Length v</strong><span>S</span></div>
              </div>
            </div>

            <div className="layout-actions">
              <button type="button" className="btn-primary" onClick={saveLayout} disabled={layoutSaving}>
                {layoutSaving ? "Saving Layout..." : layoutSaved ? "Save Layout Changes" : "Save Layout"}
              </button>
              {layoutUnlocked && (
                <button type="button" className="btn-secondary" onClick={resetLayoutAccess} disabled={layoutSaving}>
                  Cancel Editing
                </button>
              )}
            </div>
          </section>
        )}
      </div>

      {showPasswordPrompt && (
        <div className="modal-overlay" onClick={() => setShowPasswordPrompt(false)}>
          <div className="modal-box layout-password-modal" onClick={(event) => event.stopPropagation()}>
            <h3 className="mj-modal-title">Confirm Admin Password</h3>
            <form onSubmit={confirmAdminPassword} className="layout-password-form">
              <label className="mj-label">Admin password</label>
              <input
                className="mj-input"
                type="password"
                value={layoutPassword}
                onChange={(event) => setLayoutPassword(event.target.value)}
                autoFocus
              />
              {layoutPasswordError && <p className="mj-error">{layoutPasswordError}</p>}
              <div className="mj-footer">
                <button type="button" className="btn-ghost" onClick={() => setShowPasswordPrompt(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={layoutSaving}>
                  {layoutSaving ? "Checking..." : "Unlock Layout"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
