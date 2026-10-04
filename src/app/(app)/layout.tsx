import { Sidebar } from "@/components/shell/Sidebar";
import { TimerBar } from "@/components/timer/TimerBar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <TimerBar />
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-8 md:px-6">{children}</main>
      </div>
    </div>
  );
}
