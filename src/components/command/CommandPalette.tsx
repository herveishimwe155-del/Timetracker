"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Play, Plus, Square } from "lucide-react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { footerNav, mainNav } from "@/components/shell/nav";
import { signOut } from "@/lib/auth/actions";
import { tagIdsOf, useEntryPages, type Entry } from "@/lib/queries/entries";
import { useSettings } from "@/lib/queries/profile";
import { useAppCommands } from "./AppCommands";

type Props = { open: boolean; onOpenChange: (open: boolean) => void; running: Entry | null };

export function CommandPalette({ open, onOpenChange, running }: Props) {
  const router = useRouter();
  const commands = useAppCommands();
  const { timeZone } = useSettings();
  const { data } = useEntryPages(timeZone);

  // Up to five recent, distinct descriptions to continue with one keystroke.
  const recent = useMemo(() => {
    const seen = new Set<string>();
    const result: Entry[] = [];
    for (const entry of data?.pages.flatMap((p) => p.entries) ?? []) {
      const key = entry.description.trim();
      if (!key || seen.has(key) || key === running?.description) continue;
      seen.add(key);
      result.push(entry);
      if (result.length === 5) break;
    }
    return result;
  }, [data, running?.description]);

  const run = (action: () => void) => {
    onOpenChange(false);
    action();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="top-1/4 translate-y-0 overflow-hidden p-0 sm:max-w-lg" showCloseButton={false}>
        <DialogTitle className="sr-only">Command palette</DialogTitle>
        <DialogDescription className="sr-only">Start a timer, add an entry or go to a page.</DialogDescription>
        <Command loop>
          <CommandInput placeholder="Type a command or search…" />
          <CommandList className="max-h-80">
            <CommandEmpty>No matching commands.</CommandEmpty>

            <CommandGroup heading="Timer">
              {running ? (
                <CommandItem onSelect={() => run(commands.toggleTimer)}>
                  <Square className="text-brand" />
                  Stop timer{running.description && <span className="truncate text-muted-foreground">· {running.description}</span>}
                  <CommandShortcut>S</CommandShortcut>
                </CommandItem>
              ) : (
                <CommandItem onSelect={() => run(commands.toggleTimer)}>
                  <Play className="text-brand" />
                  Start timer
                  <CommandShortcut>S</CommandShortcut>
                </CommandItem>
              )}
              <CommandItem onSelect={() => run(() => commands.openEditor({ mode: "create" }))}>
                <Plus />
                New time entry
                <CommandShortcut>N</CommandShortcut>
              </CommandItem>
            </CommandGroup>

            {recent.length > 0 && (
              <CommandGroup heading="Continue">
                {recent.map((entry) => (
                  <CommandItem
                    key={entry.id}
                    value={`continue ${entry.description}`}
                    onSelect={() =>
                      run(() =>
                        commands.startTimer({
                          description: entry.description,
                          project_id: entry.project_id,
                          billable: entry.billable,
                          tag_ids: tagIdsOf(entry),
                        }),
                      )
                    }
                  >
                    <Play />
                    <span className="truncate">{entry.description}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            <CommandSeparator />
            <CommandGroup heading="Go to">
              {[...mainNav, ...footerNav].map((item) => (
                <CommandItem key={item.href} value={`go to ${item.label}`} onSelect={() => run(() => router.push(item.href))}>
                  <item.icon />
                  {item.label}
                </CommandItem>
              ))}
            </CommandGroup>

            <CommandSeparator />
            <CommandGroup heading="Account">
              <CommandItem onSelect={() => run(() => void signOut())}>
                <LogOut />
                Sign out
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
