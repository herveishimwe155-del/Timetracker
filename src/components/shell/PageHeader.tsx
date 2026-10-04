export function PageHeader({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <header className="flex h-12 items-center justify-between gap-4">
      <h1 className="text-base font-medium tracking-tight">{title}</h1>
      {children}
    </header>
  );
}
