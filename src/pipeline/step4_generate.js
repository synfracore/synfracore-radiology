// Pipeline step 4: assembles the final formatted report string from the
// extracted entity summary and study context, using
// data/templates/technique.js for the Technique paragraph and
// data/templates/opening_sentences.js for the default Findings opener.
// Replaces the flat-text placeholder in ../reportTemplate.js with an
// entity-aware equivalent. Consumed by pipeline/index.js.
import { getTechniqueText } from "../data/templates/technique.js";
import { getOpeningSentence } from "../data/templates/opening_sentences.js";

const MODALITY_TITLES = {
  CT: "CT SCAN REPORT",
  MR: "MRI REPORT",
  "X-RAY": "X-RAY REPORT",
  USG: "ULTRASOUND REPORT",
  "PET-CT": "PET-CT REPORT",
};

const FOOTER_TEXT = "AI-assisted draft. Final responsibility with radiologist.";

function capitalizeFirst(text) {
  if (!text) return text;
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function buildHeader(modality, bodyPart, patient) {
  const title = MODALITY_TITLES[String(modality || "").trim().toUpperCase()] || "RADIOLOGY REPORT";
  const p = patient || {};
  const studyLine = `Study: ${[modality, bodyPart].filter(Boolean).join(" ")}`;
  const patientLine = `Patient: ${p.name || "-"}  |  Age/Sex: ${p.age || "-"}/${p.gender || "-"}  |  ID: ${p.id || "-"}`;
  return [title, studyLine, patientLine].join("\n");
}

// buildEntitySentence(entities) -> string
// Composes a single descriptive sentence (positive findings, then negated
// findings) from the structured entity summary produced by step2_extract.js.
function buildEntitySentence(entities) {
  if (!entities) return "";
  const sentences = [];

  if (entities.findings && entities.findings.length > 0) {
    const descriptorWords = [entities.size, entities.density, entities.obstruction].filter(Boolean);
    const descriptor = descriptorWords.length ? `${descriptorWords.join(", ")} ` : "";
    const locationPhrase = entities.location ? ` in the ${entities.location}` : "";
    const sideOrganPhrase = entities.organ
      ? ` of the ${entities.side ? entities.side + " " : ""}${entities.organ}`
      : "";
    const measurementPhrase =
      entities.measurements && entities.measurements.length
        ? ` measuring ${entities.measurements.join(", ")}`
        : "";
    const findingList = entities.findings.join(" and ");
    sentences.push(
      capitalizeFirst(
        `${descriptor}${findingList}${measurementPhrase} noted${locationPhrase}${sideOrganPhrase}.`
      )
    );
  }

  if (entities.negatedFindings && entities.negatedFindings.length > 0) {
    sentences.push(`No ${entities.negatedFindings.join(" or ")} identified.`);
  }

  return sentences.join(" ");
}

// buildImpressionLines(entities) -> string[]
// Builds a numbered Impression list directly from structured entities
// (never a copy of the Findings text).
function buildImpressionLines(entities) {
  if (!entities) return ["1. Clinical correlation advised."];

  const hasPositiveFindings = entities.findings && entities.findings.length > 0;

  if (entities.isNormal && !hasPositiveFindings) {
    return ["1. No acute abnormality identified."];
  }

  if (!hasPositiveFindings) {
    return ["1. Clinical correlation advised."];
  }

  return entities.findings.map((finding, idx) => {
    const num = idx + 1;
    const sideOrgan = entities.organ
      ? `${entities.side ? entities.side + " " : ""}${entities.organ}`
      : null;
    const qualifiers = [entities.obstruction].filter(Boolean);
    const qualifierText = qualifiers.length ? `${qualifiers.join(", ")} ` : "";
    const locationSuffix = entities.location ? ` (${entities.location})` : "";
    const subject = sideOrgan
      ? `${qualifierText}${finding} in the ${sideOrgan}${locationSuffix}`
      : `${qualifierText}${finding}${locationSuffix}`;
    return `${num}. ${capitalizeFirst(subject)}.`;
  });
}

// generateReport(params) -> string
// params: { modality, bodyPart, contrast, clinicalHistory, cleanedTranscript,
// entities, patient }
// Assembles HEADER -> TECHNIQUE -> FINDINGS -> IMPRESSION -> FOOTER into a
// single formatted report string.
export function generateReport(params) {
  const {
    modality, bodyPart, contrast, clinicalHistory,
    cleanedTranscript, entities, patient,
  } = params || {};

  const header = buildHeader(modality, bodyPart, patient);

  const technique =
    getTechniqueText(modality, bodyPart, contrast) ||
    `${[modality, bodyPart].filter(Boolean).join(" ")} imaging was performed.`;

  const opening = getOpeningSentence(modality, bodyPart);
  const entitySentence = buildEntitySentence(entities);
  const transcriptText = (cleanedTranscript || "").trim();

  const hasPositiveFindings = entities && entities.findings && entities.findings.length > 0;

  let findingsText;
  if (entities && entities.isNormal && !hasPositiveFindings) {
    findingsText = [opening, entitySentence || "No significant abnormality detected."]
      .filter(Boolean)
      .join(" ");
  } else {
    findingsText = [opening, entitySentence, transcriptText].filter(Boolean).join(" ");
  }

  const impressionLines = buildImpressionLines(entities);
  const clinicalHistoryText = clinicalHistory && clinicalHistory.trim() ? clinicalHistory.trim() : "-";

  return `${header}

CLINICAL HISTORY:
${clinicalHistoryText}

TECHNIQUE:
${technique}

FINDINGS:
${findingsText}

IMPRESSION:
${impressionLines.join("\n")}

---
${FOOTER_TEXT}`;
}
