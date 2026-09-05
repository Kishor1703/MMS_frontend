import { useEffect, useState } from "react";
import { leaveApi } from "../api/endpoints";
import { useAuth } from "../context/AuthContext";

const emptyLeave = {
  leaveType: "Casual",
  startDate: "",
  endDate: "",
  reason: "",
};

export default function LeaveManagement() {
  const { user, hasRole } = useAuth();
  const [requests, setRequests] = useState([]);
  const [form, setForm] = useState(emptyLeave);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    const response = await leaveApi.list();
    setRequests(response.data.data);
  };

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const response = await leaveApi.list();
        if (active) setRequests(response.data.data);
      } catch (err) {
        if (active) setError(err.response?.data?.message || "Failed to load leave requests");
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await leaveApi.create(form);
      setForm(emptyLeave);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to submit leave request");
    } finally {
      setSaving(false);
    }
  };

  const updateStatus = async (id, status) => {
    await leaveApi.update(id, { status });
    await load();
  };

  const remove = async (id) => {
    if (!window.confirm("Delete this leave request?")) return;
    await leaveApi.remove(id);
    await load();
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Leaves</h1>
          <p className="muted">Track requests, approvals, and leave history.</p>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {user?.role === "employee" && (
        <form className="detail-form" onSubmit={submit}>
          <h3>Request Leave</h3>
          <label>Leave Type</label>
          <select value={form.leaveType} onChange={(event) => setForm({ ...form, leaveType: event.target.value })}>
            <option>Casual</option>
            <option>Sick</option>
            <option>Earned</option>
            <option>Unpaid</option>
            <option>Other</option>
          </select>
          <label>Start Date</label>
          <input type="date" value={form.startDate} onChange={(event) => setForm({ ...form, startDate: event.target.value })} />
          <label>End Date</label>
          <input type="date" value={form.endDate} onChange={(event) => setForm({ ...form, endDate: event.target.value })} />
          <label>Reason</label>
          <input value={form.reason} onChange={(event) => setForm({ ...form, reason: event.target.value })} />
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? "Submitting..." : "Submit Request"}
          </button>
        </form>
      )}

      <div className="record-list">
        {requests.map((request) => (
          <div className="record-row" key={request._id}>
            <div>
              <strong>{request.employee?.name || "Leave Request"}</strong>
              <div className="muted">
                {request.leaveType} | {new Date(request.startDate).toLocaleDateString()} to {new Date(request.endDate).toLocaleDateString()}
              </div>
              <div className="muted">{request.reason}</div>
              <div className="muted">Status: {request.status}</div>
            </div>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              {hasRole("admin", "owner", "general_manager") && request.status === "Pending" && (
                <>
                  <button className="btn-secondary" onClick={() => updateStatus(request._id, "Approved")}>
                    Approve
                  </button>
                  <button className="btn-secondary" onClick={() => updateStatus(request._id, "Rejected")}>
                    Reject
                  </button>
                </>
              )}
              {hasRole("employee") && request.status === "Pending" && (
                <button className="btn-secondary" onClick={() => remove(request._id)}>
                  Delete
                </button>
              )}
            </div>
          </div>
        ))}
        {requests.length === 0 && <p>No leave requests yet.</p>}
      </div>
    </div>
  );
}
