import type { Metadata } from "next";
import { BarChart3 } from "lucide-react";
import { EmptyState } from "@/components/shell/EmptyState";
import { PageHeader } from "@/components/shell/PageHeader";

export const metadata: Metadata = { title: "Reports" };

export default function ReportsPage() {
  return (
    <>
      <PageHeader title="Reports" />
      <EmptyState icon={BarChart3} title="Nothing to report yet">
        Once you track time, your weekly hours and project breakdown will show here.
      </EmptyState>
    </>
  );
}
