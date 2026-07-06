// Pipeline step 1: takes the raw dictated transcript and produces a cleaned
// transcript by removing STT echo artifacts, consecutive duplicate words,
// duplicate phrases, and speech filler, then normalizing whitespace and
// sentence capitalization. Consumed by pipeline/index.js as the first stage
// before entity extraction (step2_extract.js).
import { stripFillerWords } from "../data/ontology/filler_words.js";

const WORD_TOKEN_RE = /\S+/g;

function normalizeWord(word) {
  return word.toLowerCase().replace(/[.,!?;:]+$/, "");
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

  let tokens = raw.match(WORD_TOKEN_RE) || [];

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
