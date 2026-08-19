import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { machineApi, oilChangeApi, maintenanceApi, maintenanceJobApi } from "../api/endpoints";

const TABS = ["Info", "Maintenance History", "Oil Change History", "Spare Parts", "Documents"];

const getStatusClass = (status) => {
  switch (status) {
    case "Running":        return "green";
    case "Under Maintenance": return "orange";
    case "Breakdown":     return "red";
    case "Idle":          return "gray";
    default:              return "gray";
  }
};

export default function MachineDetail() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [activeTab, setActiveTab] = useState("Info");
  const [error, setError] = useState("");

  const loadData = () => {
    machineApi
      .getById(id)
      .then((res) => setData(res.data.data))
      .catch((err) => setError(err.response?.data?.message || "Failed to load machine"));
  };

  useEffect(() => { loadData(); }, [id]);

  if (error) return <div className="error-banner">{error}</div>;
  if (!data)  return <div>Loading...</div>;

  const { machine, maintenanceHistory, oilChangeHistory, spareHistory, upcomingMaintenance } = data;

  return (
    <div>
      <div className="page-header">
        <h1>{machine.machineName}</h1>
        <span className={`status-badge ${getStatusClass(machine.status)}`}>{machine.status}</span>
      </div>

      <div className="tabs">
        {TABS.map((tab) => (
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
          <div><strong>Type:</strong> {machine.machineType}</div>
          <div><strong>Company:</strong> {machine.company}</div>
          <div><strong>Model:</strong> {machine.modelNumber}</div>
          <div><strong>Serial Number:</strong> {machine.serialNumber}</div>
          <div>
            <strong>Warranty Expiry:</strong>{" "}
            {machine.warrantyExpiry ? new Date(machine.warrantyExpiry).toLocaleDateString() : "-"}
          </div>
          {upcomingMaintenance && (
            <div>
              <strong>Next Maintenance:</strong>{" "}
              {new Date(upcomingMaintenance.nextMaintenanceDate).toLocaleDateString()}
            </div>
          )}
          <div>
            <strong>Assigned Employees:</strong>{" "}
            {machine.assignedEmployees?.map((e) => e.name).join(", ") || "None"}
          </div>
        </div>
      )}

      {activeTab === "Maintenance History" && (
        <MaintenanceTab machineId={id} records={maintenanceHistory} onSaved={loadData} />
      )}

      {activeTab === "Oil Change History" && (
        <OilChangeTab machineId={id} records={oilChangeHistory} onSaved={loadData} />
      )}

      {activeTab === "Spare Parts" && (
        <SparePartsTab machineId={id} legacySpares={spareHistory} />
      )}

      {activeTab === "Documents" && (
        <div className="record-list">
          {(machine.documents || []).map((doc, idx) => (
            <a key={idx} href={doc} target="_blank" rel="noreferrer">
              Document {idx + 1}
            </a>
          ))}
          {(!machine.documents || machine.documents.length === 0) && <p>No documents uploaded.</p>}
        </div>
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
  { label: "Engineer & Work", icon: "🔧" },
  { label: "Spares Used", icon: "🔩" },
  { label: "Cost & Resolution", icon: "✅" },
];

const STATUS_COLORS = {
  Resolved:        "#22c55e",
  "Partially Fixed": "#f59e0b",
  Escalated:       "#ef4444",
  Pending:         "#6b7280",
};

const emptyJob = () => ({
  whyStopped:          "",
  downtimeStart:       "",
  downtimeEnd:         "",
  engineerStarted:     "",
  workDone:            "",
  engineerFinished:    "",
  sparesUsed:          [{ spareName: "", spareNumber: "", quantity: 1, price: 0 }],
  totalCost:           "",
  finalStatus:         "Resolved",
  nextMaintenanceDate: "",
});

function SparePartsTab({ machineId, legacySpares }) {
  const [jobs, setJobs]           = useState([]);
  const [loading, setLoading]     = useState(true);
  const [showForm, setShowForm]   = useState(false);
  const [step, setStep]           = useState(0);
  const [form, setForm]           = useState(emptyJob());
  const [saving, setSaving]       = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [formError, setFormError] = useState("");

  const fetchJobs = () => {
    maintenanceJobApi
      .list({ machine: machineId })
      .then((res) => setJobs(res.data.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchJobs(); }, [machineId]);

  const openForm = () => {
    setForm(emptyJob());
    setStep(0);
    setFormError("");
    setShowForm(true);
  };
  const closeForm = () => setShowForm(false);

  // Spare rows helpers
  const addSpare = () =>
    setForm((f) => ({ ...f, sparesUsed: [...f.sparesUsed, { spareName: "", spareNumber: "", quantity: 1, price: 0 }] }));
  const removeSpare = (i) =>
    setForm((f) => ({ ...f, sparesUsed: f.sparesUsed.filter((_, idx) => idx !== i) }));
  const updateSpare = (i, field, val) =>
    setForm((f) => {
      const s = [...f.sparesUsed];
      s[i] = { ...s[i], [field]: val };
      return { ...f, sparesUsed: s };
    });

  // Auto-sum total cost from spares when on step 3
  const autoTotal = form.sparesUsed.reduce(
    (sum, s) => sum + (parseFloat(s.price) || 0) * (parseFloat(s.quantity) || 0),
    0
  );

  const validateStep = () => {
    if (step === 0) {
      if (!form.whyStopped.trim()) return "Please enter why the machine stopped.";
      if (!form.downtimeStart)     return "Please set the downtime start date/time.";
    }
    if (step === 1) {
      if (!form.workDone.trim()) return "Please describe the work done.";
    }
    if (step === 2) {
      for (const s of form.sparesUsed) {
        if (!s.spareName.trim()) return "Each spare part must have a name.";
      }
    }
    if (step === 3) {
      if (!form.finalStatus) return "Please select the final status.";
    }
    return "";
  };

  const nextStep = () => {
    const err = validateStep();
    if (err) { setFormError(err); return; }
    setFormError("");
    setStep((s) => s + 1);
  };
  const prevStep = () => { setFormError(""); setStep((s) => s - 1); };

  const submit = async () => {
    const err = validateStep();
    if (err) { setFormError(err); return; }
    setSaving(true);
    try {
      const payload = {
        ...form,
        machine:   machineId,
        totalCost: form.totalCost !== "" ? parseFloat(form.totalCost) : autoTotal,
      };
      await maintenanceJobApi.create(payload);
      setShowForm(false);
      fetchJobs();
    } catch (e) {
      setFormError(e.response?.data?.message || "Failed to save job.");
    } finally {
      setSaving(false);
    }
  };

  const deleteJob = async (jobId) => {
    if (!window.confirm("Delete this maintenance job?")) return;
    await maintenanceJobApi.remove(jobId);
    fetchJobs();
  };

  const fmt = (dt) => (dt ? new Date(dt).toLocaleString() : "—");
  const fmtDate = (dt) => (dt ? new Date(dt).toLocaleDateString() : "—");

  return (
    <div className="spare-parts-tab">
      {/* Header */}
      <div className="sp-header">
        <div>
          <h2 className="sp-title">Maintenance Job Log</h2>
          <p className="sp-subtitle">Full breakdown-to-resolution workflow</p>
        </div>
        <button className="btn-primary" onClick={openForm}>+ Log New Job</button>
      </div>

      {/* Flow legend */}
      <div className="flow-legend">
        {[
          "Why Stopped", "Downtime", "Engineer Started",
          "Work Done", "Engineer Finished",
          "Spares Used", "Cost", "Final Status", "Next Maintenance"
        ].map((label, i, arr) => (
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
          <button className="btn-primary" onClick={openForm}>Log First Job</button>
        </div>
      )}

      <div className="job-list">
        {jobs.map((job) => {
          const isOpen = expandedId === job._id;
          const statusColor = STATUS_COLORS[job.finalStatus] || "#6b7280";
          return (
            <div key={job._id} className="job-card">
              {/* Card header */}
              <div className="job-card-header" onClick={() => setExpandedId(isOpen ? null : job._id)}>
                <div className="job-card-left">
                  <span className="job-status-dot" style={{ background: statusColor }} />
                  <div>
                    <strong className="job-why">{job.whyStopped}</strong>
                    <span className="job-meta">
                      {new Date(job.createdAt).toLocaleDateString()} &nbsp;·&nbsp;
                      {job.downtimeHours != null ? `${job.downtimeHours}h downtime` : "Downtime TBD"}
                    </span>
                  </div>
                </div>
                <div className="job-card-right">
                  <span className="job-status-badge" style={{ background: statusColor + "22", color: statusColor }}>
                    {job.finalStatus}
                  </span>
                  <span className="job-cost">₹{job.totalCost?.toLocaleString() || 0}</span>
                  <span className="job-chevron">{isOpen ? "▲" : "▼"}</span>
                </div>
              </div>

              {/* Expanded detail — 9-step timeline */}
              {isOpen && (
                <div className="job-detail">
                  <div className="job-timeline">
                    <TimelineRow num="1" label="Why Stopped"      value={job.whyStopped} />
                    <TimelineRow num="2" label="Downtime Start"   value={fmt(job.downtimeStart)} />
                    <TimelineRow num="3" label="Downtime End"     value={fmt(job.downtimeEnd)} />
                    <TimelineRow num="4" label="Engineer Started" value={fmt(job.engineerStarted)} />
                    <TimelineRow num="5" label="Work Done"        value={job.workDone || "—"} />
                    <TimelineRow num="6" label="Engineer Finished" value={fmt(job.engineerFinished)} />
                    <TimelineRow
                      num="7"
                      label="Spares Used"
                      value={
                        job.sparesUsed?.length
                          ? job.sparesUsed.map((s) => `${s.spareName} ×${s.quantity} @ ₹${s.price}`).join(", ")
                          : "None"
                      }
                    />
                    <TimelineRow num="8" label="Total Cost"       value={`₹${job.totalCost?.toLocaleString() || 0}`} />
                    <TimelineRow num="9" label="Final Status"     value={job.finalStatus} highlight={statusColor} />
                    <TimelineRow num="—" label="Next Maintenance" value={fmtDate(job.nextMaintenanceDate)} />
                  </div>

                  {job.sparesUsed?.length > 0 && (
                    <div className="spares-table-wrap">
                      <table className="spares-table">
                        <thead>
                          <tr><th>Spare Name</th><th>Part #</th><th>Qty</th><th>Unit Price</th><th>Total</th></tr>
                        </thead>
                        <tbody>
                          {job.sparesUsed.map((s, i) => (
                            <tr key={i}>
                              <td>{s.spareName}</td>
                              <td>{s.spareNumber || "—"}</td>
                              <td>{s.quantity}</td>
                              <td>₹{s.price}</td>
                              <td>₹{(s.quantity * s.price).toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  <div className="job-actions">
                    <button className="btn-danger-sm" onClick={() => deleteJob(job._id)}>🗑 Delete</button>
                  </div>
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
                <strong>{s.spareName}</strong> — Qty {s.quantity} — ₹{s.price} —{" "}
                {new Date(s.replacementDate).toLocaleDateString()} — {s.reason}
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
              {FLOW_STEPS.map((s, i) => (
                <div key={i} className={`mj-step ${i === step ? "active" : i < step ? "done" : ""}`}>
                  <span className="mj-step-icon">{i < step ? "✓" : s.icon}</span>
                  <span className="mj-step-label">{s.label}</span>
                  {i < FLOW_STEPS.length - 1 && <span className="mj-step-line" />}
                </div>
              ))}
            </div>

            <h3 className="mj-modal-title">{FLOW_STEPS[step].label}</h3>

            {/* Step 0 — Why Stopped + Downtime */}
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

                <div className="mj-row">
                  <div className="mj-col">
                    <label className="mj-label">Downtime Start <span className="req">*</span></label>
                    <input
                      type="datetime-local"
                      className="mj-input"
                      value={form.downtimeStart}
                      onChange={(e) => setForm({ ...form, downtimeStart: e.target.value })}
                    />
                  </div>
                  <div className="mj-col">
                    <label className="mj-label">Downtime End</label>
                    <input
                      type="datetime-local"
                      className="mj-input"
                      value={form.downtimeEnd}
                      onChange={(e) => setForm({ ...form, downtimeEnd: e.target.value })}
                    />
                  </div>
                </div>
                {form.downtimeStart && form.downtimeEnd && (
                  <p className="mj-hint">
                    ⏱ Calculated downtime:{" "}
                    {(
                      (new Date(form.downtimeEnd) - new Date(form.downtimeStart)) /
                      (1000 * 60 * 60)
                    ).toFixed(2)}{" "}
                    hours
                  </p>
                )}
              </div>
            )}

            {/* Step 1 — Engineer + Work */}
            {step === 1 && (
              <div className="mj-fields">
                <div className="mj-row">
                  <div className="mj-col">
                    <label className="mj-label">Engineer Started</label>
                    <input
                      type="datetime-local"
                      className="mj-input"
                      value={form.engineerStarted}
                      onChange={(e) => setForm({ ...form, engineerStarted: e.target.value })}
                    />
                  </div>
                  <div className="mj-col">
                    <label className="mj-label">Engineer Finished</label>
                    <input
                      type="datetime-local"
                      className="mj-input"
                      value={form.engineerFinished}
                      onChange={(e) => setForm({ ...form, engineerFinished: e.target.value })}
                    />
                  </div>
                </div>

                <label className="mj-label">Work Done <span className="req">*</span></label>
                <textarea
                  className="mj-input"
                  rows={4}
                  placeholder="Describe all work carried out…"
                  value={form.workDone}
                  onChange={(e) => setForm({ ...form, workDone: e.target.value })}
                />
              </div>
            )}

            {/* Step 2 — Spares Used */}
            {step === 2 && (
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
                      placeholder="Price ₹"
                      value={s.price}
                      onChange={(e) => updateSpare(i, "price", e.target.value)}
                    />
                    {form.sparesUsed.length > 1 && (
                      <button className="spare-remove" onClick={() => removeSpare(i)}>✕</button>
                    )}
                  </div>
                ))}
                <button className="btn-add-spare" onClick={addSpare}>+ Add Spare Part</button>
                <p className="mj-hint">
                  Auto-total from spares: <strong>₹{autoTotal.toFixed(2)}</strong>
                </p>
              </div>
            )}

            {/* Step 3 — Cost + Final status + Next maintenance */}
            {step === 3 && (
              <div className="mj-fields">
                <label className="mj-label">Total Cost (₹)</label>
                <input
                  type="number"
                  className="mj-input"
                  placeholder={`Auto-calculated: ₹${autoTotal.toFixed(2)} — override if needed`}
                  value={form.totalCost}
                  onChange={(e) => setForm({ ...form, totalCost: e.target.value })}
                />
                <p className="mj-hint">Leave blank to use the spares auto-total (₹{autoTotal.toFixed(2)})</p>

                <label className="mj-label">Final Status <span className="req">*</span></label>
                <div className="status-options">
                  {["Resolved", "Partially Fixed", "Escalated", "Pending"].map((opt) => (
                    <label key={opt} className={`status-opt ${form.finalStatus === opt ? "selected" : ""}`}
                      style={{ "--sc": STATUS_COLORS[opt] }}>
                      <input
                        type="radio"
                        name="finalStatus"
                        value={opt}
                        checked={form.finalStatus === opt}
                        onChange={() => setForm({ ...form, finalStatus: opt })}
                      />
                      {opt}
                    </label>
                  ))}
                </div>

                <label className="mj-label">Next Maintenance Date</label>
                <input
                  type="date"
                  className="mj-input"
                  value={form.nextMaintenanceDate}
                  onChange={(e) => setForm({ ...form, nextMaintenanceDate: e.target.value })}
                />
              </div>
            )}

            {formError && <p className="mj-error">{formError}</p>}

            {/* Footer buttons */}
            <div className="mj-footer">
              {step > 0 && (
                <button className="btn-secondary" onClick={prevStep}>← Back</button>
              )}
              <button className="btn-ghost" onClick={closeForm}>Cancel</button>
              {step < FLOW_STEPS.length - 1 ? (
                <button className="btn-primary" onClick={nextStep}>Next →</button>
              ) : (
                <button className="btn-primary" onClick={submit} disabled={saving}>
                  {saving ? "Saving…" : "✓ Submit Job"}
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

/* ─── Maintenance History Tab (unchanged) ─── */
function MaintenanceTab({ machineId, records, onSaved }) {
  const [form, setForm] = useState({ maintenanceType: "Preventive", description: "" });
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await maintenanceApi.create({ ...form, machine: machineId });
      setForm({ maintenanceType: "Preventive", description: "" });
      onSaved();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <form className="inline-form" onSubmit={submit}>
        <select value={form.maintenanceType} onChange={(e) => setForm({ ...form, maintenanceType: e.target.value })}>
          <option>Preventive</option>
          <option>Corrective</option>
          <option>Breakdown</option>
          <option>Inspection</option>
          <option>Other</option>
        </select>
        <input
          placeholder="Description"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
        <button type="submit" disabled={saving}>Log Maintenance</button>
      </form>

      <div className="record-list">
        {records.map((r) => (
          <div className="record-row" key={r._id}>
            <strong>{r.maintenanceType}</strong> —{" "}
            {new Date(r.maintenanceDate).toLocaleDateString()} — {r.description}
          </div>
        ))}
        {records.length === 0 && <p>No maintenance records yet.</p>}
      </div>
    </div>
  );
}

/* ─── Oil Change Tab (unchanged) ─── */
function OilChangeTab({ machineId, records, onSaved }) {
  const [form, setForm] = useState({ oilType: "", oilQuantity: "", remarks: "" });
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await oilChangeApi.create({ ...form, machine: machineId });
      setForm({ oilType: "", oilQuantity: "", remarks: "" });
      onSaved();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <form className="inline-form" onSubmit={submit}>
        <input placeholder="Oil Type"   value={form.oilType}     onChange={(e) => setForm({ ...form, oilType: e.target.value })} />
        <input placeholder="Quantity"   type="number" value={form.oilQuantity}  onChange={(e) => setForm({ ...form, oilQuantity: e.target.value })} />
        <input placeholder="Remarks"   value={form.remarks}     onChange={(e) => setForm({ ...form, remarks: e.target.value })} />
        <button type="submit" disabled={saving}>Log Oil Change</button>
      </form>

      <div className="record-list">
        {records.map((r) => (
          <div className="record-row" key={r._id}>
            <strong>{new Date(r.oilChangeDate).toLocaleDateString()}</strong> — {r.oilType} —{" "}
            Next due: {new Date(r.nextOilChangeDate).toLocaleDateString()} —{" "}
            {r.reminderSent ? "Reminder sent" : "Pending reminder"}
          </div>
        ))}
        {records.length === 0 && <p>No oil change records yet.</p>}
      </div>
    </div>
  );
}
