// Rule layer that checks text against the anatomy expected for the report's
// study type (data source: data/ontology/anatomy_map.js), and flags terms
// that belong to a different body region than the one being studied (e.g. a
// "ventricle" mention on a CT Abdomen study). Generic finding descriptors
// that apply everywhere (mass, lesion, etc.) are never flagged. Consumed by
// pipeline/step3_validate.js (via rules/index.js).
import { ANATOMY_MAP, getExpectedAnatomy } from "../data/ontology/anatomy_map.js";

// GENERIC_TERMS: terms that appear in ANATOMY_MAP entries across many
// unrelated study types (they describe a finding, not a specific anatomical
// region) and must never be flagged as "out of context".
const GENERIC_TERMS = new Set([
  "mass", "tumor", "lesion", "cyst", "nodule", "calcification", "edema",
  "fracture", "hemorrhage", "effusion", "hematoma", "abscess", "atrophy",
]);

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildAllAnatomyTerms() {
  const set = new Set();
  for (const terms of Object.values(ANATOMY_MAP)) {
    for (const term of terms) set.add(term.toLowerCase());
  }
  return [...set].sort((a, b) => b.length - a.length);
}

const ALL_ANATOMY_TERMS = buildAllAnatomyTerms();

// checkContext(text, modality, bodyPart) -> string[]
// Scans text for any known anatomy term (drawn from every study type in
// ANATOMY_MAP, excluding GENERIC_TERMS) and flags any match that is not part
// of the expected anatomy list for the given modality/bodyPart.
export function checkContext(text, modality, bodyPart) {
  const t = String(text || "");
  if (!t.trim()) return [];

  const expectedSet = new Set(getExpectedAnatomy(modality, bodyPart).map((x) => x.toLowerCase()));
  const claimedRanges = [];
  const isClaimed = (start, end) => claimedRanges.some((r) => start < r.end && end > r.start);
  const flags = new Set();

  for (const term of ALL_ANATOMY_TERMS) {
    if (GENERIC_TERMS.has(term)) continue;

    const re = new RegExp(`\\b${escapeRegExp(term)}\\b`, "gi");
    let match;
    while ((match = re.exec(t)) !== null) {
      const start = match.index;
      const end = start + match[0].length;
      if (!isClaimed(start, end)) {
        claimedRanges.push({ start, end });
        if (!expectedSet.has(term)) {
          flags.add(`"${term}" is not part of the expected anatomy for ${modality} ${bodyPart}.`);
        }
      }
      if (match[0].length === 0) re.lastIndex++;
    }
  }

  return [...flags];
}

// --- Test cases (manual reference, not executed automatically) ---
// PASS (anatomy matches the study type, no flag):
//   checkContext("The ventricles are normal.", "CT", "Brain")
//   -> []
// FAIL (anatomy belongs to a different study type, flag triggered):
//   checkContext("The ventricles are normal.", "CT", "Abdomen")
//   -> ['"ventricles" is not part of the expected anatomy for CT Abdomen.']
// EDGE CASE (generic term "mass" never flagged, even out of context):
//   checkContext("A mass is noted.", "CT", "Brain")
//   -> []
