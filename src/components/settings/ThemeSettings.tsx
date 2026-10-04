"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";
import { useThemePreference, type ThemePreference } from "@/lib/theme";

const OPTIONS: { value: ThemePreference; label: string; icon: typeof Sun; hint: string }[] = [
  { value: "dark", label: "Dark", icon: Moon, hint: "Monolith default" },
  { value: "light", label: "Light", icon: Sun, hint: "Bright surfaces" },
  { value: "system", label: "Match system", icon: Monitor, hint: "Follows this device" },
];

/** Theme choice. Applies instantly and is saved on this device only. */
export function ThemeSettings() {
  const [preference, setPreference] = useThemePreference();

  return (
    <fieldset className="flex max-w-xl flex-col gap-2">
      <legend className="mb-2 font-medium">Appearance</legend>
      <div className="grid gap-2 sm:grid-cols-3">
        {OPTIONS.map(({ value, label, icon: Icon, hint }) => {
          const checked = preference === value;
          return (
            <label
              key={value}
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
      <p className="text-muted-foreground">Saved on this device. Changes apply straight away.</p>
    </fieldset>
  );
}
