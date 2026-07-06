// Defines section ordering and which sections are mandatory vs optional per
// modality (e.g. CT/MRI include Comparison when a prior exists; X-Ray reports
// are typically shorter). Consumed by pipeline/step4_generate.js to assemble
// sections in the correct order and by pipeline/step3_validate.js to check
// that mandatory sections are present.

const DEFAULT_ORDER = [
  "header", "clinicalHistory", "technique", "comparison",
  "findings", "impression", "recommendation", "footer",
];

const XRAY_ORDER = [
  "header", "clinicalHistory", "technique", "findings", "impression", "footer",
];

const MANDATORY_SECTIONS = ["header", "technique", "findings", "impression", "footer"];

// getSectionOrder(modality) -> string[]
// Returns the ordered list of section names for the given modality
// (e.g. ["header", "clinicalHistory", "technique", "comparison", "findings",
// "impression", "recommendation", "footer"]).
export function getSectionOrder(modality) {
  const mod = String(modality || "").trim().toUpperCase();
  return (mod === "X-RAY" ? XRAY_ORDER : DEFAULT_ORDER).slice();
}

// getMandatorySections(modality) -> string[]
// Returns the subset of section names that must be non-empty before a report
// can be approved for the given modality. Currently identical across
// modalities; kept as a function so per-modality overrides can be added
// later without changing callers.
export function getMandatorySections(modality) {
  return MANDATORY_SECTIONS.slice();
}

// --- Self-test (manual reference, not executed automatically) ---
// getSectionOrder("CT")
//   -> ["header","clinicalHistory","technique","comparison","findings","impression","recommendation","footer"]
// getSectionOrder("X-RAY")
//   -> ["header","clinicalHistory","technique","findings","impression","footer"]
// getMandatorySections("CT")
//   -> ["header","technique","findings","impression","footer"]
