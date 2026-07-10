// Pipeline step 3: runs deterministic validation rules against the Findings
// and Impression text (plus the entity summary from step2_extract.js) and
// returns severity-tagged results. Consumed by pipeline/index.js; errors
// block approval, warnings are shown with an override option, flags are
// informational only. See components/ValidationAlerts.jsx for rendering.
import { extractEntities } from "./step2_extract.js";
import { isBilateralOrgan } from "../data/ontology/bilateral_organs.js";

// Organs that should always carry an explicit laterality qualifier.
const LATERALITY_ORGANS = [
  "kidney", "lung", "adrenal gland", "ovary", "hip", "shoulder", "breast",
  "orbit", "adnexa", "ureter",
];

// Adjective/plural forms that should resolve to a canonical
// LATERALITY_ORGANS entry, so e.g. "renal calculus" is recognized as a
// "kidney" mention just like step2_extract.js and rules/impression.js do.
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

// LATERALITY_SEARCH_TERMS: every literal string that should resolve to a
// LATERALITY_ORGANS entry when scanning free text (canonical name plus
// aliases), longest first so multi-word terms aren't shadowed by a shorter
// substring match.
const LATERALITY_SEARCH_TERMS = [
  ...LATERALITY_ORGANS.map((organ) => ({ term: organ, organ })),
  ...Object.entries(ORGAN_ALIASES)
    .filter(([, organ]) => LATERALITY_ORGANS.includes(organ))
    .map(([term, organ]) => ({ term, organ })),
].sort((a, b) => b.term.length - a.term.length);

// FOCAL_LESION_TERMS: a mention of one of these near an organ describes a
// single, discrete lesion (as opposed to a whole-organ status like "normal"
// or "hydronephrosis"). A bilateral organ can still be described
// separately on each side without contradiction (see BILATERAL_ORGANS),
// but a focal lesion's side must stay consistent between Findings and
// Impression regardless of whether the organ itself is bilateral — e.g. a
// "right renal calculus" in Findings still contradicts a "left renal
// calculus" Impression.
const FOCAL_LESION_TERMS = [
  "calculus", "stone", "mass", "cyst", "nodule", "tumor", "lesion",
  "fracture", "dislocation",
];
const FOCAL_LESION_RE = new RegExp(`\\b(${FOCAL_LESION_TERMS.join("|")})\\b`, "i");

// Maps an organ to the body region it is normally studied in, used by
// Rule 5 to flag anatomy that doesn't belong to the selected study type.
// Organs that legitimately appear across many regions (lymph nodes, bone,
// joint, soft tissue) are intentionally omitted to avoid false positives.
const ORGAN_TO_BODYPART = {
  liver: "abdomen",
  gallbladder: "abdomen",
  pancreas: "abdomen",
  spleen: "abdomen",
  kidney: "abdomen",
  "adrenal gland": "abdomen",
  bowel: "abdomen",
  appendix: "abdomen",
  aorta: "abdomen",
  "common bile duct": "abdomen",
  "portal vein": "abdomen",
  stomach: "abdomen",
  colon: "abdomen",
  bladder: "pelvis",
  uterus: "pelvis",
  ovary: "pelvis",
  prostate: "pelvis",
  testis: "pelvis",
  epididymis: "pelvis",
  thyroid: "neck",
  lung: "chest",
  pleura: "chest",
  heart: "chest",
  mediastinum: "chest",
  brain: "brain",
  ventricles: "brain",
  cerebellum: "brain",
  spine: "spine",
  vertebra: "spine",
  disc: "spine",
  "spinal cord": "spine",
};

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function splitSentences(text) {
  return text.split(/(?<=[.!?])\s+/).filter((s) => s.trim().length > 0);
}

// extractOrganSidePairs(text) -> { organ, side, hasFocalLesion }[]
// Within each sentence, pairs every laterality-sensitive organ mention
// (canonical name or alias, e.g. "renal" -> "kidney") with the nearest
// right/left/bilateral mention in that same sentence. "both" is treated as
// a synonym for "bilateral" (e.g. "both kidneys normal"). Each pair also
// records whether the sentence mentions a focal lesion term (calculus,
// mass, etc.), since that determines whether a bilateral organ still
// requires strict left/right consistency (see FOCAL_LESION_TERMS).
function extractOrganSidePairs(text) {
  const pairs = [];
  for (const sentence of splitSentences(text)) {
    const sideMatches = [...sentence.matchAll(/\b(right|left|bilateral|both)\b/gi)];
    if (sideMatches.length === 0) continue;

    const hasFocalLesion = FOCAL_LESION_RE.test(sentence);

    for (const { term, organ } of LATERALITY_SEARCH_TERMS) {
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

const MEASUREMENT_RE = /\b\d+(?:\.\d+)?\s?(?:x\s?\d+(?:\.\d+)?\s?)?(?:mm|cm)\b/i;

// validateReport(findings, impression, entities, modality, bodyPart)
//   -> { errors: string[], warnings: string[], flags: string[] }
export function validateReport(findings, impression, entities, modality, bodyPart) {
  const errors = [];
  const warnings = [];
  const flags = [];

  const findingsText = findings == null ? "" : String(findings);
  const impressionText = impression == null ? "" : String(impression);

  // Rule 1 (ERROR): Impression empty when Findings has substantive content.
  if (findingsText.trim().length > 20 && impressionText.trim().length === 0) {
    errors.push("Impression is empty but Findings contains content.");
  }

  // Rule 2 (ERROR): Laterality mismatch between Findings and Impression.
  // A bilateral organ (kidneys, lungs, etc.) described with different sides
  // in Findings vs Impression is NOT a contradiction on its own — it's
  // normal to report "left kidney normal... right kidney shows
  // hydronephrosis". Only flag when either side involves a focal lesion
  // (calculus, mass, fracture, ...), since a single lesion's side must stay
  // consistent regardless of whether its organ is bilateral.
  const findingsPairs = extractOrganSidePairs(findingsText);
  const impressionPairs = extractOrganSidePairs(impressionText);
  for (const fp of findingsPairs) {
    for (const ip of impressionPairs) {
      const bothSpecific = fp.side !== "bilateral" && ip.side !== "bilateral";
      if (fp.organ === ip.organ && fp.side !== ip.side && bothSpecific) {
        const isNormalBilateralReporting =
          isBilateralOrgan(fp.organ) && !fp.hasFocalLesion && !ip.hasFocalLesion;
        if (isNormalBilateralReporting) continue;

        errors.push(
          `Laterality mismatch: Findings states "${fp.side} ${fp.organ}" but Impression states "${ip.side} ${ip.organ}".`
        );
      }
    }
  }

  // Rule 3 (WARNING): Laterality-sensitive organ mentioned without a side.
  // "both kidneys" / "bilateral pleural effusion" count as a specified
  // laterality (normalized to "bilateral" in extractOrganSidePairs), so
  // they are not flagged here.
  const flaggedOrgans = new Set();
  for (const { term, organ } of LATERALITY_SEARCH_TERMS) {
    if (flaggedOrgans.has(organ)) continue;
    const organRe = new RegExp(`\\b${escapeRegExp(term)}\\b`, "i");
    if (organRe.test(findingsText)) {
      const hasSide = findingsPairs.some((p) => p.organ === organ);
      if (!hasSide) {
        warnings.push(`Laterality missing — specify left or right ${organ}.`);
        flaggedOrgans.add(organ);
      }
    }
  }

  // Rule 4 (WARNING): Same finding both asserted and negated in one section.
  const findingsExtraction = extractEntities(findingsText, modality, bodyPart);
  for (const term of findingsExtraction.findings) {
    if (findingsExtraction.negatedFindings.includes(term)) {
      warnings.push(`Contradiction in Findings: "${term}" is both asserted and negated.`);
    }
  }
  const impressionExtraction = extractEntities(impressionText, modality, bodyPart);
  for (const term of impressionExtraction.findings) {
    if (impressionExtraction.negatedFindings.includes(term)) {
      warnings.push(`Contradiction in Impression: "${term}" is both asserted and negated.`);
    }
  }

  // Rule 5 (FLAG): Anatomy mentioned that is out of context for this study.
  const entityOrgan = entities && entities.organ;
  const expectedBodyPart = entityOrgan && ORGAN_TO_BODYPART[entityOrgan];
  if (expectedBodyPart) {
    const normalizedBodyPart = String(bodyPart || "").trim().toLowerCase();
    if (expectedBodyPart !== normalizedBodyPart) {
      flags.push(
        `"${entityOrgan}" is not typically expected in a ${modality} ${bodyPart} study (usually seen in ${expectedBodyPart} studies).`
      );
    }
  }

  // Rule 6 (FLAG): Measurement present in Findings but absent from Impression.
  if (MEASUREMENT_RE.test(findingsText) && !MEASUREMENT_RE.test(impressionText)) {
    flags.push("A measurement is documented in Findings but not carried into Impression.");
  }

  // Rule 7 (WARNING): Findings section is unusually short.
  const wordCount = findingsText.trim().split(/\s+/).filter(Boolean).length;
  if (wordCount > 0 && wordCount < 20) {
    warnings.push(`Findings section is brief (${wordCount} words); confirm all relevant anatomy was addressed.`);
  }

  return { errors, warnings, flags };
}
