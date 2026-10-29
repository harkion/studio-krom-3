"use client";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { logoMarkup } from "./night-light-markup";

type State = {
  my: number;
  sc: number;
  cres: number;
  glow: number;
  warm: number;
  draw: number;
  cap: number;
};
const rest: State = {
  my: 8,
  sc: 0.82,
  cres: 1,
  glow: 0.16,
  warm: 0,
  draw: 1,
  cap: 1,
};
const full = { ...rest, my: 0, sc: 1, cres: 0, glow: 1, warm: 1 };
const ease = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

export default function NightLightBrand() {
  const root = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const host = root.current;
    if (!host) return;
    const el = (suffix: string) =>
      host.querySelector<SVGElement>(`#night-light-nav${suffix}`)!;
    const name = host.querySelector<HTMLElement>(".name")!;
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const s: State = {
      my: -390,
      sc: 1,
      cres: 0,
      glow: 0,
      warm: 0,
      draw: 0,
      cap: 0,
    };
    const start = performance.now();
    let raf = 0,
      interactive = false,
      hovering = false,
      focused = false;
    let from = { ...s },
      target = { ...rest },
      transitionStart = start,
      duration = 0;
    const blend = (a: number, b: number, t: number) => a + (b - a) * t;
    const apply = (a: State, b: State, t: number) => {
      for (const key of Object.keys(s) as (keyof State)[])
        s[key] = blend(a[key], b[key], t);
    };
    const render = (now: number) => {
      if (media.matches) Object.assign(s, hovering || focused ? full : rest);
      else if (interactive)
        apply(
          from,
          target,
          ease(Math.min(1, (now - transitionStart) / duration)),
        );
      else {
        const t = now - start;
        s.draw = s.cap = ease(Math.min(1, t / 1600));
        s.my = blend(
          -390,
          0,
          -(Math.cos(Math.PI * Math.min(1, Math.max(0, t - 1850) / 4500)) - 1) /
            2,
        );
        s.glow = 0.12 * Math.min(1, Math.max(0, t - 1850) / 4500);
        if (t >= 6700)
          apply(
            { ...rest, my: 0, sc: 1, cres: 0, glow: 0.12 },
            rest,
            ease(Math.min(1, (t - 6700) / 2800)),
          );
      }
      el("glass").setAttribute("stroke-dashoffset", String(1 - s.draw));
      el("cap").setAttribute("opacity", String(s.cap));
      el("moon").setAttribute(
        "transform",
        `translate(${100 - 7 * s.cres} ${190 + s.my}) scale(${s.sc})`,
      );
      el("full").setAttribute("opacity", String(1 - s.cres));
      el("cres").setAttribute("opacity", String(s.cres));
      el("moon").style.filter =
        `drop-shadow(0 0 ${7 * s.cres}px rgba(255,170,110,${0.85 * s.cres}))`;
      const breathe =
        media.matches || hovering || focused
          ? 0
          : Math.sin(now / 700) * 0.05 * (s.glow > 0.05 ? 1 : 0);
      el("glow").setAttribute(
        "opacity",
        String(Math.max(0, s.glow + breathe) * 0.65),
      );
      el("fill").setAttribute("opacity", String(s.warm * 0.2));
      const color = (base: number[]) =>
        `rgb(${base.map((v, i) => Math.round(blend(v, [255, 226, 168][i], s.warm))).join(",")})`;
      el("glass").setAttribute("stroke", color([74, 74, 74]));
      name.style.color = color([118, 115, 107]);
      if (!media.matches) raf = requestAnimationFrame(render);
    };
    const update = () => {
      interactive = true;
      from = { ...s };
      target = hovering || focused ? full : rest;
      transitionStart = performance.now();
      duration = hovering || focused ? 900 : 1100;
      if (media.matches) render(transitionStart);
    };
    const enter = () => {
      hovering = true;
      update();
    };
    const leave = () => {
      hovering = false;
      update();
    };
    const focus = () => {
      focused = true;
      update();
    };
    const blur = () => {
      focused = false;
      update();
    };
    const change = () => {
      cancelAnimationFrame(raf);
      render(performance.now());
    };
    const link = host.parentElement!;
    link.addEventListener("pointerenter", enter);
    link.addEventListener("pointerleave", leave);
    link.addEventListener("focus", focus);
    link.addEventListener("blur", blur);
    media.addEventListener("change", change);
    render(start);
    return () => {
      cancelAnimationFrame(raf);
      link.removeEventListener("pointerenter", enter);
      link.removeEventListener("pointerleave", leave);
      link.removeEventListener("focus", focus);
      link.removeEventListener("blur", blur);
      media.removeEventListener("change", change);
    };
  }, []);
  return (
    <Link href="/" aria-label="Night Light home" className="night-light-brand">
      <span
        ref={root}
        aria-hidden="true"
        dangerouslySetInnerHTML={{ __html: logoMarkup }}
      />
    </Link>
  );
}
