// Checks that the laterality stated in Findings for a given organ is
// confirmed (or at least not contradicted) in the Impression, when the
// Impression mentions that organ at all. Consumed by
// pipeline/step3_validate.js (via rules/index.js).
import { ORGAN_FINDINGS } from "../data/ontology/organ_findings.js";
import { isBilateralOrgan } from "../data/ontology/bilateral_organs.js";

// A mention of one of these near an organ describes a single, discrete
// lesion (as opposed to a whole-organ status like "normal" or
// "hydronephrosis"). A bilateral organ (kidney, lung, ...) can legitimately
// be described with a different side in Findings vs Impression when no
// focal lesion is involved (e.g. "left kidney normal" / "right kidney
// hydronephrosis" is standard bilateral reporting, not a contradiction) —
// but a focal lesion's side must still match, since a lesion like a
// calculus is a single, specific finding.
const FOCAL_LESION_TERMS = [
  "calculus", "stone", "mass", "cyst", "nodule", "tumor", "lesion",
  "fracture", "dislocation",
];
const FOCAL_LESION_RE = new RegExp(`\\b(${FOCAL_LESION_TERMS.join("|")})\\b`, "i");

// Adjective forms that should resolve to the same canonical organ as
// step2_extract.js's ORGAN_ALIASES, so "right renal calculus" and "left
// kidney calculus" are recognized as mentions of the same organ.
const ORGAN_ALIASES = {
  renal: "kidney",
  hepatic: "liver",
  splenic: "spleen",
  pulmonary: "lung",
  pleural: "pleura",
  cardiac: "heart",
  cerebral: "brain",
  vertebral: "spine",
};

const SEARCH_TERMS = [
  ...Object.keys(ORGAN_FINDINGS).map((organ) => ({ term: organ, organ })),
  ...Object.entries(ORGAN_ALIASES).map(([term, organ]) => ({ term, organ })),
].sort((a, b) => b.term.length - a.term.length);

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function splitSentences(text) {
  return text.split(/(?<=[.!?])\s+/).filter((s) => s.trim().length > 0);
}

// extractOrganSidePairs(text) -> { organ: string, side: string }[]
// Within each sentence, pairs every known organ mention (canonical name or
// adjective alias) with the nearest right/left/bilateral mention in that
// same sentence.
function extractOrganSidePairs(text) {
  const pairs = [];
  for (const sentence of splitSentences(text)) {
    const sideMatches = [...sentence.matchAll(/\b(right|left|bilateral|both)\b/gi)];
    if (sideMatches.length === 0) continue;

    const hasFocalLesion = FOCAL_LESION_RE.test(sentence);

    for (const { term, organ } of SEARCH_TERMS) {
      const organRe = new RegExp(`\\b${escapeRegExp(term)}\\b`, "i");
      const organMatch = organRe.exec(sentence);
      if (!organMatch) continue;

      let best = null;
      for (const sm of sideMatches) {
        const dist = Math.abs(sm.index - organMatch.index);
        if (best === null || dist < best.dist) {
          const rawSide = sm[1].toLowerCase();
          best = { side: rawSide === "both" ? "bilateral" : rawSide, dist };
        }
      }
      if (best) pairs.push({ organ, side: best.side, hasFocalLesion });
    }
  }
  return pairs;
}

// checkImpression(findingsText, impressionText) -> string[]
// For every organ+side pair found in Findings, if Impression mentions that
// same organ at all, its side must match (or either side must be
// "bilateral"). If Impression never mentions the organ, no flag is raised.
export function checkImpression(findingsText, impressionText) {
  const findingsPairs = extractOrganSidePairs(String(findingsText || ""));
  const impressionPairs = extractOrganSidePairs(String(impressionText || ""));
  const flags = new Set();

  for (const fp of findingsPairs) {
    const impressionMatches = impressionPairs.filter((ip) => ip.organ === fp.organ);
    if (impressionMatches.length === 0) continue;

    const sideConfirmed = impressionMatches.some(
      (ip) => ip.side === fp.side || ip.side === "bilateral" || fp.side === "bilateral"
    );
    if (sideConfirmed) continue;

    // Bilateral organs (kidney, lung, ...) are normally reported with each
    // side described independently, so a side mismatch alone is not a
    // contradiction — unless a focal lesion (calculus, mass, ...) is
    // involved, whose laterality must stay consistent regardless.
    const isNormalBilateralReporting =
      isBilateralOrgan(fp.organ) &&
      !fp.hasFocalLesion &&
      !impressionMatches.some((ip) => ip.hasFocalLesion);
    if (isNormalBilateralReporting) continue;

    flags.add(`Findings states "${fp.side} ${fp.organ}" but Impression does not confirm the same side.`);
  }

  return [...flags];
}

// --- Test cases (manual reference, not executed automatically) ---
// PASS (side confirmed in Impression):
//   checkImpression("Right kidney shows a calculus.", "Right kidney calculus noted.")
//   -> []
// FAIL (side mismatch, flag triggered):
//   checkImpression("Right kidney shows a calculus.", "Left kidney calculus noted.")
//   -> ['Findings states "right kidney" but Impression does not confirm the same side.']
// EDGE CASE (Impression never mentions the organ, no flag):
//   checkImpression("Right kidney shows a calculus.", "No acute abnormality identified.")
//   -> []
