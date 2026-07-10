// Rules for organs/structures that require an explicit left/right/bilateral
// qualifier. Flags an entity when a laterality-sensitive organ is mentioned
// but no side was specified. Consumed by pipeline/step3_validate.js (via
// rules/index.js).
//
// Note: several of these organs (kidney, lung, adrenal gland, ovary, hip,
// shoulder, breast, orbit, adnexa, ureter) are also BILATERAL_ORGANS (see
// data/ontology/bilateral_organs.js) — normally described on both sides in
// the same report. That does not exempt them from this check: a *focal*
// finding on one of these organs (e.g. "renal mass", "hip fracture",
// "breast lesion", "ovarian cyst", "shoulder dislocation") still must state
// which side it's on. Generic laterality specifications like "both kidneys
// normal" or "bilateral pleural effusion" satisfy the requirement and are
// not flagged (see the "bilateral"/"both" handling in
// pipeline/step3_validate.js's extractOrganSidePairs).

// LATERALITY_REQUIRED: string[]
// Organ names (matching the canonical keys used by
// data/ontology/organ_findings.js) that must carry a laterality qualifier.
export const LATERALITY_REQUIRED = [
  "kidney", "lung", "adrenal gland", "ovary", "hip", "shoulder", "breast",
  "orbit", "adnexa", "ureter",
];

// checkLaterality(entities) -> string[]
// Accepts either a single entity object ({ organ, side, ... }) or an array
// of entity objects. For each entity whose organ requires laterality and
// has no side specified, returns a warning message. A side of "bilateral"
// satisfies the requirement (it is an explicit laterality, just not a
// single one).
export function checkLaterality(entities) {
  const list = Array.isArray(entities) ? entities : entities ? [entities] : [];
  const warnings = [];

  for (const entity of list) {
    const organ = entity && entity.organ;
    if (organ && LATERALITY_REQUIRED.includes(organ) && !entity.side) {
      warnings.push(
        `"${organ}" requires laterality (right/left/bilateral) but none was specified.`
      );
    }
  }

  return warnings;
}

// --- Test cases (manual reference, not executed automatically) ---
// PASS (side specified, no warning):
//   checkLaterality({ organ: "kidney", side: "right" })
//   -> []
// FAIL (side missing, warning triggered):
//   checkLaterality({ organ: "kidney", side: null })
//   -> ['"kidney" requires laterality (right/left/bilateral) but none was specified.']
// EDGE CASE ("bilateral" counts as laterality specified, no warning):
//   checkLaterality({ organ: "lung", side: "bilateral" })
//   -> []
