// Lets the radiologist expand a collapsed toggle to see the original raw
// transcript and what pipeline/step1_clean.js changed, for transparency/
// audit of what cleanup removed. Renders nothing when nothing was changed.
import { useState } from "react";

// RawTranscriptToggle({ raw, cleaned, changes }) -> JSX.Element | null
// Props:
//   raw: string       — the untouched transcript as originally captured
//   cleaned: string   — the cleaned transcript (already shown elsewhere;
//                        accepted here for API parity but not re-rendered)
//   changes: string[] — human-readable descriptions of what was removed/
//                        changed by step1_clean.js
export default function RawTranscriptToggle({ raw, changes = [] }) {
  const [expanded, setExpanded] = useState(false);

  if (!changes || changes.length === 0) return null;

  const label = expanded
    ? "▲ Hide original"
    : `▼ Cleaned ${changes.length} issue${changes.length === 1 ? "" : "s"} (click to see original)`;

  return (
    <div className="transcript-toggle">
      <button type="button" className="transcript-toggle-link" onClick={() => setExpanded((prev) => !prev)}>
        {label}
      </button>

      {expanded && (
        <div className="transcript-toggle-panel">
          <div className="transcript-raw-box">{raw}</div>
          <div className="transcript-changes">
            {changes.map((change, i) => (
              <span className="transcript-change-chip" key={i}>
                {change}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
