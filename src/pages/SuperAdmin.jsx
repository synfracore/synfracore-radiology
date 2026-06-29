import { useEffect, useState } from "react";
import Layout from "../components/Layout.jsx";
import { listHospitals, createHospital } from "../store.js";

export default function SuperAdmin() {
  const [hospitals, setHospitals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [lastCreated, setLastCreated] = useState(null);

  const [hospitalName, setHospitalName] = useState("");
  const [adminFullName, setAdminFullName] = useState("");
  const [adminUsername, setAdminUsername] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [securityQuestion, setSecurityQuestion] = useState("");
  const [securityAnswer, setSecurityAnswer] = useState("");

  function refresh() {
    setLoading(true);
    listHospitals()
      .then(setHospitals)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(refresh, []);

  async function handleCreate(e) {
    e.preventDefault();
    setError("");
    setCreating(true);
    try {
      await createHospital({
        hospitalName: hospitalName.trim(),
        adminUsername: adminUsername.trim(),
        adminPassword,
        adminFullName: adminFullName.trim(),
        securityQuestion: securityQuestion.trim(),
        securityAnswer: securityAnswer.trim(),
      });
      setLastCreated({ username: adminUsername.trim(), password: adminPassword, hospitalName: hospitalName.trim() });
      setHospitalName("");
      setAdminFullName("");
      setAdminUsername("");
      setAdminPassword("");
      setSecurityQuestion("");
      setSecurityAnswer("");
      refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  }

  return (
    <Layout title="Manage Hospitals">
      <div className="card">
        <h2>🏥 Onboard New Hospital</h2>
        {error && <p style={{ color: "#d64545", fontSize: 13 }}>{error}</p>}
        <form onSubmit={handleCreate}>
          <div className="grid-3">
            <div className="field">
              <label>Hospital Name</label>
              <input value={hospitalName} onChange={(e) => setHospitalName(e.target.value)} required />
            </div>
            <div className="field">
              <label>Admin Full Name</label>
              <input value={adminFullName} onChange={(e) => setAdminFullName(e.target.value)} required />
            </div>
            <div className="field">
              <label>Admin Username</label>
              <input value={adminUsername} onChange={(e) => setAdminUsername(e.target.value)} required />
            </div>
          </div>
          <div className="grid-3">
            <div className="field">
              <label>Admin Password (min 8 chars)</label>
              <input type="password" value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} minLength={8} required />
            </div>
            <div className="field">
              <label>Security Question</label>
              <input
                value={securityQuestion}
                onChange={(e) => setSecurityQuestion(e.target.value)}
                placeholder="e.g. What city were you born in?"
                required
              />
            </div>
            <div className="field">
              <label>Security Answer</label>
              <input value={securityAnswer} onChange={(e) => setSecurityAnswer(e.target.value)} required />
            </div>
          </div>
          <button className="btn btn-primary" type="submit" disabled={creating}>
            {creating ? "Creating..." : "+ Create Hospital & Admin"}
          </button>
        </form>

        {lastCreated && (
          <div style={{ marginTop: 14, background: "#e4f5ea", padding: 12, borderRadius: 8, fontSize: 13 }}>
            "{lastCreated.hospitalName}" created. Share these credentials with their admin:
            <br />
            <strong>Username:</strong> {lastCreated.username} &nbsp; <strong>Password:</strong> {lastCreated.password}
          </div>
        )}
      </div>

      <div className="card">
        <h2>Hospitals ({loading ? "..." : hospitals.length})</h2>
        {loading ? (
          <p style={{ color: "#888" }}>Loading...</p>
        ) : hospitals.length === 0 ? (
          <p style={{ color: "#888", fontSize: 14 }}>No hospitals onboarded yet.</p>
        ) : (
          <table className="history-table">
            <thead>
              <tr>
                <th>Hospital</th>
                <th>Admin</th>
                <th>Username</th>
                <th>Onboarded</th>
              </tr>
            </thead>
            <tbody>
              {hospitals.map((h) => (
                <tr key={h.id}>
                  <td>{h.name}</td>
                  <td>{h.admin_full_name || "-"}</td>
                  <td>{h.admin_username || "-"}</td>
                  <td>{new Date(h.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </Layout>
  );
}
