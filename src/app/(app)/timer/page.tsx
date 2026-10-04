import type { Metadata } from "next";
import { Clock } from "lucide-react";
import { EmptyState } from "@/components/shell/EmptyState";
import { PageHeader } from "@/components/shell/PageHeader";

export const metadata: Metadata = { title: "Timer" };

export default function TimerPage() {
  return (
    <>
      <PageHeader title="Timer" />
      <EmptyState icon={Clock} title="No time entries yet">
        Start the timer above. Your entries will show here, grouped by day with daily totals.
      </EmptyState>
    </>
  );
}
