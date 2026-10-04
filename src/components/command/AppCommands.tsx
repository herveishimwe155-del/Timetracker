"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { EntryEditor, type EditorTarget } from "@/components/entries/EntryEditor";
import {
  entryErrorMessage,
  tagIdsOf,
  useEntryActions,
  useRealtimeSync,
  useRunningEntry,
  type Entry,
  type EntryFields,
} from "@/lib/queries/entries";
import { CommandPalette } from "./CommandPalette";

/** Project, tags and billable chosen in the timer bar before a timer starts. */
export type TimerDraft = { projectId: string | null; tagIds: string[]; billable: boolean };
const EMPTY_DRAFT: TimerDraft = { projectId: null, tagIds: [], billable: false };

type AppCommands = {
  draft: TimerDraft;
  setDraft: React.Dispatch<React.SetStateAction<TimerDraft>>;
  /** Starts a timer with the timer bar's description and draft. */
  startFromBar: () => void;
  /** Stops the running timer, or starts one (focusing the description so you can type). */
  toggleTimer: () => void;
  startTimer: (fields?: Partial<EntryFields>) => void;
  openEditor: (target: EditorTarget) => void;
  openPalette: () => void;
  /** Deletes an entry with an Undo toast. */
  deleteEntry: (entry: Entry) => void;
};

const Context = createContext<AppCommands | null>(null);

export function useAppCommands() {
  const value = useContext(Context);
  if (!value) throw new Error("useAppCommands must be used inside <AppCommandsProvider>");
  return value;
}

/** True when a key press is meant for a text field or an open dialog, not a shortcut. */
function isTyping(event: KeyboardEvent) {
  const el = event.target as HTMLElement | null;
  if (!el) return false;
  if (el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName)) return true;
  return Boolean(document.querySelector("[role=dialog]"));
}

export const TIMER_INPUT_ID = "timer-description";

export function AppCommandsProvider({ children }: { children: React.ReactNode }) {
  const [editor, setEditor] = useState<EditorTarget | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [draft, setDraft] = useState<TimerDraft>(EMPTY_DRAFT);
  const { data: running } = useRunningEntry();
  const { start, stop, remove, create } = useEntryActions();
  useRealtimeSync();

  const onError = useCallback((e: unknown) => toast.error(entryErrorMessage(e)), []);

  const startTimer = useCallback(
    (fields: Partial<EntryFields> = {}) => start.mutate(fields, { onError }),
    [start, onError],
  );

  const startFromBar = useCallback(() => {
    const input = document.getElementById(TIMER_INPUT_ID) as HTMLInputElement | null;
    startTimer({
      description: input?.value.trim() ?? "",
      project_id: draft.projectId,
      tag_ids: draft.tagIds,
      billable: draft.billable,
    });
    setDraft(EMPTY_DRAFT);
  }, [startTimer, draft]);

  const toggleTimer = useCallback(() => {
    if (running) {
      stop.mutate(undefined, { onError });
    } else {
      startFromBar();
      document.getElementById(TIMER_INPUT_ID)?.focus();
    }
  }, [running, stop, startFromBar, onError]);

  const deleteEntry = useCallback(
    (entry: Entry) =>
      remove.mutate(entry, {
        onError,
        onSuccess: (deleted) =>
          toast("Entry deleted", {
            action: {
              label: "Undo",
              onClick: () =>
                create.mutate(
                  {
                    description: deleted.description,
                    project_id: deleted.project_id,
                    billable: deleted.billable,
                    start_at: deleted.start_at,
                    stop_at: deleted.stop_at,
                    tagIds: tagIdsOf(deleted),
                  },
                  { onError },
                ),
            },
          }),
      }),
    [remove, create, onError],
  );

  // Global shortcuts: Ctrl/Cmd+K palette, S start/stop, N new entry.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPaletteOpen((open) => !open);
        return;
      }
      if (event.metaKey || event.ctrlKey || event.altKey || event.repeat || isTyping(event)) return;
      const key = event.key.toLowerCase();
      if (key === "s") {
        event.preventDefault();
        toggleTimer();
      } else if (key === "n") {
        event.preventDefault();
        setEditor({ mode: "create" });
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [toggleTimer]);

  const value = useMemo<AppCommands>(
    () => ({
      draft,
      setDraft,
      startFromBar,
      toggleTimer,
      startTimer,
      openEditor: setEditor,
      openPalette: () => setPaletteOpen(true),
      deleteEntry,
    }),
    [draft, startFromBar, toggleTimer, startTimer, deleteEntry],
  );

  return (
    <Context.Provider value={value}>
      {children}
      <EntryEditor target={editor} onClose={() => setEditor(null)} />
      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} running={running ?? null} />
    </Context.Provider>
  );
}
