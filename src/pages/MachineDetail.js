import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { machineApi, oilChangeApi, maintenanceApi } from "../api/endpoints";

const TABS = ["Info", "Maintenance History", "Oil Change History", "Spare Parts", "Documents"];

const getStatusClass = (status) => {
  switch (status) {
    case "Running":
      return "green";
    case "Under Maintenance":
      return "orange";
    case "Breakdown":
      return "red";
    case "Idle":
      return "gray";
    default:
      return "gray";
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
  if (!data) return <div>Loading...</div>;

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
          <div>
            <strong>Machine Number:</strong> {machine.machineNumber}
          </div>
          <div>
            <strong>Type:</strong> {machine.machineType}
          </div>
          <div>
            <strong>Company:</strong> {machine.company}
          </div>
          <div>
            <strong>Model:</strong> {machine.modelNumber}
          </div>
          <div>
            <strong>Serial Number:</strong> {machine.serialNumber}
          </div>
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
        <div className="record-list">
          {spareHistory.map((s) => (
            <div className="record-row" key={s._id}>
              <strong>{s.spareName}</strong> — Qty {s.quantity} — ₹{s.price} —{" "}
              {new Date(s.replacementDate).toLocaleDateString()} — {s.reason}
            </div>
          ))}
          {spareHistory.length === 0 && <p>No spare part records yet.</p>}
        </div>
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
        <select
          value={form.maintenanceType}
          onChange={(e) => setForm({ ...form, maintenanceType: e.target.value })}
        >
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
        <button type="submit" disabled={saving}>
          Log Maintenance
        </button>
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

function OilChangeTab({ machineId, records, onSaved }) {
  const [form, setForm] = useState({ oilType: "", oilQuantity: "", remarks: "" });
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      // oilChangeDate defaults to now; nextOilChangeDate (+6 months) is
      // computed automatically by the backend.
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
        <input
          placeholder="Oil Type"
          value={form.oilType}
          onChange={(e) => setForm({ ...form, oilType: e.target.value })}
        />
        <input
          placeholder="Quantity"
          type="number"
          value={form.oilQuantity}
          onChange={(e) => setForm({ ...form, oilQuantity: e.target.value })}
        />
        <input
          placeholder="Remarks"
          value={form.remarks}
          onChange={(e) => setForm({ ...form, remarks: e.target.value })}
        />
        <button type="submit" disabled={saving}>
          Log Oil Change
        </button>
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
