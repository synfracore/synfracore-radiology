import { useEffect, useState } from "react";
import Layout from "../components/Layout.jsx";
import { listHospitals, createHospital, addHospitalAdmin } from "../store.js";

function AddAdminForm({ hospital, onDone }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [securityQuestion, setSecurityQuestion] = useState("");
  const [securityAnswer, setSecurityAnswer] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      await addHospitalAdmin(hospital.id, {
        username: username.trim(),
        password,
        fullName: fullName.trim(),
        securityQuestion: securityQuestion.trim(),
        securityAnswer: securityAnswer.trim(),
      });
      onDone({ username: username.trim(), password });
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <tr>
      <td colSpan={4} style={{ background: "#f6f8fc" }}>
        <form onSubmit={handleSubmit} style={{ padding: "12px 4px" }}>
          {error && <p style={{ color: "#d64545", fontSize: 12 }}>{error}</p>}
          <div className="grid-3">
            <div className="field">
              <label>Admin Full Name</label>
              <input value={fullName} onChange={(e) => setFullName(e.target.value)} required />
            </div>
            <div className="field">
              <label>Username</label>
              <input value={username} onChange={(e) => setUsername(e.target.value)} required />
            </div>
            <div className="field">
              <label>Password (min 8 chars)</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} required />
            </div>
          </div>
          <div className="grid-3">
            <div className="field">
              <label>Security Question</label>
              <input value={securityQuestion} onChange={(e) => setSecurityQuestion(e.target.value)} required />
            </div>
            <div className="field">
              <label>Security Answer</label>
              <input value={securityAnswer} onChange={(e) => setSecurityAnswer(e.target.value)} required />
            </div>
          </div>
          <button className="btn btn-primary" type="submit" disabled={saving}>
            {saving ? "Saving..." : `Create Admin for ${hospital.name}`}
          </button>
        </form>
      </td>
    </tr>
  );
}

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
  const [addingAdminFor, setAddingAdminFor] = useState(null);
  const [adminCreatedNotice, setAdminCreatedNotice] = useState(null);

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
        {adminCreatedNotice && (
          <div style={{ marginBottom: 14, background: "#e4f5ea", padding: 12, borderRadius: 8, fontSize: 13 }}>
            Admin created. Share these credentials:
            <br />
            <strong>Username:</strong> {adminCreatedNotice.username} &nbsp;{" "}
            <strong>Password:</strong> {adminCreatedNotice.password}
          </div>
        )}
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
                <>
                  <tr key={h.id}>
                    <td>{h.name}</td>
                    <td>{h.admin_full_name || <span style={{ color: "#d97706" }}>No admin</span>}</td>
                    <td>
                      {h.admin_username || (
                        <button
                          className="btn btn-outline"
                          style={{ padding: "4px 10px", fontSize: 12 }}
                          onClick={() => setAddingAdminFor(addingAdminFor === h.id ? null : h.id)}
                        >
                          {addingAdminFor === h.id ? "Cancel" : "+ Add Admin"}
                        </button>
                      )}
                    </td>
                    <td>{new Date(h.created_at).toLocaleDateString()}</td>
                  </tr>
                  {addingAdminFor === h.id && (
                    <AddAdminForm
                      hospital={h}
                      onDone={(creds) => {
                        setAddingAdminFor(null);
                        setAdminCreatedNotice(creds);
                        refresh();
                      }}
                    />
                  )}
                </>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </Layout>
  );
}
