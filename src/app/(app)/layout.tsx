import { redirect } from "next/navigation";
import { AppCommandsProvider } from "@/components/command/AppCommands";
import { MonitoringProvider } from "@/components/providers/MonitoringProvider";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { Sidebar } from "@/components/shell/Sidebar";
import { TimerBar } from "@/components/timer/TimerBar";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // The proxy already redirects signed-out visitors; this verifies the session again
  // where the pages render, so a proxy misconfiguration can't expose them.
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims.sub) redirect("/login");

  return (
    <MonitoringProvider userId={data.claims.sub}>
      <QueryProvider>
        <AppCommandsProvider>
          <a
            href="#main"
            className="sr-only rounded-sm bg-brand px-3 py-2 font-medium text-primary-foreground focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50"
          >
            Skip to content
          </a>
          <div className="flex min-h-dvh">
            <Sidebar email={typeof data.claims.email === "string" ? data.claims.email : null} />
            <div className="flex min-w-0 flex-1 flex-col">
              <TimerBar />
              <main id="main" tabIndex={-1} className="w-full min-w-0 flex-1 px-4 pb-8 outline-none md:px-6">
                {children}
              </main>
            </div>
          </div>
        </AppCommandsProvider>
      </QueryProvider>
    </MonitoringProvider>
  );
}
