// Pipeline step 5: generates non-blocking "next likely term" suggestions
// while dictating (using data/ontology/organ_findings.js), and parses raw
// transcript phrases for voice commands (using
// data/ontology/voice_commands.js) so the UI can act on structural commands
// instead of inserting them as literal text. Consumed by pipeline/index.js;
// suggestions are rendered via components/SuggestionChips.jsx.
import { ORGAN_FINDINGS, getLikelyFindings } from "../data/ontology/organ_findings.js";
import { matchVoiceCommand } from "../data/ontology/voice_commands.js";

function normalize(text) {
  return String(text || "").toLowerCase().replace(/[^a-z]/g, "");
}

const NORMALIZED_ORGAN_KEYS = Object.keys(ORGAN_FINDINGS).map((key) => ({
  key,
  normalized: normalize(key),
}));

// getSuggestions(partialText) -> string[]
// Matches the given partial/whole phrase against known organ names
// (ignoring spacing/punctuation, e.g. "gall bladder" -> "gallbladder") and
// returns that organ's most common findings as next-likely-term suggestions.
// Returns an empty array when no organ match is found.
export function getSuggestions(partialText) {
  const normalizedInput = normalize(partialText);
  if (!normalizedInput) return [];

  let matchedOrgan = NORMALIZED_ORGAN_KEYS.find((o) => o.normalized === normalizedInput);
  if (!matchedOrgan) {
    matchedOrgan = NORMALIZED_ORGAN_KEYS.find(
      (o) => o.normalized.startsWith(normalizedInput) || normalizedInput.startsWith(o.normalized)
    );
  }
  if (!matchedOrgan) return [];

  return getLikelyFindings(matchedOrgan.key).slice(0, 6);
}

// parseVoiceCommand(text) -> { isCommand: boolean, action: string|null, originalText: string }
// Wraps matchVoiceCommand() from data/ontology/voice_commands.js in the
// shape the dictation UI needs to decide whether to execute a structural
// action or insert the text literally.
export function parseVoiceCommand(text) {
  const match = matchVoiceCommand(text);
  return {
    isCommand: match !== null,
    action: match ? match.action : null,
    originalText: text,
  };
}

// --- Self-test (manual reference, not executed automatically) ---
// getSuggestions("gall bladder")
//   -> ["normal", "unremarkable", "no calculus", "wall not thickened", "gallstones", "cholelithiasis"]
// parseVoiceCommand("finalize report")
//   -> { isCommand: true, action: "FINALIZE_REPORT", originalText: "finalize report" }
// parseVoiceCommand("the liver is normal")
//   -> { isCommand: false, action: null, originalText: "the liver is normal" }
