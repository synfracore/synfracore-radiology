import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { login } from "../store.js";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleLogin(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const result = await login(username.trim(), password);
      navigate(result.user.role === "superadmin" ? "/superadmin" : "/dashboard");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-wrap">
      <div className="login-card">
        <h2 style={{ marginTop: 0 }}>SynfraCore Login</h2>
        <p style={{ fontSize: 12, color: "#888", marginTop: -8, marginBottom: 18 }}>
          For radiologists and hospital admins. Use the username and password
          given to you. New hospitals are onboarded by the platform admin.
        </p>

        {error && <p style={{ color: "#d64545", fontSize: 13, marginBottom: 14 }}>{error}</p>}

        <form onSubmit={handleLogin}>
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

        <p style={{ textAlign: "center", marginTop: 14, fontSize: 13 }}>
          <Link to="/forgot-password">Forgot password?</Link>
        </p>
        <p style={{ textAlign: "center", marginTop: 10 }}>
          <Link to="/" style={{ fontSize: 12 }}>← Back home</Link>
        </p>
      </div>
    </div>
  );
}
