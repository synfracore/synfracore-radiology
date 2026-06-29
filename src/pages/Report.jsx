import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Layout from "../components/Layout.jsx";
import { getReport, updateReport, deleteReport } from "../store.js";

export default function Report() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [report, setReport] = useState(null);
  const [draftText, setDraftText] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getReport(id)
      .then((r) => {
        setReport(r);
        setDraftText(r.draft_text || r.dictated_text || "");
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleApprove() {
    setSaving(true);
    try {
      await updateReport(id, { draftText, status: "Approved" });
      navigate("/dashboard");
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveEdits() {
    setSaving(true);
    try {
      await updateReport(id, { draftText });
      setReport((r) => ({ ...r, draft_text: draftText }));
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  function handlePrint() {
    window.print();
  }

  async function handleDelete() {
    if (!confirm("Delete this report? This cannot be undone.")) return;
    try {
      await deleteReport(id);
      navigate("/dashboard");
    } catch (e) {
      setError(e.message);
    }
  }

  if (loading) {
    return (
      <Layout title="Loading report...">
        <div className="card">Loading...</div>
      </Layout>
    );
  }

  if (!report) {
    return (
      <Layout title="Report not found">
        <div className="card">{error || "Report not found."}</div>
      </Layout>
    );
  }

  return (
    <Layout title={`Report — ${report.patient_name || "Unnamed"}`}>
      <div className="card">
        <h2>Report</h2>
        {error && <p style={{ color: "#d64545", fontSize: 13 }}>{error}</p>}
        <textarea
          className="report-editor"
          value={draftText}
          onChange={(e) => setDraftText(e.target.value)}
        />
        <div style={{ marginTop: 14, display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button className="btn btn-outline" onClick={handleSaveEdits} disabled={saving}>
            💾 Save Edits
          </button>
          <button className="btn btn-outline" onClick={handlePrint}>
            🖨️ Print
          </button>
          {report.status !== "Approved" && (
            <button className="btn btn-primary" onClick={handleApprove} disabled={saving}>
              ✅ Approve & Finalize
            </button>
          )}
          <button className="btn btn-danger" onClick={handleDelete}>
            Delete
          </button>
        </div>
        <p style={{ fontSize: 11, color: "#999", marginTop: 10 }}>
          Status: <strong>{report.status}</strong>
        </p>
      </div>
    </Layout>
  );
}
