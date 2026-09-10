import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { authApi, machineApi } from "../api/endpoints";
import { MACHINE_CATEGORIES, MACHINE_TYPE_OPTIONS } from "../constants/machineCategories";

const empty = {
  machineId: "",
  machineName: "",
  machineNumber: "",
  machineType: "",
  machineCategory: "loom",
  company: "",
  modelNumber: "",
  serialNumber: "",
  purchaseDate: "",
  installationDate: "",
  warrantyExpiry: "",
  section: "",
  shed: "",
  brand: "",
  rpm: "",
  width: "",
  assignedEngineer: "",
  notes: "",
  pressure: "",
  temperature: "",
  oilLevel: "",
  oilFilterStatus: "",
  airFilterStatus: "",
  separatorCondition: "",
  differentialPressure: "",
  oilCarryoverStatus: "",
  separatorElementStatus: "",
  oRingOrSealStatus: "",
  coolantLevel: "",
  inletPressure: "",
  outletPressure: "",
  dewPoint: "",
  drainStatus: "",
  filterCondition: "",
  cleaningStatus: "",
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
  const [searchParams] = useSearchParams();
  const company = searchParams.get("company") || "";
  const categoryParam = searchParams.get("category") || "";
  const lockedMeta = categoryParam ? MACHINE_CATEGORIES[categoryParam] : null;
  const isLockedCategory = Boolean(lockedMeta);
  const sectionName = lockedMeta?.single || "Machine";
  const backRoute = lockedMeta?.route || "/machines";
  const [form, setForm] = useState({ ...empty, machineCategory: searchParams.get("category") || "loom" });
  const activeType = MACHINE_CATEGORIES[form.machineCategory]?.single || "Machine";
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [usedMachineNumbers, setUsedMachineNumbers] = useState([]);
  const [savedMachine, setSavedMachine] = useState(null);
  const [layoutSaved, setLayoutSaved] = useState(false);
  const [layoutSize, setLayoutSize] = useState(2);
  const [layoutMachineCount, setLayoutMachineCount] = useState(DEFAULT_LAYOUT_MACHINE_COUNT);
  const [layoutUnlocked, setLayoutUnlocked] = useState(false);
  const [layoutPassword, setLayoutPassword] = useState("");
  const [layoutPasswordError, setLayoutPasswordError] = useState("");
  const [layoutSaving, setLayoutSaving] = useState(false);
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);

  const handleChange = (field) => (e) => setForm({ ...form, [field]: e.target.value });
  const resetLayoutAccess = () => {
    setLayoutUnlocked(false);
    setLayoutPassword("");
    setLayoutPasswordError("");
    setShowPasswordPrompt(false);
  };

  const machineCount = Math.max(1, Number(layoutMachineCount) || 1);
  const layoutLength = Math.max(1, Math.ceil(machineCount / layoutSize));
  const layoutCells = Array.from({ length: machineCount }, (_, index) => {
    const row = Math.floor(index / layoutSize) + 1;
    const column = (index % layoutSize) + 1;
    const rowBand = Math.floor((row - 1) / 2);
    const rowInBand = (row - 1) % 2;
    const machineNumber =
      rowBand * layoutSize * 2 + (layoutSize - column) * 2 + rowInBand + 1;

    return { row, column, machineNumber };
  });
  const availableMachineNumbers = layoutCells
    .map(({ machineNumber }) => String(machineNumber))
    .filter((machineNumber) =>
      !usedMachineNumbers.includes(machineNumber) || machineNumber === form.machineNumber
    );

  const isSaved = Boolean(savedMachine);
  const canEditLayout = !layoutSaved || layoutUnlocked;

  useEffect(() => {
    if (savedMachine || !company) return;

    let active = true;
    Promise.all([
      machineApi.companyLayout(company),
      machineApi.list({ company, limit: 1000 }),
    ])
      .then(([layoutRes, machinesRes]) => {
        if (!active) return;
        const layout = layoutRes.data.data;
        setUsedMachineNumbers(
          machinesRes.data.data
            .map((machine) => String(machine.machineNumber))
            .filter(Boolean)
        );
        if (layout) {
          setLayoutSize(layout.width);
          setLayoutMachineCount(getLayoutMachineCount(layout));
          setLayoutSaved(true);
        } else {
          setLayoutSaved(false);
        }
        resetLayoutAccess();
      })
      .catch(() => {
        if (active) setError("Failed to load the company layout");
      });

    return () => {
      active = false;
    };
  }, [company, savedMachine]);

  const submit = async (e) => {
    e.preventDefault();
    if (isSaved) return;

    setSaving(true);
    setError("");

    try {
      const res = await machineApi.create({
        ...form,
        company,
        layoutWidth: layoutSize,
        layoutLength,
        machineCount,
      });

      const machine = res.data.data;
      setSavedMachine(machine);
      setLayoutSaved(true);
      setLayoutSize(machine.layout?.width || layoutSize);
      setLayoutMachineCount(getLayoutMachineCount(machine.layout));
      resetLayoutAccess();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create machine");
    } finally {
      setSaving(false);
    }
  };

  const requestLayoutEdit = () => {
    setLayoutPassword("");
    setLayoutPasswordError("");
    setShowPasswordPrompt(true);
  };

  const confirmAdminPassword = async (e) => {
    e.preventDefault();
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

      if (savedMachine) {
        const res = await machineApi.updateLayout(savedMachine._id, {
          layoutWidth: layoutSize,
          layoutLength,
          machineCount,
          adminPassword: layoutPassword,
        });
        setSavedMachine(res.data.data);
      }
      setLayoutSaved(true);
      resetLayoutAccess();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update layout");
    } finally {
      setLayoutSaving(false);
    }
  };

  const startAnotherMachine = () => {
    setForm({ ...empty, machineCategory: categoryParam || "loom" });
    setSavedMachine(null);
    setLayoutSaved(false);
    setLayoutSize(DEFAULT_LAYOUT_SIZE);
    setLayoutMachineCount(DEFAULT_LAYOUT_MACHINE_COUNT);
    resetLayoutAccess();
    setError("");
  };

  return (
    <div>
      <h1>{isLockedCategory ? `Add ${sectionName}` : "Add Machine"}</h1>
      {error && <div className="error-banner">{error}</div>}

      <div className="add-machine-layout">
        <form className="detail-form add-machine-form" onSubmit={submit}>
          {isLockedCategory && (
            <p className="locked-category-note">
              Adding a new {sectionName} to the {lockedMeta.label} section.
            </p>
          )}
          {!isLockedCategory && (
            <>
              <label>Machine Category</label>
              <select value={form.machineCategory} onChange={handleChange("machineCategory")} required>
                {MACHINE_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </>
          )}

          <label>{activeType} ID</label>
          <input value={form.machineId} onChange={handleChange("machineId")} required />

          <label>{activeType} Name</label>
          <input value={form.machineName} onChange={handleChange("machineName")} required />

          <label>{activeType} Number</label>
          <select value={form.machineNumber} onChange={handleChange("machineNumber")} required>
            <option value="">Select {activeType} number</option>
            {availableMachineNumbers.map((machineNumber) => (
              <option key={machineNumber} value={machineNumber}>
                {activeType} {machineNumber}
              </option>
            ))}
          </select>

          {form.machineCategory === "loom" && (
            <>
              <label>Machine Type</label>
              <input value={form.machineType} onChange={handleChange("machineType")} placeholder="e.g. Air Jet" />
            </>
          )}

          <label>Company</label>
          <input value={company} readOnly required placeholder="Select a company first" />

          <label>Brand</label>
          <input value={form.brand} onChange={handleChange("brand")} />

          <label>Model Number</label>
          <input value={form.modelNumber} onChange={handleChange("modelNumber")} />

          <label>Serial Number</label>
          <input value={form.serialNumber} onChange={handleChange("serialNumber")} />

          <label>Section</label>
          <input value={form.section} onChange={handleChange("section")} placeholder="e.g. Weaving Shed 1" />

          <label>Shed</label>
          <input value={form.shed} onChange={handleChange("shed")} placeholder="e.g. A" />

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
              <input value={form.oilLevel} onChange={handleChange("oilLevel")} placeholder="e.g. Low / Normal / High" />
              <label>Oil Filter Status</label>
              <input value={form.oilFilterStatus} onChange={handleChange("oilFilterStatus")} placeholder="e.g. OK / Due / Clogged" />
              <label>Air Filter Status</label>
              <input value={form.airFilterStatus} onChange={handleChange("airFilterStatus")} placeholder="e.g. OK / Due / Clogged" />
              <label>Separator Condition</label>
              <input value={form.separatorCondition} onChange={handleChange("separatorCondition")} placeholder="e.g. Good / Due / Failing" />
              <label>Differential Pressure</label>
              <input type="number" step="0.1" value={form.differentialPressure} onChange={handleChange("differentialPressure")} />
              <label>Oil Carryover Status</label>
              <input value={form.oilCarryoverStatus} onChange={handleChange("oilCarryoverStatus")} placeholder="e.g. Normal / Above Limit" />
              <label>Separator Element Status</label>
              <input value={form.separatorElementStatus} onChange={handleChange("separatorElementStatus")} placeholder="e.g. OK / Due for replacement" />
              <label>O-ring / Seal Status</label>
              <input value={form.oRingOrSealStatus} onChange={handleChange("oRingOrSealStatus")} placeholder="e.g. OK / Worn" />
              <label>Coolant Level</label>
              <input value={form.coolantLevel} onChange={handleChange("coolantLevel")} placeholder="e.g. Low / Normal / High" />
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
              <input value={form.drainStatus} onChange={handleChange("drainStatus")} placeholder="e.g. Auto OK / Manual / Clogged" />
              <label>Filter Condition</label>
              <input value={form.filterCondition} onChange={handleChange("filterCondition")} placeholder="e.g. Good / Due / Replace" />
              <label>Cleaning Status</label>
              <input value={form.cleaningStatus} onChange={handleChange("cleaningStatus")} placeholder="e.g. Cleaned / Due" />
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

          <button type="submit" disabled={saving || isSaved}>
            {saving ? "Saving..." : isSaved ? `${sectionName} Saved` : `Save ${sectionName}`}
          </button>

          <Link to={`${backRoute}${company ? `?company=${encodeURIComponent(company)}` : ""}`} className="btn-secondary">
            {isLockedCategory ? `Back to ${lockedMeta.label}` : "Back to Companies"}
          </Link>

          {isSaved && (
            <button type="button" className="btn-secondary" onClick={startAnotherMachine}>
              Create Another {sectionName}
            </button>
          )}
        </form>

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
                  : isSaved
                    ? "Layout locked after save."
                    : "Layout saved. Save the machine to persist it."}
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
                      if (!canEditLayout) return;
                      setLayoutSize(size);
                      setLayoutMachineCount(size * size);
                    }}
                    aria-pressed={layoutSize === size}
                    disabled={!canEditLayout}
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
                  if (!canEditLayout) return;
                  setLayoutMachineCount((current) => Math.max(1, Number(current) - 1));
                }}
                disabled={!canEditLayout || machineCount <= 1}
                aria-label="Remove one machine slot"
              >
                -
              </button>
              <input
                type="number"
                min="1"
                max="50"
                value={machineCount}
                onChange={(event) => {
                  if (!canEditLayout) return;
                  const value = event.target.value;
                  setLayoutMachineCount(value === "" ? "" : Math.min(50, Math.max(1, Number(value))));
                }}
                disabled={!canEditLayout}
              />
              <button
                type="button"
                className="layout-stepper-btn"
                onClick={() => {
                  if (!canEditLayout) return;
                  setLayoutMachineCount((current) => Math.min(50, Number(current) + 1));
                }}
                disabled={!canEditLayout || machineCount >= 50}
                aria-label="Add one machine slot"
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
                  aria-label={`${layoutSize} columns and ${layoutLength} rows, with ${machineCount} machine slots. North is at the top and West is on the left.`}
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
            <button
              type="button"
              className="btn-primary"
              onClick={saveLayout}
              disabled={!canEditLayout || layoutSaving}
            >
              {layoutSaving ? "Saving Layout..." : layoutSaved ? "Save Layout Changes" : "Save Layout"}
            </button>
            {layoutUnlocked && (
              <button type="button" className="btn-secondary" onClick={resetLayoutAccess} disabled={layoutSaving}>
                Cancel Editing
              </button>
            )}
          </div>
        </section>
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
