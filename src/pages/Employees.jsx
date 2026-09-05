import { useEffect, useState } from "react";
import { employeeApi, machineApi, uploadApi } from "../api/endpoints";

const empty = {
  employeeId: "",
  name: "",
  phoneNumber: "",
  email: "",
  department: "",
  designation: "",
  password: "",
  assignedMachines: [],
};

export default function Employees() {
  const [employees, setEmployees] = useState([]);
  const [machines, setMachines] = useState([]);
  const [form, setForm] = useState(empty);
  const [showForm, setShowForm] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [error, setError] = useState("");
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [saving, setSaving] = useState(false);

  // The API paginates at 20 records by default. Request the full GM team so
  // employees do not silently disappear from the management screen.
  const load = () => employeeApi.list({ limit: 500 }).then((res) => setEmployees(res.data.data));

  useEffect(() => {
    load();
    machineApi.list({ limit: 500 }).then((res) => setMachines(res.data.data));
  }, []);

  const handleChange = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const openCreateForm = () => {
    setEditingEmployee(null);
    setForm(empty);
    setProfilePhoto(null);
    setError("");
    setShowForm(true);
  };

  const openEditForm = (employee) => {
    setEditingEmployee(employee);
    setForm({
      employeeId: employee.employeeId || "",
      name: employee.name || "",
      phoneNumber: employee.phoneNumber || "",
      email: employee.email || "",
      department: employee.department || "",
      designation: employee.designation || "",
      password: "",
      assignedMachines: employee.assignedMachines?.map((machine) => machine._id || machine) || [],
    });
    setProfilePhoto(null);
    setError("");
    setShowForm(true);
  };

  const toggleMachine = (machineId) => {
    setForm((current) => ({
      ...current,
      assignedMachines: current.assignedMachines.includes(machineId)
        ? current.assignedMachines.filter((id) => id !== machineId)
        : [...current.assignedMachines, machineId],
    }));
  };

  const renderAssignmentGroup = (label, equipment, emptyLabel) => (
    <>
      <label>Assign {label}</label>
      <details className="machine-checkbox-dropdown">
        <summary>
          {equipment.filter((item) => form.assignedMachines.includes(item._id)).length
            ? `${equipment.filter((item) => form.assignedMachines.includes(item._id)).length} ${label.toLowerCase()} selected`
            : `Select ${label.toLowerCase()}`}
        </summary>
        <div className="machine-checkbox-options">
          {equipment.length ? equipment.map((item) => (
            <label key={item._id} className="machine-checkbox-option">
              <input
                type="checkbox"
                checked={form.assignedMachines.includes(item._id)}
                onChange={() => toggleMachine(item._id)}
              />
              <span>{item.machineName} ({item.machineId || item.machineNumber})</span>
            </label>
          )) : <span className="muted">{emptyLabel}</span>}
        </div>
      </details>
    </>
  );

  const regularMachines = machines.filter((machine) => !machine.assetType || machine.assetType === "Machine");
  const compressors = machines.filter((machine) => machine.assetType === "Compressor");
  const airDryers = machines.filter((machine) => machine.assetType === "Air Dryer");

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (!editingEmployee && !profilePhoto) {
      setError("Please upload a profile photo.");
      return;
    }
    setSaving(true);
    try {
      let profilePhotoUrl = editingEmployee?.profilePhoto;
      if (profilePhoto) {
        const upload = await uploadApi.single(profilePhoto);
        profilePhotoUrl = upload.data.data.url;
      }
      const payload = { ...form, profilePhoto: profilePhotoUrl };
      if (!payload.password) delete payload.password;
      if (editingEmployee) {
        await employeeApi.update(editingEmployee._id, payload);
      } else {
        await employeeApi.create(payload);
      }
      setForm(empty);
      setProfilePhoto(null);
      setEditingEmployee(null);
      setShowForm(false);
      load();
    } catch (err) {
      setError(err.response?.data?.message || `Failed to ${editingEmployee ? "update" : "add"} employee`);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id) => {
    if (!window.confirm("Deactivate this employee?")) return;
    await employeeApi.remove(id);
    load();
  };

  return (
    <div>
      <div className="page-header">
        <h1>Employees</h1>
        <button
          className="btn-primary"
          onClick={() => {
            if (showForm) {
              setShowForm(false);
              setEditingEmployee(null);
            } else {
              openCreateForm();
            }
          }}
        >
          {showForm ? "Cancel" : "+ Add Employee"}
        </button>
      </div>

      {showForm && (
        <form className="detail-form" onSubmit={submit}>
          {error && <div className="error-banner">{error}</div>}
          <label>Employee ID</label>
          <input value={form.employeeId} onChange={handleChange("employeeId")} required />
          <label>Name</label>
          <input value={form.name} onChange={handleChange("name")} required />
          <label>Phone Number</label>
          <input value={form.phoneNumber} onChange={handleChange("phoneNumber")} required />
          <label>Email</label>
          <input type="email" value={form.email} onChange={handleChange("email")} required />
          <label>Department</label>
          <input value={form.department} onChange={handleChange("department")} />
          <label>Designation</label>
          <input value={form.designation} onChange={handleChange("designation")} />
          <label>Profile Photo {editingEmployee && "(optional)"}</label>
          <input
            type="file"
            accept="image/jpeg,image/png,image/gif"
            onChange={(e) => setProfilePhoto(e.target.files?.[0] || null)}
            required={!editingEmployee}
          />
          {editingEmployee?.profilePhoto && !profilePhoto && <p className="muted">Current profile photo will be kept.</p>}
          {profilePhoto && <p className="muted">Selected: {profilePhoto.name}</p>}
          {renderAssignmentGroup("Machines", regularMachines, "No machines available")}
          {renderAssignmentGroup("Compressors", compressors, "No compressors available")}
          {renderAssignmentGroup("Air Dryers", airDryers, "No air dryers available")}
          <label>{editingEmployee ? "New Login Password (optional)" : "Login Password (optional - creates their login)"}</label>
          <input type="password" value={form.password} onChange={handleChange("password")} />
          <button type="submit" disabled={saving}>{saving ? "Saving..." : editingEmployee ? "Update Employee" : "Save Employee"}</button>
        </form>
      )}

      <table className="data-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Name</th>
            <th>Phone</th>
            <th>Department</th>
            <th>Assigned Machines</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {employees.map((emp) => (
            <tr key={emp._id}>
              <td>{emp.employeeId}</td>
              <td>{emp.name}</td>
              <td>{emp.phoneNumber}</td>
              <td>{emp.department}</td>
              <td>{emp.assignedMachines?.length || 0}</td>
              <td>
                <button className="btn-secondary-sm" onClick={() => openEditForm(emp)}>Edit</button>{" "}
                <button onClick={() => remove(emp._id)}>Deactivate</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
