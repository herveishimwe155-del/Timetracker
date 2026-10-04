import type { Metadata } from "next";
import { Settings } from "lucide-react";
import { EmptyState } from "@/components/shell/EmptyState";
import { PageHeader } from "@/components/shell/PageHeader";

export const metadata: Metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <>
      <PageHeader title="Settings" />
      <EmptyState icon={Settings} title="Settings are coming">
        Time zone, week start and duration format will live here.
      </EmptyState>
    </>
  );
}
