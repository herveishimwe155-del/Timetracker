"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { ProjectDot } from "@/components/projects/ProjectDot";
import { displayColor } from "@/lib/project-colors";
import { NO_PROJECT_COLOR, type Report } from "@/lib/reports";
import { formatDuration, type DurationFormat } from "@/lib/time";

type Row = { key: string; name: string; detail: string | null; color: string; ms: number; share: number };

const percent = (share: number) => `${(share * 100).toFixed(share > 0 && share < 0.01 ? 1 : 0)}%`;

/** Time per project or per client, largest first, with totals and shares. */
export function Breakdown({ report, format }: { report: Report; format: DurationFormat }) {
  const [view, setView] = useState<"projects" | "clients">("projects");

  const rows: Row[] =
    view === "projects"
      ? report.projects.map((p) => ({
          key: p.id ?? "none",
          name: p.name,
          detail: p.clientName,
          color: p.color,
          ms: p.ms,
          share: p.share,
        }))
      : report.clients.map((c) => ({
          key: c.id ?? "none",
          name: c.name,
          detail: null,
          // Clients have no colour of their own; the bar uses the neutral ink.
          color: c.id ? "var(--text-muted)" : NO_PROJECT_COLOR,
          ms: c.ms,
          share: c.share,
        }));

  return (
    <section aria-labelledby="breakdown-title" className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <h2 id="breakdown-title" className="font-medium">
          Breakdown
        </h2>
        <div className="flex rounded-sm p-0.5 shadow-sm" role="group" aria-label="Break down by">
          {(["projects", "clients"] as const).map((v) => (
            <button
              key={v}
              type="button"
              aria-pressed={view === v}
              onClick={() => setView(v)}
              className={cn(
                "rounded-sm px-2.5 py-1 text-muted-foreground capitalize outline-none transition-colors",
                "hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring",
                view === v && "bg-surface-2 text-foreground",
              )}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      <table className="w-full text-left">
        <caption className="sr-only">Time per {view === "projects" ? "project" : "client"}</caption>
        <thead className="text-xs text-muted-foreground">
          <tr>
            <th scope="col" className="w-full pb-2 font-normal">
              {view === "projects" ? "Project" : "Client"}
            </th>
            <th scope="col" className="pb-2 pl-4 text-right font-normal whitespace-nowrap">
              Time
            </th>
            <th scope="col" className="pb-2 pl-4 text-right font-normal whitespace-nowrap">
              Share
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key} className="border-t border-line">
              <th scope="row" className="py-2 pr-3 font-normal">
                <div className="flex min-w-0 items-center gap-2">
                  {view === "projects" && <ProjectDot color={row.color} />}
                  <span className="truncate">{row.name}</span>
                  {row.detail && <span className="truncate text-muted-foreground">· {row.detail}</span>}
                </div>
                {/* Share bar: a thin track, filled to the share, coloured by the entity. */}
                <div className="mt-1.5 h-1 w-full rounded-full bg-surface-2" aria-hidden>
                  <div className="h-1 rounded-full" style={{ width: `${row.share * 100}%`, backgroundColor: displayColor(row.color) }} />
                </div>
              </th>
              <td className="tabular py-2 pl-4 text-right align-top whitespace-nowrap">{formatDuration(Math.floor(row.ms / 1000), format)}</td>
              <td className="tabular py-2 pl-4 text-right align-top whitespace-nowrap text-muted-foreground">{percent(row.share)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
