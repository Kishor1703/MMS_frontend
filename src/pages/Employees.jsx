import { useEffect, useState } from "react";
import { employeeApi } from "../api/endpoints";

const empty = {
  employeeId: "",
  name: "",
  phoneNumber: "",
  email: "",
  department: "",
  designation: "",
  password: "",
};

export default function Employees() {
  const [employees, setEmployees] = useState([]);
  const [form, setForm] = useState(empty);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState("");

  const load = () => employeeApi.list().then((res) => setEmployees(res.data.data));

  useEffect(() => { load(); }, []);

  const handleChange = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await employeeApi.create(form);
      setForm(empty);
      setShowForm(false);
      load();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to add employee");
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
        <button className="btn-primary" onClick={() => setShowForm(!showForm)}>
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
          <label>Login Password (optional - creates their login)</label>
          <input type="password" value={form.password} onChange={handleChange("password")} />
          <button type="submit">Save Employee</button>
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
                <button onClick={() => remove(emp._id)}>Deactivate</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
