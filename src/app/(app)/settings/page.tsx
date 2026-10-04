import type { Metadata } from "next";
import { PageHeader } from "@/components/shell/PageHeader";
import { SettingsForm } from "@/components/settings/SettingsForm";

export const metadata: Metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <>
      <PageHeader title="Settings" />
      <SettingsForm />
    </>
  );
}
