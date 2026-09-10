import { useEffect, useState } from "react";
import { machineApi, reportApi } from "../api/endpoints";
import { useAuth } from "../context/AuthContext";

const currentMonth = new Date().toISOString().slice(0, 7);

const formatDate = (value) => (value ? new Date(value).toLocaleDateString() : "-");

export default function Reports() {
  const { hasRole } = useAuth();
  const isEmployee = hasRole("employee");
  const [reports, setReports] = useState([]);
  const [machines, setMachines] = useState([]);
  const [machine, setMachine] = useState("");
  const [month, setMonth] = useState(currentMonth);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [downloadingId, setDownloadingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadReports = async () => {
    try {
      const response = await reportApi.list();
      setReports(response.data.data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load reports");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const reportResponse = await reportApi.list();
        if (active) setReports(reportResponse.data.data);
        if (isEmployee) {
          const machineResponse = await machineApi.list({ limit: 200 });
          if (active) {
            const assignedMachines = machineResponse.data.data || [];
            setMachines(assignedMachines);
            setMachine((current) => current || assignedMachines[0]?._id || "");
          }
        }
      } catch (err) {
        if (active) setError(err.response?.data?.message || "Failed to load reports");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [isEmployee]);

  const submitReport = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setMessage("");
    try {
      await reportApi.createMonthly({ machine, month });
      setMessage("Monthly maintenance report submitted to the General Manager and Owner.");
      await loadReports();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to submit report");
    } finally {
      setSubmitting(false);
    }
  };

  const downloadReport = async (report) => {
    setDownloadingId(report._id);
    setError("");
    try {
      const response = await reportApi.download(report._id);
      const url = URL.createObjectURL(response.data);
      const link = document.createElement("a");
      link.href = url;
      link.download = `machine-maintenance-${report.machine?.machineNumber || report._id}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to download PDF");
    } finally {
      setDownloadingId(null);
    }
  };

  const deleteReport = async (report) => {
    if (!window.confirm("Delete this monthly maintenance report? This cannot be undone.")) return;
    setDeletingId(report._id);
    setError("");
    setMessage("");
    try {
      await reportApi.remove(report._id);
      setMessage("Report deleted successfully.");
      await loadReports();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to delete report");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Monthly Maintenance Reports</h1>
          <p className="muted">
            {isEmployee
              ? "Submit the complete maintenance history for one assigned machine and month."
              : "Review monthly machine maintenance reports submitted by employees."}
          </p>
        </div>
      </div>

      {message && <div className="success-banner">{message}</div>}
      {error && <div className="error-banner">{error}</div>}

      {isEmployee && (
        <form className="card detail-form" onSubmit={submitReport}>
          <h2>Submit Monthly Report</h2>
          <p className="muted">The report includes maintenance records, maintenance jobs, oil changes, spare parts, and costs.</p>
          <label htmlFor="report-machine">Machine</label>
          <select id="report-machine" value={machine} onChange={(event) => setMachine(event.target.value)} required>
            <option value="">Select an assigned machine</option>
            {machines.map((item) => (
              <option key={item._id} value={item._id}>
                {item.machineName} ({item.machineNumber})
              </option>
            ))}
          </select>
          <label htmlFor="report-month">Month</label>
          <input id="report-month" type="month" value={month} onChange={(event) => setMonth(event.target.value)} required />
          <button type="submit" className="btn-primary" disabled={submitting || !machine}>
            {submitting ? "Submitting..." : "Submit Report to GM and Owner"}
          </button>
        </form>
      )}

      <section className="card report-section">
        <h2>{isEmployee ? "My Submitted Reports" : "Reports Awaiting Review"}</h2>
        {loading ? <p>Loading reports...</p> : reports.length === 0 ? <p>No monthly reports found.</p> : (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Machine</th>
                  <th>Month</th>
                  {!isEmployee && <th>Submitted By</th>}
                  <th>Status</th>
                  <th>Submitted</th>
                  <th>PDF</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((report) => (
                  <tr key={report._id}>
                    <td>{report.machine?.machineName || "-"} ({report.machine?.machineNumber || "-"})</td>
                    <td>{formatDate(report.dateRangeStart)} - {formatDate(new Date(report.dateRangeEnd).getTime() - 86400000)}</td>
                    {!isEmployee && <td>{report.generatedBy?.name || report.generatedBy?.email || "-"}</td>}
                    <td><span className="status-badge green">{report.status || "Submitted"}</span></td>
                    <td>{formatDate(report.createdAt)}</td>
                    <td>
                      <button type="button" className="btn-secondary" onClick={() => downloadReport(report)} disabled={downloadingId === report._id}>
                        {downloadingId === report._id ? "Preparing..." : "Download PDF"}
                      </button>
                    </td>
                    <td>
                      <button type="button" className="btn-secondary" onClick={() => deleteReport(report)} disabled={deletingId === report._id}>
                        {deletingId === report._id ? "Deleting..." : "Delete"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
