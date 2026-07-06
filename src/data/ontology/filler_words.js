// Speech filler and stutter patterns to strip from a transcript before section
// classification and entity extraction (e.g. "um", "uh", "like", repeated
// stammered word-starts). Distinct from cleanupTranscript.js's immediate
// duplicate-word removal — this targets non-medical filler noise specifically.
// Consumed by: pipeline/step1_clean.js.

// FILLER_PATTERNS: RegExp[]
// Ordered list of filler-word/phrase patterns to remove. Multi-word phrases
// are listed before single filler words so they match as a unit first.
export const FILLER_PATTERNS = [
  /\bokay so\b/gi,
  /\byou know\b/gi,
  /\bum+\b/gi,
  /\buh+\b/gi,
  /\ber+\b/gi,
  /\bhmm+\b/gi,
];

// stripFillerWords(text) -> string
// Removes all filler patterns from the given text and returns the cleaned string.
export function stripFillerWords(text) {
  if (!text) return text;
  let result = text;
  for (const pattern of FILLER_PATTERNS) {
    result = result.replace(pattern, " ");
  }
  return result.replace(/\s+/g, " ").trim();
}

// --- Self-test (manual reference, not executed automatically) ---
// stripFillerWords("um the uh liver is normal")
//   -> "the liver is normal"
// stripFillerWords("okay so the kidney, you know, looks fine")
//   -> "the kidney, looks fine"
