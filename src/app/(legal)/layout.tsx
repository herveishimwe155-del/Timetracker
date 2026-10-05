import Link from "next/link";
import { Logo } from "@/components/shell/Logo";

/** Public pages (pricing, privacy policy, terms); open to everyone. Articles keep a reading width. */
export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-5xl flex-col px-4 py-8">
      <header className="mb-10 flex items-center justify-between">
        <Link href="/" className="rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <Logo />
        </Link>
        <nav aria-label="Site" className="flex gap-4 text-muted-foreground">
          <Link href="/pricing" className="rounded-sm outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring">
            Pricing
          </Link>
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
        className="flex-1 leading-relaxed [&>article]:mx-auto [&>article]:max-w-2xl [&>article_a]:text-brand [&>article_a]:underline [&>article_a]:underline-offset-4 hover:[&>article_a]:decoration-2 [&>article_h1]:text-2xl [&>article_h1]:font-semibold [&>article_h1]:tracking-tight [&>article_h2]:mt-8 [&>article_h2]:mb-2 [&>article_h2]:text-base [&>article_h2]:font-medium [&>article_li]:mt-1 [&>article_p]:mt-3 [&>article_ul]:mt-3 [&>article_ul]:list-disc [&>article_ul]:pl-5"
      >
        {children}
      </main>
    </div>
  );
}
