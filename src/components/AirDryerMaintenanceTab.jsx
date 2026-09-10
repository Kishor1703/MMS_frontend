import { useCallback, useEffect, useState } from "react";
import {
  airDryerMaintenanceApi,
  uploadApi,
} from "../api/endpoints";

const BASIC_CONDITIONS = ["Good", "Fair", "Poor", "Replace"];

const COMPONENTS = [
  { key: "airFilter", label: "Air Filter", type: "basic" },
  { key: "moistureSeparator", label: "Moisture Separator", type: "basic" },
  { key: "coolant", label: "Coolant", type: "basic" },
  { key: "refrigerant", label: "Refrigerant", type: "refrigerant" },
];

const emptyBasic = () => ({
  checked: false,
  condition: "",
  notes: "",
  replacementDate: "",
  nextReplacementDate: "",
  photos: [],
});

const emptyRefrigerant = () => ({
  checked: false,
  levelPressure: "",
  condition: "",
  notes: "",
  serviceDate: "",
  nextServiceDate: "",
  photos: [],
});

const emptyFactory = {
  basic: emptyBasic,
  refrigerant: emptyRefrigerant,
};

const emptySpare = () => ({
  spareName: "",
  spareNumber: "",
  quantity: 1,
  unitCost: "",
  replacementDate: "",
  remarks: "",
  photo: null,
});

const photoUrl = (photo) =>
  photo ? new URL(photo, import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api").href : "";

const scheduleStatusClass = {
  Completed: "green",
  "Due Soon": "orange",
  Overdue: "red",
  "Not Scheduled": "gray",
};

/* ───────────────────────── Small shared bits ───────────────────────── */
function Toggle({ checked, onChange, label }) {
  return (
    <label className="insp-toggle">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>{label || "Inspected"}</span>
    </label>
  );
}

function SelectRow({ label, value, options, onChange, placeholder = "— Select —" }) {
  return (
    <label className="insp-field">
      <span className="insp-label">{label}</span>
      <select value={value || ""} onChange={(e) => onChange(e.target.value)}>
        <option value="">{placeholder}</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    </label>
  );
}

function DateRow({ label, value, onChange }) {
  return (
    <label className="insp-field">
      <span className="insp-label">{label}</span>
      <input type="date" value={value || ""} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

function PhotoInput({ photos, onChange }) {
  const [picked, setPicked] = useState([]);
  return (
    <label className="insp-field insp-photos">
      <span className="insp-label">Photo Evidence</span>
      <input
        type="file"
        multiple
        accept="image/*"
        onChange={(e) => setPicked(Array.from(e.target.files || []))}
      />
      {picked.length > 0 && (
        <button
          type="button"
          className="btn-secondary-sm"
          onClick={async () => {
            const urls = await Promise.all(picked.map((f) => uploadApi.single(f).then((r) => r.data.data.url)));
            onChange([...photos, ...urls]);
            setPicked([]);
          }}
        >
          Upload {picked.length} photo{picked.length > 1 ? "s" : ""}
        </button>
      )}
      {photos.length > 0 && (
        <div className="insp-thumbs">
          {photos.map((url, i) => (
            <a key={url + i} href={photoUrl(url)} target="_blank" rel="noreferrer">
              <img src={photoUrl(url)} alt={`Inspection photo ${i + 1}`} />
            </a>
          ))}
        </div>
      )}
    </label>
  );
}

function BasicInspector({ data, update }) {
  return (
    <div className="insp-group">
      <div className="insp-grid">
        <SelectRow label="Condition" value={data.condition} options={BASIC_CONDITIONS} onChange={(v) => update("condition", v)} />
        <DateRow label="Replacement Date" value={data.replacementDate} onChange={(v) => update("replacementDate", v)} />
        <DateRow label="Next Replacement Date" value={data.nextReplacementDate} onChange={(v) => update("nextReplacementDate", v)} />
      </div>
      <label className="insp-field">
        <span className="insp-label">Notes</span>
        <textarea rows={2} value={data.notes || ""} onChange={(e) => update("notes", e.target.value)} />
      </label>
      <PhotoInput photos={data.photos || []} onChange={(v) => update("photos", v)} />
    </div>
  );
}

function RefrigerantInspector({ data, update }) {
  return (
    <div className="insp-group">
      <div className="insp-grid">
        <SelectRow label="Level / Pressure" value={data.levelPressure} options={["Low", "Normal", "High"]} onChange={(v) => update("levelPressure", v)} />
        <SelectRow label="Condition" value={data.condition} options={["Good", "Leaking", "Needs Refill", "Replace"]} onChange={(v) => update("condition", v)} />
        <DateRow label="Service Date" value={data.serviceDate} onChange={(v) => update("serviceDate", v)} />
        <DateRow label="Next Service Date" value={data.nextServiceDate} onChange={(v) => update("nextServiceDate", v)} />
      </div>
      <label className="insp-field">
        <span className="insp-label">Notes</span>
        <textarea rows={2} value={data.notes || ""} onChange={(e) => update("notes", e.target.value)} />
      </label>
      <PhotoInput photos={data.photos || []} onChange={(v) => update("photos", v)} />
    </div>
  );
}

const INSPECTORS = {
  basic: BasicInspector,
  refrigerant: RefrigerantInspector,
};

/* ───────────────────────── Main tab ───────────────────────── */
export default function AirDryerMaintenanceTab({ machineId, userRole }) {
  const [records, setRecords] = useState([]);
  const [schedule, setSchedule] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [expandedId, setExpandedId] = useState(null);

  const [form, setForm] = useState({
    maintenanceDate: new Date().toISOString().slice(0, 16),
    engineerName: "",
    inspectionStatus: "In Progress",
    remarks: "",
    finalStatus: "",
    nextMaintenanceDate: "",
    generalPhotos: [],
    sparesRequired: "no",
    sparesUsed: [],
    components: {},
  });

  const canCreate = userRole === "employee" || userRole === "general_manager";

  const load = useCallback(() => {
    Promise.all([
      airDryerMaintenanceApi.list({ machine: machineId, limit: 200 }),
      airDryerMaintenanceApi.schedule(machineId),
    ])
      .then(([recordsRes, scheduleRes]) => {
        setRecords(recordsRes.data.data);
        setSchedule(scheduleRes.data.data);
      })
      .catch((err) => setError(err.response?.data?.message || "Failed to load air dryer maintenance"))
      .finally(() => setLoading(false));
  }, [machineId]);

  useEffect(() => { load(); }, [load]);

  const updateComponent = (key, patch) =>
    setForm((f) => ({
      ...f,
      components: { ...f.components, [key]: { ...f.components[key], ...patch } },
    }));

  const updateSpare = (i, field, val) =>
    setForm((f) => {
      const s = [...f.sparesUsed];
      s[i] = { ...s[i], [field]: val };
      return { ...f, sparesUsed: s };
    });

  const addSpare = () =>
    setForm((f) => ({ ...f, sparesUsed: [...f.sparesUsed, emptySpare()] }));

  const removeSpare = (i) =>
    setForm((f) => ({ ...f, sparesUsed: f.sparesUsed.filter((_, idx) => idx !== i) }));

  const openForm = () => {
    setForm({
      maintenanceDate: new Date().toISOString().slice(0, 16),
      engineerName: "",
      inspectionStatus: "In Progress",
      remarks: "",
      finalStatus: "",
      nextMaintenanceDate: "",
      generalPhotos: [],
      sparesRequired: "no",
      sparesUsed: [],
      components: Object.fromEntries(COMPONENTS.map((c) => [c.key, emptyFactory[c.type]()])),
    });
    setError("");
    setShowForm(true);
  };

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    const checkedCount = COMPONENTS.filter((c) => form.components[c.key]?.checked).length;
    if (checkedCount === 0 && form.sparesRequired !== "yes") {
      setError("Inspect at least one component or select 'Spare Parts Used? = Yes'.");
      return;
    }
    if (form.sparesRequired === "yes" && form.sparesUsed.length && form.sparesUsed.some((s) => !s.spareName.trim())) {
      setError("Every spare part must have a name.");
      return;
    }
    setSaving(true);
    try {
      const sanitizeDate = (d) => (d ? new Date(d).toISOString() : undefined);
      const sparesUsed = form.sparesRequired === "yes"
        ? await Promise.all(
            form.sparesUsed.map(async ({ photo, ...rest }) => {
              const base = {
                ...rest,
                unitCost: rest.unitCost === "" ? 0 : Number(rest.unitCost) || 0,
                quantity: Number(rest.quantity) || 1,
                replacementDate: sanitizeDate(rest.replacementDate),
              };
              delete base.totalCost;
              return {
                ...base,
                photoUrl: photo ? (await uploadApi.single(photo)).data.data.url : "",
              };
            })
          )
        : [];

      const components = Object.fromEntries(
        COMPONENTS.map((c) => {
          const comp = { ...form.components[c.key] };
          if (comp.checked) {
            comp.replacementDate = sanitizeDate(comp.replacementDate);
            comp.nextReplacementDate = sanitizeDate(comp.nextReplacementDate);
          }
          if (c.key === "refrigerant") {
            comp.serviceDate = sanitizeDate(comp.serviceDate);
            comp.nextServiceDate = sanitizeDate(comp.nextServiceDate);
          }
          return [c.key, comp];
        })
      );

      const payload = {
        machine: machineId,
        maintenanceDate: sanitizeDate(form.maintenanceDate),
        engineerName: form.engineerName,
        inspectionStatus: form.inspectionStatus,
        remarks: form.remarks,
        finalStatus: form.finalStatus || undefined,
        nextMaintenanceDate: sanitizeDate(form.nextMaintenanceDate),
        photos: form.generalPhotos,
        components,
        sparesUsed,
      };

      await airDryerMaintenanceApi.create(payload);
      setShowForm(false);
      load();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save air dryer maintenance");
    } finally {
      setSaving(false);
    }
  };

  const setGeneralPhotos = (urls) => setForm((f) => ({ ...f, generalPhotos: [...f.generalPhotos, ...urls] }));

  const recordSummary = (record) => {
    const checked = COMPONENTS.filter((c) => record.components?.[c.key]?.checked).map((c) => c.label);
    return checked.length ? checked.join(", ") : "No components marked";
  };

  return (
    <div className="compressor-tab">
      <div className="sp-header">
        <div>
          <h2 className="sp-title">Air Dryer Maintenance</h2>
          <p className="sp-subtitle">Inspect air filter, moisture separator, coolant and refrigerant; record spare parts and costs.</p>
        </div>
        {canCreate && <button className="btn-primary" onClick={openForm}>+ Log Air Dryer Maintenance</button>}
      </div>

      {error && <div className="error-banner">{error}</div>}

      {/* Schedule summary */}
      <div className="schedule-grid">
        {schedule.map((item) => (
          <div className="schedule-card" key={item.component}>
            <div className="schedule-card-top">
              <strong>{item.label}</strong>
              <span className={`status-badge ${scheduleStatusClass[item.status]}`}>{item.status}</span>
            </div>
            <p className="muted">
              {item.nextDate
                ? `Next: ${new Date(item.nextDate).toLocaleDateString()}`
                : "No date scheduled"}
            </p>
          </div>
        ))}
      </div>

      {loading && <p className="sp-loading">Loading…</p>}

      {/* History */}
      {!loading && records.length === 0 && (
        <div className="sp-empty">
          <p>No air dryer maintenance logged yet.</p>
          {canCreate && <button className="btn-primary" onClick={openForm}>Log First Maintenance</button>}
        </div>
      )}

      <div className="job-list">
        {records.map((record) => {
          const isOpen = expandedId === record._id;
          const spares = record.sparesUsed || [];
          const totalCost = spares.reduce((s, x) => s + (Number(x.totalCost) || 0), 0);
          return (
            <div className="job-card" key={record._id}>
              <div className="job-card-header" onClick={() => setExpandedId(isOpen ? null : record._id)}>
                <div className="job-card-left">
                  <strong className="job-why">
                    {new Date(record.maintenanceDate).toLocaleDateString()}
                    {record.engineerName ? ` — ${record.engineerName}` : ""}
                  </strong>
                  <span className="job-meta">{recordSummary(record)}</span>
                </div>
                <div className="job-card-right">
                  <span className={`status-badge ${record.approvalStatus === "Approved" ? "green" : record.approvalStatus === "Rejected" ? "red" : "gray"}`}>
                    {record.approvalStatus}
                  </span>
                  <span className="job-chevron">{isOpen ? "▲" : "▼"}</span>
                </div>
              </div>

              {isOpen && (
                <div className="job-detail">
                  <div className="job-timeline">
                    <TimelineRow num="1" label="Date & Engineer" value={`${new Date(record.maintenanceDate).toLocaleString()} — ${record.engineerName || "N/A"}`} />
                    <TimelineRow num="2" label="Inspection Status" value={record.inspectionStatus || "—"} />
                    <TimelineRow num="3" label="Components Checked" value={recordSummary(record)} />
                    <TimelineRow num="4" label="Final Status" value={record.finalStatus || "—"} />
                    <TimelineRow num="5" label="Remarks" value={record.remarks || "—"} />
                    <TimelineRow num="6" label="Next Maintenance" value={record.nextMaintenanceDate ? new Date(record.nextMaintenanceDate).toLocaleDateString() : "—"} />
                    <TimelineRow num="7" label="Cost" value={`$${totalCost.toFixed(2)}`} highlight="#4f46e5" />
                  </div>

                  {record.components && COMPONENTS.filter((c) => record.components[c.key]?.checked).map((c) => (
                    <details className="record-component" key={c.key}>
                      <summary>{c.label}</summary>
                      <div className="insp-readonly-grid">
                        {Object.entries(record.components[c.key])
                          .filter(([k, v]) => v && (typeof v === "string" || typeof v === "number" || (Array.isArray(v) && v.length > 0)) && k !== "photos" && k !== "checked")
                          .map(([k, v]) => (
                            <div key={k}>
                              <strong style={{ textTransform: "capitalize" }}>{k.replace(/([A-Z])/g, " $1")}:</strong>{" "}
                              {Array.isArray(v) ? `${v.length} photo(s)` : String(v)}
                            </div>
                          ))}
                      </div>
                      {record.components[c.key].photos?.length > 0 && (
                        <div className="insp-thumbs readonly">
                          {record.components[c.key].photos.map((p, i) => (
                            <a key={p + i} href={photoUrl(p)} target="_blank" rel="noreferrer">
                              <img src={photoUrl(p)} alt={`${c.label} photo ${i + 1}`} />
                            </a>
                          ))}
                        </div>
                      )}
                    </details>
                  ))}

                  {spares.length > 0 && (
                    <div className="spares-table-wrap">
                      <table className="spares-table">
                        <thead>
                          <tr><th>Spare</th><th>Part #</th><th>Qty</th><th>Unit Cost</th><th>Total</th></tr>
                        </thead>
                        <tbody>
                          {spares.map((s, i) => (
                            <tr key={i}>
                              <td>{s.spareName}</td>
                              <td>{s.spareNumber || "—"}</td>
                              <td>{s.quantity}</td>
                              <td>${s.unitCost || 0}</td>
                              <td>${s.totalCost || 0}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {record.photos?.length > 0 && (
                    <div className="insp-thumbs readonly">
                      {record.photos.map((p, i) => (
                        <a key={p + i} href={photoUrl(p)} target="_blank" rel="noreferrer">
                          <img src={photoUrl(p)} alt={`General photo ${i + 1}`} />
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Form modal */}
      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal-box cmp-modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="mj-modal-title">Log Air Dryer Maintenance</h3>
            <form onSubmit={submit} className="cmp-form">
              <div className="insp-grid">
                <label className="insp-field">
                  <span className="insp-label">Date & Time</span>
                  <input type="datetime-local" required value={form.maintenanceDate} onChange={(e) => setForm({ ...form, maintenanceDate: e.target.value })} />
                </label>
                <label className="insp-field">
                  <span className="insp-label">Engineer Name</span>
                  <input value={form.engineerName} onChange={(e) => setForm({ ...form, engineerName: e.target.value })} placeholder="Engineer name" />
                </label>
              </div>

              {/* Component cards */}
              {COMPONENTS.map((comp) => {
                const data = form.components[comp.key] || emptyFactory[comp.type]();
                const Inspector = INSPECTORS[comp.type];
                return (
                  <section className={`component-card ${data.checked ? "checked" : ""}`} key={comp.key}>
                    <div className="component-card-head">
                      <Toggle checked={data.checked} onChange={(v) => updateComponent(comp.key, { checked: v })} label={`Inspect: ${comp.label}`} />
                    </div>
                    {data.checked && <Inspector data={data} update={(field, val) => updateComponent(comp.key, { [field]: val })} />}
                  </section>
                );
              })}

              {/* Spare parts logic */}
              <div className="insp-field">
                <span className="insp-label">Spare Parts Used?</span>
                <div className="status-options">
                  {["yes", "no"].map((answer) => (
                    <label key={answer} className={`status-opt ${form.sparesRequired === answer ? "selected" : ""}`}>
                      <input
                        type="radio"
                        name="sparesRequired"
                        value={answer}
                        checked={form.sparesRequired === answer}
                        onChange={() => setForm((f) => ({ ...f, sparesRequired: answer, sparesUsed: answer === "yes" && f.sparesUsed.length === 0 ? [emptySpare()] : f.sparesUsed }))}
                      />
                      {answer === "yes" ? "Yes" : "No"}
                    </label>
                  ))}
                </div>
              </div>

              {form.sparesRequired === "yes" && (
                <section className="cmp-spares">
                  <div className="cmp-spares-head">
                    <strong>Spare Parts Used</strong>
                    <button type="button" className="btn-add-spare" onClick={addSpare}>+ Add Spare Part</button>
                  </div>
                  {form.sparesUsed.map((s, i) => {
                    const total = (Number(s.quantity) || 0) * (Number(s.unitCost) || 0);
                    return (
                      <div className="spare-form-grid" key={i}>
                        <input placeholder="Spare part name *" value={s.spareName} onChange={(e) => updateSpare(i, "spareName", e.target.value)} required />
                        <input placeholder="Part number" value={s.spareNumber} onChange={(e) => updateSpare(i, "spareNumber", e.target.value)} />
                        <input type="number" min="1" placeholder="Qty" value={s.quantity} onChange={(e) => updateSpare(i, "quantity", e.target.value)} />
                        <input type="number" min="0" step="0.01" placeholder="Unit cost $" value={s.unitCost} onChange={(e) => updateSpare(i, "unitCost", e.target.value)} />
                        <input type="date" value={s.replacementDate} onChange={(e) => updateSpare(i, "replacementDate", e.target.value)} />
                        <input placeholder="Remarks" value={s.remarks} onChange={(e) => updateSpare(i, "remarks", e.target.value)} />
                        <label className="spare-photo">
                          <input type="file" accept="image/*" onChange={(e) => updateSpare(i, "photo", e.target.files?.[0] || null)} />
                          {s.photo?.name || "Photo"}
                        </label>
                        <span className="spare-line-total">Total: ${total.toFixed(2)}</span>
                        {form.sparesUsed.length > 1 && (
                          <button type="button" className="spare-remove" onClick={() => removeSpare(i)}>✕</button>
                        )}
                      </div>
                    );
                  })}
                  <div className="cmp-spares-total">
                    Estimated total: ${form.sparesUsed.reduce((sum, s) => sum + (Number(s.quantity) || 0) * (Number(s.unitCost) || 0), 0).toFixed(2)}
                  </div>
                </section>
              )}

              {/* General fields */}
              <div className="insp-grid">
                <label className="insp-field">
                  <span className="insp-label">Inspection Status</span>
                  <select value={form.inspectionStatus} onChange={(e) => setForm({ ...form, inspectionStatus: e.target.value })}>
                    <option>Pending</option>
                    <option>In Progress</option>
                    <option>Completed</option>
                  </select>
                </label>
                <label className="insp-field">
                  <span className="insp-label">Final Maintenance Status</span>
                  <select value={form.finalStatus} onChange={(e) => setForm({ ...form, finalStatus: e.target.value })}>
                    <option value="">— Select —</option>
                    <option>Good</option>
                    <option>Attention Required</option>
                    <option>Needs Repair</option>
                    <option>Out of Service</option>
                  </select>
                </label>
                <label className="insp-field">
                  <span className="insp-label">Next Maintenance Date</span>
                  <input type="date" value={form.nextMaintenanceDate} onChange={(e) => setForm({ ...form, nextMaintenanceDate: e.target.value })} />
                </label>
              </div>

              <label className="insp-field">
                <span className="insp-label">General Remarks</span>
                <textarea rows={3} value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })} />
              </label>

              <PhotoInput photos={form.generalPhotos} onChange={setGeneralPhotos} />

              {error && <p className="mj-error">{error}</p>}

              <div className="mj-footer">
                <button type="button" className="btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? "Saving…" : "Complete Maintenance"}
                </button>
              </div>
            </form>
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
      <span className="tl-value" style={highlight ? { color: highlight, fontWeight: 600 } : {}}>{value}</span>
    </div>
  );
}