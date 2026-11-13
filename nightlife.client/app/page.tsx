"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import "./home.css";

export default function Home() {
  const router = useRouter();
  const street = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [entering, setEntering] = useState(false);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let dispose: (() => void) | undefined;
    import("./street-view/scene").then(({ mountStreet }) => {
      if (!cancelled && street.current) dispose = mountStreet(street.current, [], { preview: true });
    }).catch(() => { if (!cancelled) setUnavailable(true); });
    return () => {
      cancelled = true;
      dispose?.();
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  function enterStreet(event: React.MouseEvent<HTMLAnchorElement>) {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    event.preventDefault();
    if (entering) return;
    setEntering(true);
    timer.current = setTimeout(() => router.push("/street-view"), 1100);
  }

  return (
    <main className={`home-page${entering ? " is-entering" : ""}`}>
      <div ref={street} className="home-street" aria-hidden="true" />
      <div className="home-mist" aria-hidden="true" />
      <div className="home-cloud" aria-hidden="true" />
      <section className="home-content" aria-labelledby="home-title">
        <p className="home-eyebrow">Every night has a brighter side</p>
        <h1 id="home-title">Night Light</h1>
        <p className="home-description">A kind stranger. A shared laugh. A moment that stayed with you.
          Explore the street and discover real stories of connection after dark.</p>
        <Link href="/street-view" className="home-cta" onClick={enterStreet}>
          Explore the street <span aria-hidden="true">↗</span>
        </Link>
        <p className="home-note">Take your time. Choose a story when you’re ready to listen.</p>
        {unavailable && <p role="status" className="home-note">The street preview couldn’t load. You can still try entering the experience.</p>}
      </section>
    </main>
  );
}
