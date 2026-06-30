import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout.jsx";
import { useSpeechToText } from "../hooks/useSpeechToText.js";
import { buildReport } from "../reportTemplate.js";
import { cleanupDuplicateWords } from "../cleanupTranscript.js";
import { createReport } from "../store.js";

const MODALITIES = ["CT", "MR", "X-RAY", "USG", "PET-CT"];

const LANGUAGES = [
  { code: "en-IN", label: "English (India)" },
  { code: "en-US", label: "English (US)" },
  { code: "hi-IN", label: "Hindi" },
  { code: "ta-IN", label: "Tamil" },
  { code: "te-IN", label: "Telugu" },
  { code: "kn-IN", label: "Kannada" },
  { code: "ml-IN", label: "Malayalam" },
  { code: "bn-IN", label: "Bengali" },
  { code: "mr-IN", label: "Marathi" },
  { code: "gu-IN", label: "Gujarati" },
  { code: "es-ES", label: "Spanish" },
  { code: "fr-FR", label: "French" },
  { code: "ar-SA", label: "Arabic" },
  { code: "zh-CN", label: "Chinese (Mandarin)" },
];

export default function NewReport() {
  const navigate = useNavigate();
  const [patient, setPatient] = useState({ id: "", name: "", age: "", gender: "Male" });
  const [modality, setModality] = useState("CT");
  const [study, setStudy] = useState("");
  const [clinicalHistory, setClinicalHistory] = useState("");
  const [draft, setDraft] = useState("");

  const {
    listening,
    transcript,
    interim,
    error,
    lang,
    setLang,
    isSupported,
    start,
    stop,
    clear,
  } = useSpeechToText("en-IN");

  function handleGenerate() {
    // Speech-to-text → duplicate word cleanup → report generator (unchanged)
    const cleanedText = cleanupDuplicateWords(transcript);
    const report = buildReport({
      modality,
      study,
      clinicalHistory,
      dictatedText: cleanedText,
      patient,
    });
    setDraft(report);
  }

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  async function handleSaveDraft() {
    setSaving(true);
    setSaveError("");
    try {
      const result = await createReport({
        patient,
        modality,
        study,
        clinicalHistory,
        dictatedText: transcript,
        draftText: draft || transcript,
        status: "Draft",
      });
      navigate(`/report/${result.id}`);
    } catch (err) {
      setSaveError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Layout title="New Radiology Report">
      <div className="grid-3">
        <div className="card">
          <h2>🧑‍⚕️ Patient Details</h2>
          <div className="field">
            <label>Patient ID</label>
            <input value={patient.id} onChange={(e) => setPatient({ ...patient, id: e.target.value })} />
          </div>
          <div className="field">
            <label>Patient Name</label>
            <input value={patient.name} onChange={(e) => setPatient({ ...patient, name: e.target.value })} />
          </div>
          <div className="field">
            <label>Age</label>
            <input value={patient.age} onChange={(e) => setPatient({ ...patient, age: e.target.value })} />
          </div>
          <div className="field">
            <label>Gender</label>
            <select value={patient.gender} onChange={(e) => setPatient({ ...patient, gender: e.target.value })}>
              <option>Male</option>
              <option>Female</option>
              <option>Other</option>
            </select>
          </div>
        </div>

        <div className="card">
          <h2>📋 Study Details</h2>
          <div className="field">
            <label>Modality</label>
            <div className="modality-row">
              {MODALITIES.map((m) => (
                <button
                  key={m}
                  className={`modality-btn ${modality === m ? "active" : ""}`}
                  onClick={() => setModality(m)}
                  type="button"
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
          <div className="field">
            <label>Study</label>
            <input value={study} onChange={(e) => setStudy(e.target.value)} placeholder="e.g. CT Brain Plain" />
          </div>
          <div className="field">
            <label>Clinical History</label>
            <textarea
              rows={3}
              value={clinicalHistory}
              onChange={(e) => setClinicalHistory(e.target.value)}
              placeholder="e.g. Headache, h/o trauma"
            />
          </div>
        </div>

        <div className="card">
          <h2>⚙️ Report Settings</h2>
          <div className="field lang-select">
            <label>Dictation Language</label>
            <select value={lang} onChange={(e) => setLang(e.target.value)} disabled={listening}>
              {LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.label}
                </option>
              ))}
            </select>
          </div>
          <p style={{ fontSize: 12, color: "#888" }}>
            Works best in Chrome or Edge. The browser's microphone permission popup will appear on first use.
          </p>
        </div>
      </div>

      <div className="grid-3" style={{ gridTemplateColumns: "1fr 1fr" }}>
        <div className="card">
          <h2>🎙️ Voice Dictation</h2>
          {!isSupported && (
            <p style={{ color: "#d64545", fontSize: 13 }}>
              Speech recognition isn't supported in this browser. Please use Chrome or Edge.
            </p>
          )}
          <div className="mic-box">
            <button
              className={`mic-circle ${listening ? "listening" : ""}`}
              onClick={listening ? stop : start}
              disabled={!isSupported}
              type="button"
            >
              🎤
            </button>
            <div className="mic-status">
              {listening ? "Listening..." : "Tap mic to start dictation"}
            </div>
          </div>
          {error && <p style={{ color: "#d64545", fontSize: 13 }}>Error: {error}</p>}
          <div className="transcript-box">
            {transcript || interim ? (
              <>
                {transcript}
                <span style={{ color: "#999" }}> {interim}</span>
              </>
            ) : (
              <span style={{ color: "#999" }}>Transcript will appear here as you speak...</span>
            )}
          </div>
          <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
            <button className="btn btn-outline" onClick={clear} type="button">
              Clear Transcript
            </button>
          </div>
        </div>

        <div className="card">
          <h2>📝 AI Generated Report (Draft)</h2>
          <div className="editor-toolbar">
            <button type="button" title="Undo">↺</button>
            <button type="button" title="Redo">↻</button>
            <button type="button" title="Bold"><strong>B</strong></button>
            <button type="button" title="Italic"><em>I</em></button>
            <button type="button" title="Underline"><u>U</u></button>
            <button type="button" title="Bullet list">•≡</button>
            <button type="button" title="Numbered list">1≡</button>
          </div>
          <textarea
            className="report-editor"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Click 'Generate Draft' to build the report from your dictation, then edit freely here."
          />
          <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button className="btn btn-outline" onClick={handleGenerate} type="button">
              🔄 Generate Draft
            </button>
            <button className="btn btn-primary" onClick={handleSaveDraft} type="button" disabled={saving}>
              💾 {saving ? "Saving..." : "Save Draft"}
            </button>
          </div>
          {saveError && <p style={{ color: "#d64545", fontSize: 12, marginTop: 6 }}>{saveError}</p>}
          <div className="ai-note">
            ℹ️ This is an AI-assisted draft. Please review and edit before finalizing.
          </div>
        </div>
      </div>
    </Layout>
  );
}
