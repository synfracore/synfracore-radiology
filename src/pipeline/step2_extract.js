// Pipeline step 2: takes the cleaned transcript plus the study's modality and
// body part, and extracts a single structured entity summary (organ,
// laterality, findings, measurements, etc.) using regex/dictionary lookups
// scoped by data/ontology/anatomy_map.js and data/ontology/negation_words.js.
// Consumed by pipeline/index.js and feeds pipeline/step3_validate.js +
// pipeline/step4_generate.js.
import { getExpectedAnatomy } from "../data/ontology/anatomy_map.js";
import { ORGAN_FINDINGS } from "../data/ontology/organ_findings.js";
import { NEGATION_REGEX } from "../data/ontology/negation_words.js";

// Adjective/plural forms that should resolve to a canonical organ key from
// ORGAN_FINDINGS.
const ORGAN_ALIASES = {
  kidneys: "kidney",
  renal: "kidney",
  ovaries: "ovary",
  lungs: "lung",
  pulmonary: "lung",
  pleural: "pleura",
  "adrenal glands": "adrenal gland",
  "lymph node": "lymph nodes",
  vertebrae: "vertebra",
  vertebral: "spine",
  discs: "disc",
  testes: "testis",
  testicles: "testis",
  hepatic: "liver",
  splenic: "spleen",
  cardiac: "heart",
  cerebral: "brain",
};

const ORGAN_TERMS = [
  ...Object.keys(ORGAN_FINDINGS),
  ...Object.keys(ORGAN_ALIASES),
].sort((a, b) => b.length - a.length);

// Standalone finding phrases/words, longest first so multi-word findings
// (e.g. "pleural effusion") are matched before a subsumed shorter term
// (e.g. "effusion").
const FINDING_TERMS = [
  "ground glass opacity", "disc herniation", "bowel obstruction",
  "pleural effusion", "kidney stone", "renal calculus", "midline shift",
  "mass effect", "hydronephrosis", "cholelithiasis", "cholecystitis",
  "pancreatitis", "appendicitis", "diverticulosis", "lymphadenopathy",
  "hepatomegaly", "splenomegaly", "cardiomegaly", "osteoarthritis",
  "osteomyelitis", "atelectasis", "consolidation", "calcification",
  "hemorrhage", "infarction", "dislocation", "herniation", "dilatation",
  "thrombosis", "stenosis", "aneurysm", "hematoma", "fibroid", "abscess",
  "effusion", "fracture", "calculus", "ischemia", "atrophy", "gliosis",
  "infarct", "hernia", "nodule", "lesion", "stone", "edema", "bulge",
  "mass", "cyst",
].sort((a, b) => b.length - a.length);

const SIZE_TERMS = [
  "mild-to-moderate", "mild to moderate", "tiny", "small", "minimal",
  "trace", "mild", "moderate", "large", "massive",
].sort((a, b) => b.length - a.length);

const LOCATION_TERMS = [
  "upper pole", "lower pole", "mid pole", "interpolar region", "anterior",
  "posterior", "superior", "inferior", "medial", "lateral", "proximal",
  "distal", "apex", "base",
].sort((a, b) => b.length - a.length);

const DENSITY_TERMS = [
  "hypodense", "hyperdense", "isodense", "hypoechoic", "hyperechoic",
  "isoechoic", "hypointense", "hyperintense", "sclerotic", "lucent",
].sort((a, b) => b.length - a.length);

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function findFirstTerm(text, terms) {
  let best = null;
  for (const term of terms) {
    const re = new RegExp(`\\b${escapeRegExp(term)}\\b`, "i");
    const match = re.exec(text);
    if (match && (best === null || match.index < best.index)) {
      best = { term, index: match.index };
    }
  }
  return best ? best.term : null;
}

function splitSentences(text) {
  return text.split(/(?<=[.!?])\s+/).filter((s) => s.trim().length > 0);
}

// extractOrganAndSide(text) -> { organ: string|null, side: string|null }
function extractOrganAndSide(text) {
  let organMatch = null;
  for (const term of ORGAN_TERMS) {
    const re = new RegExp(`\\b${escapeRegExp(term)}\\b`, "i");
    const match = re.exec(text);
    if (match && (organMatch === null || match.index < organMatch.index)) {
      const canonical = ORGAN_ALIASES[term.toLowerCase()] || term.toLowerCase();
      organMatch = { term: canonical, index: match.index };
    }
  }

  const sideMatch = /\b(right|left|bilateral)\b/i.exec(text);

  return {
    organ: organMatch ? organMatch.term : null,
    side: sideMatch ? sideMatch[1].toLowerCase() : null,
  };
}

// extractFindings(text) -> { findings: string[], negatedFindings: string[] }
// Scans sentence-by-sentence so a negation trigger only affects findings
// within the same sentence. Longer finding phrases are matched first and
// their matched span is excluded from shorter overlapping matches.
function extractFindings(text) {
  const findings = new Set();
  const negatedFindings = new Set();

  for (const sentence of splitSentences(text)) {
    const negationSpans = [];
    NEGATION_REGEX.lastIndex = 0;
    let negMatch;
    while ((negMatch = NEGATION_REGEX.exec(sentence)) !== null) {
      negationSpans.push({ start: negMatch.index, end: negMatch.index + negMatch[0].length });
      if (negMatch[0].length === 0) NEGATION_REGEX.lastIndex++;
    }

    const claimedRanges = [];
    const isClaimed = (start, end) =>
      claimedRanges.some((r) => start < r.end && end > r.start);

    for (const term of FINDING_TERMS) {
      const re = new RegExp(`\\b${escapeRegExp(term)}\\b`, "gi");
      let match;
      while ((match = re.exec(sentence)) !== null) {
        const start = match.index;
        const end = start + match[0].length;
        if (!isClaimed(start, end)) {
          claimedRanges.push({ start, end });
          const negatedByPrefix = negationSpans.some((n) => n.end <= start);
          if (negatedByPrefix) {
            negatedFindings.add(term);
          } else {
            findings.add(term);
          }
        }
        if (match[0].length === 0) re.lastIndex++;
      }
    }
  }

  return { findings: [...findings], negatedFindings: [...negatedFindings] };
}

function extractMeasurements(text) {
  const re = /\b\d+(?:\.\d+)?\s?(?:x\s?\d+(?:\.\d+)?\s?)?(?:mm|cm)\b/gi;
  return [...text.matchAll(re)].map((m) => m[0].trim());
}

function extractObstruction(text) {
  if (/\bnon[-\s]obstructing\b/i.test(text)) return "non-obstructing";
  if (/\bobstructing\b/i.test(text)) return "obstructing";
  return null;
}

function extractEnhancement(text) {
  if (/\bnon[-\s]enhancing\b/i.test(text)) return "non-enhancing";
  if (/\b(enhancing|enhancement)\b/i.test(text)) return "enhancing";
  return null;
}

function computeConfidence(entity, modality, bodyPart) {
  const simpleFields = [
    entity.organ, entity.side, entity.size, entity.location,
    entity.density, entity.obstruction, entity.enhancement,
  ];
  let filledCount = simpleFields.filter(Boolean).length;
  if (entity.findings.length > 0) filledCount++;
  if (entity.negatedFindings.length > 0) filledCount++;
  if (entity.measurements.length > 0) filledCount++;
  if (entity.calcification) filledCount++;
  if (entity.fracture) filledCount++;

  const TOTAL_FIELDS = 11;
  const base = filledCount / TOTAL_FIELDS;

  const expected = getExpectedAnatomy(modality, bodyPart).map((t) => t.toLowerCase());
  const mentionedTerms = [entity.organ, ...entity.findings, ...entity.negatedFindings]
    .filter(Boolean)
    .map((t) => t.toLowerCase());

  let bonus = 0;
  if (mentionedTerms.length > 0 && expected.length > 0) {
    const matchCount = mentionedTerms.filter((t) =>
      expected.some((e) => e.includes(t) || t.includes(e))
    ).length;
    bonus = (matchCount / mentionedTerms.length) * 0.3;
  }

  return Math.min(1, Math.round((base * 0.7 + bonus) * 100) / 100);
}

// extractEntities(cleanedText, modality, bodyPart) -> Entity
// Entity shape: { organ, side, findings, negatedFindings, size,
// measurements, location, density, obstruction, enhancement,
// calcification, fracture, isNormal, confidence }
export function extractEntities(cleanedText, modality, bodyPart) {
  const text = cleanedText == null ? "" : String(cleanedText);

  const { organ, side } = extractOrganAndSide(text);
  const { findings, negatedFindings } = extractFindings(text);
  const size = findFirstTerm(text, SIZE_TERMS);
  const measurements = extractMeasurements(text);
  const location = findFirstTerm(text, LOCATION_TERMS);
  const density = findFirstTerm(text, DENSITY_TERMS);
  const obstruction = extractObstruction(text);
  const enhancement = extractEnhancement(text);
  const calcification = /\bcalcificat(?:ion|ions)\b/i.test(text);
  const fracture = /\bfractures?\b/i.test(text);

  const literalNormal = /\b(normal|unremarkable)\b/i.test(text);
  const isNormal = literalNormal || (findings.length === 0 && negatedFindings.length > 0);

  const entity = {
    organ,
    side,
    findings,
    negatedFindings,
    size,
    measurements,
    location,
    density,
    obstruction,
    enhancement,
    calcification,
    fracture,
    isNormal,
  };

  entity.confidence = computeConfidence(entity, modality, bodyPart);

  return entity;
}
