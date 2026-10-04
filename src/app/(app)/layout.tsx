import { redirect } from "next/navigation";
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
    <div className="flex min-h-dvh">
      <Sidebar email={typeof data.claims.email === "string" ? data.claims.email : null} />
      <div className="flex min-w-0 flex-1 flex-col">
        <TimerBar />
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-8 md:px-6">{children}</main>
      </div>
    </div>
  );
}
