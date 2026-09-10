import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { machineApi, oilChangeApi, maintenanceApi, maintenanceJobApi, uploadApi } from "../api/endpoints";
import { useAuth } from "../context/AuthContext";
import CompressorMaintenanceTab from "../components/CompressorMaintenanceTab";
import AirDryerMaintenanceTab from "../components/AirDryerMaintenanceTab";
import { categoryLabel, orNa } from "../constants/machineCategories";

const TABS = [
  "Info",
  "Maintenance History",
  "Oil Change History",
  "Spare Parts",
  "Compressor Maintenance",
  "Air Dryer Maintenance",
  "Documents",
];

const getStatusClass = (status) => {
  switch (status) {
    case "Running":        return "green";
    case "Stopped":        return "blue";
    case "Under Maintenance": return "orange";
    case "Breakdown":     return "red";
    case "Idle":          return "gray";
    default:              return "gray";
  }
};

export default function MachineDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [activeTab, setActiveTab] = useState("Info");
  const [error, setError] = useState("");
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const loadData = () => {
    machineApi
      .getById(id)
      .then((res) => setData(res.data.data))
      .catch((err) => setError(err.response?.data?.message || "Failed to load machine"));
  };

  useEffect(() => { loadData(); }, [id]);

  if (error) return <div className="error-banner">{error}</div>;
  if (!data)  return <div>Loading...</div>;

  const { machine, maintenanceHistory, oilChangeHistory, spareHistory, upcomingMaintenance, costSummary, compressorMaintenance, airDryerMaintenance } = data;
  // Documents are part of the employee/GM reporting workflow, not an
  // admin/owner machine-management feature.
  const visibleTabs = TABS.filter(
    (tab) => tab !== "Documents" || ["employee", "general_manager"].includes(user?.role)
  );

  const updateMachineStatus = async (status) => {
    setUpdatingStatus(true);
    setError("");
    try {
      const response = await machineApi.updateStatus(id, status);
      setData((current) => ({
        ...current,
        machine: { ...current.machine, status: response.data.data.status },
      }));
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update machine status");
    } finally {
      setUpdatingStatus(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1>{machine.machineName}</h1>
        <div>
          <span className={`category-badge ${machine.machineCategory}`}>
            {categoryLabel(machine.machineCategory)}
          </span>
          <span className={`status-badge ${getStatusClass(machine.status)}`}>{machine.status}</span>
          {["admin", "employee"].includes(user?.role) && (
            <select
              aria-label="Machine status"
              value={machine.status}
              disabled={updatingStatus}
              onChange={(event) => updateMachineStatus(event.target.value)}
              style={{ marginLeft: "12px" }}
            >
              <option>Running</option>
              <option>Stopped</option>
              <option>Under Maintenance</option>
              <option>Breakdown</option>
              <option>Idle</option>
            </select>
          )}
        </div>
      </div>

      <div className="tabs">
        {visibleTabs.map((tab) => (
          <button
            key={tab}
            className={activeTab === tab ? "tab active" : "tab"}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === "Info" && (
        <div className="info-grid">
          <div><strong>Machine Number:</strong> {machine.machineNumber}</div>
          <div><strong>Machine Category:</strong> {categoryLabel(machine.machineCategory)}</div>
          {machine.machineCategory === "loom" && (
            <div><strong>Machine Type:</strong> {orNa(machine.machineType)}</div>
          )}
          <div><strong>Company:</strong> {machine.company}</div>
          <div><strong>Brand:</strong> {machine.brand || "—"}</div>
          <div><strong>Model:</strong> {machine.modelNumber}</div>
          <div><strong>Serial Number:</strong> {machine.serialNumber}</div>
          <div><strong>Section:</strong> {machine.section || "—"}</div>
          <div><strong>Shed:</strong> {machine.shed || "—"}</div>
          {machine.machineCategory === "loom" && (
            <>
              <div><strong>RPM:</strong> {orNa(machine.rpm)}</div>
              <div><strong>Width:</strong> {machine.width ? `${machine.width} cm` : "—"}</div>
            </>
          )}

          {machine.machineCategory === "compressor" && (
            <>
              <div><strong>Pressure:</strong> {machine.pressure ? `${machine.pressure} bar` : "—"}</div>
              <div><strong>Temperature:</strong> {machine.temperature ? `${machine.temperature} °C` : "—"}</div>
              <div><strong>Oil Level:</strong> {orNa(machine.oilLevel)}</div>
              <div><strong>Oil Filter Status:</strong> {orNa(machine.oilFilterStatus)}</div>
              <div><strong>Air Filter Status:</strong> {orNa(machine.airFilterStatus)}</div>
              <div><strong>Separator Condition:</strong> {orNa(machine.separatorCondition)}</div>
              <div><strong>Differential Pressure:</strong> {orNa(machine.differentialPressure)}</div>
              <div><strong>Oil Carryover Status:</strong> {orNa(machine.oilCarryoverStatus)}</div>
              <div><strong>Separator Element Status:</strong> {orNa(machine.separatorElementStatus)}</div>
              <div><strong>O-ring / Seal Status:</strong> {orNa(machine.oRingOrSealStatus)}</div>
              <div><strong>Coolant Level:</strong> {orNa(machine.coolantLevel)}</div>
            </>
          )}

          {machine.machineCategory === "air_dryer" && (
            <>
              <div><strong>Inlet Pressure:</strong> {machine.inletPressure ? `${machine.inletPressure} bar` : "—"}</div>
              <div><strong>Outlet Pressure:</strong> {machine.outletPressure ? `${machine.outletPressure} bar` : "—"}</div>
              <div><strong>Dew Point:</strong> {machine.dewPoint ? `${machine.dewPoint} °C` : "—"}</div>
              <div><strong>Drain Status:</strong> {orNa(machine.drainStatus)}</div>
              <div><strong>Filter Condition:</strong> {orNa(machine.filterCondition)}</div>
              <div><strong>Cleaning Status:</strong> {orNa(machine.cleaningStatus)}</div>
            </>
          )}
          <div><strong>Running Hours:</strong> {machine.runningHours ?? 0}</div>
          <div><strong>Total Downtime:</strong> {machine.totalDowntime ? `${machine.totalDowntime} min` : "0 min"}</div>
          <div>
            <strong>Last Maintenance:</strong>{" "}
            {machine.lastMaintenanceDate ? new Date(machine.lastMaintenanceDate).toLocaleDateString() : "—"}
          </div>
          <div>
            <strong>Next Maintenance:</strong>{" "}
            {machine.nextMaintenanceDate ? new Date(machine.nextMaintenanceDate).toLocaleDateString() : "—"}
          </div>
          <div>
            <strong>Warranty Expiry:</strong>{" "}
            {machine.warrantyExpiry ? new Date(machine.warrantyExpiry).toLocaleDateString() : "-"}
          </div>
          {upcomingMaintenance && (
            <div>
              <strong>Upcoming Scheduled Maintenance:</strong>{" "}
              {new Date(upcomingMaintenance.nextMaintenanceDate).toLocaleDateString()}
            </div>
          )}
          <div>
            <strong>Assigned Employees:</strong>{" "}
            {machine.assignedEmployees?.map((e) => e.name).join(", ") || "None"}
          </div>
          <div><strong>Assigned Engineer:</strong> {machine.assignedEngineer || "—"}</div>
          <div>
            <strong>Total Maintenance Jobs:</strong> {costSummary?.totalJobCount ?? 0}
          </div>
          <div>
            <strong>Total Spare Cost:</strong>{" "}
            <span className="job-cost">${(costSummary?.totalSpareCost ?? 0).toFixed(2)}</span>
          </div>
          {machine.notes && <div><strong>Notes:</strong> {machine.notes}</div>}
        </div>
      )}

      {activeTab === "Maintenance History" && (
        <>
          {((compressorMaintenance?.length || 0) + (airDryerMaintenance?.length || 0)) > 0 && (
            <div className="summary-strip">
              {compressorMaintenance?.length > 0 && (
                <span className="summary-chip">Compressor maintenance logs: {compressorMaintenance.length}</span>
              )}
              {airDryerMaintenance?.length > 0 && (
                <span className="summary-chip">Air dryer maintenance logs: {airDryerMaintenance.length}</span>
              )}
              <span className="muted">Details in the Compressor / Air Dryer Maintenance tabs.</span>
            </div>
          )}
          <MaintenanceTab machineId={id} records={maintenanceHistory} onSaved={loadData} userRole={user?.role} />
        </>
      )}

      {activeTab === "Oil Change History" && (
        <OilChangeTab machineId={id} records={oilChangeHistory} onSaved={loadData} userRole={user?.role} />
      )}

      {activeTab === "Spare Parts" && (
        <SparePartsTab machineId={id} legacySpares={spareHistory} userRole={user?.role} />
      )}

      {activeTab === "Compressor Maintenance" && (
        <CompressorMaintenanceTab machineId={id} userRole={user?.role} />
      )}

      {activeTab === "Air Dryer Maintenance" && (
        <AirDryerMaintenanceTab machineId={id} userRole={user?.role} />
      )}

      {activeTab === "Documents" && (
        <DocumentsTab machineId={id} documents={machine.documents} onSaved={loadData} userRole={user?.role} />
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   SPARE PARTS TAB  — Maintenance Job Flow
   Steps: Why stopped → Downtime → Engineer
          started → Work done → Engineer finished
          → Spares used → Cost → Final status
          → Next maintenance
───────────────────────────────────────────── */

const FLOW_STEPS = [
  { label: "Why Stopped", icon: "⚠️" },
  { label: "Spares Used", icon: "🔩" },
  { label: "Cost & Resolution", icon: "✅" },
];

const STATUS_COLORS = {
  Resolved:        "#22c55e",
  "Partially Fixed": "#f59e0b",
  Escalated:       "#ef4444",
  Pending:         "#6b7280",
};

const SIMPLE_FLOW_STEPS = ["Why Stopped", "Were Spares Used?", "Spares Used"];

const emptyJob = () => ({
  whyStopped:          "",
  sparesRequired:      "",
  sparesUsed:          [],
});

const emptySpare = () => ({ spareName: "", spareNumber: "", quantity: 1, price: "", photo: null });

function SparePartsTab({ machineId, legacySpares, userRole }) {
  const [jobs, setJobs]           = useState([]);
  const [loading, setLoading]     = useState(true);
  const [showForm, setShowForm]   = useState(false);
  const [step, setStep]           = useState(0);
  const [form, setForm]           = useState(emptyJob());
  const [saving, setSaving]       = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [formError, setFormError] = useState("");
  const [editingJobId, setEditingJobId] = useState(null);

  const canSubmitReport = userRole === "employee";
  const canEditReports = userRole === "general_manager";

  const fetchJobs = () => {
    maintenanceJobApi
      .list({ machine: machineId })
      .then((res) => setJobs(res.data.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchJobs(); }, [machineId]);

  const openForm = (job = null) => {
    setForm(job ? {
      whyStopped: job.whyStopped || "",
      sparesRequired: job.sparesUsed?.length ? "yes" : "no",
      sparesUsed: (job.sparesUsed || []).map((spare) => ({ ...spare, photo: null })),
    } : emptyJob());
    setEditingJobId(job?._id || null);
    setStep(0);
    setFormError("");
    setShowForm(true);
  };
  const closeForm = () => {
    setShowForm(false);
    setEditingJobId(null);
  };

  // Spare rows helpers
  const addSpare = () =>
    setForm((f) => ({ ...f, sparesUsed: [...f.sparesUsed, emptySpare()] }));
  const removeSpare = (i) =>
    setForm((f) => ({ ...f, sparesUsed: f.sparesUsed.filter((_, idx) => idx !== i) }));
  const updateSpare = (i, field, val) =>
    setForm((f) => {
      const s = [...f.sparesUsed];
      s[i] = { ...s[i], [field]: val };
      return { ...f, sparesUsed: s };
    });

  const visibleSteps = form.sparesRequired === "no" ? SIMPLE_FLOW_STEPS.slice(0, 2) : SIMPLE_FLOW_STEPS;

  const validateStep = () => {
    if (step === 0) {
      if (!form.whyStopped.trim()) return "Please enter why the machine stopped.";
    }
    if (step === 1) {
      if (!form.sparesRequired) return "Please select Yes or No.";
    }
    if (step === 2) {
      for (const s of form.sparesUsed) {
        if (!s.spareName.trim()) return "Each spare part must have a name.";
      }
    }
    return "";
  };

  const nextStep = () => {
    const err = validateStep();
    if (err) { setFormError(err); return; }
    setFormError("");
    setStep((s) => s + 1);
  };
  const prevStep = () => {
    setFormError("");
    setStep((s) => s - 1);
  };

  const submit = async () => {
    const err = validateStep();
    if (err) { setFormError(err); return; }
    setSaving(true);
    try {
      const sparesUsed = form.sparesRequired === "yes"
        ? await Promise.all(form.sparesUsed.map(async ({ photo, price, ...spare }) => ({
          ...spare,
          price: price === "" ? 0 : Number(price) || 0,
          totalCost: (Number(spare.quantity) || 0) * (price === "" ? 0 : Number(price) || 0),
          photoUrl: photo ? (await uploadApi.single(photo)).data.data.url : "",
        })))
        : [];
      const payload = {
        machine: machineId,
        whyStopped: form.whyStopped,
        sparesUsed,
      };
      if (editingJobId) await maintenanceJobApi.update(editingJobId, payload);
      else await maintenanceJobApi.create(payload);
      closeForm();
      fetchJobs();
    } catch (e) {
      setFormError(e.response?.data?.message || "Failed to save job.");
    } finally {
      setSaving(false);
    }
  };

  const jobTotal = (job) =>
    (job.sparesUsed || []).reduce((sum, s) => sum + (Number(s.totalCost) || Number(s.price) * Number(s.quantity) || 0), 0);

  const photoUrl = (photo) => (photo ? new URL(photo, import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api").href : "");

  return (
    <div className="spare-parts-tab">
      {/* Header */}
      <div className="sp-header">
        <div>
          <h2 className="sp-title">Maintenance Job Log</h2>
          <p className="sp-subtitle">Record why the machine stopped, any spares used, and the next maintenance date.</p>
        </div>
        {canSubmitReport && <button className="btn-primary" onClick={() => openForm()}>+ Submit Report</button>}
      </div>

      {/* Flow legend */}
      <div className="flow-legend">
        {visibleSteps.map((label, i, arr) => (
          <span key={label} className="flow-step-pill">
            <span className="flow-pill-num">{i + 1}</span>
            {label}
            {i < arr.length - 1 && <span className="flow-arrow">›</span>}
          </span>
        ))}
      </div>

      {/* Job cards */}
      {loading && <p className="sp-loading">Loading jobs…</p>}
      {!loading && jobs.length === 0 && (
        <div className="sp-empty">
          <span className="sp-empty-icon">🔩</span>
          <p>No maintenance jobs logged yet.</p>
          {canSubmitReport && <button className="btn-primary" onClick={() => openForm()}>Submit First Report</button>}
        </div>
      )}

      <div className="job-list">
        {jobs.map((job) => {
          const isOpen = expandedId === job._id;
          return (
            <div key={job._id} className="job-card">
              {/* Card header */}
              <div className="job-card-header" onClick={() => setExpandedId(isOpen ? null : job._id)}>
                <div className="job-card-left">
                  <div>
                    <strong className="job-why">{job.whyStopped}</strong>
                    <span className="job-meta">
                      {new Date(job.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <div className="job-card-right">
                  <span className="job-chevron">{isOpen ? "▲" : "▼"}</span>
                </div>
              </div>

              {/* Expanded detail — 9-step timeline */}
              {isOpen && (
                <div className="job-detail">
                  <div className="job-timeline">
                    <TimelineRow num="1" label="Why Stopped"      value={job.whyStopped} />
                    <TimelineRow
                      num="2"
                      label="Spares Used"
                      value={
                        job.sparesUsed?.length
                          ? job.sparesUsed.map((s) => `${s.spareName} ×${s.quantity}`).join(", ")
                          : "None"
                      }
                    />
                  </div>

                  {job.sparesUsed?.length > 0 && (
                    <div className="spares-table-wrap">
                      <table className="spares-table">
                        <thead>
                          <tr>
                            <th>Spare Name</th>
                            <th>Part #</th>
                            <th>Qty</th>
                            <th>Price</th>
                            <th>Total</th>
                            <th>Photo</th>
                          </tr>
                        </thead>
                        <tbody>
                          {job.sparesUsed.map((s, i) => (
                            <tr key={i}>
                              <td>{s.spareName}</td>
                              <td>{s.spareNumber || "—"}</td>
                              <td>{s.quantity}</td>
                              <td>{s.price ? `$${s.price}` : "—"}</td>
                              <td>
                                {s.totalCost
                                  ? `$${s.totalCost}`
                                  : s.price && s.quantity
                                    ? `$${(Number(s.price) * Number(s.quantity)).toFixed(2)}`
                                    : "—"}
                              </td>
                              <td>
                                {s.photoUrl
                                  ? <a href={photoUrl(s.photoUrl)} target="_blank" rel="noreferrer">
                                      <img src={photoUrl(s.photoUrl)} alt={`${s.spareName} spare part`} style={{ width: 48, height: 48, objectFit: "cover", borderRadius: 4 }} />
                                    </a>
                                  : "—"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr>
                            <td colSpan="4" style={{ textAlign: "right" }}><strong>Job Total:</strong></td>
                            <td colSpan="2" className="job-cost">
                              <strong>${jobTotal(job).toFixed(2)}</strong>
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  )}

                  {canEditReports && (
                    <div className="job-actions">
                      <button className="btn-primary" onClick={() => openForm(job)}>Edit Report</button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Legacy spare parts */}
      {legacySpares?.length > 0 && (
        <details className="legacy-spares">
          <summary>Legacy Spare Part Records ({legacySpares.length})</summary>
          <div className="record-list">
            {legacySpares.map((s) => (
              <div className="record-row" key={s._id}>
                <strong>{s.spareName}</strong> — Qty {s.quantity} — {new Date(s.replacementDate).toLocaleDateString()} — {s.reason}
                {s.price ? (
                  <span className="job-cost"> — ${((Number(s.price) || 0) * (Number(s.quantity) || 1)).toFixed(2)}</span>
                ) : null}
              </div>
            ))}
          </div>
        </details>
      )}

      {/* Multi-step modal */}
      {showForm && (
        <div className="modal-overlay" onClick={closeForm}>
          <div className="modal-box mj-modal" onClick={(e) => e.stopPropagation()}>
            {/* Step indicator */}
            <div className="mj-steps">
              {visibleSteps.map((label, i) => (
                <div key={i} className={`mj-step ${i === step ? "active" : i < step ? "done" : ""}`}>
                  <span className="mj-step-icon">{i < step ? "✓" : i + 1}</span>
                  <span className="mj-step-label">{label}</span>
                  {i < visibleSteps.length - 1 && <span className="mj-step-line" />}
                </div>
              ))}
            </div>

            <h3 className="mj-modal-title">
              {editingJobId ? `Edit Report — ${SIMPLE_FLOW_STEPS[step]}` : SIMPLE_FLOW_STEPS[step]}
            </h3>

            {/* Why Stopped */}
            {step === 0 && (
              <div className="mj-fields">
                <label className="mj-label">Why did the machine stop? <span className="req">*</span></label>
                <textarea
                  className="mj-input"
                  rows={3}
                  placeholder="Describe the reason for stoppage…"
                  value={form.whyStopped}
                  onChange={(e) => setForm({ ...form, whyStopped: e.target.value })}
                />

              </div>
            )}

            {step === 1 && (
              <div className="mj-fields">
                <label className="mj-label">Were Spares Used? <span className="req">*</span></label>
                <div className="status-options">
                  {["yes", "no"].map((answer) => (
                    <label key={answer} className={`status-opt ${form.sparesRequired === answer ? "selected" : ""}`}>
                      <input
                        type="radio"
                        name="sparesRequired"
                        value={answer}
                        checked={form.sparesRequired === answer}
                        onChange={() => setForm((current) => ({
                          ...current,
                          sparesRequired: answer,
                          sparesUsed: answer === "yes" && current.sparesUsed.length === 0
                            ? [{ spareName: "", spareNumber: "", quantity: 1, photo: null }]
                            : current.sparesUsed,
                        }))}
                      />
                      {answer === "yes" ? "Yes" : "No"}
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Spares Used */}
            {step === 2 && form.sparesRequired === "yes" && (
              <div className="mj-fields">
                <label className="mj-label">Spare Parts Used</label>
                {form.sparesUsed.map((s, i) => (
                  <div className="spare-row" key={i}>
                    <input
                      className="mj-input spare-name"
                      placeholder="Part name *"
                      value={s.spareName}
                      onChange={(e) => updateSpare(i, "spareName", e.target.value)}
                    />
                    <input
                      className="mj-input spare-num"
                      placeholder="Part #"
                      value={s.spareNumber}
                      onChange={(e) => updateSpare(i, "spareNumber", e.target.value)}
                    />
                    <input
                      className="mj-input spare-qty"
                      type="number"
                      min="1"
                      placeholder="Qty"
                      value={s.quantity}
                      onChange={(e) => updateSpare(i, "quantity", e.target.value)}
                    />
                    <input
                      className="mj-input spare-price"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="Price $"
                      value={s.price}
                      onChange={(e) => updateSpare(i, "price", e.target.value)}
                    />
                    <input
                      className="mj-input"
                      type="file"
                      accept="image/*"
                      aria-label={`Photo for spare part ${i + 1}`}
                      onChange={(e) => updateSpare(i, "photo", e.target.files?.[0] || null)}
                    />
                    {form.sparesUsed.length > 1 && (
                      <button className="spare-remove" onClick={() => removeSpare(i)}>✕</button>
                    )}
                  </div>
                ))}
                <span className="mj-subtotal">
                  Subtotal: ${form.sparesUsed.reduce(
                    (sum, s) => sum + (Number(s.quantity) || 0) * (Number(s.price) || 0),
                    0
                  ).toFixed(2)}
                </span>
                <button className="btn-add-spare" onClick={addSpare}>+ Add Spare Part</button>
              </div>
            )}


            {formError && <p className="mj-error">{formError}</p>}

            {/* Footer buttons */}
            <div className="mj-footer">
              {step > 0 && (
                <button className="btn-secondary" onClick={prevStep}>← Back</button>
              )}
              <button className="btn-ghost" onClick={closeForm}>Cancel</button>
              {step < SIMPLE_FLOW_STEPS.length - 1 && !(step === 1 && form.sparesRequired === "no") ? (
                <button className="btn-primary" onClick={nextStep}>Next →</button>
              ) : (
                <button className="btn-primary" onClick={submit} disabled={saving}>
                  {saving ? "Saving…" : editingJobId ? "Save Report" : "✓ Submit Report"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TimelineRow({ num, label, value, highlight }) {
  return (
    <div className="tl-row">
      <span className="tl-num">{num}</span>
      <span className="tl-label">{label}</span>
      <span className="tl-value" style={highlight ? { color: highlight, fontWeight: 600 } : {}}>
        {value}
      </span>
    </div>
  );
}

/* ─── Documents Tab ─── */
function DocumentsTab({ machineId, documents, onSaved, userRole }) {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const canManage = ["employee", "general_manager"].includes(userRole);
  const isImage = (url) => /\.(jpe?g|png|gif|webp)$/i.test(url) || url.includes("image");
  const isVideo = (url) => /\.(mp4|mov|avi|webm)$/i.test(url) || url.includes("video");

  const submit = async (e) => {
    e.preventDefault();
    if (files.length === 0) return;
    setUploading(true);
    setError("");
    try {
      const uploads = await Promise.all(
        files.map((file) => uploadApi.single(file))
      );
      const urls = uploads.map((res) => res.data.data.url);
      await machineApi.addDocuments(machineId, urls);
      setFiles([]);
      onSaved();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to upload documents");
    } finally {
      setUploading(false);
    }
  };

  const remove = async (url) => {
    if (!window.confirm("Remove this document from the machine?")) return;
    try {
      await machineApi.removeDocument(machineId, url);
      onSaved();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to remove document");
    }
  };

  return (
    <div>
      {error && <div className="error-banner">{error}</div>}

      {canManage && (
        <form className="inline-form" onSubmit={submit}>
          <input
            type="file"
            multiple
            accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.csv"
            onChange={(e) => setFiles(Array.from(e.target.files || []))}
            aria-label="Choose files to upload"
          />
          <button type="submit" disabled={uploading || files.length === 0}>
            {uploading ? "Uploading..." : `Upload ${files.length ? `(${files.length} files)` : ""}`}
          </button>
        </form>
      )}

      <div className="record-list">
        {(documents || []).map((doc, idx) => (
          <div className="record-row doc-row" key={idx}>
            {isImage(doc) ? (
              <a href={doc} target="_blank" rel="noreferrer">
                <img src={doc} alt={`Document ${idx + 1}`} style={{ width: 72, height: 54, objectFit: "cover", borderRadius: 4 }} />
              </a>
            ) : isVideo(doc) ? (
              <a href={doc} target="_blank" rel="noreferrer">
                <video src={doc} style={{ width: 100, height: 60, objectFit: "cover", borderRadius: 4 }} muted />
              </a>
            ) : (
              <a href={doc} target="_blank" rel="noreferrer">
                Document {idx + 1}
              </a>
            )}
            {canManage && (
              <button className="btn-danger-sm" onClick={() => remove(doc)}>Remove</button>
            )}
          </div>
        ))}
        {(!documents || documents.length === 0) && <p>No documents uploaded.</p>}
      </div>
    </div>
  );
}

/* ─── Maintenance History Tab (unchanged) ─── */
function MaintenanceTab({ machineId, records, onSaved, userRole }) {
  const [form, setForm] = useState({ maintenanceType: "Preventive", description: "", nextMaintenanceDate: "" });
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [error, setError] = useState("");

  const canEdit = ["admin", "general_manager", "employee"].includes(userRole);
  const canDelete = userRole === "admin";
  const isReadOnly = userRole === "owner";

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      await maintenanceApi.create({ ...form, machine: machineId });
      setForm({ maintenanceType: "Preventive", description: "", nextMaintenanceDate: "" });
      onSaved();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save maintenance record");
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (record) => {
    setEditingId(record._id);
    setEditForm({
      maintenanceType: record.maintenanceType || "Preventive",
      description: record.description || "",
      nextMaintenanceDate: record.nextMaintenanceDate
        ? record.nextMaintenanceDate.split("T")[0]
        : "",
      remarks: record.remarks || "",
      machineRunningHours: record.machineRunningHours || "",
    });
    setError("");
  };

  const saveEdit = async (e) => {
    e.preventDefault();
    if (!editForm) return;
    setSaving(true);
    setError("");
    try {
      await maintenanceApi.update(editingId, editForm);
      setEditingId(null);
      setEditForm(null);
      onSaved();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update maintenance record");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id) => {
    if (!window.confirm("Delete this maintenance record?")) return;
    try {
      await maintenanceApi.remove(id);
      onSaved();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to delete maintenance record");
    }
  };

  return (
    <div>
      {error && <div className="error-banner">{error}</div>}
      {!isReadOnly && (
        <form className="inline-form" onSubmit={submit}>
          <select value={form.maintenanceType} onChange={(e) => setForm({ ...form, maintenanceType: e.target.value })}>
            <option>Preventive</option>
            <option>Idle</option>
            <option>Breakdown</option>
            <option>Inspection</option>
            <option>Other</option>
          </select>
          <input
            placeholder="Description"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <input
            type="date"
            aria-label="Next maintenance date"
            value={form.nextMaintenanceDate}
            onChange={(e) => setForm({ ...form, nextMaintenanceDate: e.target.value })}
          />
          <button type="submit" disabled={saving}>Log Maintenance</button>
        </form>
      )}

      <div className="record-list">
        {records.map((r) => (
          <div className="record-row maintenance-row" key={r._id}>
            {editingId === r._id && editForm ? (
              <form className="inline-form edit-inline" onSubmit={saveEdit}>
                <select
                  value={editForm.maintenanceType}
                  onChange={(e) => setEditForm({ ...editForm, maintenanceType: e.target.value })}
                >
                  <option>Preventive</option>
                  <option>Idle</option>
                  <option>Breakdown</option>
                  <option>Inspection</option>
                  <option>Other</option>
                </select>
                <input
                  placeholder="Description"
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                />
                <input
                  type="date"
                  aria-label="Next maintenance date"
                  value={editForm.nextMaintenanceDate}
                  onChange={(e) => setEditForm({ ...editForm, nextMaintenanceDate: e.target.value })}
                />
                <input
                  placeholder="Running hours"
                  type="number"
                  value={editForm.machineRunningHours}
                  onChange={(e) => setEditForm({ ...editForm, machineRunningHours: e.target.value })}
                />
                <button type="submit" disabled={saving}>Save</button>
                <button type="button" onClick={() => { setEditingId(null); setEditForm(null); }}>Cancel</button>
              </form>
            ) : (
              <>
                <strong>{r.maintenanceType === "Corrective" ? "Idle" : r.maintenanceType}</strong> —{" "}
                {new Date(r.maintenanceDate).toLocaleDateString()} — {r.description}
                {r.nextMaintenanceDate && (
                  <span className="muted">
                    {" "}— Next: {new Date(r.nextMaintenanceDate).toLocaleDateString()}
                  </span>
                )}
                {canEdit && (
                  <span className="record-actions">
                    <button className="btn-secondary-sm" onClick={() => openEdit(r)}>Edit</button>{" "}
                    {canDelete && <button onClick={() => remove(r._id)}>Delete</button>}
                  </span>
                )}
              </>
            )}
          </div>
        ))}
        {records.length === 0 && <p>No maintenance records yet.</p>}
      </div>
    </div>
  );
}

/* ─── Oil Change Tab (unchanged) ─── */
function OilChangeTab({ machineId, records, onSaved, userRole }) {
  const [form, setForm] = useState({ oilType: "", oilQuantity: "", remarks: "", reminderMonthsInterval: 6 });
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [error, setError] = useState("");

  const canEdit = ["admin", "general_manager", "employee"].includes(userRole);
  const isReadOnly = userRole === "owner";

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      await oilChangeApi.create({ ...form, machine: machineId });
      setForm({ oilType: "", oilQuantity: "", remarks: "", reminderMonthsInterval: 6 });
      onSaved();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save oil change record");
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (record) => {
    setEditingId(record._id);
    setEditForm({
      oilType: record.oilType || "",
      oilQuantity: record.oilQuantity || "",
      remarks: record.remarks || "",
      oilChangeDate: record.oilChangeDate ? record.oilChangeDate.split("T")[0] : "",
      reminderMonthsInterval: record.reminderMonthsInterval || 6,
    });
    setError("");
  };

  const saveEdit = async (e) => {
    e.preventDefault();
    if (!editForm) return;
    setSaving(true);
    setError("");
    try {
      await oilChangeApi.update(editingId, editForm);
      setEditingId(null);
      setEditForm(null);
      onSaved();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update oil change record");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id) => {
    if (!window.confirm("Delete this oil change record?")) return;
    try {
      await oilChangeApi.remove(id);
      onSaved();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to delete oil change record");
    }
  };

  return (
    <div>
      {error && <div className="error-banner">{error}</div>}
      {!isReadOnly && (
      <form className="inline-form" onSubmit={submit}>
        <input placeholder="Oil Type"   value={form.oilType}     onChange={(e) => setForm({ ...form, oilType: e.target.value })} />
        <input placeholder="Quantity"   type="number" value={form.oilQuantity}  onChange={(e) => setForm({ ...form, oilQuantity: e.target.value })} />
        <input placeholder="Remarks"   value={form.remarks}     onChange={(e) => setForm({ ...form, remarks: e.target.value })} />
        <select
          value={form.reminderMonthsInterval}
          onChange={(e) => setForm({ ...form, reminderMonthsInterval: e.target.value })}
          aria-label="Reminder interval months"
        >
          <option value="3">3 months</option>
          <option value="6">6 months</option>
          <option value="12">12 months</option>
        </select>
        <button type="submit" disabled={saving}>Log Oil Change</button>
      </form>
      )}

      <div className="record-list">
        {records.map((r) => (
          <div className="record-row oil-row" key={r._id}>
            {editingId === r._id && editForm ? (
              <form className="inline-form edit-inline" onSubmit={saveEdit}>
                <input
                  type="date"
                  aria-label="Oil change date"
                  value={editForm.oilChangeDate}
                  onChange={(e) => setEditForm({ ...editForm, oilChangeDate: e.target.value })}
                />
                <input
                  placeholder="Oil Type"
                  value={editForm.oilType}
                  onChange={(e) => setEditForm({ ...editForm, oilType: e.target.value })}
                />
                <input
                  placeholder="Quantity"
                  type="number"
                  value={editForm.oilQuantity}
                  onChange={(e) => setEditForm({ ...editForm, oilQuantity: e.target.value })}
                />
                <input
                  placeholder="Remarks"
                  value={editForm.remarks}
                  onChange={(e) => setEditForm({ ...editForm, remarks: e.target.value })}
                />
                <button type="submit" disabled={saving}>Save</button>
                <button type="button" onClick={() => { setEditingId(null); setEditForm(null); }}>Cancel</button>
              </form>
            ) : (
              <>
                <strong>{new Date(r.oilChangeDate).toLocaleDateString()}</strong> — {r.oilType} —{" "}
                Next due: {r.nextOilChangeDate ? new Date(r.nextOilChangeDate).toLocaleDateString() : "—"} —{" "}
                {r.reminderSent ? "Reminder sent" : "Pending reminder"}
                {canEdit && (
                  <span className="record-actions">
                    <button className="btn-secondary-sm" onClick={() => openEdit(r)}>Edit</button>{" "}
                    <button onClick={() => remove(r._id)}>Delete</button>
                  </span>
                )}
              </>
            )}
          </div>
        ))}
        {records.length === 0 && <p>No oil change records yet.</p>}
      </div>
    </div>
  );
}
