"use client";

import { useCallback, useSyncExternalStore } from "react";

const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

function read(key: string): boolean | null {
  try {
    const value = window.localStorage.getItem(key);
    return value === null ? null : value === "1";
  } catch {
    return null;
  }
}

/**
 * A boolean kept in localStorage (a per-browser convenience, never app data).
 * Renders `fallback` on the server and first paint, then the stored value.
 */
export function useLocalStorageFlag(key: string, fallback: boolean) {
  const value = useSyncExternalStore(
    subscribe,
    () => read(key) ?? fallback,
    () => fallback,
  );

  const setValue = useCallback(
    (next: boolean) => {
      try {
        window.localStorage.setItem(key, next ? "1" : "0");
      } catch {
        // Storage blocked: the flag simply won't persist.
      }
      listeners.forEach((listener) => listener());
    },
    [key],
  );

  return [value, setValue] as const;
}
