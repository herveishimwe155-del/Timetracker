"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatDuration, type DurationFormat } from "@/lib/time";

type Day = { key: string; label: string; ms: number };
type Point = Day & { hours: number };

/** Clean axis steps in hours: at most four steps above zero. */
const STEPS = [0.25, 0.5, 1, 2, 3, 4, 6, 8, 12, 24];
export function hourTicks(maxHours: number): number[] {
  const step = STEPS.find((s) => maxHours / s <= 4) ?? Math.ceil(maxHours / 4);
  const top = Math.max(step, Math.ceil(maxHours / step) * step);
  return Array.from({ length: Math.round(top / step) + 1 }, (_, i) => i * step);
}
/** 0.25 → "15m", 1 → "1h", 1.5 → "1.5h". */
export const hoursTick = (v: number) => (v === 0 ? "0" : v < 1 ? `${Math.round(v * 60)}m` : `${Number(v.toFixed(2))}h`);

/**
 * Hours per day: one series, so one colour (emerald) and no legend. Thin bars
 * (≤ 24px) with a 4px rounded top, recessive hairline gridlines, a hover tooltip,
 * and the same numbers in a table underneath for screen readers and copying.
 */
export function DailyChart({ days, format }: { days: Day[]; format: DurationFormat }) {
  const data: Point[] = days.map((d) => ({ ...d, hours: d.ms / 3_600_000 }));
  const ticks = hourTicks(Math.max(0, ...data.map((d) => d.hours)));
  const summary = `Hours per day, ${days[0]?.label} to ${days.at(-1)?.label}`;

  return (
    <figure className="flex flex-col gap-3">
      <figcaption className="font-medium">Hours per day</figcaption>
      <div className="h-56 w-full" role="img" aria-label={summary}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: 0 }} barCategoryGap="20%">
            <CartesianGrid vertical={false} stroke="var(--line)" strokeWidth={1} />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={{ stroke: "var(--line)" }}
              tick={{ fill: "var(--text-muted)", fontSize: 12 }}
              interval="preserveStartEnd"
              minTickGap={8}
            />
            <YAxis
              ticks={ticks}
              domain={[0, ticks.at(-1) ?? 1]}
              tickFormatter={hoursTick}
              tickLine={false}
              axisLine={false}
              tick={{ fill: "var(--text-muted)", fontSize: 12, fontFamily: "var(--font-mono)" }}
              width={48}
            />
            <Tooltip
              cursor={{ fill: "var(--surface)" }}
              content={({ active, payload }) => <DayTooltip active={active} payload={payload} format={format} />}
              isAnimationActive={false}
            />
            <Bar dataKey="hours" fill="var(--brand)" maxBarSize={24} radius={[4, 4, 0, 0]} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <details className="text-muted-foreground">
        <summary className="w-fit cursor-pointer rounded-sm outline-none select-none focus-visible:ring-2 focus-visible:ring-ring">
          Show as table
        </summary>
        <table className="mt-2 w-full max-w-sm text-left">
          <caption className="sr-only">{summary}</caption>
          <thead>
            <tr>
              <th scope="col" className="py-1 font-normal">
                Day
              </th>
              <th scope="col" className="py-1 text-right font-normal">
                Time
              </th>
            </tr>
          </thead>
          <tbody className="text-foreground">
            {days.map((d) => (
              <tr key={d.key} className="border-t border-line">
                <th scope="row" className="py-1 font-normal">
                  {d.label}
                </th>
                <td className="tabular py-1 text-right">{formatDuration(Math.floor(d.ms / 1000), format)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}

type TooltipProps = { active?: boolean; payload?: ReadonlyArray<{ payload?: unknown }>; format: DurationFormat };

function DayTooltip({ active, payload, format }: TooltipProps) {
  const point = payload?.[0]?.payload as Point | undefined;
  if (!active || !point) return null;
  return (
    <div className="rounded-sm bg-popover px-2.5 py-1.5 text-sm shadow-md">
      <div className="text-muted-foreground">{point.label}</div>
      <div className="tabular">{formatDuration(Math.floor(point.ms / 1000), format)}</div>
    </div>
  );
}
