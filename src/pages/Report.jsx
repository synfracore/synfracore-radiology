import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Layout from "../components/Layout.jsx";
import { getReport, updateReport, deleteReport, getHospitalInfo, learnFromApprovedReport } from "../store.js";
import { learnFromReport } from "../pipeline/patternLearner.js";

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function Report() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [report, setReport] = useState(null);
  const [draftText, setDraftText] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [signaturePreview, setSignaturePreview] = useState(null);
  const [signatureFile, setSignatureFile] = useState(null);
  const [hospital, setHospital] = useState(null);

  useEffect(() => {
    getReport(id)
      .then((r) => {
        setReport(r);
        setDraftText(r.draft_text || r.dictated_text || "");
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    getHospitalInfo()
      .then(setHospital)
      .catch(() => setHospital(null));
  }, []);

  async function handleSignatureChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setSignatureFile(file);
    const dataUrl = await fileToDataUrl(file);
    setSignaturePreview(dataUrl);
  }

  async function handleApprove() {
    if (!signaturePreview) {
      setError("Please upload your digital signature before approving.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await updateReport(id, { draftText, status: "Approved", signatureData: signaturePreview });

      // Fire-and-forget: teach the phrase learner from this now-trusted
      // (approved) report. Never blocks navigation or surfaces errors to
      // the radiologist — it's a background improvement, not part of the
      // approval flow itself.
      try {
        const modality = report.modality || "";
        // "study" is stored as "<modality> <bodyPart>" (see NewReport.jsx);
        // there's no separate body_part column, so derive it here.
        const bodyPart = (report.study || "").replace(modality, "").trim();
        const { sections } = learnFromReport(draftText, modality, bodyPart);
        learnFromApprovedReport({ modality, bodyPart, sections }).catch(() => {});
      } catch {
        // Parsing/learning failure should never block approval.
      }

      navigate("/dashboard");
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveEdits() {
    setSaving(true);
    setError("");
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

  const isApproved = report.status === "Approved";

  return (
    <Layout title={`Report — ${report.patient_name || "Unnamed"}`}>
      <div className="card">
        {hospital?.logo_data && (
          <img
            src={hospital.logo_data}
            alt={`${hospital.name || "Hospital"} logo`}
            style={{ height: 40, marginBottom: 10 }}
          />
        )}
        <h2>📄 Report {isApproved && <span className="badge success">Approved &amp; Locked</span>}</h2>
        {error && <p style={{ color: "#d64545", fontSize: 13 }}>{error}</p>}

        <textarea
          className="report-editor no-print"
          value={draftText}
          onChange={(e) => setDraftText(e.target.value)}
          readOnly={isApproved}
          style={isApproved ? { background: "#f6f8fc", color: "#444" } : undefined}
        />
        {/* Textareas don't reliably render their value when printed, so this
            plain-text mirror is what actually shows up on the printed page. */}
        <div className="report-print-view">{draftText}</div>

        {isApproved ? (
          <div style={{ marginTop: 18, display: "flex", alignItems: "center", gap: 16 }}>
            <div>
              <div style={{ fontSize: 12, color: "#888", marginBottom: 6 }}>Digitally signed by radiologist</div>
              {report.signature_data && (
                <img
                  src={report.signature_data}
                  alt="Radiologist signature"
                  style={{ height: 60, border: "1px solid #e5e8f0", borderRadius: 6, padding: 6, background: "#fff" }}
                />
              )}
            </div>
            <div style={{ fontSize: 12, color: "#888" }}>
              Approved {report.approved_at ? new Date(report.approved_at).toLocaleString() : ""}
            </div>
          </div>
        ) : (
          <div className="field no-print" style={{ marginTop: 18 }}>
            <label>Digital Signature (required to approve — upload an image of your signature)</label>
            <input type="file" accept="image/*" onChange={handleSignatureChange} />
            {signaturePreview && (
              <img
                src={signaturePreview}
                alt="Signature preview"
                style={{ height: 60, marginTop: 10, border: "1px solid #e5e8f0", borderRadius: 6, padding: 6 }}
              />
            )}
          </div>
        )}

        <div className="no-print" style={{ marginTop: 14, display: "flex", gap: 8, flexWrap: "wrap" }}>
          {!isApproved && (
            <button className="btn btn-outline" onClick={handleSaveEdits} disabled={saving}>
              💾 Save Edits
            </button>
          )}
          <button className="btn btn-outline" onClick={handlePrint}>
            🖨️ Print
          </button>
          {!isApproved && (
            <button className="btn btn-primary" onClick={handleApprove} disabled={saving}>
              ✅ {saving ? "Approving..." : "Approve & Finalize"}
            </button>
          )}
          {!isApproved && (
            <button className="btn btn-danger" onClick={handleDelete}>
              Delete
            </button>
          )}
        </div>

        {isApproved && (
          <p style={{ fontSize: 12, color: "#888", marginTop: 12 }}>
            This report has been approved and digitally signed. It is now locked and cannot be edited or deleted.
          </p>
        )}
      </div>
    </Layout>
  );
}
