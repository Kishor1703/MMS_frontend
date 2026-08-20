import { useEffect, useState } from "react";
import { authApi } from "../api/endpoints";

const empty = { name: "", companyName: "", email: "", phoneNumber: "", password: "" };

export default function AccountManagement({ role }) {
  const isOwner = role === "owner";
  const label = isOwner ? "Owner" : "General Manager";
  const pluralLabel = isOwner ? "Owners" : "General Managers";
  const [accounts, setAccounts] = useState([]);
  const [form, setForm] = useState(empty);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState("");

  const load = () => authApi.listUsers(role).then((res) => setAccounts(res.data.data));

  useEffect(() => { load(); }, [role]);

  const change = (field) => (event) =>
    setForm((current) => ({ ...current, [field]: event.target.value }));

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    try {
      await authApi.register({ ...form, role });
      setForm(empty);
      setShowForm(false);
      load();
    } catch (err) {
      setError(err.response?.data?.message || `Failed to create ${label.toLowerCase()}`);
    }
  };

  const remove = async (account) => {
    if (!window.confirm(`Deactivate ${account.name} and all of this company's related accounts?`)) return;
    setError("");
    try {
      await authApi.removeUser(account._id);
      load();
    } catch (err) {
      setError(err.response?.data?.message || `Failed to delete ${label.toLowerCase()}`);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1>{pluralLabel}</h1>
        <button className="btn-primary" onClick={() => setShowForm((visible) => !visible)}>
          {showForm ? "Cancel" : `+ Add ${label}`}
        </button>
      </div>

      {showForm && (
        <form className="detail-form" onSubmit={submit}>
          {error && <div className="error-banner">{error}</div>}
          <label>Name</label>
          <input value={form.name} onChange={change("name")} required />
          {isOwner && <>
            <label>Company Name</label>
            <input value={form.companyName} onChange={change("companyName")} required />
          </>}
          <label>Email</label>
          <input type="email" value={form.email} onChange={change("email")} required />
          <label>Phone Number</label>
          <input value={form.phoneNumber} onChange={change("phoneNumber")} required />
          <label>Temporary Password</label>
          <input type="password" minLength="6" value={form.password} onChange={change("password")} required />
          <button type="submit">Create {label}</button>
        </form>
      )}

      <table className="data-table">
        <thead>
          <tr><th>Name</th>{isOwner && <th>Company</th>}<th>Email</th><th>Phone</th><th>Created</th>{isOwner && <th />}</tr>
        </thead>
        <tbody>
          {accounts.map((account) => (
            <tr key={account._id}>
              <td>{account.name}</td>
              {isOwner && <td>{account.companyName || "—"}</td>}
              <td>{account.email}</td>
              <td>{account.phoneNumber}</td>
              <td>{new Date(account.createdAt).toLocaleDateString()}</td>
              {isOwner && <td><button className="btn-danger-sm" onClick={() => remove(account)}>Delete</button></td>}
            </tr>
          ))}
          {!accounts.length && <tr><td colSpan={isOwner ? 6 : 4} className="muted">No {pluralLabel.toLowerCase()} yet.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
