// Standalone shadow-mode simulation. Runs 5 synthetic dictation sessions
// (no real patient data) through the full pipeline — clean -> extract ->
// generate -> validate -> runLiveAssist — and logs every stage's output,
// the same way shadow mode logs to the console in the real app (see
// SHADOW_MODE in pages/NewReport.jsx) instead of surfacing suggestions to
// the doctor. Used to eyeball suggestion/flag quality across a batch of
// sessions before turning shadow mode off.
//
// Run with: node src/tests/shadowTest.js
import { cleanTranscript } from "../pipeline/step1_clean.js";
import { extractEntities } from "../pipeline/step2_extract.js";
import { generateReport } from "../pipeline/step4_generate.js";
import { validateReport } from "../pipeline/step3_validate.js";
import { runLiveAssist } from "../pipeline/typingAssistant.js";

// extractSection(reportText, startLabel, endLabel) -> string
// Mirrors pages/NewReport.jsx's helper of the same name, so Findings/
// Impression can be pulled out of the assembled report string for
// validateReport.
function extractSection(reportText, startLabel, endLabel) {
  const startIdx = reportText.indexOf(startLabel);
  if (startIdx === -1) return "";
  const contentStart = startIdx + startLabel.length;
  const endIdx = reportText.indexOf(endLabel, contentStart);
  const contentEnd = endIdx === -1 ? reportText.length : endIdx;
  return reportText.slice(contentStart, contentEnd).trim();
}

const SESSIONS = [
  {
    name: "Session 1",
    modality: "CT",
    bodyPart: "Brain",
    raw: "no acute intracranial hemorrhage no midline shift ventricles normal",
  },
  {
    name: "Session 2",
    modality: "CT",
    bodyPart: "Abdomen",
    raw: "small non obstructing calculus lower pole right kidney liver and spleen normal",
  },
  {
    name: "Session 3",
    modality: "CT",
    bodyPart: "Chest",
    raw: "bilateral pleural effusion right greater than left no pneumothorax",
  },
  {
    name: "Session 4",
    modality: "X-RAY",
    bodyPart: "Extremities",
    raw: "right right knee joint normal no fracture fracture seen",
  },
  {
    name: "Session 5",
    modality: "CT",
    bodyPart: "Liver",
    raw: "no evidence of mass lesion a mass is seen in right lobe",
  },
];

const PATIENT = { id: "TEST-000", name: "Shadow Test Patient", age: "00", gender: "Other" };

let sessionsCompleted = 0;
const sessionResults = [];

for (const session of SESSIONS) {
  console.log(`\n${"=".repeat(72)}`);
  console.log(`${session.name} — ${session.modality} ${session.bodyPart}`);
  console.log("=".repeat(72));

  try {
    console.log(`Raw input:     "${session.raw}"`);

    const cleanResult = cleanTranscript(session.raw);
    console.log(`After dedup:   "${cleanResult.cleaned}"`);
    console.log(`  dedup changes: ${cleanResult.changes.length > 0 ? JSON.stringify(cleanResult.changes) : "(none)"}`);

    const entities = extractEntities(cleanResult.cleaned, session.modality, session.bodyPart);
    console.log(`Entities:      ${JSON.stringify(entities)}`);

    const reportText = generateReport({
      modality: session.modality,
      bodyPart: session.bodyPart,
      contrast: "STANDARD",
      clinicalHistory: "",
      cleanedTranscript: cleanResult.cleaned,
      entities,
      patient: PATIENT,
    });

    const findingsSection = extractSection(reportText, "FINDINGS:", "IMPRESSION:");
    const impressionSection = extractSection(reportText, "IMPRESSION:", "---");
    console.log("Generated report (FINDINGS + IMPRESSION):");
    console.log(`  FINDINGS:   ${findingsSection}`);
    console.log(`  IMPRESSION: ${impressionSection}`);

    const validation = validateReport(
      findingsSection,
      impressionSection,
      entities,
      session.modality,
      session.bodyPart
    );
    console.log(`Validation:    ${JSON.stringify(validation)}`);

    // No D1 connection in this standalone test, so learnedPhrases is empty —
    // suggestCompletion will correctly find nothing to suggest. The
    // consistency checks run against the cleaned transcript (not the
    // generated report), matching real usage: pages/NewReport.jsx calls
    // runLiveAssist with the live transcript-so-far as `fullReportSoFar`
    // while the doctor is still dictating, well before "Generate Draft"
    // (and its entity-driven templating) ever runs.
    const liveAssist = runLiveAssist(cleanResult.cleaned, cleanResult.cleaned, "findings", []);
    console.log(`[SHADOW] suggestion: ${liveAssist.suggestion ?? "(none)"}, confidence: ${liveAssist.confidence}`);
    console.log(`[SHADOW] flags: ${liveAssist.flags.length > 0 ? JSON.stringify(liveAssist.flags) : "(none)"}`);

    sessionResults.push({ session: session.name, cleanResult, liveAssist });
    sessionsCompleted++;
  } catch (e) {
    console.log(`ERROR: ${e.message}`);
    console.log(e.stack);
  }
}

console.log(`\n${"=".repeat(72)}`);
console.log(`${sessionsCompleted}/${SESSIONS.length} sessions completed without throwing`);

// --- Required-outcome checks -------------------------------------------
let passCount = 0;
let failCount = 0;

function check(name, pass, detail) {
  if (pass) {
    passCount++;
    console.log(`PASS - ${name}`);
  } else {
    failCount++;
    console.log(`FAIL - ${name}`);
    console.log(`  detail: ${detail}`);
  }
}

check("All 5 sessions completed without throwing", sessionsCompleted === SESSIONS.length, `${sessionsCompleted}/${SESSIONS.length} completed`);

const session4 = sessionResults.find((r) => r.session === "Session 4");
check(
  "Session 4: dedup removed the duplicate 'fracture'",
  Boolean(
    session4 &&
      session4.cleanResult.changes.length > 0 &&
      /\bfracture\b/i.test(session4.cleanResult.cleaned) &&
      !/fracture\s+fracture/i.test(session4.cleanResult.cleaned)
  ),
  session4
    ? `cleaned: "${session4.cleanResult.cleaned}", changes: ${JSON.stringify(session4.cleanResult.changes)}`
    : "session 4 did not complete"
);

const session5 = sessionResults.find((r) => r.session === "Session 5");
check(
  "Session 5: negation contradiction flag raised for 'mass'",
  Boolean(session5 && session5.liveAssist.flags.some((f) => /mass/i.test(f))),
  session5 ? JSON.stringify(session5.liveAssist.flags) : "session 5 did not complete"
);

console.log(`\n${passCount} passed, ${failCount} failed`);
if (failCount > 0 || sessionsCompleted !== SESSIONS.length) {
  process.exit(1);
}
