"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, FileUp, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { readImport, type ImportProblem, type ImportRow } from "@/lib/csv-import";
import { runImport, type ImportResult } from "@/lib/queries/import";
import { useSettings } from "@/lib/queries/profile";
import { useWorkspace } from "@/lib/workspace";
import { dayKey } from "@/lib/time";

const MAX_BYTES = 10 * 1024 * 1024;

/** Settings → Import: time entries from a Tickr or Toggl CSV export. */
export function ImportSettings() {
  const { timeZone } = useSettings();
  const { workspace, workspaceId } = useWorkspace();
  const queryClient = useQueryClient();
  const [file, setFile] = useState<{ name: string; rows: ImportRow[]; problems: ImportProblem[] } | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);

  async function choose(event: React.ChangeEvent<HTMLInputElement>) {
    const picked = event.target.files?.[0];
    event.target.value = "";
    setResult(null);
    if (!picked) return;
    if (picked.size > MAX_BYTES) return toast.error("That file is over 10 MB. Split it and import the parts.");
    const { rows, problems } = readImport(await picked.text(), timeZone);
    setFile({ name: picked.name, rows, problems });
  }

  async function start() {
    if (!file) return;
    setProgress(0);
    try {
      const outcome = await runImport(file.rows, setProgress, workspaceId);
      setResult({ ...outcome, problems: [...file.problems, ...outcome.problems].sort((a, b) => a.line - b.line) });
      setFile(null);
      toast.success(`${outcome.imported} ${outcome.imported === 1 ? "entry" : "entries"} imported`);
    } catch (e) {
      console.error("Import failed", e);
      toast.error("The import stopped. Entries added so far were kept; check them, then try the rest.");
    } finally {
      setProgress(null);
      for (const key of [["entries"], ["projects"], ["clients"], ["tags"]]) queryClient.invalidateQueries({ queryKey: key });
    }
  }

  const days = file?.rows.map((r) => dayKey(r.startAt, timeZone)).sort() ?? [];
  const newNames = (pick: (r: ImportRow) => string[]) => new Set(file?.rows.flatMap(pick).map((n) => n.toLowerCase())).size;

  return (
    <div className="flex max-w-xl flex-col items-start gap-3">
      <p className="text-muted-foreground">
        Bring in time entries from a CSV file: a Tickr export, or a Toggl Track detailed report export. Projects, clients
        and tags are matched by name and created if they&apos;re new.
      </p>

      {!file && progress === null && (
        <Button variant="outline" asChild>
          <label className="cursor-pointer">
            <FileUp />
            Choose a CSV file
            <input type="file" accept=".csv,text/csv" onChange={choose} className="sr-only" />
          </label>
        </Button>
      )}

      {file && progress === null && (
        <div className="flex w-full flex-col gap-3 rounded-md p-4 shadow-sm">
          <p className="font-medium">{file.name}</p>
          {file.rows.length > 0 ? (
            <ul className="list-disc pl-5 text-muted-foreground">
              <li>
                {file.rows.length} {file.rows.length === 1 ? "entry" : "entries"}, {days[0]} to {days.at(-1)}
              </li>
              <li>
                {newNames((r) => (r.project ? [r.project] : []))} projects, {newNames((r) => (r.client ? [r.client] : []))} clients,{" "}
                {newNames((r) => r.tags)} tags named
              </li>
              <li>Times are read in your time zone, {timeZone}.</li>
              <li>Imported into {workspace ? `the ${workspace.name} workspace` : "your personal space"}.</li>
            </ul>
          ) : (
            <p className="text-danger">No entries could be read from this file.</p>
          )}
          <Problems problems={file.problems} label="won't be imported" />
          <div className="flex gap-2">
            <Button onClick={start} disabled={file.rows.length === 0}>
              Import {file.rows.length} {file.rows.length === 1 ? "entry" : "entries"}
            </Button>
            <Button variant="ghost" onClick={() => setFile(null)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {progress !== null && (
        <p role="status" className="flex items-center gap-2">
          <Loader2 className="size-4 animate-spin" aria-hidden />
          Importing… {progress} done
        </p>
      )}

      {result && (
        <div className="flex w-full flex-col gap-2 rounded-md p-4 shadow-sm" role="status">
          <p className="flex items-center gap-2 font-medium">
            <CheckCircle2 className="size-4 text-brand" aria-hidden />
            {result.imported} {result.imported === 1 ? "entry" : "entries"} imported
          </p>
          {result.notes.map((note) => (
            <p key={note} className="text-muted-foreground">
              {note}
            </p>
          ))}
          <Problems problems={result.problems} label="skipped" />
        </div>
      )}
    </div>
  );
}

function Problems({ problems, label }: { problems: ImportProblem[]; label: string }) {
  if (!problems.length) return null;
  const shown = problems.slice(0, 8);
  return (
    <details className="text-muted-foreground">
      <summary className="cursor-pointer rounded-sm text-danger outline-none focus-visible:ring-2 focus-visible:ring-ring">
        {problems.length} {problems.length === 1 ? "row" : "rows"} {label}
      </summary>
      <ul className="mt-2 flex flex-col gap-1">
        {shown.map((p) => (
          <li key={`${p.line}-${p.message}`}>
            Line {p.line}: {p.message}
          </li>
        ))}
        {problems.length > shown.length && <li>…and {problems.length - shown.length} more.</li>}
      </ul>
    </details>
  );
}
