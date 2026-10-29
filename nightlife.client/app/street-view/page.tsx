"use client";
import { useEffect, useRef, useState } from "react";
import "./street.css";
import { getApprovedStories } from "./actions";
import { type StoryData } from "./scene";
export default function StreetView() {
  const host = useRef<HTMLDivElement>(null);
  const [error, setError] = useState("");
    const [ready, setReady] = useState(false);

    useEffect(() => {
        let cancelled = false;
        let cleanup: (() => void) | undefined;

        getApprovedStories().then((rawData) => {
            if (cancelled) return;

            const storiesData = rawData as StoryData[];

            import("./scene")
                .then(({ mountStreet }) => {
                    if (cancelled || !host.current) return;

                    cleanup = mountStreet(host.current, storiesData);
                    setReady(true);
                })
                .catch(() => {
                    if (!cancelled)
                        setError(
                            "The 3D scene could not start. Try a browser with WebGL enabled.",
                        );
                });
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
      <div id="intro-screen" className="sv-start">
        <p>Headphones recommended for the best experience.</p>
        <p>Walk around and explore the stories of the night.</p>
        {error && <p role="alert">{error}</p>}
      </div>
      <p className="sv-hint">
        <span id="area-name">Station</span>
        <span className="sv-desktop-hint">
          {" · "}Arrow keys or W A S D to walk and turn
        </span>
        <span className="sv-mobile-hint">
          {" · "}Swipe to look · Touch the lower screen to move
        </span>
      </p>
      <p id="audio-status" className="sv-status" role="status" />
      <div id="choice-box" className="sv-choice hidden">
        <p id="choice-text" />
        <button id="listen-btn">Stop and listen</button>
        <button id="pass-btn">Keep walking</button>
      </div>
      <div id="joystick" className="sv-joystick hidden" aria-hidden="true">
        <div className="sv-joystick-knob" />
      </div>
    </main>
  );
}
