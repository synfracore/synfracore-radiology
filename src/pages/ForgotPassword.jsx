import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { forgotPassword, resetPassword } from "../store.js";

export default function ForgotPassword() {
  const [step, setStep] = useState(1); // 1: enter username, 2: answer + new password
  const [username, setUsername] = useState("");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleFindAccount(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const result = await forgotPassword(username.trim());
      setQuestion(result.securityQuestion);
      setStep(2);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleReset(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await resetPassword({ username: username.trim(), securityAnswer: answer, newPassword });
      setSuccess(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-wrap">
      <div className="login-card">
        <h2 style={{ marginTop: 0 }}>Reset Password</h2>

        {error && <p style={{ color: "#d64545", fontSize: 13, marginBottom: 14 }}>{error}</p>}

        {success ? (
          <>
            <p style={{ fontSize: 14, color: "#16a34a" }}>
              Your password has been reset. You can log in now with your new password.
            </p>
            <button className="btn btn-primary" style={{ width: "100%", justifyContent: "center" }} onClick={() => navigate("/login")}>
              Go to Login
            </button>
          </>
        ) : step === 1 ? (
          <form onSubmit={handleFindAccount}>
            <p style={{ fontSize: 12, color: "#888", marginTop: -4, marginBottom: 18 }}>
              Enter your username and we'll show your security question.
            </p>
            <div className="field">
              <label>Username</label>
              <input value={username} onChange={(e) => setUsername(e.target.value)} required />
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: "100%", justifyContent: "center" }} disabled={loading}>
              {loading ? "Checking..." : "Continue"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleReset}>
            <div className="field">
              <label>{question}</label>
              <input value={answer} onChange={(e) => setAnswer(e.target.value)} required autoFocus />
            </div>
            <div className="field">
              <label>New Password (min 8 characters)</label>
              <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} minLength={8} required />
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: "100%", justifyContent: "center" }} disabled={loading}>
              {loading ? "Resetting..." : "Reset Password"}
            </button>
          </form>
        )}

        <p style={{ textAlign: "center", marginTop: 16 }}>
          <Link to="/login" style={{ fontSize: 12 }}>← Back to login</Link>
        </p>
      </div>
    </div>
  );
}
