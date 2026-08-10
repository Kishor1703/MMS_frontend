import { useEffect, useState } from "react";
import apiClient from "../api/client";

export default function Reports() {
  const [reports, setReports] = useState([]);
  const [reportType, setReportType] = useState("Monthly");
  const [format, setFormat] = useState("pdf");

  const load = () => apiClient.get("/reports").then((res) => setReports(res.data.data));

  useEffect(() => { load(); }, []);

  const request = async (e) => {
    e.preventDefault();
    await apiClient.post("/reports", { reportType, format });
    load();
  };

  return (
    <div>
      <h1>Reports</h1>
      <form className="inline-form" onSubmit={request}>
        <select value={reportType} onChange={(e) => setReportType(e.target.value)}>
          <option>Daily</option>
          <option>Weekly</option>
          <option>Monthly</option>
          <option>Yearly</option>
          <option>Machine</option>
          <option>Employee</option>
          <option>Oil Change</option>
          <option>Spare</option>
        </select>
        <select value={format} onChange={(e) => setFormat(e.target.value)}>
          <option value="pdf">PDF</option>
          <option value="excel">Excel</option>
          <option value="csv">CSV</option>
        </select>
        <button type="submit">Generate Report</button>
      </form>

      <table className="data-table">
        <thead>
          <tr>
            <th>Type</th>
            <th>Format</th>
            <th>Requested</th>
            <th>File</th>
          </tr>
        </thead>
        <tbody>
          {reports.map((r) => (
            <tr key={r._id}>
              <td>{r.reportType}</td>
              <td>{r.format}</td>
              <td>{new Date(r.createdAt).toLocaleString()}</td>
              <td>
                {r.fileUrl ? (
                  <a href={r.fileUrl} target="_blank" rel="noreferrer">
                    Download
                  </a>
                ) : (
                  "Processing..."
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
