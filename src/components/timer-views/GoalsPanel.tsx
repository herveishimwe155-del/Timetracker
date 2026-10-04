"use client";

import { useState } from "react";
import { ChevronDown, Loader2, Plus, Target, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ProjectDot } from "@/components/projects/ProjectDot";
import { useLocalStorageFlag } from "@/hooks/use-local-storage-flag";
import { track } from "@/lib/analytics";
import { useCatalogMaps, useGoalActions, useGoals, useProjects, type Goal } from "@/lib/queries/catalog";
import type { Entry } from "@/lib/queries/entries";
import type { DayRange } from "@/lib/reports";
import { formatDuration, type DurationFormat } from "@/lib/time";
import { goalProgress, parseDuration } from "@/lib/views";

type Props = {
  entries: Entry[];
  today: string;
  /** The current week (goals always measure the present, whatever date is being viewed). */
  week: DayRange;
  timeZone: string;
  nowMs: number;
  durationFormat: DurationFormat;
};

/** Toggl-style goals: "at least / at most N per day / week", with live progress. */
export function GoalsPanel({ entries, today, week, timeZone, nowMs, durationFormat }: Props) {
  const { data: goals = [] } = useGoals();
  const { remove } = useGoalActions();
  const catalog = useCatalogMaps();
  const [collapsed, setCollapsed] = useLocalStorageFlag("goals-collapsed", false);
  const [creating, setCreating] = useState(false);
  const fmt = (ms: number) => formatDuration(Math.floor(ms / 1000), durationFormat);

  return (
    <section aria-labelledby="goals-title" className="rounded-md shadow-sm">
      <div className="flex items-center gap-1 px-2 py-2">
        <button
          type="button"
          aria-expanded={!collapsed}
          aria-controls="goals-list"
          onClick={() => setCollapsed(!collapsed)}
          className="flex flex-1 items-center gap-1.5 rounded-sm px-1 text-left font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ChevronDown className={cn("size-4 transition-transform", collapsed && "-rotate-90")} aria-hidden />
          <span id="goals-title">Goals</span>
        </button>
        <Button variant="ghost" size="icon-sm" aria-label="Create a goal" onClick={() => setCreating(true)}>
          <Plus />
        </Button>
      </div>

      {!collapsed && (
        <div id="goals-list" className="border-t border-line px-3 py-3">
          {goals.length === 0 ? (
            <button
              type="button"
              onClick={() => setCreating(true)}
              className="flex items-center gap-2 rounded-sm text-xs font-medium tracking-wide text-brand uppercase outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Plus className="size-3.5" aria-hidden />
              Create a goal
            </button>
          ) : (
            <ul className="flex flex-col gap-3">
              {goals.map((goal) => {
                const progress = goalProgress(goal, { entries, today, week, timeZone, nowMs });
                const project = goal.project_id ? catalog.projects.get(goal.project_id) : undefined;
                const bad = progress.status === "over";
                const good = progress.status === "met";
                return (
                  <li key={goal.id} className="group flex flex-col gap-1.5">
                    <div className="flex items-start gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="truncate">
                          {goal.comparison === "at_most" ? "At most" : "At least"} {fmt(goal.target_seconds * 1000)} /{" "}
                          {goal.period === "day" ? "day" : "week"}
                        </p>
                        <p className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
                          {project && <ProjectDot color={project.color} />}
                          <span className="truncate">{project?.name ?? "All projects"}</span>
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        aria-label="Delete goal"
                        onClick={() => remove.mutate(goal.id)}
                        className="opacity-100 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100"
                      >
                        <Trash2 />
                      </Button>
                    </div>
                    <div
                      role="meter"
                      aria-label="Goal progress"
                      aria-valuemin={0}
                      aria-valuemax={goal.target_seconds}
                      aria-valuenow={Math.floor(progress.doneMs / 1000)}
                      aria-valuetext={`${fmt(progress.doneMs)} of ${fmt(progress.targetMs)}, ${statusText(progress.status)}`}
                      className="h-1.5 w-full overflow-hidden rounded-full bg-surface-2"
                    >
                      <div
                        className={cn("h-full rounded-full", bad ? "bg-danger" : "bg-brand")}
                        style={{ width: `${Math.min(100, progress.ratio * 100)}%` }}
                      />
                    </div>
                    <p className="flex justify-between text-xs text-muted-foreground">
                      <span className="tabular">
                        {fmt(progress.doneMs)} of {fmt(progress.targetMs)}
                      </span>
                      <span className={cn(good && "text-brand", bad && "text-danger")}>{statusText(progress.status)}</span>
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      <GoalDialog open={creating} onClose={() => setCreating(false)} />
    </section>
  );
}

const statusText = (s: ReturnType<typeof goalProgress>["status"]) =>
  ({ met: "Goal met", behind: "In progress", within: "Within limit", over: "Over limit" })[s];

function GoalDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-sm">{open && <GoalForm onDone={onClose} />}</DialogContent>
    </Dialog>
  );
}

function GoalForm({ onDone }: { onDone: () => void }) {
  const { data: projects = [] } = useProjects();
  const { create } = useGoalActions();
  const [values, setValues] = useState<Pick<Goal, "comparison" | "period"> & { projectId: string; target: string }>({
    comparison: "at_least",
    period: "week",
    projectId: "",
    target: "8",
  });
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const seconds = parseDuration(values.target);
    if (!seconds || seconds < 60) return setError("Enter a time like 8, 7:30 or 90m.");
    if (seconds > (values.period === "day" ? 24 : 168) * 3600)
      return setError(`That's more than a ${values.period} has.`);
    await create.mutateAsync({
      comparison: values.comparison,
      period: values.period,
      project_id: values.projectId || null,
      target_seconds: seconds,
    });
    track("goal_created", { period: values.period, comparison: values.comparison, has_project: values.projectId !== "" });
    onDone();
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
      <DialogHeader>
        <DialogTitle>Create a goal</DialogTitle>
        <DialogDescription>Track how much time you spend, per day or per week.</DialogDescription>
      </DialogHeader>
      <div className="grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-3">
        <label htmlFor="goal-comparison" className="text-muted-foreground">
          Track
        </label>
        <NativeSelect
          id="goal-comparison"
          value={values.comparison}
          onChange={(e) => setValues((v) => ({ ...v, comparison: e.target.value }))}
        >
          <option value="at_least">At least</option>
          <option value="at_most">At most</option>
        </NativeSelect>
        <label htmlFor="goal-target" className="text-muted-foreground">
          Hours
        </label>
        <Input
          id="goal-target"
          value={values.target}
          inputMode="decimal"
          onChange={(e) => (setValues((v) => ({ ...v, target: e.target.value })), setError(null))}
          className="tabular h-9"
        />
        <label htmlFor="goal-period" className="text-muted-foreground">
          Per
        </label>
        <NativeSelect id="goal-period" value={values.period} onChange={(e) => setValues((v) => ({ ...v, period: e.target.value }))}>
          <option value="day">Day</option>
          <option value="week">Week</option>
        </NativeSelect>
        <label htmlFor="goal-project" className="text-muted-foreground">
          On
        </label>
        <NativeSelect
          id="goal-project"
          value={values.projectId}
          onChange={(e) => setValues((v) => ({ ...v, projectId: e.target.value }))}
        >
          <option value="">All projects</option>
          {projects
            .filter((p) => !p.archived)
            .map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
        </NativeSelect>
      </div>
      <p aria-live="polite" className="min-h-5 text-danger">
        {error}
      </p>
      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" disabled={create.isPending}>
          {create.isPending ? <Loader2 className="animate-spin" /> : <Target />}
          Create goal
        </Button>
      </DialogFooter>
    </form>
  );
}
