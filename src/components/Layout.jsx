import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { logout, getSession } from "../store.js";

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
        <nav>
          <Link to="/dashboard" className={isActive("/dashboard") ? "active" : ""}>
            Dashboard
          </Link>
          <Link to="/new-report" className={isActive("/new-report") ? "active" : ""}>
            New Report
          </Link>
          {session?.role === "admin" && (
            <Link to="/admin" className={isActive("/admin") ? "active" : ""}>
              Manage Radiologists
            </Link>
          )}
          <button onClick={handleLogout}>Logout</button>
        </nav>
        <div className="footer-note">
          Logged in as<br />
          <strong style={{ color: "#fff" }}>{session?.fullName || "..."}</strong>
          <br />
          {session?.role === "admin" ? "Hospital Admin" : "Radiologist"}
          <br />
          AI drafts only — doctor approval required before finalizing.
        </div>
      </div>
      <div className="main">
        <div className="topbar">
          <h1>{title}</h1>
        </div>
        {children}
      </div>
    </div>
  );
}
