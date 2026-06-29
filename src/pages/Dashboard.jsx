import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Layout from "../components/Layout.jsx";
import { listReports } from "../store.js";

export default function Dashboard() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    listReports()
      .then(setReports)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <Layout title="Dashboard">
      <div className="card">
        <h2>Quick Action</h2>
        <Link to="/new-report">
          <button className="btn btn-primary">+ New Report</button>
        </Link>
      </div>

      <div className="card">
        <h2>Hospital Reports {!loading && `(${reports.length})`}</h2>
        {error && <p style={{ color: "#d64545", fontSize: 13 }}>{error}</p>}
        {loading ? (
          <p style={{ color: "#888" }}>Loading...</p>
        ) : reports.length === 0 ? (
          <p style={{ color: "#888", fontSize: 14 }}>No reports yet. Create your first one.</p>
        ) : (
          <table className="history-table">
            <thead>
              <tr>
                <th>Patient</th>
                <th>Modality</th>
                <th>Study</th>
                <th>Status</th>
                <th>Updated</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {reports.map((r) => (
                <tr key={r.id}>
                  <td>{r.patient_name || "-"}</td>
                  <td>{r.modality}</td>
                  <td>{r.study}</td>
                  <td>
                    <span className={`badge ${r.status === "Approved" ? "success" : "warning"}`}>
                      {r.status || "Draft"}
                    </span>
                  </td>
                  <td>{new Date(r.updated_at).toLocaleString()}</td>
                  <td>
                    <Link to={`/report/${r.id}`}>Open</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </Layout>
  );
}
