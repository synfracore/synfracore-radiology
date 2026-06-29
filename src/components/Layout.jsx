import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { logout, getSession } from "../store.js";

function initials(name) {
  if (!name) return "DR";
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export default function Layout({ title, children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [session, setSession] = useState(null);

  useEffect(() => {
    getSession().then(setSession).catch(() => setSession(null));
  }, []);

  async function handleLogout() {
    await logout();
    navigate("/login");
  }

  const isActive = (path) => location.pathname === path;

  return (
    <div className="app-shell">
      <div className="sidebar">
        <div className="brand">🩻 SynfraCore</div>
        <div className="brand-sub">AI Radiology Reporting</div>
        <nav>
          <Link to="/dashboard" className={isActive("/dashboard") ? "active" : ""}>
            📊 Dashboard
          </Link>
          <Link to="/new-report" className={isActive("/new-report") ? "active" : ""}>
            ➕ New Report
          </Link>
          {session?.role === "admin" && (
            <Link to="/admin" className={isActive("/admin") ? "active" : ""}>
              👥 Manage Radiologists
            </Link>
          )}
          <button onClick={handleLogout}>↩ Logout</button>
        </nav>
        <div className="footer-note">
          🔒 <strong>Secure & Encrypted</strong>
          <br />
          Reports are scoped to your hospital only. AI drafts only — final
          approval always remains with the radiologist.
        </div>
      </div>
      <div className="main">
        <div className="topbar">
          <h1>{title}</h1>
          <div className="avatar-pill">
            <div className="avatar-circle">{initials(session?.fullName)}</div>
            <div>
              <div className="name">{session?.fullName || "..."}</div>
              <div className="role">{session?.role === "admin" ? "Hospital Admin" : "Radiologist"}</div>
            </div>
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}
