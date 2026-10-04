"use client";

import { useMemo, useState } from "react";
import { FolderKanban, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { nextProjectColor } from "@/lib/project-colors";
import { useClients, useProjectActions, useProjects, type Project } from "@/lib/queries/catalog";
import { ProjectDot } from "./ProjectDot";

type Props = {
  value: string | null;
  onChange: (projectId: string | null) => void;
  /** "compact" hides the label on small screens (timer bar); "field" is full width (forms). */
  variant?: "compact" | "field";
  disabled?: boolean;
};

/** Keyboard-searchable project picker, grouped by client, that can create a project inline. */
export function ProjectPicker({ value, onChange, variant = "compact", disabled }: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const { data: projects = [] } = useProjects();
  const { data: clients = [] } = useClients();
  const { create } = useProjectActions();

  const selected = projects.find((p) => p.id === value) ?? null;
  const clientName = (id: string | null) => clients.find((c) => c.id === id)?.name ?? null;

  // Active projects grouped by client ("No client" first); keep the current one even if archived.
  const groups = useMemo(() => {
    const visible = projects.filter((p) => !p.archived || p.id === value);
    const map = new Map<string, { label: string; projects: Project[] }>();
    for (const p of visible) {
      const key = p.client_id ?? "";
      const label = p.client_id ? (clients.find((c) => c.id === p.client_id)?.name ?? "Client") : "No client";
      if (!map.has(key)) map.set(key, { label, projects: [] });
      map.get(key)!.projects.push(p);
    }
    return [...map.entries()]
      .sort(([a, ga], [b, gb]) => (a === "" ? -1 : b === "" ? 1 : ga.label.localeCompare(gb.label)))
      .map(([key, g]) => ({ key, ...g }));
  }, [projects, clients, value]);

  const trimmed = search.trim();
  const exactMatch = projects.some((p) => !p.client_id && p.name.toLowerCase() === trimmed.toLowerCase());

  const choose = (id: string | null) => {
    onChange(id);
    setOpen(false);
    setSearch("");
  };

  const createProject = () => {
    create.mutate(
      { name: trimmed, color: nextProjectColor(projects.map((p) => p.color)) },
      { onSuccess: (project) => choose(project.id) },
    );
  };

  return (
    <Popover open={open} onOpenChange={(o) => (setOpen(o), o || setSearch(""))}>
      <PopoverTrigger asChild>
        <Button
          variant={variant === "field" ? "outline" : "ghost"}
          size="sm"
          disabled={disabled}
          aria-label={selected ? `Project: ${selected.name}` : "Choose a project"}
          className={cn(
            "min-w-0 justify-start",
            variant === "field" ? "h-9 w-full" : "max-w-48",
            !selected && "text-muted-foreground",
          )}
        >
          {selected ? <ProjectDot color={selected.color} /> : <FolderKanban strokeWidth={1.75} />}
          <span className={cn("truncate", variant === "compact" && "hidden sm:inline")}>
            {selected ? selected.name : "No project"}
          </span>
          {selected && variant === "field" && clientName(selected.client_id) && (
            <span className="truncate text-muted-foreground">· {clientName(selected.client_id)}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 p-0">
        <Command loop>
          <CommandInput placeholder="Find or create a project…" value={search} onValueChange={setSearch} />
          <CommandList className="max-h-72">
            <CommandEmpty>{trimmed ? "No matching project." : "No projects yet."}</CommandEmpty>
            {value && (
              <CommandGroup>
                <CommandItem value="__none__ no project" onSelect={() => choose(null)}>
                  <X />
                  No project
                </CommandItem>
              </CommandGroup>
            )}
            {groups.map((group) => (
              <CommandGroup key={group.key} heading={group.label}>
                {group.projects.map((p) => (
                  <CommandItem
                    key={p.id}
                    value={`${p.name} ${group.label} ${p.id}`}
                    data-checked={p.id === value}
                    onSelect={() => choose(p.id)}
                  >
                    <ProjectDot color={p.color} />
                    <span className="truncate">{p.name}</span>
                    {p.archived && <span className="text-xs text-muted-foreground">archived</span>}
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
            {trimmed && !exactMatch && (
              <>
                <CommandSeparator />
                <CommandGroup>
                  <CommandItem value={`__create__ ${trimmed}`} onSelect={createProject} disabled={create.isPending}>
                    <Plus />
                    Create project &ldquo;<span className="truncate">{trimmed}</span>&rdquo;
                  </CommandItem>
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
