import Link from "next/link";
import type { Metadata } from "next";
import { PageHeader } from "@/components/shell/PageHeader";
import { DangerZone, DataSettings, SecuritySettings, ShortcutsList } from "@/components/settings/AccountSettings";
import { SettingsForm } from "@/components/settings/SettingsForm";
import { ThemeSettings } from "@/components/settings/ThemeSettings";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Settings" };

const SECTIONS = [
  { id: "appearance", title: "Appearance" },
  { id: "preferences", title: "Profile and preferences" },
  { id: "security", title: "Account and security" },
  { id: "data", title: "Your data" },
  { id: "shortcuts", title: "Keyboard shortcuts" },
  { id: "danger", title: "Danger zone" },
] as const;

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const email = typeof data?.claims.email === "string" ? data.claims.email : null;

  const content: Record<(typeof SECTIONS)[number]["id"], React.ReactNode> = {
    appearance: <ThemeSettings />,
    preferences: <SettingsForm />,
    security: <SecuritySettings email={email} />,
    data: <DataSettings />,
    shortcuts: <ShortcutsList />,
    danger: <DangerZone />,
  };

  return (
    <>
      <PageHeader title="Settings" />
      <div className="grid gap-10 lg:grid-cols-[12rem_minmax(0,1fr)]">
        <nav aria-label="Settings sections" className="hidden lg:block">
          <ul className="sticky top-16 flex flex-col gap-0.5">
            {SECTIONS.map((s) => (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  className="block rounded-sm px-2 py-1.5 text-muted-foreground outline-none hover:bg-surface hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {s.title}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <div className="flex min-w-0 flex-col gap-12">
          {SECTIONS.map((s) => (
            <section key={s.id} id={s.id} aria-labelledby={`${s.id}-title`} className="flex scroll-mt-16 flex-col gap-4">
              <h2 id={`${s.id}-title`} className="border-b border-line pb-2 text-base font-medium">
                {s.title}
              </h2>
              {content[s.id]}
            </section>
          ))}
          <p className="flex gap-4 text-muted-foreground">
            <Link href="/privacy" className="rounded-sm underline-offset-4 outline-none hover:text-foreground hover:underline focus-visible:ring-2 focus-visible:ring-ring">
              Privacy policy
            </Link>
            <Link href="/terms" className="rounded-sm underline-offset-4 outline-none hover:text-foreground hover:underline focus-visible:ring-2 focus-visible:ring-ring">
              Terms of use
            </Link>
          </p>
        </div>
      </div>
    </>
  );
}
