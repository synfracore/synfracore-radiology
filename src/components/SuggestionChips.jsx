// Renders a horizontal row of clickable suggestion pills, sourced from
// pipeline/step5_suggest.js's getSuggestions(). Renders nothing when there
// are no suggestions, so it never reserves empty layout space.

// SuggestionChips({ suggestions, onSelect }) -> JSX.Element | null
// Props:
//   suggestions: string[] — suggestion terms to render as pills
//   onSelect: (suggestion: string) => void — called with the clicked term
export default function SuggestionChips({ suggestions = [], onSelect }) {
  if (!suggestions || suggestions.length === 0) return null;

  return (
    <div className="suggestion-chips">
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
