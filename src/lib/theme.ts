"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";
import { THEME_KEY as KEY } from "./theme-script";

/**
 * Colour theme. The preference is per device (localStorage); dark is Monolith's
 * default. The resolved theme lives on <html data-theme="dark|light"> plus the
 * `dark` class that shadcn's `dark:` variants use.
 */
export type ThemePreference = "dark" | "light" | "system";
export type ResolvedTheme = "dark" | "light";

const EVENT = "themechange";

function readPreference(): ThemePreference {
  try {
    const value = window.localStorage.getItem(KEY);
    return value === "light" || value === "system" ? value : "dark";
  } catch {
    return "dark";
  }
}

function resolve(preference: ThemePreference): ResolvedTheme {
  if (preference !== "system") return preference;
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

function apply(preference: ThemePreference) {
  const theme = resolve(preference);
  const root = document.documentElement;
  root.dataset.theme = theme;
  root.classList.toggle("dark", theme === "dark");
  window.dispatchEvent(new Event(EVENT));
}

function subscribe(listener: () => void) {
  window.addEventListener(EVENT, listener);
  window.addEventListener("storage", listener);
  return () => {
    window.removeEventListener(EVENT, listener);
    window.removeEventListener("storage", listener);
  };
}

/** The saved preference and a setter that applies it immediately. */
export function useThemePreference() {
  const preference = useSyncExternalStore(subscribe, readPreference, () => "dark" as ThemePreference);
  const setPreference = useCallback((next: ThemePreference) => {
    try {
      window.localStorage.setItem(KEY, next);
    } catch {
      // Storage blocked: the theme still changes for this visit.
    }
    apply(next);
  }, []);
  return [preference, setPreference] as const;
}

/** The theme currently showing ("dark" or "light"). */
export function useResolvedTheme(): ResolvedTheme {
  return useSyncExternalStore(
    subscribe,
    () => (document.documentElement.dataset.theme === "light" ? "light" : "dark"),
    () => "dark",
  );
}

/** Follows the operating system while the preference is "system", and other tabs' changes. */
export function useThemeSync() {
  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: light)");
    const sync = () => apply(readPreference());
    const onStorage = (e: StorageEvent) => e.key === KEY && sync();
    const onMedia = () => readPreference() === "system" && sync();
    media.addEventListener("change", onMedia);
    window.addEventListener("storage", onStorage);
    return () => {
      media.removeEventListener("change", onMedia);
      window.removeEventListener("storage", onStorage);
    };
  }, []);
}
