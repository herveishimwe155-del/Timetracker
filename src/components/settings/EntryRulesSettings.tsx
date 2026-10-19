"use client";

import { useState } from "react";
import { Loader2, Lock } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useEntryRules, useSaveEntryRules, type EntryRules } from "@/lib/queries/profile";

/** Settings → Time entries: required fields, tag limit, lock date, and how entries show. */
export function EntryRulesSettings() {
  const rules = useEntryRules();
  if (!rules.loaded) {
    return <div className="h-64 animate-pulse rounded-md bg-surface" role="status" aria-busy="true" aria-label="Loading time entry settings" />;
  }
  const saved: EntryRules = {
    requireProject: rules.requireProject,
    requireDescription: rules.requireDescription,
    requireTags: rules.requireTags,
    maxTags: rules.maxTags,
    lockBefore: rules.lockBefore,
    showTimes: rules.showTimes,
    showTimesheet: rules.showTimesheet,
  };
  // Remount when the saved rules change elsewhere, so the form starts from them.
  return <Form key={JSON.stringify(saved)} saved={saved} />;
}

function Form({ saved }: { saved: EntryRules }) {
  const [values, setValues] = useState<EntryRules>(saved);
  const [maxTagsText, setMaxTagsText] = useState(saved.maxTags?.toString() ?? "");
  const save = useSaveEntryRules();
  const set = <K extends keyof EntryRules>(key: K, value: EntryRules[K]) => setValues((v) => ({ ...v, [key]: value }));
  const dirty = JSON.stringify(values) !== JSON.stringify(saved) || maxTagsText !== (saved.maxTags?.toString() ?? "");

  function submit(event: React.FormEvent) {
    event.preventDefault();
    let maxTags: number | null = null;
    if (maxTagsText.trim()) {
      const n = Number(maxTagsText);
      if (!Number.isInteger(n) || n < 1 || n > 50) return toast.error("The tag limit must be a whole number from 1 to 50.");
      maxTags = n;
    }
    save.mutate(
      { ...values, maxTags },
      {
        onSuccess: () => toast.success("Time entry settings saved"),
        onError: () => toast.error("Your settings couldn't be saved. Try again."),
      },
    );
  }

  return (
    <form onSubmit={submit} className="flex max-w-xl flex-col gap-6" noValidate>
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 font-medium">Required for every entry</legend>
        <p className="text-muted-foreground">Starting a timer or saving an entry asks for these first.</p>
        <Check label="Description" checked={values.requireDescription} onChange={(v) => set("requireDescription", v)} />
        <Check label="Project" checked={values.requireProject} onChange={(v) => set("requireProject", v)} />
        <Check label="At least one tag" checked={values.requireTags} onChange={(v) => set("requireTags", v)} />
      </fieldset>

      <label className="flex flex-col gap-1.5">
        <span className="font-medium">Maximum tags per entry</span>
        <span className="text-muted-foreground">Keeps tags tidy for reporting. Leave empty for no limit.</span>
        <Input
          type="number"
          inputMode="numeric"
          min={1}
          max={50}
          placeholder="No limit"
          value={maxTagsText}
          onChange={(e) => setMaxTagsText(e.target.value)}
          className="h-9 w-32"
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="flex items-center gap-1.5 font-medium">
          <Lock className="size-4 text-muted-foreground" aria-hidden />
          Lock entries before
        </span>
        <span className="text-muted-foreground">
          Entries before this day can&apos;t be added, changed or deleted, so past timesheets stay as they were sent.
        </span>
        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={values.lockBefore ?? ""}
            onChange={(e) => set("lockBefore", e.target.value || null)}
            className="h-9 w-44"
          />
          {values.lockBefore && (
            <Button type="button" variant="ghost" size="sm" onClick={() => set("lockBefore", null)}>
              Unlock
            </Button>
          )}
        </div>
      </label>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 font-medium">Entry times in the list</legend>
        <Radio name="show-times" label="Show start and end times" checked={values.showTimes} onChange={() => set("showTimes", true)} />
        <Radio name="show-times" label="Show durations only" checked={!values.showTimes} onChange={() => set("showTimes", false)} />
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 font-medium">Timesheet view</legend>
        <Radio name="timesheet" label="Show the Timesheet view" checked={values.showTimesheet} onChange={() => set("showTimesheet", true)} />
        <Radio name="timesheet" label="Hide it" checked={!values.showTimesheet} onChange={() => set("showTimesheet", false)} />
      </fieldset>

      <div>
        <Button type="submit" disabled={!dirty || save.isPending}>
          {save.isPending && <Loader2 className="animate-spin" />}
          Save
        </Button>
      </div>
    </form>
  );
}

function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center gap-2">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="size-4 accent-[var(--brand)]" />
      {label}
    </label>
  );
}

function Radio({ name, label, checked, onChange }: { name: string; label: string; checked: boolean; onChange: () => void }) {
  return (
    <label className="flex cursor-pointer items-center gap-2">
      <input type="radio" name={name} checked={checked} onChange={onChange} className="size-4 accent-[var(--brand)]" />
      {label}
    </label>
  );
}
