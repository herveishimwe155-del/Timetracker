"use client";

import { useEffect, useState } from "react";
import { FolderKanban, Play, Square } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TimerDigits } from "./TimerDigits";

/**
 * Placeholder timer bar (phase 1). It ticks locally so the layout and digits can be
 * checked, but nothing is saved: start/stop moves to server time in phase 3.
 */
export function TimerBar() {
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const running = startedAt !== null;

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, [running]);

  const elapsed = running ? Math.floor((now - startedAt) / 1000) : 0;

  function toggle() {
    const t = Date.now();
    setNow(t);
    setStartedAt(running ? null : t);
  }

  return (
    <div className="sticky top-0 z-10 flex h-12 items-center gap-2 border-b border-line bg-background/95 px-3 backdrop-blur supports-[backdrop-filter]:bg-background/80 md:px-4">
      <Input
        aria-label="What are you working on?"
        placeholder="What are you working on?"
        className="h-8 min-w-0 flex-1 border-transparent bg-transparent shadow-none dark:bg-transparent focus-visible:border-line"
      />
      <Button
        variant="ghost"
        size="sm"
        disabled
        className="hidden text-muted-foreground sm:inline-flex"
        title="Projects arrive in phase 4"
      >
        <FolderKanban strokeWidth={1.75} />
        No project
      </Button>
      <TimerDigits seconds={elapsed} size="lg" running={running} className="w-[8ch] text-right" />
      <Button
        size="icon"
        onClick={toggle}
        aria-label={running ? "Stop timer" : "Start timer"}
        aria-pressed={running}
        className={cn("size-8 rounded-full", running && "animate-glow")}
      >
        {running ? <Square className="fill-current" /> : <Play className="fill-current" />}
      </Button>
    </div>
  );
}
