import { redirect } from "next/navigation";
import { AppCommandsProvider } from "@/components/command/AppCommands";
import { MonitoringProvider } from "@/components/providers/MonitoringProvider";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { Sidebar } from "@/components/shell/Sidebar";
import { GuestBanner } from "@/components/shell/GuestBanner";
import { TimerBar } from "@/components/timer/TimerBar";
import { GuestProvider } from "@/lib/guest";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // Signed-out visitors get guest mode: the app, empty, until they try to save
  // something. The session is verified here, where the pages render.
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims.sub ?? null;
  const guest = !userId;
  // With two-step verification on, a password-only session must enter a code first.
  // (The database enforces this too; this just sends the user to the right page.)
  if (data && userId && data.claims.aal !== "aal2") {
    const { data: ok } = await supabase.rpc("session_assurance_ok");
    if (ok === false) redirect("/verify");
  }

  return (
    <MonitoringProvider userId={userId}>
      <GuestProvider guest={guest}>
        <QueryProvider key={userId ?? "guest"} guest={guest}>
          <AppCommandsProvider>
            <a
              href="#main"
              className="sr-only rounded-sm bg-brand px-3 py-2 font-medium text-primary-foreground focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50"
            >
              Skip to content
            </a>
            {/* Fixed panels over the moving backdrop; only the main panel scrolls. */}
            <div className="flex h-dvh gap-2 overflow-hidden p-2 md:gap-3 md:p-3">
              <Sidebar email={typeof data?.claims.email === "string" ? data.claims.email : null} guest={guest} />
              <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-2 md:gap-3">
                {guest && <GuestBanner />}
                <TimerBar />
                <main id="main" tabIndex={-1} className="glass min-h-0 w-full min-w-0 flex-1 overflow-y-auto px-3 pb-8 outline-none sm:px-4 md:px-6">
                  {children}
                </main>
              </div>
            </div>
          </AppCommandsProvider>
        </QueryProvider>
      </GuestProvider>
    </MonitoringProvider>
  );
}
