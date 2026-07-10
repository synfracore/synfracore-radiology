// End-to-end tests for the rule-based dictation pipeline. Plain Node ESM
// script (no test framework/new dependency) — prints PASS/FAIL per case with
// expected vs actual, and exits non-zero if anything fails so it can gate
// deployment. Run with: node src/tests/pipeline.test.js
import { cleanTranscript, mergeChunks, detectEchoRepeat } from "../pipeline/step1_clean.js";
import { extractEntities } from "../pipeline/step2_extract.js";
import { validateReport } from "../pipeline/step3_validate.js";
import { generateReport } from "../pipeline/step4_generate.js";
import { learnFromReport, extractPhrasePatterns } from "../pipeline/patternLearner.js";
import { checkContext } from "../rules/context.js";
import { checkContradictions } from "../rules/contradiction.js";
import { runAllRules } from "../rules/index.js";

let passCount = 0;
let failCount = 0;

function report(name, pass, expected, actual) {
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

// assertContains(name, haystack, needle) — case-insensitive substring
// check for strings, or case-insensitive "any element contains" for arrays.
function assertContains(name, haystack, needle) {
  const needleLower = String(needle).toLowerCase();
  const pass =
    typeof haystack === "string"
      ? haystack.toLowerCase().includes(needleLower)
      : Array.isArray(haystack) &&
        haystack.some((item) => String(item).toLowerCase().includes(needleLower));
  report(name, pass, `contains "${needle}"`, JSON.stringify(haystack));
}

// assertEqualCI(name, actual, expected) — case-insensitive equality (cleaned
// text is intentionally capitalized by step1_clean.js's sentence-casing
// rule, so we compare content, not casing).
function assertEqualCI(name, actual, expected) {
  const pass = String(actual).toLowerCase() === String(expected).toLowerCase();
  report(name, pass, expected, actual);
}

function assertEqual(name, actual, expected) {
  report(name, actual === expected, expected, actual);
}

function assertSome(name, items, predicate, expectedDescription) {
  const pass = Array.isArray(items) && items.some(predicate);
  report(name, pass, expectedDescription, JSON.stringify(items));
}

console.log("=== TEST SUITE A — Duplicate cleanup ===");
{
  const { cleaned } = cleanTranscript("x-ray x-ray x-ray clerical x-ray clerical injury");
  assertContains("A1: echoes + duplicate phrase removed", cleaned, "x-ray clerical injury");
}
{
  const { cleaned } = cleanTranscript("there is there is mild pleural effusion");
  assertEqualCI("A2: duplicate phrase removed", cleaned, "there is mild pleural effusion");
}
{
  const { cleaned } = cleanTranscript("right right kidney calculus calculus lower pole");
  assertEqualCI("A3: duplicate words removed", cleaned, "right kidney calculus lower pole");
}

console.log("\n=== TEST SUITE A2 — Chunk-boundary merge / echo repeat ===");
{
  const merged = mergeChunks("the liver appears normal in", "normal in size and echotexture");
  assertEqualCI("A2-1: mergeChunks overlap dropped", merged, "the liver appears normal in size and echotexture");
}
{
  const merged = mergeChunks("no acute intracranial hemorrhage", "intracranial hemorrhage identified");
  assertEqualCI("A2-2: mergeChunks overlap dropped", merged, "no acute intracranial hemorrhage identified");
}
{
  const result = detectEchoRepeat("x-ray x-ray x-ray x-ray x-ray clerical injury");
  assertEqualCI("A2-3: detectEchoRepeat collapses 5x repeat", result, "x-ray clerical injury");
}
{
  const result = detectEchoRepeat("right right kidney calculus");
  assertEqualCI("A2-4: detectEchoRepeat collapses 2x repeat", result, "right kidney calculus");
}
{
  const merged = mergeChunks("findings are unremarkable", "the spleen is normal");
  assertEqualCI("A2-5: mergeChunks no overlap appends normally", merged, "findings are unremarkable the spleen is normal");
}

console.log("\n=== TEST SUITE A3 — Bilateral organ laterality (validateReport) ===");
{
  // Test 1: bilateral organ, no shared focal lesion -> should NOT flag.
  const findings = "The left kidney appears normal in size. The right kidney shows mild hydronephrosis.";
  const { errors } = validateReport(findings, "", null, "USG", "Abdomen");
  const hasLateralityMismatch = errors.some((e) => /laterality mismatch/i.test(e));
  report("A3-1: bilateral kidney pair not flagged", !hasLateralityMismatch, "no laterality mismatch error", JSON.stringify(errors));
}
{
  // Test 2: focal lesion (calculus) side changes between Findings and
  // Impression -> SHOULD flag, even though kidney is a bilateral organ.
  const findings = "Right renal calculus noted in the lower pole. Left renal calculus is the likely cause of pain.";
  const impression = "Left renal calculus.";
  const { errors } = validateReport(findings, impression, null, "USG", "Abdomen");
  assertSome(
    "A3-2: right-vs-left renal calculus mismatch flagged",
    errors,
    (e) => /laterality mismatch/i.test(e) && /right kidney/i.test(e) && /left kidney/i.test(e),
    "a laterality mismatch error mentioning right kidney (Findings) vs left kidney (Impression)"
  );
}
{
  // Test 3: "bilateral" is itself a valid, non-contradictory laterality.
  const findings = "Bilateral pleural effusion noted, right greater than left.";
  const { errors } = validateReport(findings, "", null, "CT", "Chest");
  const hasLateralityMismatch = errors.some((e) => /laterality mismatch/i.test(e));
  report("A3-3: bilateral pleural effusion not flagged", !hasLateralityMismatch, "no laterality mismatch error", JSON.stringify(errors));
}
{
  // Test 4: no side mentioned at all for a laterality-required organ ->
  // SHOULD warn.
  const findings = "Renal calculus noted in the lower pole. Additional supporting clinical detail follows for context.";
  const { warnings } = validateReport(findings, "Renal calculus.", null, "USG", "Abdomen");
  assertSome(
    "A3-4: missing laterality warns for renal calculus",
    warnings,
    (w) => /laterality missing/i.test(w) && /kidney/i.test(w),
    'a warning like "Laterality missing — specify left or right kidney"'
  );
}

console.log("\n=== TEST SUITE B — Entity extraction ===");
{
  const entities = extractEntities(
    "Small non obstructing calculus lower pole right kidney",
    "CT",
    "Abdomen"
  );
  assertEqual("B1: organ = kidney", entities.organ, "kidney");
  assertEqual("B1: side = right", entities.side, "right");
  assertEqual("B1: obstruction = non-obstructing", entities.obstruction, "non-obstructing");
  assertContains("B1: location contains 'lower pole'", entities.location, "lower pole");
  assertEqual("B1: size = small", entities.size, "small");
}
{
  const entities = extractEntities("No intracranial hemorrhage no midline shift", "CT", "Brain");
  assertContains("B2: negatedFindings includes hemorrhage", entities.negatedFindings, "hemorrhage");
  assertEqual("B2: isNormal = true", entities.isNormal, true);
}

console.log("\n=== TEST SUITE C — Validation rules ===");
{
  const findings = "Right renal calculus.";
  const impression = "Left renal calculus.";
  const entities = extractEntities(findings, "CT", "Abdomen");
  const results = runAllRules(findings, impression, entities, "CT", "Abdomen");
  assertSome(
    "C1: flags contains laterality mismatch message",
    results.flags,
    (f) => /right kidney/i.test(f) && /left|mismatch|does not confirm/i.test(f),
    "a flag describing a right-vs-left kidney mismatch"
  );
}
{
  const text = "The gall bladder appears normal.";
  const flags = checkContext(text, "CT", "Brain");
  assertSome(
    "C2: context flags contains gall bladder warning",
    flags,
    (f) => /gall bladder/i.test(f),
    'a flag mentioning "gall bladder"'
  );
}
{
  const text = "No pleural effusion. Moderate pleural effusion.";
  const warnings = checkContradictions(text);
  assertSome(
    "C3: warnings contains contradiction message",
    warnings,
    (w) => /pleural effusion/i.test(w),
    "a contradiction warning mentioning pleural effusion"
  );
}

console.log("\n=== TEST SUITE D — Report generation ===");
{
  const cleanedTranscript = "Small non obstructing calculus lower pole right kidney";
  const entities = extractEntities(cleanedTranscript, "CT", "Abdomen");
  const reportText = generateReport({
    modality: "CT",
    bodyPart: "Abdomen",
    contrast: "Plain",
    clinicalHistory: "Right flank pain",
    cleanedTranscript,
    entities,
    patient: { id: "P1", name: "Test Patient", age: 40, gender: "Male" },
  });

  assertContains("D1: contains 'TECHNIQUE:' heading", reportText, "TECHNIQUE:");
  assertContains("D2: contains 'FINDINGS:' heading", reportText, "FINDINGS:");
  assertContains("D3: contains 'IMPRESSION:' heading", reportText, "IMPRESSION:");
  assertContains("D4: 'calculus' present in report", reportText, "calculus");
  assertContains("D5: 'right' laterality preserved", reportText, "right");
}

console.log("\n=== TEST SUITE E — Pattern learner ===");
{
  const cleanedTranscript = "Small non obstructing calculus lower pole right kidney";
  const entities = extractEntities(cleanedTranscript, "CT", "Abdomen");
  const reportText = generateReport({
    modality: "CT",
    bodyPart: "Abdomen",
    contrast: "Plain",
    clinicalHistory: "Right flank pain",
    cleanedTranscript,
    entities,
    patient: { id: "P1", name: "Test Patient", age: 40, gender: "Male" },
  });

  const { modality, bodyPart, sections } = learnFromReport(reportText, "CT", "Abdomen");
  assertEqual("E1: modality passed through", modality, "CT");
  assertEqual("E2: bodyPart passed through", bodyPart, "Abdomen");
  assertSome(
    "E3: findings section extracted and normalized",
    sections.findings,
    (s) => /calculus/i.test(s) && s === s.toLowerCase(),
    "a lowercase findings sentence mentioning calculus"
  );
  assertSome(
    "E4: impression section extracted",
    sections.impression,
    (s) => /calculus/i.test(s),
    "an impression sentence mentioning calculus"
  );
}
{
  const patterns = extractPhrasePatterns([
    "no acute intracranial abnormality",
    "No Acute Intracranial Abnormality",
    "  no   acute intracranial abnormality  ",
    "mild pleural effusion",
  ]);
  assertEqual("E5: repeated sentence counted despite case/whitespace differences", patterns[0].count, 3);
  assertEqual("E6: top phrase text normalized", patterns[0].phrase, "no acute intracranial abnormality");
}

console.log(`\n${passCount} passed, ${failCount} failed`);
if (failCount > 0) {
  process.exit(1);
}
