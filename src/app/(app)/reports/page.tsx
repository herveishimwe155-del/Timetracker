import type { Metadata } from "next";
import { ReportsView } from "@/components/reports/ReportsView";
import { PageHeader } from "@/components/shell/PageHeader";

export const metadata: Metadata = { title: "Reports" };

export default function ReportsPage() {
  return (
    <>
      <PageHeader title="Reports" />
      <ReportsView />
    </>
  );
}
