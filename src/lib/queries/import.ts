"use client";

import { createClient } from "@/lib/supabase/client";
import type { ImportProblem, ImportRow } from "@/lib/csv-import";
import { nextProjectColor } from "@/lib/project-colors";
import { inSpace } from "@/lib/workspace";
import { entryErrorMessage } from "./entries";

export type ImportResult = { imported: number; problems: ImportProblem[]; notes: string[] };

const key = (name: string) => name.trim().toLowerCase();
const CHUNK = 50;

/**
 * Writes imported rows: creates the clients, projects and tags they name (matching
 * existing ones by name, ignoring case), then the entries in batches. A batch that
 * fails is retried row by row, so one bad row (an overlap, a locked day) only skips itself.
 */
export async function runImport(
  rows: ImportRow[],
  onProgress: (done: number) => void,
  workspaceId: string | null,
): Promise<ImportResult> {
  const supabase = createClient();
  const problems: ImportProblem[] = [];
  const notes: string[] = [];

  const [clientsRes, projectsRes, tagsRes] = await Promise.all([
    inSpace(supabase.from("clients").select("id, name"), workspaceId),
    inSpace(supabase.from("projects").select("id, name, client_id, color"), workspaceId),
    inSpace(supabase.from("tags").select("id, name"), workspaceId),
  ]);
  if (clientsRes.error) throw clientsRes.error;
  if (projectsRes.error) throw projectsRes.error;
  if (tagsRes.error) throw tagsRes.error;

  // Clients
  const clients = new Map(clientsRes.data.map((c) => [key(c.name), c.id]));
  for (const name of new Set(rows.map((r) => r.client).filter((n): n is string => !!n))) {
    if (clients.has(key(name))) continue;
    const { data, error } = await supabase.from("clients").insert({ name: name.slice(0, 200), workspace_id: workspaceId }).select("id").single();
    if (error) notes.push(`Client “${name}” couldn't be created; its projects were imported without a client.`);
    else clients.set(key(name), data.id);
  }

  // Projects (a project is the same if its name and client match)
  const projectKey = (name: string, clientId: string | null) => `${key(name)}|${clientId ?? ""}`;
  const projects = new Map(projectsRes.data.map((p) => [projectKey(p.name, p.client_id), p.id]));
  const colors = projectsRes.data.map((p) => p.color);
  let projectLimitHit = false;
  for (const row of rows) {
    if (!row.project) continue;
    const clientId = row.client ? (clients.get(key(row.client)) ?? null) : null;
    const k = projectKey(row.project, clientId);
    if (projects.has(k) || projectLimitHit) continue;
    const color = nextProjectColor(colors);
    const { data, error } = await supabase
      .from("projects")
      .insert({ name: row.project.slice(0, 200), client_id: clientId, color, workspace_id: workspaceId })
      .select("id")
      .single();
    if (error) {
      if (error.code === "TK402") {
        projectLimitHit = true;
        notes.push("The Free plan's 10-project limit was reached; entries for other new projects were imported without a project.");
      } else notes.push(`Project “${row.project}” couldn't be created; its entries were imported without a project.`);
      projects.set(k, "");
    } else {
      projects.set(k, data.id);
      colors.push(color);
    }
  }

  // Tags
  const tags = new Map(tagsRes.data.map((t) => [key(t.name), t.id]));
  for (const name of new Set(rows.flatMap((r) => r.tags))) {
    if (tags.has(key(name))) continue;
    const { data, error } = await supabase.from("tags").insert({ name: name.slice(0, 100), workspace_id: workspaceId }).select("id").single();
    if (error) notes.push(`Tag “${name}” couldn't be created and was left off its entries.`);
    else tags.set(key(name), data.id);
  }

  const toEntry = (r: ImportRow) => {
    const clientId = r.client ? (clients.get(key(r.client)) ?? null) : null;
    const projectId = r.project ? projects.get(projectKey(r.project, clientId)) || null : null;
    return {
      description: r.description,
      project_id: projectId,
      billable: r.billable,
      start_at: r.startAt.toISOString(),
      stop_at: r.stopAt.toISOString(),
      workspace_id: workspaceId,
    };
  };
  const tagIdsOf = (r: ImportRow) => r.tags.map((t) => tags.get(key(t))).filter((id): id is string => !!id);

  let imported = 0;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK);
    let saved: { row: ImportRow; id: string }[] = [];
    const batch = await supabase.from("time_entries").insert(chunk.map(toEntry)).select("id");
    if (!batch.error) {
      saved = chunk.map((row, j) => ({ row, id: batch.data[j].id }));
    } else {
      // Retry one by one so only the bad rows are skipped.
      for (const row of chunk) {
        const one = await supabase.from("time_entries").insert(toEntry(row)).select("id").single();
        if (one.error) problems.push({ line: row.line, message: entryErrorMessage(one.error) });
        else saved.push({ row, id: one.data.id });
      }
    }
    imported += saved.length;

    const links = saved.flatMap(({ row, id }) => tagIdsOf(row).map((tagId) => ({ time_entry_id: id, tag_id: tagId })));
    if (links.length) {
      const tagged = await supabase.from("time_entry_tags").insert(links);
      if (tagged.error) {
        for (const { row, id } of saved) {
          const ids = tagIdsOf(row);
          if (!ids.length) continue;
          const one = await supabase.from("time_entry_tags").insert(ids.map((tagId) => ({ time_entry_id: id, tag_id: tagId })));
          if (one.error) problems.push({ line: row.line, message: `Entry imported, but its tags weren't: ${entryErrorMessage(one.error)}` });
        }
      }
    }
    onProgress(Math.min(rows.length, i + CHUNK));
  }

  return { imported, problems, notes };
}
