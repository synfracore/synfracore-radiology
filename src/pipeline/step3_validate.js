// Pipeline step 3: runs deterministic validation rules against the Findings
// and Impression text (plus the entity summary from step2_extract.js) and
// returns severity-tagged results. Consumed by pipeline/index.js; errors
// block approval, warnings are shown with an override option, flags are
// informational only. See components/ValidationAlerts.jsx for rendering.
import { extractEntities } from "./step2_extract.js";

// Organs that should always carry an explicit laterality qualifier.
const LATERALITY_ORGANS = [
  "kidney", "lung", "adrenal gland", "ovary", "hip", "shoulder", "breast",
  "orbit", "adnexa", "ureter",
];

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

// extractOrganSidePairs(text) -> { organ: string, side: string }[]
// Within each sentence, pairs every laterality-sensitive organ mention with
// the nearest right/left/bilateral mention in that same sentence.
function extractOrganSidePairs(text) {
  const pairs = [];
  for (const sentence of splitSentences(text)) {
    const sideMatches = [...sentence.matchAll(/\b(right|left|bilateral)\b/gi)];
    if (sideMatches.length === 0) continue;

    for (const organ of LATERALITY_ORGANS) {
      const organRe = new RegExp(`\\b${escapeRegExp(organ)}\\b`, "i");
      const organMatch = organRe.exec(sentence);
      if (!organMatch) continue;

      let best = null;
      for (const sm of sideMatches) {
        const dist = Math.abs(sm.index - organMatch.index);
        if (best === null || dist < best.dist) {
          best = { side: sm[1].toLowerCase(), dist };
        }
      }
      if (best) pairs.push({ organ, side: best.side });
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
  const findingsPairs = extractOrganSidePairs(findingsText);
  const impressionPairs = extractOrganSidePairs(impressionText);
  for (const fp of findingsPairs) {
    for (const ip of impressionPairs) {
      const bothSpecific = fp.side !== "bilateral" && ip.side !== "bilateral";
      if (fp.organ === ip.organ && fp.side !== ip.side && bothSpecific) {
        errors.push(
          `Laterality mismatch: Findings states "${fp.side} ${fp.organ}" but Impression states "${ip.side} ${ip.organ}".`
        );
      }
    }
  }

  // Rule 3 (WARNING): Laterality-sensitive organ mentioned without a side.
  for (const organ of LATERALITY_ORGANS) {
    const organRe = new RegExp(`\\b${escapeRegExp(organ)}\\b`, "i");
    if (organRe.test(findingsText)) {
      const hasSide = findingsPairs.some((p) => p.organ === organ);
      if (!hasSide) {
        warnings.push(`"${organ}" mentioned in Findings without laterality (right/left/bilateral).`);
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
