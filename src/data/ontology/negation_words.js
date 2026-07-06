// Word/phrase patterns that negate a nearby finding (e.g. "no evidence of",
// "not seen", "without", "rules out"). Consumed by pipeline/step2_extract.js
// to mark an extracted entity as negated so downstream validation/consistency
// checks don't treat a negated finding as a positive one.

// NEGATION_PREFIXES: string[]
// Lowercase negation trigger phrases, longest/most-specific first so a
// greedy regex match prefers "no evidence of" over the bare "no ".
export const NEGATION_PREFIXES = [
  "no evidence of",
  "no significant",
  "no signs of",
  "no findings of",
  "no residual",
  "no interval",
  "no acute",
  "no focal",
  "no definite",
  "not identified",
  "not visualized",
  "cannot be identified",
  "absence of",
  "negative for",
  "unremarkable for",
  "ruled out",
  "rules out",
  "excludes",
  "free of",
  "clear of",
  "non-obstructing",
  "non-displaced",
  "no ",
  "not ",
  "without ",
  "absent ",
];

// NEGATION_REGEX: RegExp
// Case-insensitive, global alternation of all NEGATION_PREFIXES, escaped and
// ordered longest-first so overlapping prefixes don't shadow more specific
// matches (e.g. matches "no evidence of" as one unit rather than just "no ").
const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
export const NEGATION_REGEX = new RegExp(
  NEGATION_PREFIXES.slice()
    .sort((a, b) => b.length - a.length)
    .map(escapeRegExp)
    .join("|"),
  "gi"
);

// isNegated(sentence, findingIndex) -> boolean
// Given a sentence string and the character index of a finding term within
// it, returns whether that finding falls within scope of a negation trigger
// (i.e. a negation prefix appears earlier in the same sentence, before the
// finding, with no intervening sentence-ending punctuation).
export function isNegated(sentence, findingIndex) {
  // TODO: implement
}

// --- Self-test (manual reference, not executed automatically) ---
// NEGATION_REGEX.test("no evidence of intracranial hemorrhage")
//   -> true (matches "no evidence of")
// "kidney stone is not identified".match(NEGATION_REGEX)
//   -> ["not identified"]
// isNegated("liver is normal, no focal lesion seen", 18)
//   -> true (index 18 falls within "no focal lesion", after "no focal" trigger)
