"use client";

import { useEffect, useRef, useState } from "react";
import { motionOff } from "./MotionEffects";

/**
 * A number that counts to its new value when it changes by more than `jump`
 * (switching days, changing report filters). Smaller changes, like a running
 * timer ticking each second, show straight away. Screen readers get the final
 * value only.
 */
export function CountUp({
  value,
  format,
  jump = 2,
  duration = 700,
}: {
  value: number;
  format: (n: number) => string;
  jump?: number;
  duration?: number;
}) {
  const [shown, setShown] = useState(value);
  const current = useRef(value);
  const frame = useRef(0);

  useEffect(() => {
    const from = current.current;
    cancelAnimationFrame(frame.current);
    if (Math.abs(value - from) <= jump || motionOff()) {
      current.current = value;
      frame.current = requestAnimationFrame(() => setShown(value));
      return;
    }
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      const next = from + (value - from) * eased;
      current.current = next;
      setShown(next);
      if (t < 1) frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame.current);
  }, [value, jump, duration]);

  return (
    <>
      <span aria-hidden>{format(shown)}</span>
      <span className="sr-only">{format(value)}</span>
    </>
  );
}
