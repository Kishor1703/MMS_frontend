import { useState } from "react";
import { Link } from "react-router-dom";
import { authApi } from "../api/endpoints";

export default function ChangePassword() {
  const [form, setForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);

  const handleChange = (field) => (e) =>
    setForm({ ...form, [field]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (form.newPassword.length < 6) {
      setError("New password must be at least 6 characters long.");
      return;
    }
    if (form.newPassword !== form.confirmPassword) {
      setError("New password and confirmation do not match.");
      return;
    }
    setSaving(true);
    try {
      await authApi.changePassword({
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      });
      setSuccess("Password changed successfully.");
      setForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (err) {
      setError(err.response?.data?.message || "Failed to change password");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <h1>Change Password</h1>
      {error && <div className="error-banner">{error}</div>}
      {success && <div className="success-banner">{success}</div>}

      <form className="detail-form leave-form" onSubmit={submit}>
        <label>Current Password</label>
        <input
          type="password"
          required
          value={form.currentPassword}
          onChange={handleChange("currentPassword")}
          autoComplete="current-password"
        />
        <label>New Password</label>
        <input
          type="password"
          required
          minLength="6"
          value={form.newPassword}
          onChange={handleChange("newPassword")}
          autoComplete="new-password"
        />
        <label>Confirm New Password</label>
        <input
          type="password"
          required
          value={form.confirmPassword}
          onChange={handleChange("confirmPassword")}
          autoComplete="new-password"
        />
        <button type="submit" disabled={saving}>
          {saving ? "Updating..." : "Change Password"}
        </button>
        <Link to="/profile" className="btn-secondary">
          Back to Profile
        </Link>
      </form>
    </div>
  );
}