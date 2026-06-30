// Cleans up consecutive duplicate words from dictated speech-to-text output.
// e.g. "right right clavicle fracture fracture seen" -> "right clavicle fracture seen"
//
// Deliberately simple and rule-based (no AI call) for this first pass — fast,
// free, predictable. Only removes immediate word repeats; does not touch
// sentence structure, grammar, or medical terminology. More advanced cleanup
// (filler words, stutters, AI-based rewriting) can be added later as a
// separate step without changing this function's contract.
export function cleanupDuplicateWords(text) {
  if (!text) return text;

  // Split into words while keeping punctuation attached, then drop a word
  // if it's the same as the immediately preceding word (case-insensitive).
  const words = text.split(/\s+/);
  const result = [];

  for (let i = 0; i < words.length; i++) {
    const current = words[i];
    const previous = result[result.length - 1];

    const normalize = (w) => w.toLowerCase().replace(/[.,!?;:]+$/, "");

    if (previous && normalize(current) === normalize(previous)) {
      continue; // skip the duplicate
    }
    result.push(current);
  }

  return result.join(" ");
}
