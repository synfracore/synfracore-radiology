// JavaScript port of typing_assistant.py. All logic runs client-side in the
// browser — no Python, no external API. Consumed by pages/NewReport.jsx to
// power live-dictation autocomplete (suggestCompletion, sourced from D1
// learned phrases via /api/patterns/suggest) and two lightweight
// consistency checks that run against the transcript as it's typed/spoken
// (checkNegationContradiction, checkLateralityConsistency).
import { NEGATION_PREFIXES } from "../data/ontology/negation_words.js";
import { isBilateralOrgan } from "../data/ontology/bilateral_organs.js";

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// CLAUSE_BOUNDARY_RE: a soft sentence boundary for continuous, unpunctuated
// live dictation (Web Speech API commits recognition results without
// inserting periods between spoken pauses — see mergeChunks in
// pipeline/step1_clean.js). "a/an/the <noun> is/are/was/were" is a strong,
// general signal that a fresh independent clinical statement has started
// (e.g. "...mass lesion" + "a mass is seen in the right lobe" — two
// distinct assertions run together with no punctuation between them), so
// it's treated as a sentence break in addition to literal . ! ? — this
// keeps checkNegationContradiction/checkLateralityConsistency usable on
// partial transcript text before any punctuation has been dictated.
const CLAUSE_BOUNDARY_RE = /\s+(?=(?:a|an|the)\s+\S+(?:\s+\S+){0,2}\s+(?:is|are|was|were)\b)/i;

function splitSentences(text) {
  return String(text || "")
    .split(/(?<=[.!?])\s+/)
    .flatMap((chunk) => chunk.split(CLAUSE_BOUNDARY_RE))
    .map((s) => s.trim())
    .filter(Boolean);
}

function normalizePhrase(text) {
  return String(text || "").toLowerCase().replace(/\s+/g, " ").trim();
}

// suggestCompletion(partialText, section, learnedPhrases) -> { suggestion, confidence }
// learnedPhrases: [{ phrase, count }] as returned by GET /api/patterns/suggest.
// Scores each candidate by how much of it is already typed (characters
// matched / phrase length) weighted by how often it's been approved before
// (log(count + 1)), and returns the single best match — the FULL phrase, so
// the radiologist sees the entire standard sentence they'd be completing,
// not just the remainder. `section` is accepted for API-shape parity with
// runLiveAssist/getPhraseSuggestions (the caller already scoped
// `learnedPhrases` to the right section server-side) — it isn't
// re-filtered here.
export function suggestCompletion(partialText, section, learnedPhrases) {
  const partial = normalizePhrase(partialText);
  const candidates = Array.isArray(learnedPhrases) ? learnedPhrases : [];

  if (!partial || candidates.length === 0) {
    return { suggestion: null, confidence: 0 };
  }

  let best = null;

  for (const entry of candidates) {
    const phrase = normalizePhrase(entry && entry.phrase);
    const count = Number(entry && entry.count) || 0;
    if (!phrase) continue;

    const isMatch = phrase.startsWith(partial) || phrase.includes(partial);
    if (!isMatch) continue;

    const matchedChars = Math.min(partial.length, phrase.length);
    const rawScore = (matchedChars / phrase.length) * Math.log(count + 1);
    const confidence = Math.min(1, rawScore);

    if (!best || confidence > best.confidence) {
      best = { suggestion: entry.phrase, confidence };
    }
  }

  if (!best || best.confidence <= 0.4) {
    return { suggestion: null, confidence: 0 };
  }

  return best;
}

// STOPWORDS: skipped when picking the "key noun" that follows a negation
// trigger, so e.g. "no evidence of mass lesion" yields "mass" rather than
// "of" or "lesion" alone.
const STOPWORDS = new Set([
  "a", "an", "the", "of", "in", "on", "at", "is", "are", "was", "were",
  "to", "and", "or", "with", "for", "noted", "seen", "identified",
  "present", "evidence", "any", "there",
]);

const NEGATION_REGEX_SORTED = NEGATION_PREFIXES
  .slice()
  .sort((a, b) => b.length - a.length)
  .map(escapeRegExp)
  .join("|");
const NEGATION_TRIGGER_RE = new RegExp(`(${NEGATION_REGEX_SORTED})`, "i");

// extractNegatedNoun(sentence) -> string|null
// Finds the first negation trigger in the sentence and returns the first
// non-stopword token immediately following it (the thing being negated).
function extractNegatedNoun(sentence) {
  const match = NEGATION_TRIGGER_RE.exec(sentence);
  if (!match) return null;

  const remainder = sentence.slice(match.index + match[0].length);
  const words = remainder.toLowerCase().match(/[a-z]+/g) || [];
  const noun = words.find((w) => !STOPWORDS.has(w));
  return noun || null;
}

// checkNegationContradiction(fullReportText) -> string[]
// Port of check_negation_contradiction from typing_assistant.py. First
// pass: collect the key noun negated in each sentence that contains a
// negation trigger (e.g. "No evidence of mass lesion" -> "mass"). Second
// pass: for every LATER sentence that mentions that same noun without a
// negation trigger of its own, flag it as a contradiction — the finding
// was ruled out earlier but then asserted positively.
export function checkNegationContradiction(fullReportText) {
  const sentences = splitSentences(fullReportText);
  const flags = [];
  const alreadyFlagged = new Set();

  const negatedNouns = sentences.map((sentence) => extractNegatedNoun(sentence));

  for (let i = 0; i < sentences.length; i++) {
    const noun = negatedNouns[i];
    if (!noun || alreadyFlagged.has(noun)) continue;

    const nounRe = new RegExp(`\\b${escapeRegExp(noun)}\\b`, "i");

    for (let j = i + 1; j < sentences.length; j++) {
      const laterSentence = sentences[j];
      const hasNegationInLaterSentence = NEGATION_TRIGGER_RE.test(laterSentence);
      if (hasNegationInLaterSentence) continue;
      if (!nounRe.test(laterSentence)) continue;

      flags.push(`"${noun}" was negated earlier but mentioned positively later.`);
      alreadyFlagged.add(noun);
      break;
    }
  }

  return flags;
}

// Organs relevant to laterality checks, plus adjective/plural aliases that
// resolve to a canonical entry (mirrors the alias handling in
// pipeline/step3_validate.js and rules/impression.js).
const LATERALITY_ORGANS = [
  "kidney", "lung", "adrenal gland", "ovary", "hip", "shoulder", "breast",
  "orbit", "adnexa", "ureter", "testis", "knee", "ankle", "wrist", "elbow",
];
const ORGAN_ALIASES = {
  renal: "kidney",
  pulmonary: "lung",
  adrenal: "adrenal gland",
  pleural: "pleura",
  testicular: "testis",
};
const ORGAN_SEARCH_TERMS = [
  ...LATERALITY_ORGANS.map((organ) => ({ term: organ, organ })),
  ...Object.entries(ORGAN_ALIASES).map(([term, organ]) => ({ term, organ })),
].sort((a, b) => b.term.length - a.term.length);

// A mention of one of these near an organ describes a single, discrete
// lesion. A bilateral organ (kidney, lung, adrenal gland, ...) can be
// legitimately described with a different side in adjacent sentences when
// no focal lesion is involved — but a focal lesion's side must stay
// consistent regardless of whether its organ is bilateral (mirrors
// pipeline/step3_validate.js's FOCAL_LESION_TERMS).
const FOCAL_LESION_TERMS = [
  "calculus", "stone", "mass", "cyst", "nodule", "tumor", "lesion",
  "fracture", "dislocation",
];
const FOCAL_LESION_RE = new RegExp(`\\b(${FOCAL_LESION_TERMS.join("|")})\\b`, "i");

// extractOrganSidePairs(sentence) -> { organ, side, hasFocalLesion }[]
// Pairs every known organ mention in the sentence with the nearest
// right/left/bilateral mention in that same sentence.
function extractOrganSidePairs(sentence) {
  const sideMatches = [...sentence.matchAll(/\b(right|left|bilateral)\b/gi)];
  if (sideMatches.length === 0) return [];

  const hasFocalLesion = FOCAL_LESION_RE.test(sentence);
  const pairs = [];

  for (const { term, organ } of ORGAN_SEARCH_TERMS) {
    const organRe = new RegExp(`\\b${escapeRegExp(term)}\\b`, "i");
    const organMatch = organRe.exec(sentence);
    if (!organMatch) continue;

    let best = null;
    for (const sm of sideMatches) {
      const dist = Math.abs(sm.index - organMatch.index);
      if (best === null || dist < best.dist) {
        best = { side: sm[1].toLowerCase(), dist };
      }
    }
    if (best) pairs.push({ organ, side: best.side, hasFocalLesion });
  }
  return pairs;
}

// checkLateralityConsistency(fullReportText) -> string[]
// Port of check_laterality_consistency from typing_assistant.py, updated to
// import BILATERAL_ORGANS (Phase 2) and skip flagging when the organ shared
// between two adjacent sentences is normally described on both sides in
// the same report (e.g. "left kidney normal... right kidney shows
// hydronephrosis" is standard bilateral reporting). A focal lesion
// (calculus, mass, nodule, ...) still requires consistent laterality even
// on a bilateral organ, since a single lesion has one location.
export function checkLateralityConsistency(fullReportText) {
  const sentences = splitSentences(fullReportText);
  const pairsPerSentence = sentences.map(extractOrganSidePairs);
  const flags = [];

  for (let i = 0; i < sentences.length - 1; i++) {
    for (const fp of pairsPerSentence[i]) {
      for (const np of pairsPerSentence[i + 1]) {
        if (fp.organ !== np.organ) continue;
        const bothSpecific = fp.side !== "bilateral" && np.side !== "bilateral";
        if (!bothSpecific || fp.side === np.side) continue;

        const isNormalBilateralReporting =
          isBilateralOrgan(fp.organ) && !fp.hasFocalLesion && !np.hasFocalLesion;
        if (isNormalBilateralReporting) continue;

        flags.push(
          `Laterality flip: "${fp.side} ${fp.organ}" then "${np.side} ${np.organ}" in adjacent sentences.`
        );
      }
    }
  }

  return flags;
}

// runLiveAssist(partialText, fullReportSoFar, section, learnedPhrases)
//   -> { suggestion, confidence, flags }
// Single entry point the UI calls after each committed speech-recognition
// chunk: combines the corpus-learned completion with both consistency
// checks run against the transcript accumulated so far.
export function runLiveAssist(partialText, fullReportSoFar, section, learnedPhrases) {
  const { suggestion, confidence } = suggestCompletion(partialText, section, learnedPhrases);
  const flags = [
    ...checkNegationContradiction(fullReportSoFar),
    ...checkLateralityConsistency(fullReportSoFar),
  ];

  return { suggestion, confidence, flags };
}

// --- __test__ -----------------------------------------------------------
// Runs only when this file is executed directly (node src/pipeline/typingAssistant.js),
// never when imported into the app bundle. Plain PASS/FAIL console output,
// no test framework/new dependency, matching src/tests/pipeline.test.js's style.
const isDirectRun =
  typeof process !== "undefined" &&
  process.argv &&
  process.argv[1] &&
  import.meta.url.replace(/\\/g, "/").endsWith(process.argv[1].replace(/\\/g, "/").split("/").pop());

if (isDirectRun) {
  let passCount = 0;
  let failCount = 0;

  function check(name, pass, expected, actual) {
    if (pass) {
      passCount++;
      console.log(`PASS - ${name}`);
    } else {
      failCount++;
      console.log(`FAIL - ${name}`);
      console.log(`  expected: ${expected}`);
      console.log(`  actual:   ${actual}`);
    }
  }

  // Test 1 — suggestCompletion
  {
    const result = suggestCompletion("no acute intracranial hem", "findings", [
      { phrase: "no acute intracranial hemorrhage identified.", count: 5 },
      { phrase: "no evidence of mass lesion.", count: 3 },
    ]);
    check(
      "Test 1: suggestCompletion picks full learned phrase",
      result.suggestion === "no acute intracranial hemorrhage identified." && result.confidence > 0.8,
      'suggestion = "no acute intracranial hemorrhage identified.", confidence > 0.8',
      JSON.stringify(result)
    );
  }

  // Test 2 — checkNegationContradiction
  {
    const text =
      "No evidence of mass lesion. Ventricles normal. A mass lesion is seen in the right frontal lobe.";
    const flags = checkNegationContradiction(text);
    check(
      "Test 2: checkNegationContradiction flags mass contradiction",
      flags.some((f) => /mass/i.test(f)),
      'a flag mentioning "mass"',
      JSON.stringify(flags)
    );
  }

  // Test 3 — checkLateralityConsistency (bilateral organ, no flag)
  {
    const text = "The left kidney appears normal. The right kidney shows mild hydronephrosis.";
    const flags = checkLateralityConsistency(text);
    check(
      "Test 3: bilateral kidney pair not flagged",
      flags.length === 0,
      "[]",
      JSON.stringify(flags)
    );
  }

  // Test 4 — checkLateralityConsistency (real contradiction on a focal lesion)
  {
    const text = "Right adrenal nodule noted. Left adrenal nodule is the finding of concern.";
    const flags = checkLateralityConsistency(text);
    check(
      "Test 4: right-vs-left adrenal nodule flagged",
      flags.length > 0,
      "at least one flag",
      JSON.stringify(flags)
    );
  }

  console.log(`\n${passCount} passed, ${failCount} failed`);
  if (failCount > 0) {
    process.exit(1);
  }
}
