"use client";

import { useState } from "react";
import { Plus, Tag as TagIcon } from "lucide-react";
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
import { useTagActions, useTags } from "@/lib/queries/catalog";

type Props = {
  value: string[];
  onChange: (tagIds: string[]) => void;
  variant?: "compact" | "field";
  disabled?: boolean;
};

/** Multi-select tag picker; stays open while you tick tags, and creates new ones inline. */
export function TagPicker({ value, onChange, variant = "compact", disabled }: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const { data: tags = [] } = useTags();
  const { create } = useTagActions();

  const selected = tags.filter((t) => value.includes(t.id));
  const trimmed = search.trim();
  const exactMatch = tags.some((t) => t.name.toLowerCase() === trimmed.toLowerCase());

  const toggle = (id: string) => onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);

  const createTag = () =>
    create.mutate(trimmed, {
      onSuccess: (tag) => {
        onChange([...value, tag.id]);
        setSearch("");
      },
    });

  const label =
    selected.length === 0 ? "Tags" : selected.length <= 2 ? selected.map((t) => t.name).join(", ") : `${selected.length} tags`;

  return (
    <Popover open={open} onOpenChange={(o) => (setOpen(o), o || setSearch(""))}>
      <PopoverTrigger asChild>
        <Button
          variant={variant === "field" ? "outline" : "ghost"}
          size={variant === "field" ? "sm" : "icon"}
          disabled={disabled}
          aria-label={selected.length ? `Tags: ${selected.map((t) => t.name).join(", ")}` : "Add tags"}
          className={cn(
            variant === "field" ? "h-9 w-full min-w-0 justify-start" : "relative",
            selected.length === 0 ? "text-muted-foreground" : variant === "compact" && "text-brand hover:text-brand",
          )}
        >
          <TagIcon strokeWidth={1.75} />
          {variant === "field" && <span className="truncate">{label}</span>}
          {variant === "compact" && selected.length > 0 && (
            <span className="tabular absolute -top-0.5 -right-0.5 text-[10px] leading-none">{selected.length}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 p-0">
        <Command loop>
          <CommandInput placeholder="Find or create a tag…" value={search} onValueChange={setSearch} />
          <CommandList className="max-h-64">
            <CommandEmpty>{trimmed ? "No matching tag." : "No tags yet. Type to create one."}</CommandEmpty>
            {tags.length > 0 && (
              <CommandGroup>
                {tags.map((t) => (
                  <CommandItem
                    key={t.id}
                    value={`${t.name} ${t.id}`}
                    data-checked={value.includes(t.id)}
                    onSelect={() => toggle(t.id)}
                  >
                    <span className="truncate">{t.name}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {trimmed && !exactMatch && (
              <>
                <CommandSeparator />
                <CommandGroup>
                  <CommandItem value={`__create__ ${trimmed}`} onSelect={createTag} disabled={create.isPending}>
                    <Plus />
                    Create tag &ldquo;<span className="truncate">{trimmed}</span>&rdquo;
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
