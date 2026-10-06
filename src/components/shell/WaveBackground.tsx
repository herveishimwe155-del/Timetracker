"use client";

import { useEffect, useRef } from "react";
import { useLocalStorageFlag } from "@/hooks/use-local-storage-flag";

/** localStorage key for Settings → Appearance → "Moving background". */
export const BACKGROUND_MOTION_KEY = "background-motion";

/**
 * The app's backdrop: a deep navy night with a glowing electric-blue wave
 * rolling along the bottom. Its shapes drift slowly, and the whole layer shifts
 * a little against the pointer so the glass panels seem to float above it.
 * Styles are in globals.css (.wave). Still when the device asks for less motion
 * or the user turns it off.
 */
export function WaveBackground() {
  const ref = useRef<HTMLDivElement>(null);
  const [moving] = useLocalStorageFlag(BACKGROUND_MOTION_KEY, true);

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
        layer.style.setProperty("--wave-x", `${x.toFixed(1)}px`);
        layer.style.setProperty("--wave-y", `${y.toFixed(1)}px`);
      });
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", onMove);
      layer.style.removeProperty("--wave-x");
      layer.style.removeProperty("--wave-y");
    };
  }, [moving]);

  return (
    <div ref={ref} aria-hidden className="wave" data-still={moving ? undefined : ""}>
      <div className="wave-shape wave-haze" />
      <div className="wave-shape wave-indigo" />
      <div className="wave-shape wave-body" />
      <div className="wave-shape wave-crest" />
      <div className="wave-shape wave-dip" />
    </div>
  );
}
