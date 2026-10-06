"use client";

import { useEffect, useRef } from "react";
import { useLocalStorageFlag } from "@/hooks/use-local-storage-flag";
import { MOTION_KEY } from "@/lib/theme-script";

/**
 * The app's moving backdrop, behind every page. The theme picks the scene
 * (styles in globals.css, .backdrop): a navy night with an electric-blue wave
 * (dark) or soft daylight with drifting light beams (light). The whole layer
 * also shifts a little against the pointer so the glass panels seem to float.
 * Still when the device asks for less motion or the user turns motion effects off.
 */
export function Backdrop() {
  const ref = useRef<HTMLDivElement>(null);
  const [moving] = useLocalStorageFlag(MOTION_KEY, true);

  // Mirror the setting onto <html data-motion> so CSS and the other effects follow it.
  useEffect(() => {
    if (moving) delete document.documentElement.dataset.motion;
    else document.documentElement.dataset.motion = "off";
  }, [moving]);

  useEffect(() => {
    const layer = ref.current;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (!layer || !moving || reduce.matches) return;

    let frame = 0;
    const onMove = (event: PointerEvent) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        // Up to 18px opposite the pointer: near things move more than far things.
        const x = (event.clientX / window.innerWidth - 0.5) * -36;
        const y = (event.clientY / window.innerHeight - 0.5) * -36;
        layer.style.setProperty("--bd-x", `${x.toFixed(1)}px`);
        layer.style.setProperty("--bd-y", `${y.toFixed(1)}px`);
      });
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", onMove);
      layer.style.removeProperty("--bd-x");
      layer.style.removeProperty("--bd-y");
    };
  }, [moving]);

  return (
    <div ref={ref} aria-hidden className="backdrop">
      <div className="bd-night bd-shape bd-wave-haze" />
      <div className="bd-night bd-shape bd-wave-indigo" />
      <div className="bd-night bd-shape bd-wave-body" />
      <div className="bd-night bd-shape bd-wave-crest" />
      <div className="bd-night bd-shape bd-wave-dip" />
      <div className="bd-day bd-shape bd-day-haze" />
      <div className="bd-day bd-shape bd-day-haze-2" />
      <div className="bd-day bd-shape bd-day-glow" />
      <div className="bd-day bd-shape bd-day-prism" />
      <div className="bd-day bd-shape bd-day-beam" />
      <div className="bd-day bd-shape bd-day-beam bd-day-beam-2" />
    </div>
  );
}
