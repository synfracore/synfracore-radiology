// Pipeline step 1: takes the raw dictated transcript and produces a cleaned
// transcript by removing STT echo artifacts, consecutive duplicate words,
// duplicate phrases, and speech filler, then normalizing whitespace and
// sentence capitalization. Consumed by pipeline/index.js as the first stage
// before entity extraction (step2_extract.js).
//
// Pipeline order:
// 1. detectEchoRepeat (handles mic feedback / rapid STT repetition)
// 2. mergeChunks (called at recognition result time, before accumulation)
// 3. removeConsecutiveDuplicates
// 4. removeDuplicatePhrases
// 5. removeFiller
// 6. normalizeSpacing
import { stripFillerWords } from "../data/ontology/filler_words.js";

const WORD_TOKEN_RE = /\S+/g;
const CHUNK_BOUNDARY_WINDOW = 8;
const CHUNK_OVERLAP_SIMILARITY_THRESHOLD = 0.8;

function normalizeWord(word) {
  return word.toLowerCase().replace(/[.,!?;:]+$/, "");
}

// levenshtein(a, b) -> number of single-character edits needed to turn a
// into b. Used to fuzzy-match words across a chunk boundary that STT may
// have transcribed slightly differently between the interim and final
// results (e.g. "echotexture" vs "echo texture").
function levenshtein(a, b) {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }
  return dp[m][n];
}

// wordSimilarity(a, b) -> 0..1, 1 = identical after normalization. Allows
// roughly a 1-character difference to still register as a near-match.
function wordSimilarity(a, b) {
  const wa = normalizeWord(a);
  const wb = normalizeWord(b);
  if (wa === wb) return 1;
  const maxLen = Math.max(wa.length, wb.length);
  if (maxLen === 0) return 1;
  return 1 - levenshtein(wa, wb) / maxLen;
}

// detectEchoRepeat(text) -> string
// Web Speech API sometimes emits the same word several times in a row when
// the mic picks up speaker feedback. Collapses any run of 2+ identical
// (case/punctuation-insensitive) words down to a single occurrence.
// e.g. "x-ray x-ray x-ray x-ray x-ray" -> "x-ray"
export function detectEchoRepeat(text) {
  if (!text) return text;

  const tokens = text.match(WORD_TOKEN_RE) || [];
  const result = [];
  let i = 0;
  while (i < tokens.length) {
    const current = tokens[i];
    const norm = normalizeWord(current);
    let runEnd = i + 1;
    while (
      runEnd < tokens.length &&
      norm !== "" &&
      normalizeWord(tokens[runEnd]) === norm
    ) {
      runEnd++;
    }
    result.push(current);
    i = runEnd;
  }
  return result.join(" ");
}

// mergeChunks(existingTranscript, newChunk, changes?) -> string
// Called instead of naive string concatenation when a new speech
// recognition result arrives. Web Speech API chunk boundaries can overlap —
// the tail of the previous chunk and the head of the new one both contain
// the same words (e.g. "...normal in" + "normal in size..."). This finds
// the longest fuzzy-matching overlap between the last 8 words of the
// existing transcript and the first 8 words of the new chunk, and drops the
// duplicated words from the new chunk before appending.
//
// `changes`, if provided, receives a
// { type: "chunk_boundary_dedup", removed: string } entry when an overlap
// is stripped.
export function mergeChunks(existingTranscript, newChunk, changes = []) {
  const existing = existingTranscript == null ? "" : String(existingTranscript);
  const incoming = newChunk == null ? "" : String(newChunk);

  if (!existing.trim()) return incoming;
  if (!incoming.trim()) return existing;

  const tailWords = (existing.match(WORD_TOKEN_RE) || []).slice(
    -CHUNK_BOUNDARY_WINDOW
  );
  const incomingTokens = incoming.match(WORD_TOKEN_RE) || [];
  const headWords = incomingTokens.slice(0, CHUNK_BOUNDARY_WINDOW);

  const maxOverlap = Math.min(tailWords.length, headWords.length);
  let overlapLen = 0;

  for (let len = maxOverlap; len >= 1; len--) {
    const tailSlice = tailWords.slice(tailWords.length - len);
    const headSlice = headWords.slice(0, len);
    const avgSimilarity =
      tailSlice.reduce((sum, w, idx) => sum + wordSimilarity(w, headSlice[idx]), 0) /
      len;
    if (avgSimilarity > CHUNK_OVERLAP_SIMILARITY_THRESHOLD) {
      overlapLen = len;
      break;
    }
  }

  if (overlapLen === 0) {
    return `${existing} ${incoming}`;
  }

  const removed = incomingTokens.slice(0, overlapLen).join(" ");
  const remainder = incomingTokens.slice(overlapLen).join(" ");
  changes.push({ type: "chunk_boundary_dedup", removed });

  return remainder ? `${existing} ${remainder}` : existing;
}

// collapseRepeatedWords(tokens, changes) -> string[]
// Collapses consecutive runs of the same word into a single occurrence.
// Runs of 3+ are logged as "echo" (rapid STT repetition); runs of exactly 2
// are logged as a plain consecutive duplicate.
function collapseRepeatedWords(tokens, changes) {
  const result = [];
  let i = 0;
  while (i < tokens.length) {
    const current = tokens[i];
    const norm = normalizeWord(current);
    let runEnd = i + 1;
    while (
      runEnd < tokens.length &&
      norm !== "" &&
      normalizeWord(tokens[runEnd]) === norm
    ) {
      runEnd++;
    }
    const runLength = runEnd - i;
    if (runLength >= 3) {
      changes.push(`echo removed: "${current}" repeated ${runLength}x -> 1x`);
    } else if (runLength === 2) {
      changes.push(`duplicate word removed: "${current}"`);
    }
    result.push(current);
    i = runEnd;
  }
  return result;
}

// removeDuplicatePhrases(tokens, changes) -> string[]
// Removes a repeated 2-5 word phrase when the duplicate starts within 4
// words after the first occurrence (e.g. "there is there is" -> "there is").
// Checks longest phrases first so a 5-word repeat isn't mistaken for two
// separate 2-word repeats.
function removeDuplicatePhrases(tokens, changes) {
  const out = tokens.slice();
  const MAX_LEN = 5;
  const MIN_LEN = 2;
  const MAX_GAP = 4;
  let mutated = true;

  while (mutated) {
    mutated = false;
    for (let len = MAX_LEN; len >= MIN_LEN && !mutated; len--) {
      for (let i = 0; i + len <= out.length && !mutated; i++) {
        const phrase = out.slice(i, i + len).map(normalizeWord);
        if (phrase.some((w) => w === "")) continue;

        for (let gap = 0; gap <= MAX_GAP; gap++) {
          const start2 = i + len + gap;
          if (start2 + len > out.length) break;
          const candidate = out.slice(start2, start2 + len).map(normalizeWord);
          const isMatch = candidate.every((w, idx) => w === phrase[idx]);
          if (isMatch) {
            changes.push(
              `duplicate phrase removed: "${out.slice(i, i + len).join(" ")}"`
            );
            out.splice(start2, len);
            mutated = true;
            break;
          }
        }
      }
    }
  }

  return out;
}

function normalizeWhitespaceAndCapitalize(text) {
  let result = text.replace(/\s+/g, " ").trim();
  if (!result) return result;

  // Capitalize the first letter after sentence-ending punctuation, and the
  // very first letter of the text.
  result = result.replace(/([.!?]\s+)([a-z])/g, (_, sep, letter) => sep + letter.toUpperCase());
  result = result.charAt(0).toUpperCase() + result.slice(1);
  return result;
}

// cleanTranscript(rawText) -> { cleaned: string, raw: string, changes: string[] }
// Runs, in order: (a) echo removal, (b) consecutive duplicate word removal,
// (c) duplicate phrase removal, (d) filler word removal, (e) whitespace
// normalization + sentence capitalization. `changes` logs each modification
// made for audit/undo purposes.
export function cleanTranscript(rawText) {
  const raw = rawText == null ? "" : String(rawText);
  const changes = [];

  if (!raw.trim()) {
    return { cleaned: "", raw, changes };
  }

  // (0) echo removal (rapid STT repetition from mic feedback), ahead of
  // every other step per the pipeline order above
  const beforeEcho = raw;
  const echoStripped = detectEchoRepeat(raw);
  if (echoStripped !== beforeEcho) {
    changes.push("echo repeat removed");
  }

  let tokens = echoStripped.match(WORD_TOKEN_RE) || [];

  // (a) + (b) echo and consecutive duplicate word removal
  tokens = collapseRepeatedWords(tokens, changes);

  // (c) duplicate phrase removal
  tokens = removeDuplicatePhrases(tokens, changes);

  let text = tokens.join(" ");

  // (d) filler word removal
  const beforeFiller = text;
  text = stripFillerWords(text);
  if (text !== beforeFiller) {
    changes.push("filler words removed");
  }

  // (e) whitespace normalization + capitalization
  text = normalizeWhitespaceAndCapitalize(text);

  return { cleaned: text, raw, changes };
}
