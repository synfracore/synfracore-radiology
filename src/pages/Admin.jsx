import { useEffect, useState } from "react";
import Layout from "../components/Layout.jsx";
import { listRadiologists, createRadiologist, deleteRadiologist } from "../store.js";

export default function Admin() {
  const [radiologists, setRadiologists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);

  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [lastCreated, setLastCreated] = useState(null);

  function refresh() {
    setLoading(true);
    listRadiologists()
      .then(setRadiologists)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(refresh, []);

  async function handleCreate(e) {
    e.preventDefault();
    setError("");
    setCreating(true);
    try {
      await createRadiologist({ username: username.trim(), password, fullName: fullName.trim() });
      setLastCreated({ username: username.trim(), password });
      setFullName("");
      setUsername("");
      setPassword("");
      refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(id) {
    if (!confirm("Remove this radiologist's access?")) return;
    try {
      await deleteRadiologist(id);
      refresh();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <Layout title="Manage Radiologists">
      <div className="card">
        <h2>Add Radiologist</h2>
        {error && <p style={{ color: "#d64545", fontSize: 13 }}>{error}</p>}
        <form onSubmit={handleCreate}>
          <div className="grid-3">
            <div className="field">
              <label>Full Name</label>
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
          <button className="btn btn-primary" type="submit" disabled={creating}>
            {creating ? "Creating..." : "+ Create Account"}
          </button>
        </form>

        {lastCreated && (
          <div style={{ marginTop: 14, background: "#e4f5ea", padding: 12, borderRadius: 8, fontSize: 13 }}>
            Account created. Share these credentials with the radiologist:
            <br />
            <strong>Username:</strong> {lastCreated.username} &nbsp; <strong>Password:</strong> {lastCreated.password}
          </div>
        )}
      </div>

      <div className="card">
        <h2>Radiologists ({radiologists.length})</h2>
        {loading ? (
          <p style={{ color: "#888" }}>Loading...</p>
        ) : radiologists.length === 0 ? (
          <p style={{ color: "#888", fontSize: 14 }}>No radiologists added yet.</p>
        ) : (
          <table className="history-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Username</th>
                <th>Added</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {radiologists.map((r) => (
                <tr key={r.id}>
                  <td>{r.full_name}</td>
                  <td>{r.username}</td>
                  <td>{new Date(r.created_at).toLocaleDateString()}</td>
                  <td>
                    <button className="btn btn-outline" style={{ padding: "4px 10px", fontSize: 12 }} onClick={() => handleDelete(r.id)}>
                      Remove
                    </button>
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
