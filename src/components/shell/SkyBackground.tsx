"use client";

import { useEffect, useRef } from "react";
import { useLocalStorageFlag } from "@/hooks/use-local-storage-flag";

/** localStorage key for Settings → Appearance → "Moving background". */
export const SKY_MOTION_KEY = "sky-motion";

/**
 * The app's backdrop: a soft blue sky whose glow and clouds drift slowly, and
 * which shifts a little against the pointer so the glass panels seem to float
 * above it. Styles are in globals.css (.sky). Still when the device asks for
 * less motion or the user turns it off.
 */
export function SkyBackground() {
  const ref = useRef<HTMLDivElement>(null);
  const [moving] = useLocalStorageFlag(SKY_MOTION_KEY, true);

  useEffect(() => {
    const sky = ref.current;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (!sky || !moving || reduce.matches) return;

    let frame = 0;
    const onMove = (event: PointerEvent) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        // Up to 18px opposite the pointer: near things move more than far things.
        const x = (event.clientX / window.innerWidth - 0.5) * -36;
        const y = (event.clientY / window.innerHeight - 0.5) * -36;
        sky.style.setProperty("--sky-x", `${x.toFixed(1)}px`);
        sky.style.setProperty("--sky-y", `${y.toFixed(1)}px`);
      });
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", onMove);
      sky.style.removeProperty("--sky-x");
      sky.style.removeProperty("--sky-y");
    };
  }, [moving]);

  return (
    <div ref={ref} aria-hidden className="sky" data-still={moving ? undefined : ""}>
      <div className="sky-blob sky-deep" />
      <div className="sky-blob sky-haze" />
      <div className="sky-blob sky-cloud" />
      <div className="sky-blob sky-glow" />
      <div className="sky-blob sky-streak" />
    </div>
  );
}
