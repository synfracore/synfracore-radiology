// Organs/structures that are normally present and independently described
// on BOTH sides within a single report (e.g. "left kidney normal... right
// kidney shows hydronephrosis" is standard bilateral reporting, not a
// laterality contradiction). Consumed by rules that compare laterality
// across sentences (pipeline/step3_validate.js, rules/impression.js) so
// they can skip flagging when the organs being compared are legitimately
// bilateral, rather than treating differing left/right mentions as an
// error.
//
// This is distinct from LATERALITY_REQUIRED (rules/laterality.js): a
// bilateral organ can still carry a focal, single-sided lesion (e.g. "right
// renal calculus") whose laterality must stay consistent between Findings
// and Impression — being a bilateral organ does not exempt a specific
// lesion mention from that check. See FOCAL_LESION_TERMS in
// pipeline/step3_validate.js.

// BILATERAL_ORGANS: string[]
// Lowercase canonical names plus common variants/abbreviations, so a match
// against either form resolves to "this is a bilateral organ".
export const BILATERAL_ORGANS = [
  // kidneys
  "kidney", "kidneys", "renal",
  // lungs / lobes
  "lung", "lungs", "pulmonary", "lobe", "lobes", "lung lobe", "lung lobes",
  // adrenal glands
  "adrenal gland", "adrenal glands", "adrenals",
  // ovaries
  "ovary", "ovaries",
  // fallopian tubes
  "fallopian tube", "fallopian tubes",
  // testes
  "testis", "testes", "testicle", "testicles",
  // joints
  "hip", "hip joint", "hip joints",
  "shoulder", "shoulder joint", "shoulder joints",
  "knee", "knee joint", "knee joints",
  "ankle", "ankle joint", "ankle joints",
  "wrist", "wrist joint", "wrist joints",
  "elbow", "elbow joint", "elbow joints",
  // arteries
  "carotid artery", "carotid arteries", "carotid",
  "vertebral artery", "vertebral arteries",
  // urinary
  "ureter", "ureters",
  // adnexa
  "adnexa", "adnexal",
  // glands
  "parotid gland", "parotid glands", "parotid",
  "submandibular gland", "submandibular glands",
  // head/eyes
  "eye", "eyes", "orbit", "orbits",
  // breast/axilla
  "breast", "breasts", "axilla", "axillae", "axillary",
];

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Longest terms first so e.g. "hip joints" is matched before the bare "hip"
// when scanning free text (isBilateralOrgan doesn't currently need this
// ordering since it just tests membership/regex per term, but keeping the
// list sorted keeps behavior predictable if callers iterate it directly).
const SORTED_TERMS = [...BILATERAL_ORGANS].sort((a, b) => b.length - a.length);

// isBilateralOrgan(text) -> boolean
// True if `text` (a free-text sentence, or a single canonical organ name
// like "kidney") contains any known bilateral-organ term as a whole word.
export function isBilateralOrgan(text) {
  const t = String(text || "");
  if (!t.trim()) return false;

  return SORTED_TERMS.some((term) => {
    const re = new RegExp(`\\b${escapeRegExp(term)}\\b`, "i");
    return re.test(t);
  });
}

// --- Test cases (manual reference, not executed automatically) ---
// PASS (bilateral organ recognized):
//   isBilateralOrgan("The right kidney shows mild hydronephrosis.")
//   -> true
// PASS (canonical organ name alone):
//   isBilateralOrgan("kidney")
//   -> true
// FAIL (non-bilateral organ, single midline structure):
//   isBilateralOrgan("The uterus is normal in size.")
//   -> false
