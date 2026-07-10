// JS port of report_pattern_learner.py. Instead of an in-process learned
// model, learned phrase frequencies are persisted in D1 (see
// functions/api/patterns/index.js + migrate_v5.sql) so they survive across
// sessions/deploys and keep improving as more reports are approved.
//
// learnFromReport() runs CLIENT-SIDE at approval time (see
// pages/Report.jsx's handleApprove) to turn the free-text report the
// radiologist just signed off on into per-section sentences; the caller
// then posts those sentences to /api/patterns/learn to update the D1
// phrase-frequency table.

// SECTION_HEADERS: recognized header lines (as they appear verbatim in
// generated reports — see pipeline/step4_generate.js), mapped to the
// section key used in the returned `sections` object. Order doesn't
// matter; matching is by exact (case-insensitive) line content minus a
// trailing colon.
const SECTION_HEADERS = {
  "clinical history": "clinicalHistory",
  technique: "technique",
  findings: "findings",
  impression: "impression",
};

// normalizeSentence(sentence) -> string
// Lowercases and collapses whitespace so semantically-identical sentences
// (different capitalization/spacing) count as the same learned phrase.
function normalizeSentence(sentence) {
  return sentence.toLowerCase().replace(/\s+/g, " ").trim();
}

// splitIntoSentences(text) -> string[]
// Splits on ./!/? and drops empty fragments.
function splitIntoSentences(text) {
  return text
    .split(/[.!?]+/)
    .map((s) => normalizeSentence(s))
    .filter((s) => s.length > 0);
}

// parseSections(reportText) -> { [sectionKey: string]: string[] }
// Walks the report line-by-line; a line that is (once trimmed and stripped
// of a trailing colon) exactly one of the known section headers starts a
// new section. Everything else is appended to the current section's raw
// text, which is then split into normalized sentences.
function parseSections(reportText) {
  const lines = String(reportText || "").split(/\r?\n/);
  const raw = { clinicalHistory: "", technique: "", findings: "", impression: "" };
  let currentSection = null;

  for (const line of lines) {
    const headerKey = line.trim().toLowerCase().replace(/:\s*$/, "");
    if (Object.prototype.hasOwnProperty.call(SECTION_HEADERS, headerKey)) {
      currentSection = SECTION_HEADERS[headerKey];
      continue;
    }
    if (currentSection) {
      raw[currentSection] += ` ${line}`;
    }
  }

  const sections = {};
  for (const [key, text] of Object.entries(raw)) {
    sections[key] = splitIntoSentences(text);
  }
  return sections;
}

// learnFromReport(reportText, modality, bodyPart)
//   -> { modality, bodyPart, sections: { findings, impression, technique } }
// Parses an approved report into per-section normalized sentences. Called
// client-side right after a report is approved (that's the point at which
// its content is trusted as ground truth).
export function learnFromReport(reportText, modality, bodyPart) {
  const parsed = parseSections(reportText);
  return {
    modality: modality || "",
    bodyPart: bodyPart || "",
    sections: {
      findings: parsed.findings,
      impression: parsed.impression,
      technique: parsed.technique,
    },
  };
}

// extractPhrasePatterns(sentences) -> [{ phrase, count }]
// Counts frequency of each normalized sentence and returns the top 20,
// most frequent first.
export function extractPhrasePatterns(sentences) {
  const counts = new Map();
  for (const raw of sentences || []) {
    const phrase = normalizeSentence(String(raw || ""));
    if (!phrase) continue;
    counts.set(phrase, (counts.get(phrase) || 0) + 1);
  }

  return [...counts.entries()]
    .map(([phrase, count]) => ({ phrase, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);
}
