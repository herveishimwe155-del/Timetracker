"use client";

import { useState } from "react";
import { z } from "zod";
import { DollarSign, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { addDaysToKey, dayKey, formatClock, timeOfDay, wallTimeToInstant } from "@/lib/time";
import { entryErrorMessage, useEntryActions, useEntryPages, useRunningEntry, type Entry } from "@/lib/queries/entries";
import { useSettings } from "@/lib/queries/profile";
import { defaultRange } from "@/lib/entry-range";

/** What the editor opens with: an entry to edit, or values for a new one. */
export type EditorTarget =
  | { mode: "edit"; entry: Entry }
  | { mode: "create"; initial?: Partial<Pick<Entry, "description" | "project_id" | "billable" | "start_at" | "stop_at">> };

const form = z.object({
  description: z.string().trim().max(500, "Keep the description under 500 characters."),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date."),
  start: z.string().regex(/^\d{2}:\d{2}$/, "Enter a start time."),
  end: z.string().regex(/^\d{2}:\d{2}$/, "Enter an end time."),
  billable: z.boolean(),
});

/** Start and stop instants from the form; an end at or before the start means the next day. */
function toInstants(date: string, start: string, end: string, timeZone: string) {
  const startAt = wallTimeToInstant(date, start, timeZone);
  const endsNextDay = end <= start;
  const stopAt = wallTimeToInstant(endsNextDay ? addDaysToKey(date, 1) : date, end, timeZone);
  return { startAt, stopAt, endsNextDay };
}

function initialValues(target: EditorTarget, timeZone: string, fallback: { start: number; end: number }) {
  const source = target.mode === "edit" ? target.entry : target.initial;
  const startAt = source?.start_at ?? new Date(fallback.start).toISOString();
  const stopAt = source?.stop_at ?? new Date(fallback.end).toISOString();
  return {
    description: source?.description ?? "",
    date: dayKey(startAt, timeZone),
    start: timeOfDay(startAt, timeZone),
    end: timeOfDay(stopAt, timeZone),
    billable: source?.billable ?? false,
  };
}

export function EntryEditor({ target, onClose }: { target: EditorTarget | null; onClose: () => void }) {
  return (
    <Dialog open={target !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        {/* Remount per target so the form starts from that entry's values. */}
        {target && (
          <EditorForm key={target.mode === "edit" ? target.entry.id : "new"} target={target} onDone={onClose} />
        )}
      </DialogContent>
    </Dialog>
  );
}

function EditorForm({ target, onDone }: { target: EditorTarget; onDone: () => void }) {
  const { timeZone } = useSettings();
  const { create, update } = useEntryActions();
  const { data: pages } = useEntryPages(timeZone);
  const { data: running = null } = useRunningEntry();
  const [values, setValues] = useState(() =>
    initialValues(target, timeZone, defaultRange(pages?.pages.flatMap((p) => p.entries) ?? [], running, Date.now())),
  );
  const [error, setError] = useState<string | null>(null);
  const pending = create.isPending || update.isPending;

  const set = <K extends keyof typeof values>(key: K, value: (typeof values)[K]) => {
    setValues((v) => ({ ...v, [key]: value }));
    setError(null);
  };

  const valid = form.safeParse(values);
  const preview = valid.success ? toInstants(values.date, values.start, values.end, timeZone) : null;
  const seconds = preview ? Math.round((preview.stopAt.getTime() - preview.startAt.getTime()) / 1000) : 0;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const parsed = form.safeParse(values);
    if (!parsed.success) return setError(parsed.error.issues[0].message);

    const { startAt, stopAt } = toInstants(parsed.data.date, parsed.data.start, parsed.data.end, timeZone);
    const fields = {
      description: parsed.data.description,
      billable: parsed.data.billable,
      start_at: startAt.toISOString(),
      stop_at: stopAt.toISOString(),
    };

    try {
      if (target.mode === "edit") {
        await update.mutateAsync({ id: target.entry.id, changes: fields });
        toast.success("Entry updated");
      } else {
        await create.mutateAsync({ ...fields, project_id: target.initial?.project_id ?? null });
        toast.success("Entry added");
      }
      onDone();
    } catch (e) {
      setError(entryErrorMessage(e));
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
      <DialogHeader>
        <DialogTitle>{target.mode === "edit" ? "Edit entry" : "New time entry"}</DialogTitle>
        <DialogDescription>Times are in {timeZone.replace(/_/g, " ")}.</DialogDescription>
      </DialogHeader>

      <label className="flex flex-col gap-1.5">
        <span className="text-muted-foreground">Description</span>
        <Input
          autoFocus
          value={values.description}
          onChange={(e) => set("description", e.target.value)}
          placeholder="What did you work on?"
          className="h-9"
        />
      </label>

      <div className="grid grid-cols-[1fr_auto_auto] gap-2">
        <label className="flex flex-col gap-1.5">
          <span className="text-muted-foreground">Date</span>
          <Input type="date" value={values.date} onChange={(e) => set("date", e.target.value)} className="tabular h-9" />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-muted-foreground">Start</span>
          <Input type="time" value={values.start} onChange={(e) => set("start", e.target.value)} className="tabular h-9 w-28" />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-muted-foreground">End</span>
          <Input type="time" value={values.end} onChange={(e) => set("end", e.target.value)} className="tabular h-9 w-28" />
        </label>
      </div>

      <div className="flex items-center justify-between gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          aria-pressed={values.billable}
          onClick={() => set("billable", !values.billable)}
          className={cn(values.billable && "border-brand text-brand")}
        >
          <DollarSign />
          {values.billable ? "Billable" : "Not billable"}
        </Button>
        <span className="text-muted-foreground">
          {preview?.endsNextDay && "Ends next day · "}
          <span className="tabular text-foreground">{formatClock(seconds)}</span>
        </span>
      </div>

      <p aria-live="polite" className="min-h-5 text-danger">
        {error}
      </p>

      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" disabled={pending}>
          {pending && <Loader2 className="animate-spin" />}
          {target.mode === "edit" ? "Save" : "Add entry"}
        </Button>
      </DialogFooter>
    </form>
  );
}
