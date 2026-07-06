// Defines pairs of [negated phrase, positive phrase] that contradict one
// another when both appear in the same report (e.g. "no pleural effusion"
// alongside a later, unqualified "pleural effusion"). Consumed by
// pipeline/step3_validate.js (via rules/index.js) to catch internal
// inconsistencies before a report reaches approval.

// CONTRADICTION_PAIRS: [negatedPhrase: string, positivePhrase: string][]
// Phrases are deliberately specific (e.g. "acute fracture" rather than the
// bare "fracture") so a qualified, non-contradictory mention — such as an
// old healed fracture coexisting with "no acute fracture" — is not flagged.
export const CONTRADICTION_PAIRS = [
  ["no pleural effusion", "pleural effusion"],
  ["no pericardial effusion", "pericardial effusion"],
  ["no pneumothorax", "pneumothorax"],
  ["no intracranial hemorrhage", "intracranial hemorrhage"],
  ["no subarachnoid hemorrhage", "subarachnoid hemorrhage"],
  ["no consolidation", "consolidation"],
  ["no acute fracture", "acute fracture"],
  ["no displaced fracture", "displaced fracture"],
  ["no mass lesion", "mass lesion"],
  ["no hydrocephalus", "hydrocephalus"],
  ["no bowel obstruction", "bowel obstruction"],
  ["no urinary obstruction", "urinary obstruction"],
  ["no ascites", "ascites"],
  ["no lymphadenopathy", "lymphadenopathy"],
  ["no midline shift", "midline shift"],
  ["no free fluid", "free fluid"],
  ["no calculus", "calculus"],
];

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function splitSentences(text) {
  return text.split(/(?<=[.!?])\s+/).filter((s) => s.trim().length > 0);
}

// checkContradictions(text) -> string[]
// For each pair, a contradiction is only raised when the negated phrase
// appears in one sentence and the (unqualified) positive phrase appears in
// a *different* sentence — so the negated sentence itself, which trivially
// contains the positive phrase as a substring, never counts against itself.
export function checkContradictions(text) {
  const t = String(text || "");
  if (!t.trim()) return [];

  const sentences = splitSentences(t);
  const warnings = [];

  for (const [negated, positive] of CONTRADICTION_PAIRS) {
    const negatedRe = new RegExp(`\\b${escapeRegExp(negated)}\\b`, "i");
    const positiveRe = new RegExp(`\\b${escapeRegExp(positive)}\\b`, "i");

    const hasNegated = sentences.some((s) => negatedRe.test(s));
    if (!hasNegated) continue;

    const hasPositiveElsewhere = sentences.some((s) => !negatedRe.test(s) && positiveRe.test(s));
    if (hasPositiveElsewhere) {
      warnings.push(`Contradiction: "${negated}" and "${positive}" both appear in the report.`);
    }
  }

  return warnings;
}

// --- Test cases (manual reference, not executed automatically) ---
// PASS (no contradiction):
//   checkContradictions("No pleural effusion is seen. Lungs are clear.")
//   -> []
// FAIL (contradiction triggered):
//   checkContradictions("No pleural effusion is seen. Pleural effusion is present in the right lung.")
//   -> ['Contradiction: "no pleural effusion" and "pleural effusion" both appear in the report.']
// EDGE CASE (qualified old/healed fracture does not conflict with "no acute fracture"):
//   checkContradictions("No acute fracture. Old healed fracture is noted in the left femur.")
//   -> []
