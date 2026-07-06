import { useRef, useState, useCallback } from "react";

// Wraps the browser's native SpeechRecognition (Web Speech API).
// Free, no API key, supports many languages out of the box.
// Works in Chrome/Edge. Not supported in Firefox/Safari yet (we show a warning if missing).
//
// Pass `onResult({ finalChunk, interimChunk })` to intercept every
// recognition result yourself (e.g. to check for a voice command before
// deciding whether to commit it to the transcript). When provided, this hook
// no longer auto-appends finalChunk to its own `transcript` state — the
// caller decides, using the returned `setTranscript`. Omit it to keep the
// previous auto-accumulating behavior.
export function useSpeechToText(initialLang = "en-IN", { onResult } = {}) {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interim, setInterim] = useState("");
  const [error, setError] = useState(null);
  const [lang, setLang] = useState(initialLang);
  const recognitionRef = useRef(null);
  const onResultRef = useRef(onResult);
  onResultRef.current = onResult;

  const isSupported =
    typeof window !== "undefined" &&
    (window.SpeechRecognition || window.webkitSpeechRecognition);

  const start = useCallback(() => {
    if (!isSupported) {
      setError("Speech recognition isn't supported in this browser. Try Chrome or Edge.");
      return;
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = lang;
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event) => {
      let finalChunk = "";
      let interimChunk = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const text = event.results[i][0].transcript;
        if (event.results[i].isFinal) finalChunk += text + " ";
        else interimChunk += text;
      }
      setInterim(interimChunk);

      const handler = onResultRef.current;
      if (handler) {
        handler({ finalChunk: finalChunk.trim(), interimChunk });
      } else if (finalChunk) {
        setTranscript((prev) => (prev + " " + finalChunk).trim());
      }
    };

    recognition.onerror = (event) => {
      setError(event.error);
      setListening(false);
    };

    recognition.onend = () => {
      setListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
    setError(null);
  }, [lang, isSupported]);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
    setListening(false);
  }, []);

  const clear = useCallback(() => {
    setTranscript("");
    setInterim("");
  }, []);

  return {
    listening,
    transcript,
    interim,
    error,
    lang,
    setLang,
    isSupported: !!isSupported,
    start,
    stop,
    clear,
    setTranscript,
  };
}
