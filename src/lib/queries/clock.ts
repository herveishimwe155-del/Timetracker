"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

/**
 * How far the browser clock is from the database clock, in ms (server − browser).
 * Timer starts and stops use server time, so the display corrects by this offset.
 */
export function useServerOffset(): number {
  const { data } = useQuery({
    queryKey: ["server-offset"],
    queryFn: async () => {
      const sentAt = Date.now();
      const { data, error } = await createClient().rpc("server_now");
      if (error) throw error;
      const receivedAt = Date.now();
      // Assume the server read its clock halfway through the round trip.
      return new Date(data).getTime() - (sentAt + receivedAt) / 2;
    },
    staleTime: 30 * 60_000,
    retry: 2,
  });
  return data ?? 0;
}

/** The current time on the server's clock, re-rendering every `intervalMs` while `enabled`. */
export function useNow(intervalMs = 1000, enabled = true): number {
  const offset = useServerOffset();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!enabled) return;
    const tick = () => setNow(Date.now());
    let interval: number | undefined;
    // Align ticks to the second boundary so every clock on the page changes together.
    const align = window.setTimeout(() => {
      tick();
      interval = window.setInterval(tick, intervalMs);
    }, intervalMs - (Date.now() % intervalMs));
    return () => {
      window.clearTimeout(align);
      if (interval) window.clearInterval(interval);
    };
  }, [intervalMs, enabled]);

  return now + offset;
}
