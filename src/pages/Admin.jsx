import { useEffect, useState } from "react";
import Layout from "../components/Layout.jsx";
import {
  listRadiologists,
  createRadiologist,
  deleteRadiologist,
  getHospitalInfo,
  updateHospitalInfo,
} from "../store.js";

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function HospitalSettingsCard() {
  const [hospital, setHospital] = useState(null);
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [logoPreview, setLogoPreview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getHospitalInfo()
      .then((h) => {
        setHospital(h);
        setAddress(h?.address || "");
        setPhone(h?.phone || "");
        setLogoPreview(h?.logo_data || null);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  async function handleLogoChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const dataUrl = await fileToDataUrl(file);
    setLogoPreview(dataUrl);
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      const updated = await updateHospitalInfo({ address, phone, logoData: logoPreview });
      setHospital(updated);
      setSaved(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card">
      <h2>🏥 Hospital Settings</h2>
      {error && <p style={{ color: "#d64545", fontSize: 13 }}>{error}</p>}
      {loading ? (
        <p style={{ color: "#888" }}>Loading...</p>
      ) : (
        <form onSubmit={handleSave}>
          <div className="grid-3">
            <div className="field">
              <label>Hospital Name</label>
              <input value={hospital?.name || ""} disabled />
            </div>
            <div className="field">
              <label>Address</label>
              <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="e.g. 12 MG Road, Bengaluru" />
            </div>
            <div className="field">
              <label>Phone</label>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="e.g. +91 80 1234 5678" />
            </div>
          </div>
          <div className="field">
            <label>Logo (shown on printed reports)</label>
            <input type="file" accept="image/*" onChange={handleLogoChange} />
            {logoPreview && (
              <img
                src={logoPreview}
                alt="Hospital logo preview"
                style={{ height: 40, marginTop: 10, display: "block" }}
              />
            )}
          </div>
          <button className="btn btn-primary" type="submit" disabled={saving}>
            {saving ? "Saving..." : "Save Hospital Settings"}
          </button>
          {saved && <span style={{ marginLeft: 10, fontSize: 12, color: "#16a34a" }}>Saved.</span>}
        </form>
      )}
    </div>
  );
}

export default function Admin() {
  const [radiologists, setRadiologists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);

  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [securityQuestion, setSecurityQuestion] = useState("");
  const [securityAnswer, setSecurityAnswer] = useState("");
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
      await createRadiologist({
        username: username.trim(),
        password,
        fullName: fullName.trim(),
        securityQuestion: securityQuestion.trim(),
        securityAnswer: securityAnswer.trim(),
      });
      setLastCreated({ username: username.trim(), password });
      setFullName("");
      setUsername("");
      setPassword("");
      setSecurityQuestion("");
      setSecurityAnswer("");
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
      <HospitalSettingsCard />

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
          <div className="grid-3">
            <div className="field">
              <label>Security Question</label>
              <input
                value={securityQuestion}
                onChange={(e) => setSecurityQuestion(e.target.value)}
                placeholder="e.g. What is your father's middle name?"
                required
              />
            </div>
            <div className="field">
              <label>Security Answer</label>
              <input
                value={securityAnswer}
                onChange={(e) => setSecurityAnswer(e.target.value)}
                placeholder="Used to verify password resets"
                required
              />
            </div>
          </div>
          <button className="btn btn-primary" type="submit" disabled={creating}>
            {creating ? "Creating..." : "+ Create Account"}
          </button>
        </form>

        {lastCreated && (
          <div style={{ marginTop: 14, background: "#e4f5ea", padding: 12, borderRadius: 8, fontSize: 13 }}>
            Account created. Share these credentials with the radiologist (including
            the security question/answer, so they can reset their own password later):
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
