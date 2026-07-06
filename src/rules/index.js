// Aggregates every rule module in src/rules/ into a single entry point.
// Consumed by pipeline/step3_validate.js (or directly by pipeline/index.js)
// so callers don't need to know about each individual rule file.
import { checkLaterality } from "./laterality.js";
import { checkContext } from "./context.js";
import { checkContradictions } from "./contradiction.js";
import { checkImpression } from "./impression.js";

// runAllRules(findings, impression, entities, modality, bodyPart)
//   -> { errors: string[], warnings: string[], flags: string[] }
// Runs all four rule checks and merges their results. No current rule
// produces a hard error on its own, so `errors` is always empty today but
// kept in the return shape for parity with pipeline/step3_validate.js and
// for future rules that do block approval.
export function runAllRules(findings, impression, entities, modality, bodyPart) {
  const findingsText = findings == null ? "" : String(findings);
  const impressionText = impression == null ? "" : String(impression);
  const combinedText = [findingsText, impressionText].filter(Boolean).join(" ");

  const warnings = [
    ...checkLaterality(entities),
    ...checkContradictions(combinedText),
  ];

  const flags = [
    ...checkContext(combinedText, modality, bodyPart),
    ...checkImpression(findingsText, impressionText),
  ];

  return { errors: [], warnings, flags };
}
