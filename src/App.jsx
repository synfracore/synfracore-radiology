import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Home from "./pages/Home.jsx";
import Login from "./pages/Login.jsx";
import ForgotPassword from "./pages/ForgotPassword.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import NewReport from "./pages/NewReport.jsx";
import Report from "./pages/Report.jsx";
import Admin from "./pages/Admin.jsx";
import SuperAdmin from "./pages/SuperAdmin.jsx";
import { getSession } from "./store.js";

function Protected({ children, allowedRoles }) {
  const [status, setStatus] = useState("loading"); // loading | ok | denied

  useEffect(() => {
    getSession()
      .then((u) => {
        if (!u) return setStatus("denied");
        if (allowedRoles && !allowedRoles.includes(u.role)) return setStatus("denied");
        setStatus("ok");
      })
      .catch(() => setStatus("denied"));
  }, []);

  if (status === "loading") return <div style={{ padding: 40 }}>Loading...</div>;
  if (status === "denied") return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route
          path="/dashboard"
          element={
            <Protected allowedRoles={["admin", "radiologist"]}>
              <Dashboard />
            </Protected>
          }
        />
        <Route
          path="/new-report"
          element={
            <Protected allowedRoles={["admin", "radiologist"]}>
              <NewReport />
            </Protected>
          }
        />
        <Route
          path="/report/:id"
          element={
            <Protected allowedRoles={["admin", "radiologist"]}>
              <Report />
            </Protected>
          }
        />
        <Route
          path="/admin"
          element={
            <Protected allowedRoles={["admin"]}>
              <Admin />
            </Protected>
          }
        />
        <Route
          path="/superadmin"
          element={
            <Protected allowedRoles={["superadmin"]}>
              <SuperAdmin />
            </Protected>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
