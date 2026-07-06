// Pipeline orchestrator: runs the full voice-to-structured-report pipeline in
// order — clean -> extract -> generate -> validate -> suggest — and returns a
// single combined result for the UI to render and act on. This is the only
// module the rest of the app (e.g. src/components/DictationWorkspace.jsx,
// once created) should import to run the pipeline; individual step modules
// are implementation details.
import { cleanTranscript } from "./step1_clean.js";
import { extractEntities } from "./step2_extract.js";
import { validateReport } from "./step3_validate.js";
import { generateReport } from "./step4_generate.js";
import { generateSuggestions } from "./step5_suggest.js";

// runPipeline(rawTranscript, studyContext) -> PipelineResult
// PipelineResult shape (for reference): { cleanedText: string, entities:
// Entity[], structuredReport: StructuredReport, validationFindings:
// ValidationFinding[], suggestions: Suggestion[] }
// Runs each pipeline step in sequence, threading each step's output into the
// next, and returns the aggregated result.
export function runPipeline(rawTranscript, studyContext) {
  // TODO: implement
}
