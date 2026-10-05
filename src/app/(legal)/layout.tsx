import Link from "next/link";
import { Logo } from "@/components/shell/Logo";

/** Plain reading layout for the privacy policy and terms; open to everyone. */
export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col px-4 py-8">
      <header className="mb-10 flex items-center justify-between">
        <Link href="/" className="rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <Logo />
        </Link>
        <nav aria-label="Legal" className="flex gap-4 text-muted-foreground">
          <Link href="/privacy" className="rounded-sm outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring">
            Privacy
          </Link>
          <Link href="/terms" className="rounded-sm outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring">
            Terms
          </Link>
        </nav>
      </header>
      <main
        id="main"
        className="flex-1 leading-relaxed [&_a]:text-brand [&_a]:underline [&_a]:underline-offset-4 hover:[&_a]:decoration-2 [&_h1]:text-2xl [&_h1]:font-semibold [&_h1]:tracking-tight [&_h2]:mt-8 [&_h2]:mb-2 [&_h2]:text-base [&_h2]:font-medium [&_li]:mt-1 [&_p]:mt-3 [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:pl-5"
      >
        {children}
      </main>
    </div>
  );
}
