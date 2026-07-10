// Renders a horizontal row of clickable suggestion pills, sourced from
// pipeline/step5_suggest.js's getSuggestions() (ontology-based) and
// optionally pipeline/typingAssistant.js's suggestCompletion() (learned
// from the D1 phrase corpus of previously-approved reports). Renders
// nothing when there are no suggestions at all, so it never reserves empty
// layout space.

// SuggestionChips({ suggestions, learnedSuggestion, onSelect }) -> JSX.Element | null
// Props:
//   suggestions: string[] — ontology-based suggestion terms to render as pills
//   learnedSuggestion: string|null — a corpus-learned full-phrase completion
//     (from suggestCompletion()); if present, rendered as the FIRST chip
//     with a distinct "Learned" style so it reads apart from the
//     organ-based ontology suggestions
//   onSelect: (suggestion: string) => void — called with the clicked term
export default function SuggestionChips({ suggestions = [], learnedSuggestion = null, onSelect }) {
  const hasLearned = Boolean(learnedSuggestion);
  if (!hasLearned && (!suggestions || suggestions.length === 0)) return null;

  return (
    <div className="suggestion-chips">
      {hasLearned && (
        <button
          type="button"
          className="suggestion-chip suggestion-chip-learned"
          onClick={() => onSelect && onSelect(learnedSuggestion)}
        >
          <span className="suggestion-chip-label">Learned ✓</span>
          {learnedSuggestion}
        </button>
      )}
      {suggestions.map((suggestion, i) => (
        <button
          key={`${suggestion}-${i}`}
          type="button"
          className="suggestion-chip"
          onClick={() => onSelect && onSelect(suggestion)}
        >
          {suggestion}
        </button>
      ))}
    </div>
  );
}
