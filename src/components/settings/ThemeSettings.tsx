"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";
import { useThemePreference, type ThemePreference } from "@/lib/theme";
import { useLocalStorageFlag } from "@/hooks/use-local-storage-flag";
import { MOTION_KEY } from "@/lib/theme-script";

const OPTIONS: { value: ThemePreference; label: string; icon: typeof Sun; hint: string }[] = [
  { value: "dark", label: "Dark", icon: Moon, hint: "Night wave" },
  { value: "light", label: "Light", icon: Sun, hint: "Soft daylight" },
  { value: "system", label: "Match system", icon: Monitor, hint: "Follows this device" },
];

/** Theme and background motion. Apply instantly and are saved on this device only. */
export function ThemeSettings() {
  const [preference, setPreference] = useThemePreference();
  const [moving, setMoving] = useLocalStorageFlag(MOTION_KEY, true);

  return (
    <fieldset className="flex max-w-xl flex-col gap-2">
      <legend className="sr-only">Theme</legend>
      <div className="grid gap-2 sm:grid-cols-3">
        {OPTIONS.map(({ value, label, icon: Icon, hint }) => {
          const checked = preference === value;
          return (
            <label
              key={value}
              data-tilt="6"
              className={cn(
                "flex cursor-pointer items-center gap-3 rounded-md p-3 shadow-sm transition-colors hover:bg-surface",
                "has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring",
                checked && "bg-surface shadow-[inset_0_0_0_1px_var(--brand)]",
              )}
            >
              <input
                type="radio"
                name="theme"
                value={value}
                checked={checked}
                onChange={() => setPreference(value)}
                className="sr-only"
              />
              <Icon className={cn("size-4 shrink-0", checked ? "text-brand" : "text-muted-foreground")} strokeWidth={1.75} aria-hidden />
              <span className="min-w-0">
                <span className="block">{label}</span>
                <span className="block text-xs text-muted-foreground">{hint}</span>
              </span>
            </label>
          );
        })}
      </div>
      <label className="mt-2 flex cursor-pointer items-start gap-3 rounded-md p-3 shadow-sm has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring">
        <input
          type="checkbox"
          checked={moving}
          onChange={(e) => setMoving(e.target.checked)}
          className="mt-0.5 size-4 shrink-0 accent-[var(--brand)]"
        />
        <span className="min-w-0">
          <span className="block">Motion effects</span>
          <span className="block text-xs text-muted-foreground">
            The moving background, panels that light up and tilt under your pointer, and content that eases into
            view. Turn off to keep everything still (it&apos;s always still if your device asks for less motion).
          </span>
        </span>
      </label>
      <p className="text-muted-foreground">Saved on this device. Changes apply straight away.</p>
    </fieldset>
  );
}
