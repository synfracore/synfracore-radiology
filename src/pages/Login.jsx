import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { login, registerHospital } from "../store.js";

export default function Login() {
  const [mode, setMode] = useState("login"); // login | register
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // login fields
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  // hospital registration fields
  const [hospitalName, setHospitalName] = useState("");
  const [adminFullName, setAdminFullName] = useState("");
  const [adminUsername, setAdminUsername] = useState("");
  const [adminPassword, setAdminPassword] = useState("");

  async function handleLogin(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(username.trim(), password);
      navigate("/dashboard");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await registerHospital({
        hospitalName: hospitalName.trim(),
        adminUsername: adminUsername.trim(),
        adminPassword,
        adminFullName: adminFullName.trim(),
      });
      navigate("/dashboard");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-wrap">
      <div className="login-card">
        <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
          <button
            type="button"
            className={`btn ${mode === "login" ? "btn-primary" : "btn-outline"}`}
            style={{ flex: 1, justifyContent: "center" }}
            onClick={() => setMode("login")}
          >
            Login
          </button>
          <button
            type="button"
            className={`btn ${mode === "register" ? "btn-primary" : "btn-outline"}`}
            style={{ flex: 1, justifyContent: "center" }}
            onClick={() => setMode("register")}
          >
            New Hospital
          </button>
        </div>

        {error && (
          <p style={{ color: "#d64545", fontSize: 13, marginTop: -8, marginBottom: 14 }}>{error}</p>
        )}

        {mode === "login" ? (
          <form onSubmit={handleLogin}>
            <p style={{ fontSize: 12, color: "#888", marginTop: -4, marginBottom: 18 }}>
              For radiologists and hospital admins. Use the username and password
              given to you by your hospital admin.
            </p>
            <div className="field">
              <label>Username</label>
              <input value={username} onChange={(e) => setUsername(e.target.value)} required />
            </div>
            <div className="field">
              <label>Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: "100%", justifyContent: "center" }} disabled={loading}>
              {loading ? "Logging in..." : "Login"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleRegister}>
            <p style={{ fontSize: 12, color: "#888", marginTop: -4, marginBottom: 18 }}>
              Register your hospital and create the one admin account. The admin
              can then create login credentials for each radiologist.
            </p>
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
            <div className="field">
              <label>Admin Password (min 8 characters)</label>
              <input
                type="password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                minLength={8}
                required
              />
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: "100%", justifyContent: "center" }} disabled={loading}>
              {loading ? "Creating..." : "Create Hospital & Admin Account"}
            </button>
          </form>
        )}

        <p style={{ textAlign: "center", marginTop: 16 }}>
          <Link to="/" style={{ fontSize: 12 }}>← Back home</Link>
        </p>
      </div>
    </div>
  );
}
