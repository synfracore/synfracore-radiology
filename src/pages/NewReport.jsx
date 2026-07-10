import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout.jsx";
import { useSpeechToText } from "../hooks/useSpeechToText.js";
import { createReport, getHospitalInfo, getPhraseSuggestions } from "../store.js";

import { cleanTranscript } from "../pipeline/step1_clean.js";
import { extractEntities } from "../pipeline/step2_extract.js";
import { generateReport } from "../pipeline/step4_generate.js";
import { getSuggestions, parseVoiceCommand } from "../pipeline/step5_suggest.js";
import { runLiveAssist } from "../pipeline/typingAssistant.js";
import { checkContext } from "../rules/context.js";
import { runAllRules } from "../rules/index.js";

import ValidationAlerts from "../components/ValidationAlerts.jsx";
import SuggestionChips from "../components/SuggestionChips.jsx";
import RawTranscriptToggle from "../components/RawTranscriptToggle.jsx";

const MODALITIES = ["CT", "MR", "X-RAY", "USG", "PET-CT"];

const BODY_PARTS_BY_MODALITY = {
  CT: ["Brain", "Chest", "Abdomen", "Pelvis", "Spine", "Neck", "Extremities"],
  MR: ["Brain", "Spine", "Abdomen"],
  "X-RAY": ["Chest", "Extremities"],
  USG: ["Abdomen", "Pelvis"],
  "PET-CT": ["Whole Body"],
};

const CONTRAST_MODALITIES = ["CT", "MR"];

// SHADOW_MODE: when true, the pattern learner / typing assistant still run
// and log their outputs to the console, but their suggestions are never
// surfaced to the doctor. Lets us validate suggestion quality against real
// dictation sessions (recommended: 20-30) before trusting it live.
// Approval-time learning (learnFromApprovedReport, see Report.jsx) is
// unaffected either way — shadow mode only gates what's *shown*, not what's
// *learned*.
const SHADOW_MODE = import.meta.env.VITE_SHADOW_MODE === "true";

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

// extractSection(reportText, startLabel, endLabel) -> string
// Pulls the text between two section labels out of the assembled report
// string produced by pipeline/step4_generate.js, so Findings/Impression can
// be fed into rules/index.js's runAllRules separately.
function extractSection(reportText, startLabel, endLabel) {
  const startIdx = reportText.indexOf(startLabel);
  if (startIdx === -1) return "";
  const contentStart = startIdx + startLabel.length;
  const endIdx = reportText.indexOf(endLabel, contentStart);
  const contentEnd = endIdx === -1 ? reportText.length : endIdx;
  return reportText.slice(contentStart, contentEnd).trim();
}

function removeLastSentence(text) {
  const trimmed = text.trim();
  if (!trimmed) return trimmed;
  const sentences = trimmed.split(/(?<=[.!?])\s+/).filter(Boolean);
  sentences.pop();
  return sentences.join(" ");
}

export default function NewReport() {
  const navigate = useNavigate();
  const [patient, setPatient] = useState({ id: "", name: "", age: "", gender: "Male" });
  const [modality, setModality] = useState("CT");
  const [bodyPart, setBodyPart] = useState("Brain");
  const [contrast, setContrast] = useState("NON_CONTRAST");
  const [clinicalHistory, setClinicalHistory] = useState("");
  const [draft, setDraft] = useState("");

  const [cleanedTranscript, setCleanedTranscript] = useState("");
  const [transcriptChanges, setTranscriptChanges] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [learnedSuggestion, setLearnedSuggestion] = useState(null);
  const [entities, setEntities] = useState(null);
  const [validation, setValidation] = useState({ errors: [], warnings: [], flags: [] });

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [hospital, setHospital] = useState(null);

  useEffect(() => {
    getHospitalInfo()
      .then(setHospital)
      .catch(() => setHospital(null));
  }, []);

  const reportEditorRef = useRef(null);
  // Holds the latest versions of functions that recognition.onresult needs to
  // call, so the stable handleSpeechResult callback (passed into the hook
  // once) always reaches the freshest closures without re-subscribing.
  const helpersRef = useRef({});

  // Keep bodyPart valid whenever modality changes.
  useEffect(() => {
    const options = BODY_PARTS_BY_MODALITY[modality] || [];
    if (!options.includes(bodyPart)) {
      setBodyPart(options[0] || "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modality]);

  const handleSpeechResult = useCallback(({ finalChunk, interimChunk }) => {
    const helpers = helpersRef.current;

    // 2a. Check the interim text for a voice command as it's being spoken.
    const interimCommand = parseVoiceCommand(interimChunk);
    if (interimCommand.isCommand) {
      helpers.executeVoiceCommand(interimCommand.action);
      return; // 2b. do not add to transcript
    }

    if (!finalChunk) return; // still mid-utterance, nothing committed yet

    // A command phrase may only be recognizable once it's finalized.
    const finalCommand = parseVoiceCommand(finalChunk);
    if (finalCommand.isCommand) {
      helpers.executeVoiceCommand(finalCommand.action);
      return;
    }

    // 2c-2f: not a command — commit it, clean, display, and suggest.
    const cleanedText = helpers.applyTranscriptUpdate((prev) => (prev + " " + finalChunk).trim());
    helpers.fetchLiveAssist(cleanedText);
  }, []);

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
    setTranscript,
  } = useSpeechToText("en-IN", { onResult: handleSpeechResult });

  function updateSuggestionsFromText(text) {
    const words = text.trim().split(/\s+/).filter(Boolean);
    const lastFive = words.slice(-5).join(" ");
    setSuggestions(lastFive ? getSuggestions(lastFive) : []);
  }

  // applyTranscriptUpdate(updaterFn) -> string
  // Applies updaterFn to the current transcript, re-cleans it, and pushes
  // all the resulting state updates. Returns the freshly-cleaned text
  // synchronously so callers (e.g. handleSpeechResult) can chain further
  // work — such as fetching a live-assist suggestion — off the same value,
  // without waiting on React's async state update.
  function applyTranscriptUpdate(updaterFn) {
    const updated = updaterFn(transcript);
    const cleanResult = cleanTranscript(updated);
    setTranscript(updated);
    setCleanedTranscript(cleanResult.cleaned);
    setTranscriptChanges(cleanResult.changes);
    updateSuggestionsFromText(cleanResult.cleaned);
    return cleanResult.cleaned;
  }

  // fetchLiveAssist(cleanedText) — fire-and-forget: fetches learned-phrase
  // suggestions for the "findings" section from D1 (via
  // getPhraseSuggestions), then runs them through runLiveAssist alongside
  // the negation/laterality consistency checks. Silently no-ops on network
  // failure — this is a background nicety, never blocking dictation.
  async function fetchLiveAssist(cleanedText) {
    const words = (cleanedText || "").trim().split(/\s+/).filter(Boolean);
    const lastFewWords = words.slice(-6).join(" ");
    if (!lastFewWords) {
      setLearnedSuggestion(null);
      return;
    }

    try {
      const learnedPhrases = await getPhraseSuggestions(modality, bodyPart, "findings", lastFewWords);
      const { suggestion, confidence, flags } = runLiveAssist(
        lastFewWords,
        cleanedText,
        "findings",
        learnedPhrases
      );

      if (SHADOW_MODE) {
        // Shadow mode: the pipeline still runs in full, but nothing is
        // surfaced to the doctor — only logged, so we can validate
        // suggestion quality against real sessions before going live.
        console.log(`[SHADOW] suggestion: ${suggestion}, confidence: ${confidence}`);
        console.log(`[SHADOW] flags: ${JSON.stringify(flags)}`);
        return;
      }

      setLearnedSuggestion(confidence > 0.4 ? suggestion : null);
      if (flags.length > 0) {
        setValidation((v) => ({ ...v, flags: [...new Set([...v.flags, ...flags])] }));
      }
    } catch {
      setLearnedSuggestion(null);
    }
  }

  function focusImpressionSection() {
    const el = reportEditorRef.current;
    if (!el || !draft) return;
    const startIdx = draft.indexOf("IMPRESSION:");
    if (startIdx === -1) {
      el.focus();
      return;
    }
    const afterLabel = startIdx + "IMPRESSION:".length;
    const endIdx = draft.indexOf("\n\n---", afterLabel);
    const selectionEnd = endIdx === -1 ? draft.length : endIdx;
    el.focus();
    el.setSelectionRange(afterLabel, selectionEnd);
  }

  function handleClearAll() {
    clear();
    setCleanedTranscript("");
    setTranscriptChanges([]);
    setSuggestions([]);
    setLearnedSuggestion(null);
    setDraft("");
    setEntities(null);
    setValidation({ errors: [], warnings: [], flags: [] });
  }

  function executeVoiceCommand(action) {
    switch (action) {
      case "INSERT_PARAGRAPH_BREAK":
        applyTranscriptUpdate((prev) => `${prev}\n\n`);
        break;
      case "DELETE_PREVIOUS_SENTENCE":
        applyTranscriptUpdate((prev) => removeLastSentence(prev));
        break;
      case "FOCUS_IMPRESSION":
        focusImpressionSection();
        break;
      case "FINALIZE_REPORT":
        handleSaveDraft();
        break;
      case "CLEAR_ALL":
        handleClearAll();
        break;
      default:
        break;
    }
  }

  // Refresh every render so the stable handleSpeechResult callback always
  // calls into the current render's closures (current draft, current state).
  helpersRef.current.executeVoiceCommand = executeVoiceCommand;
  helpersRef.current.applyTranscriptUpdate = applyTranscriptUpdate;
  helpersRef.current.fetchLiveAssist = fetchLiveAssist;

  function handleSuggestionSelect(suggestion) {
    applyTranscriptUpdate((prev) => `${prev} ${suggestion}`.trim());
    setLearnedSuggestion(null);
  }

  const effectiveContrast = CONTRAST_MODALITIES.includes(modality) ? contrast : "STANDARD";
  const studyLabel = [modality, bodyPart].filter(Boolean).join(" ");

  function handleGenerateDraft() {
    // 4a
    const cleanResult = cleanTranscript(transcript);
    const finalCleaned = cleanResult.cleaned;

    // 4b
    const extractedEntities = extractEntities(finalCleaned, modality, bodyPart);

    // 4c
    const contextFlags = checkContext(finalCleaned, modality, bodyPart);

    // 4d
    const reportText = generateReport({
      modality,
      bodyPart,
      contrast: effectiveContrast,
      clinicalHistory,
      cleanedTranscript: finalCleaned,
      entities: extractedEntities,
      patient,
      hospital,
    });

    const findingsSection = extractSection(reportText, "FINDINGS:", "IMPRESSION:");
    const impressionSection = extractSection(reportText, "IMPRESSION:", "---");

    // 4e
    const ruleResults = runAllRules(findingsSection, impressionSection, extractedEntities, modality, bodyPart);

    // 4f/4g/4h
    setCleanedTranscript(finalCleaned);
    setTranscriptChanges(cleanResult.changes);
    setEntities(extractedEntities);
    setDraft(reportText);
    setValidation({
      errors: ruleResults.errors,
      warnings: ruleResults.warnings,
      flags: [...new Set([...contextFlags, ...ruleResults.flags])],
    });
  }

  async function handleSaveDraft() {
    setSaving(true);
    setSaveError("");
    try {
      const result = await createReport({
        patient,
        modality,
        study: studyLabel,
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

  const bodyPartOptions = BODY_PARTS_BY_MODALITY[modality] || [];

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
            <label>Body Part</label>
            <div className="modality-row">
              {bodyPartOptions.map((bp) => (
                <button
                  key={bp}
                  className={`modality-btn ${bodyPart === bp ? "active" : ""}`}
                  onClick={() => setBodyPart(bp)}
                  type="button"
                >
                  {bp}
                </button>
              ))}
            </div>
          </div>
          {CONTRAST_MODALITIES.includes(modality) && (
            <div className="field">
              <label>Contrast</label>
              <div className="modality-row">
                <button
                  className={`modality-btn ${contrast === "NON_CONTRAST" ? "active" : ""}`}
                  onClick={() => setContrast("NON_CONTRAST")}
                  type="button"
                >
                  Non-Contrast
                </button>
                <button
                  className={`modality-btn ${contrast === "CONTRAST" ? "active" : ""}`}
                  onClick={() => setContrast("CONTRAST")}
                  type="button"
                >
                  Contrast
                </button>
              </div>
            </div>
          )}
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
            {cleanedTranscript || interim ? (
              <>
                {cleanedTranscript}
                <span style={{ color: "#999" }}> {interim}</span>
              </>
            ) : (
              <span style={{ color: "#999" }}>Transcript will appear here as you speak...</span>
            )}
          </div>
          {!SHADOW_MODE && (
            <SuggestionChips
              suggestions={suggestions}
              learnedSuggestion={learnedSuggestion}
              onSelect={handleSuggestionSelect}
            />
          )}
          <RawTranscriptToggle raw={transcript} changes={transcriptChanges} />
          <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
            <button className="btn btn-outline" onClick={handleClearAll} type="button">
              Clear Transcript
            </button>
          </div>
        </div>

        <div className="card">
          <h2>📝 AI Generated Report (Draft)</h2>
          <ValidationAlerts errors={validation.errors} warnings={validation.warnings} flags={validation.flags} />
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
            ref={reportEditorRef}
            className="report-editor"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Click 'Generate Draft' to build the report from your dictation, then edit freely here."
          />
          <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button className="btn btn-outline" onClick={handleGenerateDraft} type="button">
              🔄 Generate Draft
            </button>
            <button className="btn btn-primary" onClick={handleSaveDraft} type="button" disabled={saving}>
              💾 {saving ? "Saving..." : "Save Draft"}
            </button>
          </div>
          {saveError && <p style={{ color: "#d64545", fontSize: 12, marginTop: 6 }}>{saveError}</p>}
          <div className="ai-note">
            ℹ️ Rule-based draft — no external AI/LLM is used. Please review and edit before finalizing.
          </div>
        </div>
      </div>
    </Layout>
  );
}
