"use client";

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppCommands } from "@/components/command/AppCommands";

export function NewEntryButton() {
  const { openEditor, openPalette } = useAppCommands();
  return (
    <div className="flex items-center gap-2">
      <Button variant="ghost" size="sm" onClick={openPalette} className="hidden text-muted-foreground sm:inline-flex">
        Commands <kbd className="tabular text-xs">Ctrl K</kbd>
      </Button>
      <Button variant="outline" size="sm" onClick={() => openEditor({ mode: "create" })} aria-keyshortcuts="N">
        <Plus />
        Add entry
      </Button>
    </div>
  );
}
