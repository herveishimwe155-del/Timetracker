import type { Metadata } from "next";
import { OverviewDashboard } from "@/components/overview/OverviewDashboard";
import { PageHeader } from "@/components/shell/PageHeader";

export const metadata: Metadata = { title: "Overview" };

export default function OverviewPage() {
  return (
    <>
      <PageHeader title="Overview" />
      <OverviewDashboard />
    </>
  );
}
