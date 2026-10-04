"use client";

import { Archive } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export function ArchivedToggle({ value, onChange, count }: { value: boolean; onChange: (v: boolean) => void; count: number }) {
  return (
    <Button
      variant="ghost"
      size="sm"
      aria-pressed={value}
      onClick={() => onChange(!value)}
      className={cn("text-muted-foreground", value && "text-foreground")}
    >
      <Archive strokeWidth={1.75} />
      {value ? "Hide archived" : "Show archived"}
      <span className="tabular text-xs">{count}</span>
    </Button>
  );
}
