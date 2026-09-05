import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  machineApi,
  oilChangeApi,
  maintenanceApi,
  maintenanceJobApi,
  sparePartApi,
  uploadApi,
} from "../api/endpoints";
import { useAuth } from "../context/AuthContext";

const statusOptions = ["Running", "Under Maintenance", "Breakdown", "Idle"];

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

const emptyMaintenance = {
  maintenanceType: "Preventive",
  maintenanceDate: "",
  description: "",
  machineRunningHours: "",
  nextMaintenanceDate: "",
  technicianName: "",
  remarks: "",
  cost: "",
  photos: [],
  videos: [],
};

const compressorComponents = ["Compressor Oil", "Oil Filter", "Air Filter", "Oil Separator", "Separator Element", "Coolant"];
const airDryerComponents = ["Air Filter", "Moisture Separator", "Coolant", "Refrigerant Level / Pressure"];
const emptySpecialized = {
  category: "Compressor",
  componentsChecked: [],
  inspectionDetails: {},
  engineerName: "",
  maintenanceDate: "",
  nextMaintenanceDate: "",
  remarks: "",
  cost: "",
  finalStatus: "Completed",
  sparePartsUsed: false,
  sparePartsDetails: [{ name: "", partNumber: "", quantity: 1, unitCost: "", totalCost: "", replacementDate: "", remarks: "", photo: [] }],
  photos: [],
};

const emptyOilChange = {
  oilChangeDate: "",
  oilType: "",
  oilQuantity: "",
  remarks: "",
  reminderMonthsInterval: 6,
};

const emptySpare = {
  spareName: "",
  spareNumber: "",
  company: "",
  quantity: 1,
  price: "",
  replacementDate: "",
  warrantyExpiry: "",
  reason: "",
  photo: [],
  invoiceFile: [],
};

const emptyJob = {
  whyStopped: "",
  laborCost: "",
  sparePartsCost: "",
  otherCost: "",
  nextMaintenanceDate: "",
  jobStatus: "Resolved",
};

const fileUrls = async (files) => {
  if (!files || !files.length) return [];
  const response = await uploadApi.multiple(files);
  return response.data.data.map((file) => file.url);
};

const asDateInput = (value) => (value ? new Date(value).toISOString().slice(0, 10) : "");

export default function MachineDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isOwner, isAdmin } = useAuth();
  const [data, setData] = useState(null);
  const [activeTab, setActiveTab] = useState("Info");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [oilChanges, setOilChanges] = useState([]);
  const [spareParts, setSpareParts] = useState([]);
  const [maintenanceForm, setMaintenanceForm] = useState(emptyMaintenance);
  const [specializedForm, setSpecializedForm] = useState(emptySpecialized);
  const [oilForm, setOilForm] = useState(emptyOilChange);
  const [spareForm, setSpareForm] = useState(emptySpare);
  const [jobForm, setJobForm] = useState(emptyJob);
  const [editingOilId, setEditingOilId] = useState(null);
  const [editingSpareId, setEditingSpareId] = useState(null);
  const [editingMaintenanceId, setEditingMaintenanceId] = useState(null);
  const [maintenanceJobs, setMaintenanceJobs] = useState([]);

  const loadData = async () => {
    try {
      setError("");
      const [machineRes, oilRes, spareRes, jobRes] = await Promise.all([
        machineApi.getById(id),
        oilChangeApi.list({ machine: id, limit: 100 }),
        sparePartApi.list({ machine: id, limit: 100 }),
        maintenanceJobApi.list({ machine: id, limit: 100 }),
      ]);
      setData(machineRes.data.data);
      setOilChanges(oilRes.data.data);
      setSpareParts(spareRes.data.data);
      setMaintenanceJobs(jobRes.data.data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load machine");
    }
  };

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        setError("");
        const [machineRes, oilRes, spareRes, jobRes] = await Promise.all([
          machineApi.getById(id),
          oilChangeApi.list({ machine: id, limit: 100 }),
          sparePartApi.list({ machine: id, limit: 100 }),
          maintenanceJobApi.list({ machine: id, limit: 100 }),
        ]);
        if (!active) return;
        setData(machineRes.data.data);
        setOilChanges(oilRes.data.data);
        setSpareParts(spareRes.data.data);
        setMaintenanceJobs(jobRes.data.data);
      } catch (err) {
        if (active) setError(err.response?.data?.message || "Failed to load machine");
      }
    })();

    return () => {
      active = false;
    };
  }, [id]);

  if (error) return <div className="error-banner">{error}</div>;
  if (!data) return <div>Loading...</div>;

  const { machine, maintenanceHistory, spareHistory, upcomingMaintenance } = data;
  const canManageMachine = isAdmin || isOwner;
  const canUploadDocuments = ["employee", "general_manager", "owner", "admin"].includes(user?.role);

  const updateMachineStatus = async (status) => {
    setSaving(true);
    try {
      const response = await machineApi.updateStatus(id, status);
      setData((current) => ({
        ...current,
        machine: { ...current.machine, status: response.data.data.status },
      }));
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update machine status");
    } finally {
      setSaving(false);
    }
  };

  const deleteMachine = async () => {
    if (!window.confirm("Delete this machine? This will hide it from the system.")) return;
    setDeleting(true);
    try {
      await machineApi.remove(id);
      navigate("/machines");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to delete machine");
      setDeleting(false);
    }
  };

  const openOilEdit = (record) => {
    setEditingOilId(record._id);
    setOilForm({
      oilChangeDate: asDateInput(record.oilChangeDate),
      oilType: record.oilType || "",
      oilQuantity: record.oilQuantity ?? "",
      remarks: record.remarks || "",
      reminderMonthsInterval: record.reminderMonthsInterval || 6,
    });
    setActiveTab("Oil Change History");
  };

  const openSpareEdit = (record) => {
    setEditingSpareId(record._id);
    setSpareForm({
      spareName: record.spareName || "",
      spareNumber: record.spareNumber || "",
      company: record.company || "",
      quantity: record.quantity ?? 1,
      price: record.price ?? "",
      replacementDate: asDateInput(record.replacementDate),
      warrantyExpiry: asDateInput(record.warrantyExpiry),
      reason: record.reason || "",
      photo: [],
      invoiceFile: [],
    });
    setActiveTab("Spare Parts");
  };

  const openMaintenanceEdit = (record) => {
    setEditingMaintenanceId(record._id);
    setMaintenanceForm({
      maintenanceType: record.maintenanceType || "Preventive",
      maintenanceDate: asDateInput(record.maintenanceDate),
      description: record.description || "",
      machineRunningHours: record.machineRunningHours ?? "",
      nextMaintenanceDate: asDateInput(record.nextMaintenanceDate),
      technicianName: record.technicianName || "",
      remarks: record.remarks || "",
      cost: record.cost ?? "",
      photos: [],
      videos: [],
    });
    setActiveTab("Maintenance History");
  };

  const submitMaintenance = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const photos = await fileUrls(maintenanceForm.photos);
      const videos = await fileUrls(maintenanceForm.videos);
      const payload = {
        maintenanceType: maintenanceForm.maintenanceType,
        maintenanceDate: maintenanceForm.maintenanceDate || undefined,
        description: maintenanceForm.description,
        machineRunningHours: maintenanceForm.machineRunningHours || undefined,
        nextMaintenanceDate: maintenanceForm.nextMaintenanceDate || undefined,
        technicianName: maintenanceForm.technicianName,
        remarks: maintenanceForm.remarks,
        cost: maintenanceForm.cost || 0,
        photos,
        videos,
        machine: id,
      };
      if (editingMaintenanceId) {
        await maintenanceApi.update(editingMaintenanceId, payload);
      } else {
        await maintenanceApi.create(payload);
      }
      setMaintenanceForm(emptyMaintenance);
      setEditingMaintenanceId(null);
      loadData();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save maintenance record");
    } finally {
      setSaving(false);
    }
  };

  const specializedComponents = specializedForm.category === "Compressor" ? compressorComponents : airDryerComponents;
  const updateInspection = (field, value) => {
    setSpecializedForm((current) => ({
      ...current,
      inspectionDetails: { ...current.inspectionDetails, [field]: value },
    }));
  };

  const toggleSpecializedComponent = (component) => {
    setSpecializedForm((current) => ({
      ...current,
      componentsChecked: current.componentsChecked.includes(component)
        ? current.componentsChecked.filter((item) => item !== component)
        : [...current.componentsChecked, component],
    }));
  };

  const updateSpecialPart = (index, field, value) => {
    setSpecializedForm((current) => ({
      ...current,
      sparePartsDetails: current.sparePartsDetails.map((part, partIndex) =>
        partIndex === index ? { ...part, [field]: value } : part
      ),
    }));
  };

  const submitSpecializedMaintenance = async (event) => {
    event.preventDefault();
    if (!specializedForm.componentsChecked.length) {
      setError("Select at least one component to inspect");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const photos = await fileUrls(specializedForm.photos);
      const sparePartsDetails = specializedForm.sparePartsUsed
        ? await Promise.all(specializedForm.sparePartsDetails.map(async (part) => {
            const [photo] = await fileUrls(part.photo);
            const quantity = Number(part.quantity) || 0;
            const unitCost = Number(part.unitCost) || 0;
            return { ...part, quantity, unitCost, totalCost: quantity * unitCost, photo: photo || undefined, replacementDate: part.replacementDate || undefined };
          }))
        : [];
      await maintenanceApi.create({
        machine: id,
        maintenanceType: specializedForm.category === "Compressor" ? "Compressor Maintenance" : "Air Dryer Maintenance",
        maintenanceCategory: specializedForm.category,
        componentsChecked: specializedForm.componentsChecked,
        inspectionDetails: specializedForm.inspectionDetails,
        engineerName: specializedForm.engineerName,
        maintenanceDate: specializedForm.maintenanceDate || undefined,
        nextMaintenanceDate: specializedForm.nextMaintenanceDate || undefined,
        remarks: specializedForm.remarks,
        cost: Number(specializedForm.cost) || 0,
        finalStatus: specializedForm.finalStatus,
        sparePartsUsed: specializedForm.sparePartsUsed,
        sparePartsDetails,
        photos,
      });
      setSpecializedForm(emptySpecialized);
      loadData();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save specialized maintenance");
    } finally {
      setSaving(false);
    }
  };

  const submitOil = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...oilForm,
        machine: id,
        oilQuantity: oilForm.oilQuantity || undefined,
      };
      if (!payload.oilChangeDate) delete payload.oilChangeDate;
      if (!payload.reminderMonthsInterval) delete payload.reminderMonthsInterval;
      if (editingOilId) {
        await oilChangeApi.update(editingOilId, payload);
      } else {
        await oilChangeApi.create(payload);
      }
      setEditingOilId(null);
      setOilForm(emptyOilChange);
      loadData();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save oil change");
    } finally {
      setSaving(false);
    }
  };

  const submitSpare = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const [photoUrl] = await fileUrls(spareForm.photo);
      const [invoiceUrl] = await fileUrls(spareForm.invoiceFile);
      const payload = {
        ...spareForm,
        machine: id,
        quantity: spareForm.quantity || 1,
        price: spareForm.price || 0,
        photo: photoUrl || undefined,
        invoiceFile: invoiceUrl || undefined,
      };
      if (!payload.replacementDate) delete payload.replacementDate;
      if (!payload.warrantyExpiry) delete payload.warrantyExpiry;
      if (editingSpareId) {
        await sparePartApi.update(editingSpareId, payload);
      } else {
        await sparePartApi.create(payload);
      }
      setEditingSpareId(null);
      setSpareForm(emptySpare);
      loadData();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save spare part");
    } finally {
      setSaving(false);
    }
  };

  const submitJob = async (event) => {
    event.preventDefault();
    if (!jobForm.whyStopped.trim()) {
      setError("Please describe why the machine stopped");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        machine: id,
        ...jobForm,
      };
      if (jobForm.nextMaintenanceDate === "") delete payload.nextMaintenanceDate;
      if (jobForm.laborCost === "") delete payload.laborCost;
      if (jobForm.sparePartsCost === "") delete payload.sparePartsCost;
      if (jobForm.otherCost === "") delete payload.otherCost;
      await maintenanceJobApi.create(payload);
      setJobForm(emptyJob);
      loadData();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save maintenance job");
    } finally {
      setSaving(false);
    }
  };

  const deleteOil = async (recordId) => {
    if (!window.confirm("Delete this oil change record?")) return;
    await oilChangeApi.remove(recordId);
    loadData();
  };

  const deleteSpare = async (recordId) => {
    if (!window.confirm("Delete this spare part record?")) return;
    await sparePartApi.remove(recordId);
    loadData();
  };

  const uploadDocuments = async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const files = form.elements.documents.files;
    if (!files?.length) return;
    setSaving(true);
    try {
      const urls = await fileUrls(files);
      const nextDocuments = [...(machine.documents || []), ...urls];
      await machineApi.update(id, { documents: nextDocuments });
      loadData();
      form.reset();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to upload documents");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>{machine.machineName}</h1>
          <p className="muted">{machine.company || "No company"}</p>
        </div>
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "center" }}>
          <span className={`status-badge ${getStatusClass(machine.status)}`}>{machine.status}</span>
          {user?.role === "employee" && (
            <select
              aria-label="Machine status"
              value={machine.status}
              disabled={saving}
              onChange={(event) => updateMachineStatus(event.target.value)}
            >
              {statusOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          )}
          {canManageMachine && (
            <>
              <Link className="btn-secondary" to={`/machines/${id}/edit`}>
                Edit Machine
              </Link>
              <button className="btn-secondary" onClick={deleteMachine} disabled={deleting}>
                {deleting ? "Deleting..." : "Delete Machine"}
              </button>
            </>
          )}
        </div>
      </div>

      <div className="tabs">
        {["Info", ...(user?.role === "employee" && ["Compressor", "Air Dryer"].includes(machine.assetType) ? ["Maintenance"] : []), "Maintenance History", "Oil Change History", "Spare Parts", "Documents", "Job Costs"].map((tab) => (
          <button
            key={tab}
            className={activeTab === tab ? "tab active" : "tab"}
            onClick={() => {
              if (tab === "Maintenance" && ["Compressor", "Air Dryer"].includes(machine.assetType)) {
                setSpecializedForm((current) => ({ ...current, category: machine.assetType, engineerName: user?.name || current.engineerName }));
              }
              setActiveTab(tab);
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === "Maintenance" && (
        <form className="detail-form specialized-maintenance" onSubmit={submitSpecializedMaintenance}>
          <h2>Specialized Maintenance</h2>
          <p className="muted">Choose a maintenance type and inspect the relevant components.</p>
          <label>Maintenance Type</label>
          <select value={machine.assetType} disabled>
            <option value="Compressor">Compressor Maintenance</option>
            <option value="Air Dryer">Air Dryer Maintenance</option>
          </select>

          <fieldset className="inspection-card">
            <legend>Components Checked</legend>
            <div className="checkbox-grid">
              {specializedComponents.map((component) => (
                <label key={component}>
                  <input type="checkbox" checked={specializedForm.componentsChecked.includes(component)} onChange={() => toggleSpecializedComponent(component)} />
                  {component}
                </label>
              ))}
            </div>
          </fieldset>

          {specializedForm.category === "Compressor" && specializedForm.componentsChecked.includes("Oil Separator") && (
            <fieldset className="inspection-card">
              <legend>Oil Separator Inspection</legend>
              <label>Separator Condition</label><select value={specializedForm.inspectionDetails.separatorCondition || ""} onChange={(event) => updateInspection("separatorCondition", event.target.value)} required><option value="">Select condition</option><option>Good</option><option>Needs Attention</option><option>Damaged</option></select>
              <label>Differential Pressure</label><input value={specializedForm.inspectionDetails.differentialPressure || ""} onChange={(event) => updateInspection("differentialPressure", event.target.value)} placeholder="e.g. 0.8 bar" />
              <label>Oil Carryover</label><select value={specializedForm.inspectionDetails.oilCarryover || ""} onChange={(event) => updateInspection("oilCarryover", event.target.value)}><option value="">Select status</option><option>Normal</option><option>High</option><option>Not Checked</option></select>
              <label>Separator Element Condition</label><select value={specializedForm.inspectionDetails.separatorElementCondition || ""} onChange={(event) => updateInspection("separatorElementCondition", event.target.value)}><option value="">Select condition</option><option>Good</option><option>Needs Replacement</option><option>Damaged</option></select>
              <label>O-Ring / Seal Condition</label><select value={specializedForm.inspectionDetails.sealCondition || ""} onChange={(event) => updateInspection("sealCondition", event.target.value)}><option value="">Select condition</option><option>Good</option><option>Replace</option><option>Leaking</option></select>
              <label>Cleaning Status</label><select value={specializedForm.inspectionDetails.cleaningStatus || ""} onChange={(event) => updateInspection("cleaningStatus", event.target.value)}><option value="">Select status</option><option>Completed</option><option>Required</option><option>Not Required</option></select>
              <label>Replacement Status</label><select value={specializedForm.inspectionDetails.replacementStatus || ""} onChange={(event) => updateInspection("replacementStatus", event.target.value)}><option value="">Select status</option><option>Not Replaced</option><option>Replaced</option><option>Recommended</option></select>
              <label>Replacement Date</label><input type="date" value={specializedForm.inspectionDetails.replacementDate || ""} onChange={(event) => updateInspection("replacementDate", event.target.value)} />
              <label>Next Replacement Date</label><input type="date" value={specializedForm.inspectionDetails.nextReplacementDate || ""} onChange={(event) => updateInspection("nextReplacementDate", event.target.value)} />
            </fieldset>
          )}

          {specializedForm.category === "Compressor" && specializedForm.componentsChecked.includes("Coolant") && (
            <fieldset className="inspection-card">
              <legend>Coolant Inspection</legend>
              <label>Coolant Level</label><select value={specializedForm.inspectionDetails.coolantLevel || ""} onChange={(event) => updateInspection("coolantLevel", event.target.value)} required><option value="">Select level</option><option>Normal</option><option>Low</option><option>Critical</option></select>
              <label>Coolant Condition</label><select value={specializedForm.inspectionDetails.coolantCondition || ""} onChange={(event) => updateInspection("coolantCondition", event.target.value)}><option value="">Select condition</option><option>Good</option><option>Contaminated</option><option>Replace</option></select>
              <label>Coolant Leakage</label><select value={specializedForm.inspectionDetails.coolantLeakage || ""} onChange={(event) => updateInspection("coolantLeakage", event.target.value)}><option value="">Select status</option><option>No Leakage</option><option>Minor Leakage</option><option>Major Leakage</option></select>
              <label>Cooler / Radiator Condition</label><select value={specializedForm.inspectionDetails.radiatorCondition || ""} onChange={(event) => updateInspection("radiatorCondition", event.target.value)}><option value="">Select condition</option><option>Good</option><option>Needs Cleaning</option><option>Damaged</option></select>
              <label>Coolant Replacement Date</label><input type="date" value={specializedForm.inspectionDetails.coolantReplacementDate || ""} onChange={(event) => updateInspection("coolantReplacementDate", event.target.value)} />
              <label>Next Coolant Service Date</label><input type="date" value={specializedForm.inspectionDetails.nextCoolantServiceDate || ""} onChange={(event) => updateInspection("nextCoolantServiceDate", event.target.value)} />
            </fieldset>
          )}

          {specializedForm.category === "Air Dryer" && (
            <fieldset className="inspection-card">
              <legend>Air Dryer Inspection</legend>
              <label>Inspection Status</label><select value={specializedForm.inspectionDetails.inspectionStatus || ""} onChange={(event) => updateInspection("inspectionStatus", event.target.value)} required><option value="">Select status</option><option>Completed</option><option>Needs Attention</option><option>Requires Repair</option></select>
              <label>Refrigerant Level / Pressure</label><input value={specializedForm.inspectionDetails.refrigerantLevelPressure || ""} onChange={(event) => updateInspection("refrigerantLevelPressure", event.target.value)} placeholder="e.g. 5 bar" />
            </fieldset>
          )}

          <label>Engineer Name</label><input value={specializedForm.engineerName} onChange={(event) => setSpecializedForm({ ...specializedForm, engineerName: event.target.value })} required />
          <label>Date &amp; Time</label><input type="datetime-local" value={specializedForm.maintenanceDate} onChange={(event) => setSpecializedForm({ ...specializedForm, maintenanceDate: event.target.value })} required />
          <label>Next Maintenance Date</label><input type="date" value={specializedForm.nextMaintenanceDate} onChange={(event) => setSpecializedForm({ ...specializedForm, nextMaintenanceDate: event.target.value })} />
          <label>Remarks</label><textarea value={specializedForm.remarks} onChange={(event) => setSpecializedForm({ ...specializedForm, remarks: event.target.value })} rows="3" />
          <label>Maintenance Cost</label><input type="number" min="0" value={specializedForm.cost} onChange={(event) => setSpecializedForm({ ...specializedForm, cost: event.target.value })} />
          <label>General Condition Photos</label><input type="file" accept="image/*" multiple onChange={(event) => setSpecializedForm({ ...specializedForm, photos: Array.from(event.target.files || []) })} />
          <label>Final Maintenance Status</label><select value={specializedForm.finalStatus} onChange={(event) => setSpecializedForm({ ...specializedForm, finalStatus: event.target.value })}><option>Completed</option><option>Due Soon</option><option>Overdue</option><option>Not Scheduled</option><option>Requires Attention</option></select>

          <fieldset className="inspection-card">
            <legend>Spare Parts Used?</legend>
            <div className="form-actions">
              <button type="button" className={specializedForm.sparePartsUsed ? "btn-primary" : "btn-secondary"} onClick={() => setSpecializedForm({ ...specializedForm, sparePartsUsed: true })}>Yes</button>
              <button type="button" className={!specializedForm.sparePartsUsed ? "btn-primary" : "btn-secondary"} onClick={() => setSpecializedForm({ ...specializedForm, sparePartsUsed: false })}>No</button>
            </div>
            {specializedForm.sparePartsUsed && specializedForm.sparePartsDetails.map((part, index) => (
              <div className="inspection-card" key={index}>
                <label>Spare Part Name</label><input value={part.name} onChange={(event) => updateSpecialPart(index, "name", event.target.value)} required />
                <label>Part Number</label><input value={part.partNumber} onChange={(event) => updateSpecialPart(index, "partNumber", event.target.value)} />
                <label>Quantity</label><input type="number" min="1" value={part.quantity} onChange={(event) => updateSpecialPart(index, "quantity", event.target.value)} required />
                <label>Unit Cost</label><input type="number" min="0" value={part.unitCost} onChange={(event) => updateSpecialPart(index, "unitCost", event.target.value)} />
                <label>Replacement Date</label><input type="date" value={part.replacementDate} onChange={(event) => updateSpecialPart(index, "replacementDate", event.target.value)} />
                <label>Remarks</label><input value={part.remarks} onChange={(event) => updateSpecialPart(index, "remarks", event.target.value)} />
                <label>Spare Part Photo</label><input type="file" accept="image/*" onChange={(event) => updateSpecialPart(index, "photo", Array.from(event.target.files || []))} />
              </div>
            ))}
            {specializedForm.sparePartsUsed && <button type="button" className="btn-secondary" onClick={() => setSpecializedForm({ ...specializedForm, sparePartsDetails: [...specializedForm.sparePartsDetails, { ...emptySpecialized.sparePartsDetails[0] }] })}>+ Add Another Spare Part</button>}
          </fieldset>
          <button type="submit" className="btn-primary" disabled={saving}>{saving ? "Saving..." : "Complete Maintenance"}</button>
        </form>
      )}

      {activeTab === "Info" && (
        <div className="info-grid">
          <div><strong>Machine Number:</strong> {machine.machineNumber}</div>
          <div><strong>Type:</strong> {machine.machineType || "-"}</div>
          <div><strong>Company:</strong> {machine.company || "-"}</div>
          <div><strong>Model:</strong> {machine.modelNumber || "-"}</div>
          <div><strong>Serial Number:</strong> {machine.serialNumber || "-"}</div>
          <div>
            <strong>Purchase Date:</strong> {machine.purchaseDate ? new Date(machine.purchaseDate).toLocaleDateString() : "-"}
          </div>
          <div>
            <strong>Installation Date:</strong>{" "}
            {machine.installationDate ? new Date(machine.installationDate).toLocaleDateString() : "-"}
          </div>
          <div>
            <strong>Warranty Expiry:</strong>{" "}
            {machine.warrantyExpiry ? new Date(machine.warrantyExpiry).toLocaleDateString() : "-"}
          </div>
          <div>
            <strong>Next Maintenance:</strong>{" "}
            {upcomingMaintenance?.nextMaintenanceDate
              ? new Date(upcomingMaintenance.nextMaintenanceDate).toLocaleDateString()
              : "-"}
          </div>
          <div>
            <strong>Assigned Employees:</strong>{" "}
            {machine.assignedEmployees?.map((employee) => employee.name).join(", ") || "None"}
          </div>
        </div>
      )}

      {activeTab === "Maintenance History" && (
        <div>
          <form className="detail-form" onSubmit={submitMaintenance}>
            <h3>{editingMaintenanceId ? "Edit Maintenance" : "Log Maintenance"}</h3>
            <label>Type</label>
            <select
              value={maintenanceForm.maintenanceType}
              onChange={(event) => setMaintenanceForm({ ...maintenanceForm, maintenanceType: event.target.value })}
            >
              <option>Preventive</option>
              <option>Idle</option>
              <option>Breakdown</option>
              <option>Inspection</option>
              <option>Other</option>
            </select>
            <label>Maintenance Date</label>
            <input
              type="date"
              value={maintenanceForm.maintenanceDate}
              onChange={(event) => setMaintenanceForm({ ...maintenanceForm, maintenanceDate: event.target.value })}
            />
            <label>Description</label>
            <input
              value={maintenanceForm.description}
              onChange={(event) => setMaintenanceForm({ ...maintenanceForm, description: event.target.value })}
            />
            <label>Machine Running Hours</label>
            <input
              type="number"
              value={maintenanceForm.machineRunningHours}
              onChange={(event) => setMaintenanceForm({ ...maintenanceForm, machineRunningHours: event.target.value })}
            />
            <label>Next Maintenance Date</label>
            <input
              type="date"
              value={maintenanceForm.nextMaintenanceDate}
              onChange={(event) => setMaintenanceForm({ ...maintenanceForm, nextMaintenanceDate: event.target.value })}
            />
            <label>Technician Name</label>
            <input
              value={maintenanceForm.technicianName}
              onChange={(event) => setMaintenanceForm({ ...maintenanceForm, technicianName: event.target.value })}
            />
            <label>Remarks</label>
            <input
              value={maintenanceForm.remarks}
              onChange={(event) => setMaintenanceForm({ ...maintenanceForm, remarks: event.target.value })}
            />
            <label>Cost</label>
            <input
              type="number"
              value={maintenanceForm.cost}
              onChange={(event) => setMaintenanceForm({ ...maintenanceForm, cost: event.target.value })}
            />
            <label>Photos</label>
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={(event) => setMaintenanceForm({ ...maintenanceForm, photos: Array.from(event.target.files || []) })}
            />
            <label>Videos</label>
            <input
              type="file"
              multiple
              accept="video/*"
              onChange={(event) => setMaintenanceForm({ ...maintenanceForm, videos: Array.from(event.target.files || []) })}
            />
            <div className="form-actions">
              <button type="submit" className="btn-primary" disabled={saving}>
                {saving ? "Saving..." : editingMaintenanceId ? "Update Maintenance" : "Save Maintenance"}
              </button>
              {editingMaintenanceId && (
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    setEditingMaintenanceId(null);
                    setMaintenanceForm(emptyMaintenance);
                  }}
                >
                  Cancel Edit
                </button>
              )}
            </div>
          </form>

          <div className="record-list">
            {maintenanceHistory.map((record) => (
              <div className="record-row" key={record._id}>
                <div>
                  <strong>{record.maintenanceType}</strong> - {new Date(record.maintenanceDate).toLocaleDateString()}
                  <div className="muted">{record.description || "No description"}</div>
                  {record.maintenanceCategory && record.maintenanceCategory !== "General" && (
                    <div className="muted">
                      Components: {record.componentsChecked?.join(", ") || "-"} | Engineer: {record.engineerName || record.technicianName || "-"} | Status: {record.finalStatus || "Completed"}
                    </div>
                  )}
                  <div className="muted">
                    Next: {record.nextMaintenanceDate ? new Date(record.nextMaintenanceDate).toLocaleDateString() : "-"} | Cost: {record.cost || 0}
                  </div>
                </div>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button className="btn-secondary" onClick={() => openMaintenanceEdit(record)}>
                    Edit
                  </button>
                </div>
              </div>
            ))}
            {maintenanceHistory.length === 0 && <p>No maintenance records yet.</p>}
          </div>
        </div>
      )}

      {activeTab === "Oil Change History" && (
        <div>
          <form className="detail-form" onSubmit={submitOil}>
            <h3>{editingOilId ? "Edit Oil Change" : "Log Oil Change"}</h3>
            <label>Oil Change Date</label>
            <input
              type="date"
              value={oilForm.oilChangeDate}
              onChange={(event) => setOilForm({ ...oilForm, oilChangeDate: event.target.value })}
            />
            <label>Oil Type</label>
            <input value={oilForm.oilType} onChange={(event) => setOilForm({ ...oilForm, oilType: event.target.value })} />
            <label>Quantity</label>
            <input
              type="number"
              value={oilForm.oilQuantity}
              onChange={(event) => setOilForm({ ...oilForm, oilQuantity: event.target.value })}
            />
            <label>Reminder Months Interval</label>
            <input
              type="number"
              value={oilForm.reminderMonthsInterval}
              onChange={(event) => setOilForm({ ...oilForm, reminderMonthsInterval: event.target.value })}
            />
            <label>Remarks</label>
            <input value={oilForm.remarks} onChange={(event) => setOilForm({ ...oilForm, remarks: event.target.value })} />
            <div className="form-actions">
              <button type="submit" className="btn-primary" disabled={saving}>
                {saving ? "Saving..." : editingOilId ? "Update Oil Change" : "Log Oil Change"}
              </button>
              {editingOilId && (
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    setEditingOilId(null);
                    setOilForm(emptyOilChange);
                  }}
                >
                  Cancel Edit
                </button>
              )}
            </div>
          </form>

          <div className="record-list">
            {oilChanges.map((record) => (
              <div className="record-row" key={record._id}>
                <div>
                  <strong>{record.oilType || "Oil Change"}</strong> - {new Date(record.oilChangeDate).toLocaleDateString()}
                  <div className="muted">
                    Next due: {record.nextOilChangeDate ? new Date(record.nextOilChangeDate).toLocaleDateString() : "-"} | {record.reminderSent ? "Reminder sent" : "Pending reminder"}
                  </div>
                </div>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button className="btn-secondary" onClick={() => openOilEdit(record)}>
                    Edit
                  </button>
                  {isOwner && (
                    <button className="btn-secondary" onClick={() => deleteOil(record._id)}>
                      Delete
                    </button>
                  )}
                </div>
              </div>
            ))}
            {oilChanges.length === 0 && <p>No oil change records yet.</p>}
          </div>
        </div>
      )}

      {activeTab === "Spare Parts" && (
        <div>
          <form className="detail-form" onSubmit={submitSpare}>
            <h3>{editingSpareId ? "Edit Spare Part" : "Add Spare Part"}</h3>
            <label>Spare Name</label>
            <input
              value={spareForm.spareName}
              onChange={(event) => setSpareForm({ ...spareForm, spareName: event.target.value })}
            />
            <label>Spare Number</label>
            <input
              value={spareForm.spareNumber}
              onChange={(event) => setSpareForm({ ...spareForm, spareNumber: event.target.value })}
            />
            <label>Company</label>
            <input value={spareForm.company} onChange={(event) => setSpareForm({ ...spareForm, company: event.target.value })} />
            <label>Quantity</label>
            <input
              type="number"
              value={spareForm.quantity}
              onChange={(event) => setSpareForm({ ...spareForm, quantity: event.target.value })}
            />
            <label>Price</label>
            <input
              type="number"
              value={spareForm.price}
              onChange={(event) => setSpareForm({ ...spareForm, price: event.target.value })}
            />
            <label>Replacement Date</label>
            <input
              type="date"
              value={spareForm.replacementDate}
              onChange={(event) => setSpareForm({ ...spareForm, replacementDate: event.target.value })}
            />
            <label>Warranty Expiry</label>
            <input
              type="date"
              value={spareForm.warrantyExpiry}
              onChange={(event) => setSpareForm({ ...spareForm, warrantyExpiry: event.target.value })}
            />
            <label>Reason</label>
            <input value={spareForm.reason} onChange={(event) => setSpareForm({ ...spareForm, reason: event.target.value })} />
            <label>Photo</label>
            <input
              type="file"
              accept="image/*"
              onChange={(event) => setSpareForm({ ...spareForm, photo: Array.from(event.target.files || []) })}
            />
            <label>Invoice File</label>
            <input
              type="file"
              accept=".pdf,image/*"
              onChange={(event) => setSpareForm({ ...spareForm, invoiceFile: Array.from(event.target.files || []) })}
            />
            <div className="form-actions">
              <button type="submit" className="btn-primary" disabled={saving}>
                {saving ? "Saving..." : editingSpareId ? "Update Spare Part" : "Save Spare Part"}
              </button>
              {editingSpareId && (
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    setEditingSpareId(null);
                    setSpareForm(emptySpare);
                  }}
                >
                  Cancel Edit
                </button>
              )}
            </div>
          </form>

          <div className="record-list">
            {spareParts.map((record) => (
              <div className="record-row" key={record._id}>
                <div>
                  <strong>{record.spareName}</strong> - Qty {record.quantity} - Price {record.price || 0}
                  <div className="muted">
                    {record.company || "-"} | {record.reason || "No reason"} | {new Date(record.replacementDate).toLocaleDateString()}
                  </div>
                </div>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button className="btn-secondary" onClick={() => openSpareEdit(record)}>
                    Edit
                  </button>
                  {isOwner && (
                    <button className="btn-secondary" onClick={() => deleteSpare(record._id)}>
                      Delete
                    </button>
                  )}
                </div>
              </div>
            ))}
            {spareParts.length === 0 && <p>No spare part records yet.</p>}
          </div>

          {spareHistory?.length > 0 && (
            <details className="legacy-spares">
              <summary>Legacy Spare Part History ({spareHistory.length})</summary>
              <div className="record-list">
                {spareHistory.map((record) => (
                  <div className="record-row" key={record._id}>
                    <strong>{record.spareName}</strong> - Qty {record.quantity} - {new Date(record.replacementDate).toLocaleDateString()} - {record.reason}
                  </div>
                ))}
              </div>
            </details>
          )}
        </div>
      )}

      {activeTab === "Documents" && (
        <div>
          {canUploadDocuments && (
            <form className="detail-form" onSubmit={uploadDocuments}>
              <h3>Upload Documents</h3>
              <input name="documents" type="file" multiple />
              <button type="submit" className="btn-primary" disabled={saving}>
                Upload
              </button>
            </form>
          )}
          <div className="record-list">
            {(machine.documents || []).map((doc, index) => (
              <a key={doc + index} href={doc} target="_blank" rel="noreferrer">
                Document {index + 1}
              </a>
            ))}
            {(!machine.documents || machine.documents.length === 0) && <p>No documents uploaded.</p>}
          </div>
        </div>
      )}

      {activeTab === "Job Costs" && (
        <div>
          <form className="detail-form" onSubmit={submitJob}>
            <h3>Track Job Cost</h3>
            <label>Why Stopped</label>
            <input
              value={jobForm.whyStopped}
              onChange={(event) => setJobForm({ ...jobForm, whyStopped: event.target.value })}
            />
            <label>Labor Cost</label>
            <input
              type="number"
              className="job-cost"
              value={jobForm.laborCost}
              onChange={(event) => setJobForm({ ...jobForm, laborCost: event.target.value })}
            />
            <label>Spare Parts Cost</label>
            <input
              type="number"
              className="job-cost"
              value={jobForm.sparePartsCost}
              onChange={(event) => setJobForm({ ...jobForm, sparePartsCost: event.target.value })}
            />
            <label>Other Cost</label>
            <input
              type="number"
              className="job-cost"
              value={jobForm.otherCost}
              onChange={(event) => setJobForm({ ...jobForm, otherCost: event.target.value })}
            />
            <label>Next Maintenance Date</label>
            <input
              type="date"
              value={jobForm.nextMaintenanceDate}
              onChange={(event) => setJobForm({ ...jobForm, nextMaintenanceDate: event.target.value })}
            />
            <label>Status</label>
            <select
              value={jobForm.jobStatus}
              onChange={(event) => setJobForm({ ...jobForm, jobStatus: event.target.value })}
            >
              <option>Pending</option>
              <option>In Progress</option>
              <option>Resolved</option>
              <option>Escalated</option>
            </select>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? "Saving..." : "Save Cost Record"}
            </button>
          </form>

          <div className="record-list">
            {maintenanceJobs.map((job) => (
              <div className="record-row" key={job._id}>
                <div>
                  <strong>{job.whyStopped}</strong>
                  <div className="muted">
                    Labor {job.laborCost || 0} | Spares {job.sparePartsCost || 0} | Other {job.otherCost || 0} | Total {job.totalCost || 0}
                  </div>
                  <div className="muted">
                    Status: {job.jobStatus} | Next maintenance: {job.nextMaintenanceDate ? new Date(job.nextMaintenanceDate).toLocaleDateString() : "-"}
                  </div>
                </div>
              </div>
            ))}
            {maintenanceJobs.length === 0 && <p>No maintenance jobs logged yet.</p>}
          </div>
        </div>
      )}
    </div>
  );
}
