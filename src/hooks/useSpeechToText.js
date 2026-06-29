import { useRef, useState, useCallback } from "react";

// Wraps the browser's native SpeechRecognition (Web Speech API).
// Free, no API key, supports many languages out of the box.
// Works in Chrome/Edge. Not supported in Firefox/Safari yet (we show a warning if missing).
export function useSpeechToText(initialLang = "en-IN") {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interim, setInterim] = useState("");
  const [error, setError] = useState(null);
  const [lang, setLang] = useState(initialLang);
  const recognitionRef = useRef(null);

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
      if (finalChunk) setTranscript((prev) => (prev + " " + finalChunk).trim());
      setInterim(interimChunk);
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
