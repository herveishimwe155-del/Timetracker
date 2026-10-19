"use client";

import { useMemo, useState } from "react";
import { Plus, Target, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shell/EmptyState";
import { ProjectDot } from "@/components/projects/ProjectDot";
import { GoalDialog, statusText } from "@/components/timer-views/GoalsPanel";
import { useCatalogMaps, useGoalActions, useGoals } from "@/lib/queries/catalog";
import { useRangeEntries } from "@/lib/queries/entries";
import { useNow } from "@/lib/queries/clock";
import { useSettings } from "@/lib/queries/profile";
import { useRequireAccount } from "@/lib/guest";
import { dayKey, formatDuration } from "@/lib/time";
import { goalProgress, weekOf } from "@/lib/views";

/** The Goals page: every goal as a card with this period's progress. */
export function GoalsBoard() {
  const { data: goals = [], isPending } = useGoals();
  const { remove } = useGoalActions();
  const catalog = useCatalogMaps();
  const { timeZone, weekStart, durationFormat } = useSettings();
  const now = useNow(30_000);
  const today = dayKey(now, timeZone);
  const week = useMemo(() => weekOf(today, weekStart), [today, weekStart]);
  const { data: entries = [] } = useRangeEntries(week, timeZone);
  const requireAccount = useRequireAccount();
  const [creating, setCreating] = useState(false);
  const fmt = (ms: number) => formatDuration(Math.floor(ms / 1000), durationFormat);
  const create = () => requireAccount() || setCreating(true);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <p className="text-muted-foreground">Daily and weekly targets, measured as you track.</p>
        <Button className="ml-auto h-9" onClick={create}>
          <Plus />
          New goal
        </Button>
      </div>

      {isPending ? (
        <div className="h-32 animate-pulse rounded-md bg-surface" role="status" aria-busy="true" aria-label="Loading goals" />
      ) : goals.length === 0 ? (
        <EmptyState icon={Target} title="No goals yet">
          Set a target like &ldquo;at least 4 hours a day on Thesis&rdquo; or &ldquo;at most 2 hours a week in meetings&rdquo;.{" "}
          <button
            type="button"
            onClick={create}
            className="rounded-sm text-brand underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
          >
            Create your first goal
          </button>
          .
        </EmptyState>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {goals.map((goal, i) => {
            const progress = goalProgress(goal, { entries, today, week, timeZone, nowMs: now });
            const project = goal.project_id ? catalog.projects.get(goal.project_id) : undefined;
            const bad = progress.status === "over";
            const good = progress.status === "met" || progress.status === "within";
            const pct = Math.round(Math.min(1, progress.ratio) * 100);
            return (
              <li
                key={goal.id}
                data-reveal
                data-tilt="6"
                style={{ "--reveal-delay": `${Math.min(i, 6) * 60}ms` } as React.CSSProperties}
                className="group flex flex-col gap-3 rounded-md bg-surface p-4 shadow-sm"
              >
                <div className="flex items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">
                      {goal.comparison === "at_most" ? "At most" : "At least"} {fmt(goal.target_seconds * 1000)} a{" "}
                      {goal.period === "day" ? "day" : "week"}
                    </p>
                    <p className="flex min-w-0 items-center gap-1.5 text-muted-foreground">
                      {project && <ProjectDot color={project.color} />}
                      <span className="truncate">{project?.name ?? "All projects"}</span>
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Delete goal"
                    onClick={() => {
                      if (window.confirm("Delete this goal?")) remove.mutate(goal.id, { onSuccess: () => toast.success("Goal deleted") });
                    }}
                    className="opacity-100 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100"
                  >
                    <Trash2 />
                  </Button>
                </div>

                <div className="flex items-baseline justify-between gap-2">
                  <span className="tabular text-2xl font-medium tracking-tight">{fmt(progress.doneMs)}</span>
                  <span className="tabular text-muted-foreground">{pct}%</span>
                </div>
                <div
                  role="meter"
                  aria-label="Goal progress"
                  aria-valuemin={0}
                  aria-valuemax={goal.target_seconds}
                  aria-valuenow={Math.floor(progress.doneMs / 1000)}
                  aria-valuetext={`${fmt(progress.doneMs)} of ${fmt(progress.targetMs)}, ${statusText(progress.status)}`}
                  className="h-2 w-full overflow-hidden rounded-full bg-surface-2"
                >
                  <div
                    className={cn("h-full rounded-full transition-[width] duration-700", bad ? "bg-danger" : "bg-brand")}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <p className="flex justify-between text-muted-foreground">
                  <span>
                    {goal.period === "day" ? "Today" : "This week"} · of {fmt(progress.targetMs)}
                  </span>
                  <span className={cn(good && "text-brand", bad && "text-danger")}>{statusText(progress.status)}</span>
                </p>
              </li>
            );
          })}
        </ul>
      )}

      <GoalDialog open={creating} onClose={() => setCreating(false)} />
    </div>
  );
}
