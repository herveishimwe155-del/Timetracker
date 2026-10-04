import type { LucideIcon } from "lucide-react";

type EmptyStateProps = {
  icon: LucideIcon;
  title: string;
  children: React.ReactNode;
};

export function EmptyState({ icon: Icon, title, children }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-md border border-dashed border-line px-6 py-16 text-center">
      <Icon className="size-5 text-muted-foreground" strokeWidth={1.5} aria-hidden />
      <h2 className="font-medium">{title}</h2>
      <p className="max-w-sm text-muted-foreground">{children}</p>
    </div>
  );
}
