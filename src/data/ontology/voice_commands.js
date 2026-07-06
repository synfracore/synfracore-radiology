// Recognized voice command phrases (e.g. "new paragraph", "impression colon",
// "period", "delete last sentence") and the structural editing action each one
// maps to. Consumed by pipeline/step1_clean.js (or an upstream command
// interceptor) to convert spoken commands into structural actions instead of
// leaving them as literal transcript text.

// VOICE_COMMANDS: { patterns: string[], action: string, description: string }[]
// Each entry's patterns are lowercase phrase variants that all map to the
// same action; matching should normalize the spoken phrase before comparing.
export const VOICE_COMMANDS = [
  {
    patterns: ["next paragraph", "next para", "new paragraph", "new para"],
    action: "INSERT_PARAGRAPH_BREAK",
    description: "Start a new paragraph within the current section.",
  },
  {
    patterns: [
      "delete last sentence",
      "remove last sentence",
      "undo last sentence",
      "scratch that",
    ],
    action: "DELETE_PREVIOUS_SENTENCE",
    description: "Remove the most recently dictated sentence.",
  },
  {
    patterns: [
      "move to impression",
      "go to impression",
      "switch to impression",
      "impression colon",
      "impression section",
    ],
    action: "FOCUS_IMPRESSION",
    description: "Switch active dictation target to the Impression section.",
  },
  {
    patterns: [
      "finalize report",
      "finalize the report",
      "end report",
      "complete report",
    ],
    action: "FINALIZE_REPORT",
    description: "Stop dictation and move the report to review/approval.",
  },
  {
    patterns: [
      "insert template",
      "use template",
      "load template",
      "apply template",
    ],
    action: "INSERT_TEMPLATE",
    description: "Insert the default template for the current study type.",
  },
  {
    patterns: ["clear all", "clear everything", "reset report", "start over"],
    action: "CLEAR_ALL",
    description: "Clear all dictated content and start the report over.",
  },
  {
    patterns: [
      "repeat last finding",
      "repeat that",
      "repeat last",
      "say that again",
    ],
    action: "REPEAT_LAST_FINDING",
    description: "Re-read back the last dictated finding.",
  },
  {
    patterns: ["add normal finding", "mark as normal", "add normal"],
    action: "ADD_NORMAL_FINDING",
    description: "Insert the default normal/unremarkable phrasing for the current organ.",
  },
  {
    patterns: ["mark as urgent", "flag as urgent", "urgent finding", "critical finding"],
    action: "MARK_AS_URGENT",
    description: "Flag the report as containing an urgent/critical finding.",
  },
];

// matchVoiceCommand(phrase) -> { action: string, params: object } | null
// Tests the given phrase against known voice commands and returns the matched
// action + any extracted params, or null if the phrase is not a command.
export function matchVoiceCommand(phrase) {
  const normalized = String(phrase || "").trim().toLowerCase();
  if (!normalized) return null;

  for (const command of VOICE_COMMANDS) {
    if (command.patterns.includes(normalized)) {
      return { action: command.action, params: {} };
    }
  }
  return null;
}

// --- Self-test (manual reference, not executed automatically) ---
// matchVoiceCommand("new paragraph")
//   -> { action: "INSERT_PARAGRAPH_BREAK", params: {} }
// matchVoiceCommand("next para")
//   -> { action: "INSERT_PARAGRAPH_BREAK", params: {} }   (same action as above)
// matchVoiceCommand("the liver is normal")
//   -> null
