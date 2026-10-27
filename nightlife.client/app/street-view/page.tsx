"use client";
import { useEffect, useRef, useState } from "react";
import "./street.css";
export default function StreetView() {
  const host = useRef<HTMLDivElement>(null);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let cancelled = false;
    let cleanup: (() => void) | undefined;
    import("./scene")
      .then(({ mountStreet }) => {
        if (cancelled || !host.current) return;
        cleanup = mountStreet(host.current);
        setReady(true);
      })
      .catch(() => {
        if (!cancelled)
          setError(
            "The 3D scene could not start. Try a browser with WebGL enabled.",
          );
      });
    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, []);
  return (
    <main
      ref={host}
      className="sv-street"
      aria-label="Interactive street experience"
    >
      <div id="start-screen" className="sv-start">
        <h1>Night Light</h1>
        <p>Headphones recommended. The only sounds are the stories.</p>
        <p>
          Walk along a straight street through changing surroundings.
          One of the two original story points has audio.
        </p>
        {error ? (
          <p role="alert">{error}</p>
        ) : (
          <button id="start-btn" disabled={!ready}>
            {ready ? "Step into the street" : "Loading street…"}
          </button>
        )}
      </div>
      <p className="sv-hint"><span id="area-name">Station</span>{" · "}Arrow keys or W A S D to walk and turn</p>
      <p id="audio-status" className="sv-status" role="status" />
      <div id="choice-box" className="sv-choice hidden">
        <p id="choice-text" />
        <button id="listen-btn">Stop and listen</button>
        <button id="pass-btn">Keep walking</button>
      </div>
      <div className="sv-controls" aria-label="Walking controls">
        <button id="btn-left" aria-label="Turn left">
          ↶
        </button>
        <button id="btn-forward" aria-label="Walk forward">
          ↑
        </button>
        <button id="btn-back" aria-label="Walk backwards">
          ↓
        </button>
        <button id="btn-right" aria-label="Turn right">
          ↷
        </button>
      </div>
    </main>
  );
}
