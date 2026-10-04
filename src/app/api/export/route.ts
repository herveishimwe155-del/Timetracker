import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { fetchAllPages } from "@/lib/supabase/paginate";
import { safeTimeZone } from "@/lib/auth/redirect";
import { csvRows, daysIn, matchesFilters, rangeInstants, toCsv, CSV_HEADER } from "@/lib/reports";

const dayKey = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const choice = z.union([z.literal("all"), z.literal("none"), z.uuid()]);

const params = z
  .object({
    from: dayKey,
    to: dayKey, // exclusive
    client: choice.default("all"),
    project: choice.default("all"),
    tag: z.union([z.literal("all"), z.uuid()]).default("all"),
    billable: z.enum(["all", "billable", "non-billable"]).default("all"),
  })
  .refine((p) => p.from < p.to, "from must be before to")
  .refine((p) => daysIn({ from: p.from, to: p.to }).length <= 366, "Export at most a year at a time");

/**
 * GET /api/export?from=YYYY-MM-DD&to=YYYY-MM-DD[&client=&project=&tag=&billable=]
 * Downloads the signed-in user's finished entries that start in the range, as CSV,
 * with the same filters as the Reports page. Row-level security limits it to their rows.
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth?.claims.sub) return NextResponse.json({ error: "Sign in to export." }, { status: 401 });

  const parsed = params.safeParse(Object.fromEntries(request.nextUrl.searchParams));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }
  const p = parsed.data;

  try {
    const { data: profile } = await supabase.from("profiles").select("time_zone").maybeSingle();
    const timeZone = safeTimeZone(profile?.time_zone);
    const { fromMs, toMs } = rangeInstants({ from: p.from, to: p.to }, timeZone);

    const [entries, projects, clients, tags] = await Promise.all([
      fetchAllPages((from, to) =>
        supabase
          .from("time_entries")
          .select("id, start_at, stop_at, description, project_id, billable, time_entry_tags(tag_id)")
          .not("stop_at", "is", null)
          .gte("start_at", new Date(fromMs).toISOString())
          .lt("start_at", new Date(toMs).toISOString())
          .order("start_at")
          .order("id")
          .range(from, to),
      ),
      supabase.from("projects").select("id, name, color, client_id"),
      supabase.from("clients").select("id, name"),
      supabase.from("tags").select("id, name"),
    ]);
    if (projects.error || clients.error || tags.error) throw projects.error ?? clients.error ?? tags.error;

    const projectMap = new Map(projects.data.map((x) => [x.id, x]));
    const filters = { clientId: p.client, projectId: p.project, tagId: p.tag, billable: p.billable };
    const finished = entries
      .filter((e): e is typeof e & { stop_at: string } => e.stop_at !== null)
      .filter((e) => matchesFilters(e, filters, projectMap));

    const csv = toCsv([
      CSV_HEADER,
      ...csvRows({ entries: finished, timeZone, projects: projects.data, clients: clients.data, tags: tags.data }),
    ]);
    const lastDay = new Date(Date.parse(`${p.to}T00:00:00Z`) - 86_400_000).toISOString().slice(0, 10);

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="time-entries_${p.from}_to_${lastDay}.csv"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    console.error("CSV export failed", error);
    return NextResponse.json({ error: "The export failed. Try again." }, { status: 500 });
  }
}
