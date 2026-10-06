"use client";

import { useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { useSaveSettings, useSettings, type Settings } from "@/lib/queries/profile";
import { track } from "@/lib/analytics";
import { safeTimeZone } from "@/lib/auth/redirect";
import { formatDuration, type DurationFormat } from "@/lib/time";

const FORMATS: { value: DurationFormat; label: string }[] = [
  { value: "clock", label: "Clock" },
  { value: "decimal", label: "Decimal hours" },
  { value: "classic", label: "Hours and minutes" },
];
const FULL_WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const SAMPLE_SECONDS = 5_430; // 1 h 30 m 30 s

/** Every IANA time zone the browser knows, with the current one first if it's missing. */
function useTimeZones(current: string) {
  return useMemo(() => {
    const zones = typeof Intl.supportedValuesOf === "function" ? Intl.supportedValuesOf("timeZone") : [];
    return zones.includes(current) ? zones : [current, ...zones];
  }, [current]);
}

export function SettingsForm() {
  const settings = useSettings();
  if (!settings.loaded) {
    return <div className="h-64 animate-pulse rounded-md bg-surface" role="status" aria-busy="true" aria-label="Loading settings" />;
  }
  // Remount when the saved settings change elsewhere, so the form starts from them.
  return <Form key={`${settings.timeZone}|${settings.weekStart}|${settings.durationFormat}|${settings.timeFormat}|${settings.fullName}`} saved={settings} />;
}

function Form({ saved }: { saved: Settings }) {
  const [values, setValues] = useState<Settings>(saved);
  const save = useSaveSettings();
  const zones = useTimeZones(values.timeZone);
  const browserZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const dirty =
    values.timeZone !== saved.timeZone ||
    values.weekStart !== saved.weekStart ||
    values.durationFormat !== saved.durationFormat ||
    values.timeFormat !== saved.timeFormat ||
    values.fullName.trim() !== saved.fullName;

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (safeTimeZone(values.timeZone) !== values.timeZone) return toast.error("Pick a time zone from the list.");
    save.mutate(values, {
      onSuccess: () => {
        toast.success("Settings saved");
        track("settings_saved", { duration_format: values.durationFormat, week_start: values.weekStart });
      },
      onError: () => toast.error("Your settings couldn't be saved. Try again."),
    });
  };

  return (
    <form onSubmit={submit} className="flex max-w-xl flex-col gap-6">
      <section className="flex flex-col gap-2">
        <label htmlFor="full-name" className="font-medium">
          Name
        </label>
        <Input
          id="full-name"
          value={values.fullName}
          maxLength={80}
          autoComplete="name"
          placeholder="Your name"
          onChange={(e) => setValues((v) => ({ ...v, fullName: e.target.value }))}
          className="h-9 w-72 max-w-full"
        />
      </section>

      <section className="flex flex-col gap-2">
        <label htmlFor="time-zone" className="font-medium">
          Time zone
        </label>
        <p className="text-muted-foreground">Days, totals and reports are counted in this zone.</p>
        <div className="flex flex-wrap items-center gap-2">
          <NativeSelect
            id="time-zone"
            value={values.timeZone}
            onChange={(e) => setValues((v) => ({ ...v, timeZone: e.target.value }))}
            className="w-72 max-w-full"
          >
            {zones.map((z) => (
              <option key={z} value={z}>
                {z.replace(/_/g, " ")}
              </option>
            ))}
          </NativeSelect>
          {browserZone && browserZone !== values.timeZone && (
            <Button type="button" variant="ghost" size="sm" onClick={() => setValues((v) => ({ ...v, timeZone: browserZone }))}>
              Use this device&apos;s zone ({browserZone.replace(/_/g, " ")})
            </Button>
          )}
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <label htmlFor="week-start" className="font-medium">
          Week starts on
        </label>
        <NativeSelect
          id="week-start"
          value={String(values.weekStart)}
          onChange={(e) => setValues((v) => ({ ...v, weekStart: Number(e.target.value) }))}
          className="w-48"
        >
          {[1, 0, 6].map((d) => (
            <option key={d} value={d}>
              {FULL_WEEKDAYS[d]}
            </option>
          ))}
        </NativeSelect>
      </section>

      <section className="flex flex-col gap-2">
        <label htmlFor="time-format" className="font-medium">
          Time format
        </label>
        <NativeSelect
          id="time-format"
          value={values.timeFormat}
          onChange={(e) => setValues((v) => ({ ...v, timeFormat: e.target.value as Settings["timeFormat"] }))}
          className="w-48"
        >
          <option value="24h">24-hour (14:30)</option>
          <option value="12h">12-hour (2:30 PM)</option>
        </NativeSelect>
      </section>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 font-medium">Duration format</legend>
        <div className="grid gap-2 sm:grid-cols-3">
          {FORMATS.map((f) => {
            const checked = values.durationFormat === f.value;
            return (
              <label
                key={f.value}
                className={cn(
                  "flex cursor-pointer flex-col gap-1 rounded-md p-3 shadow-sm transition-colors hover:bg-surface",
                  "has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring",
                  checked && "bg-surface shadow-[inset_0_0_0_1px_var(--brand)]",
                )}
              >
                <input
                  type="radio"
                  name="duration-format"
                  value={f.value}
                  checked={checked}
                  onChange={() => setValues((v) => ({ ...v, durationFormat: f.value }))}
                  className="sr-only"
                />
                <span className="text-muted-foreground">{f.label}</span>
                <span className={cn("tabular text-base", checked && "text-brand")}>
                  {formatDuration(SAMPLE_SECONDS, f.value)}
                </span>
              </label>
            );
          })}
        </div>
        <p className="text-muted-foreground">Used for entry durations, daily totals and reports. The running timer always shows a clock.</p>
      </fieldset>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={!dirty || save.isPending}>
          {save.isPending && <Loader2 className="animate-spin" />}
          Save settings
        </Button>
        {dirty && (
          <Button type="button" variant="ghost" onClick={() => setValues(saved)}>
            Discard changes
          </Button>
        )}
      </div>
    </form>
  );
}
