"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import "./map.css";
import { places, matches, type Place } from "../../lib/places";

export default function Page() {
    const host = useRef<HTMLDivElement>(null),
        map = useRef<maplibregl.Map | null>(null),
        markers = useRef<Record<string, maplibregl.Marker>>({}),
        coords = useRef<Record<string, [number, number]>>({});
    const [query, setQuery] = useState(""),
        [category, setCategory] = useState("All"),
        [selected, setSelected] = useState<Place | null>(null),
        [reading, setReading] = useState(false),
        [notice, setNotice] = useState("Loading the map…");
    const visible = useMemo(
        () => places.filter((p) => matches(p, query, category)),
        [query, category],
    );

    function select(p: Place) {
        setSelected(p);
        setReading(false);
        if (coords.current[p.id])
            map.current?.flyTo({
                center: coords.current[p.id],
                zoom: 14,
                essential: false,
            });
    }

    useEffect(() => {
        if (!host.current) return;
        let alive = true;
        const abort = new AbortController();
        let m: maplibregl.Map;

        try {
            m = new maplibregl.Map({
                container: host.current,
                style: "https://tiles.openfreemap.org/styles/dark",
                center: [5.479, 51.443],
                zoom: 12.5,
            });
            map.current = m;
        } catch {
            queueMicrotask(() => {
                setNotice(
                    "The interactive map is unavailable. You can still explore locations in the list.",
                );
            });
            return;
        }

        const resize = new ResizeObserver(() => m.resize());
        resize.observe(host.current);
        const slow = window.setTimeout(() => {
            if (alive && !m.loaded())
                setNotice(
                    "Map is taking longer to load. Check your connection and reload the page. Locations remain available in the list.",
                );
        }, 15000);

        m.addControl(
            new maplibregl.NavigationControl({ showCompass: false }),
            "bottom-right",
        );

        m.on("load", () => {
            window.clearTimeout(slow);
            if (alive) setNotice("Street overview markers • approximate locations");
        });

        m.on("error", () => {
            if (alive)
                setNotice(
                    "Some map data could not load. Check your connection; the location list still works.",
                );
        });

        (async () => {
            let missed = 0;
            for (const p of places) {
                try {
                    const r = await fetch(
                        `https://api.pdok.nl/bzk/locatieserver/search/v3_1/free?q=${encodeURIComponent(p.query)}&fq=type:weg&rows=1`,
                        { signal: abort.signal },
                    );
                    if (!r.ok) throw Error("Location lookup failed");
                    const data = await r.json();
                    const point = data.response?.docs?.[0]?.centroide_ll?.match(
                        /POINT\(([-\d.]+) ([-\d.]+)\)/,
                    );
                    if (!point) throw Error("No street found");
                    if (!alive) return;
                    const lnglat: [number, number] = [
                        Number(point[1]),
                        Number(point[2]),
                    ];
                    coords.current[p.id] = lnglat;
                    const b = document.createElement("button");
                    b.className = "marker";
                    b.textContent = p.id === "stratumseind" ? "○" : "1";
                    b.setAttribute("aria-label", `Explore ${p.name}`);
                    b.onclick = () => select(p);
                    markers.current[p.id] = new maplibregl.Marker({ element: b })
                        .setLngLat(lnglat)
                        .addTo(m);
                } catch {
                    missed++;
                }
            }
            if (alive && missed)
                setNotice(
                    "Some street locations could not be resolved. No guessed markers were added. Use the list to read their details.",
                );
        })();

        return () => {
            alive = false;
            window.clearTimeout(slow);
            resize.disconnect();
            abort.abort();
            m.remove();
            map.current = null;
            markers.current = {};
        };
    }, []);

    useEffect(() => {
        const timer = setInterval(() => {
            for (const p of places) {
                const el = markers.current[p.id]?.getElement();
                if (el) {
                    el.style.display = visible.some((v) => v.id === p.id) ? "" : "none";
                    el.classList.toggle("active", selected?.id === p.id);
                }
            }
        }, 200);
        return () => clearInterval(timer);
    }, [visible, selected]);

    return (
        <div className="pjm-map">
            <header className="h-[78px] border-b border-[#35434f] bg-[#17212b] px-8 flex items-center justify-between">
                {/* Brand */}
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full border border-[#35434f] flex items-center justify-center">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#7ee0d1]" />
                    </div>
                    <div>
                        <span className="text-sm font-bold tracking-widest text-[#e6edf3] uppercase block">
                            NIGHT / LIGHT
                        </span>
                        <small className="text-[9px] tracking-widest text-[#aab8c4] uppercase block">
                            EINDHOVEN
                        </small>
                    </div>
                </div>

                {/* Navigation Links */}
                <nav className="hidden md:flex items-center gap-8 text-xs font-medium text-[#c1cdd7]">
                    <a href="/" className="hover:text-[#e6edf3] transition-colors">
                        Home
                    </a>
                    <a href="/map" className="text-[#e6edf3] font-bold border-b-2 border-[#7ee0d1] pb-1">
                        Map
                    </a>
                    <a href="/ShareStory" className="hover:text-[#e6edf3] transition-colors">
                        Share your story
                    </a>
                </nav>

                {/* Emergency / Safety Button */}
                <a
                    href="#"
                    className="border border-[#35434f] hover:border-[#7ee0d1] bg-[#17212b] text-[#e6edf3] hover:text-[#7ee0d1] px-4 py-2 rounded-full text-xs transition flex items-center gap-2"
                >
                    <svg className="w-3.5 h-3.5 text-[#7ee0d1]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    <span>Get home safely</span>
                </a>
            </header>
            <main>
                <aside>
                    <p className="eyebrow">02 / 05 — EXPLORE EINDHOVEN</p>
                    <h1>
                        Stories live
                        <br />
                        in places.
                    </h1>
                    <p className="intro">
                        Explore locations and the experiences connected to them.
                    </p>
                    <label htmlFor="search">Find a street or story</label>
                    <input
                        id="search"
                        placeholder="Search Eindhoven locations…"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                    />
                    <label htmlFor="filter">Filter stories</label>
                    <select
                        id="filter"
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                    >
                        {["All", ...new Set(places.map((p) => p.category))].map((c) => (
                            <option key={c}>{c}</option>
                        ))}
                    </select>
                    <div className="results" aria-live="polite">
                        {visible.length} locations
                    </div>
                    <div className="list">
                        {visible.map((p) => (
                            <button
                                className={
                                    "location " + (selected?.id === p.id ? "chosen" : "")
                                }
                                key={p.id}
                                onClick={() => select(p)}
                            >
                                <span>{p.name}</span>
                                <small>{p.status}</small>
                            </button>
                        ))}
                        {!visible.length && (
                            <p>No locations match. Try a different search or filter.</p>
                        )}
                    </div>
                    <footer>
                        <strong>About these accounts</strong>
                        <p>
                            Two public-source summaries, not interviews conducted by our
                            group. Locations show streets or areas, not exact incident spots.
                        </p>
                        <p>Accounts mention harassment. Read only if you want to.</p>
                    </footer>
                </aside>
                <section className="canvas" aria-label="Map and selected location">
                    <div ref={host} className="map" />
                    <div className="map-note" role="status">
                        {notice}
                    </div>
                    {selected && (
                        <article className="detail">
                            <button
                                className="close"
                                aria-label="Close location information"
                                onClick={() => {
                                    setSelected(null);
                                    setReading(false);
                                }}
                            >
                                ×
                            </button>
                            <p className="eyebrow">SELECTED LOCATION</p>
                            <h2>{selected.name}</h2>
                            <p className="tag">{selected.status}</p>
                            <p>{selected.scope}</p>
                            {!reading ? (
                                <>
                                    <h3>{selected.title}</h3>
                                    <button className="primary" onClick={() => setReading(true)}>
                                        {selected.source
                                            ? "Read account summary"
                                            : "About this location"}{" "}
                                        ↗
                                    </button>
                                </>
                            ) : (
                                <>
                                    <h3>{selected.title}</h3>
                                    <p className="story">{selected.summary}</p>
                                    {selected.source && (
                                        <a href={selected.source} target="_blank" rel="noreferrer">
                                            Read the original source ↗
                                        </a>
                                    )}
                                    <button className="back" onClick={() => setReading(false)}>
                                        ← Back to location
                                    </button>
                                </>
                            )}
                            <p className="later">
                                Street-level experience: planned with Maria. This starter
                                currently supports the 2D map.
                            </p>
                        </article>
                    )}
                </section>
            </main>
        </div>
    );
}