"use client";

import { useMemo, useState } from "react";
import { ChevronDown, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { track } from "@/lib/analytics";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ProjectDot } from "@/components/projects/ProjectDot";
import { ProjectPicker } from "@/components/projects/ProjectPicker";
import { useCatalogMaps } from "@/lib/queries/catalog";
import { entryErrorMessage, tagIdsOf, useEntryActions, useRangeEntries, type Entry } from "@/lib/queries/entries";
import { NO_PROJECT_COLOR, type DayRange } from "@/lib/reports";
import { addDaysToKey, dayKey, formatDuration, shortDayLabel, type DurationFormat } from "@/lib/time";
import { buildTimesheet, parseDuration, shiftEntries, slotForNewTime } from "@/lib/views";
import { useRequireAccount } from "@/lib/guest";

type Props = {
  week: DayRange;
  entries: Entry[];
  today: string;
  timeZone: string;
  nowMs: number;
  durationFormat: DurationFormat;
};

/** "1:06" style for cells: hours and minutes, blank for none. */
const cellText = (ms: number) => {
  if (ms < 60_000) return "";
  const minutes = Math.floor(ms / 60_000);
  return `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, "0")}`;
};

/**
 * Projects × days for one week. Typing a larger time into a cell adds an entry for
 * the difference on that day; time is never removed from here.
 */
export function TimesheetView({ week, entries, today, timeZone, nowMs, durationFormat }: Props) {
  const catalog = useCatalogMaps();
  const { create } = useEntryActions();
  // Rows added with "Add row", per week.
  const [extra, setExtra] = useState<Record<string, (string | null)[]>>({});
  const [copying, setCopying] = useState(false);
  const requireAccount = useRequireAccount();
  const lastWeek = useMemo(() => ({ from: addDaysToKey(week.from, -7), to: week.from }), [week.from]);
  const { data: lastWeekEntries = [] } = useRangeEntries(lastWeek, timeZone);
  // Only entries that start last week (not ones that merely spill into it).
  const toCopy = lastWeekEntries.filter((e) => e.stop_at && dayKey(e.start_at, timeZone) >= lastWeek.from && dayKey(e.start_at, timeZone) < lastWeek.to);

  const addRows = (ids: (string | null)[]) =>
    setExtra((x) => {
      const current = x[week.from] ?? [];
      return { ...x, [week.from]: [...current, ...ids.filter((id) => !current.includes(id))] };
    });

  async function copyLastWeek() {
    if (requireAccount()) return;
    setCopying(true);
    let copied = 0;
    let skipped = 0;
    for (const { entry, start_at, stop_at } of shiftEntries(toCopy, timeZone)) {
      try {
        await create.mutateAsync({
          description: entry.description,
          project_id: entry.project_id,
          billable: entry.billable,
          start_at,
          stop_at,
          tagIds: tagIdsOf(entry),
        });
        copied++;
      } catch {
        skipped++; // usually an overlap with time already tracked this week
      }
    }
    setCopying(false);
    track("week_copied", { copied, skipped });
    if (copied) toast.success(`Copied ${copied} ${copied === 1 ? "entry" : "entries"} from last week`);
    if (skipped) toast(`${skipped} ${skipped === 1 ? "entry was" : "entries were"} skipped because they overlap time already tracked.`);
  }
  const sheet = useMemo(
    () => buildTimesheet({ entries, week, timeZone, nowMs, extraProjects: extra[week.from] ?? [] }),
    [entries, week, timeZone, nowMs, extra],
  );
  const nameOf = (id: string | null) => (id ? (catalog.projects.get(id)?.name ?? "Unknown project") : "No project");
  const rows = [...sheet.rows].sort((a, b) =>
    a.projectId === null ? 1 : b.projectId === null ? -1 : nameOf(a.projectId).localeCompare(nameOf(b.projectId)),
  );
  const fmt = (ms: number) => formatDuration(Math.floor(ms / 1000), durationFormat);

  async function commit(projectId: string | null, dayIndex: number, currentMs: number, text: string) {
    if (requireAccount()) return;
    const day = sheet.days[dayIndex];
    if (text.trim() === cellText(currentMs)) return;
    const seconds = parseDuration(text);
    if (seconds === null) {
      toast.error("Enter a time like 1:30, 1.5 or 90m.");
      return;
    }
    const addSeconds = seconds - Math.floor(currentMs / 1000);
    if (addSeconds < 0) {
      toast("To remove time, edit or delete entries in the List or Calendar view.");
      return;
    }
    if (addSeconds < 60) return;
    const dayEntries = entries.filter((e) => dayKey(e.start_at, timeZone) === day);
    const slot = slotForNewTime(dayEntries, day, addSeconds, timeZone, nowMs);
    if (!slot) {
      toast.error("That much time doesn't fit after the day's last entry.");
      return;
    }
    try {
      await create.mutateAsync({
        description: "",
        project_id: projectId,
        start_at: slot.start.toISOString(),
        stop_at: slot.stop.toISOString(),
      });
      toast.success(`Added ${fmt(addSeconds * 1000)} to ${nameOf(projectId)}`);
    } catch (e) {
      toast.error(entryErrorMessage(e));
    }
  }

  return (
    <div className="overflow-x-auto rounded-md shadow-sm">
      <table className="w-full min-w-[720px] text-left">
        <caption className="sr-only">Timesheet for the week of {shortDayLabel(week.from)}</caption>
        <thead className="text-xs text-muted-foreground uppercase">
          <tr className="border-b border-line">
            <th scope="col" className="px-3 py-2 font-normal">
              Project
            </th>
            {sheet.days.map((d) => (
              <th key={d} scope="col" className={cn("w-20 px-1 py-2 text-center font-normal", d === today && "text-brand")}>
                {shortDayLabel(d)}
              </th>
            ))}
            <th scope="col" className="w-24 px-3 py-2 text-right font-normal">
              Total
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const project = row.projectId ? catalog.projects.get(row.projectId) : undefined;
            return (
              <tr key={row.projectId ?? "none"} className="border-b border-line">
                <th scope="row" className="px-3 py-1.5 font-normal">
                  <span className="flex min-w-0 items-center gap-2">
                    <ProjectDot color={project?.color ?? NO_PROJECT_COLOR} />
                    <span className="truncate">{nameOf(row.projectId)}</span>
                  </span>
                </th>
                {row.days.map((ms, i) => (
                  <td key={sheet.days[i]} className="px-1 py-1.5">
                    <input
                      // Remount when the value changes elsewhere so the cell shows it.
                      key={`${row.projectId}-${sheet.days[i]}-${cellText(ms)}`}
                      defaultValue={cellText(ms)}
                      inputMode="decimal"
                      aria-label={`${nameOf(row.projectId)}, ${shortDayLabel(sheet.days[i])}`}
                      onFocus={(e) => e.currentTarget.select()}
                      onBlur={(e) => {
                        const text = e.currentTarget.value;
                        if (text.trim() !== cellText(ms)) e.currentTarget.value = cellText(ms);
                        void commit(row.projectId, i, ms, text);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") e.currentTarget.blur();
                        if (e.key === "Escape") {
                          e.currentTarget.value = cellText(ms);
                          e.currentTarget.blur();
                        }
                      }}
                      className={cn(
                        "tabular h-8 w-full rounded-sm bg-transparent text-center shadow-sm outline-none",
                        "hover:bg-surface focus-visible:ring-2 focus-visible:ring-ring",
                      )}
                    />
                  </td>
                ))}
                <td className="tabular px-3 py-1.5 text-right">{row.totalMs > 0 ? fmt(row.totalMs) : ""}</td>
              </tr>
            );
          })}
          {rows.length === 0 && (
            <tr>
              <td colSpan={9} className="px-3 py-8 text-center text-muted-foreground">
                No time this week yet. Add a row to start filling in hours.
              </td>
            </tr>
          )}
        </tbody>
        <tfoot>
          <tr>
            <td className="px-1 py-1.5">
              <div className="flex flex-wrap items-center gap-1">
                <ProjectPicker value={null} triggerLabel="Add row" onChange={(id) => addRows([id])} />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="text-muted-foreground" disabled={copying || toCopy.length === 0}>
                      <Copy />
                      {copying ? "Copying…" : "Copy last week"}
                      <ChevronDown />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-64">
                    <DropdownMenuItem onSelect={() => addRows([...new Set(toCopy.map((e) => e.project_id))])}>
                      Rows only
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => void copyLastWeek()}>
                      Rows and time ({toCopy.length} {toCopy.length === 1 ? "entry" : "entries"})
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </td>
            {sheet.dayTotals.map((ms, i) => (
              <td key={sheet.days[i]} className="tabular px-1 py-1.5 text-center font-medium">
                {ms > 0 ? fmt(ms) : "–"}
              </td>
            ))}
            <td className="tabular px-3 py-1.5 text-right font-medium">{fmt(sheet.totalMs)}</td>
          </tr>
        </tfoot>
      </table>
      <p className="border-t border-line px-3 py-2 text-xs text-muted-foreground">
        Type a time (1:30, 1.5 or 90m) to add hours for that day; it is placed after the day&apos;s last entry.
      </p>
    </div>
  );
}
