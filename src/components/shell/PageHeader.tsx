export function PageHeader({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <header className="flex h-12 items-center justify-between gap-4">
      <h1 className="text-base font-medium tracking-tight">
        <span className="sr-only">{title}</span>
        {/* Words rise in one after another (styles: .title-word in globals.css). */}
        <span aria-hidden>
          {title.split(" ").map((word, i) => (
            <span key={i} className="title-word" style={{ "--i": i } as React.CSSProperties}>
              {word}
              {i < title.split(" ").length - 1 && " "}
            </span>
          ))}
        </span>
      </h1>
      {children}
    </header>
  );
}
