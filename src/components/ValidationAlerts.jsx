// Renders hard-error / soft-warning / info-flag banners from
// pipeline/step3_validate.js (or rules/index.js's runAllRules), grouped by
// severity. Each banner can be individually dismissed without affecting the
// underlying validation state (dismissal is purely a view concern here).
import { useState } from "react";

// ValidationAlerts({ errors, warnings, flags }) -> JSX.Element
// Props:
//   errors: string[]   — rendered as red 🚫 banners
//   warnings: string[] — rendered as yellow ⚠️ banners
//   flags: string[]    — rendered as blue ℹ️ banners
export default function ValidationAlerts({ errors = [], warnings = [], flags = [] }) {
  const [dismissed, setDismissed] = useState(() => new Set());

  const dismiss = (key) => {
    setDismissed((prev) => {
      const next = new Set(prev);
      next.add(key);
      return next;
    });
  };

  const visibleErrors = errors.filter((_, i) => !dismissed.has(`error-${i}`));
  const visibleWarnings = warnings.filter((_, i) => !dismissed.has(`warning-${i}`));
  const visibleFlags = flags.filter((_, i) => !dismissed.has(`flag-${i}`));

  if (visibleErrors.length === 0 && visibleWarnings.length === 0 && visibleFlags.length === 0) {
    return null;
  }

  return (
    <div className="validation-alerts">
      {visibleErrors.length > 0 && (
        <div className="validation-summary">
          {visibleErrors.length} issue{visibleErrors.length === 1 ? "" : "s"} need attention before approving
        </div>
      )}

      {errors.map((msg, i) => {
        const key = `error-${i}`;
        if (dismissed.has(key)) return null;
        return (
          <div className="validation-banner error" key={key}>
            <span className="icon">🚫</span>
            <span className="msg">{msg}</span>
            <button type="button" className="dismiss" aria-label="Dismiss" onClick={() => dismiss(key)}>
              ×
            </button>
          </div>
        );
      })}

      {warnings.map((msg, i) => {
        const key = `warning-${i}`;
        if (dismissed.has(key)) return null;
        return (
          <div className="validation-banner warning" key={key}>
            <span className="icon">⚠️</span>
            <span className="msg">{msg}</span>
            <button type="button" className="dismiss" aria-label="Dismiss" onClick={() => dismiss(key)}>
              ×
            </button>
          </div>
        );
      })}

      {flags.map((msg, i) => {
        const key = `flag-${i}`;
        if (dismissed.has(key)) return null;
        return (
          <div className="validation-banner flag" key={key}>
            <span className="icon">ℹ️</span>
            <span className="msg">{msg}</span>
            <button type="button" className="dismiss" aria-label="Dismiss" onClick={() => dismiss(key)}>
              ×
            </button>
          </div>
        );
      })}
    </div>
  );
}
