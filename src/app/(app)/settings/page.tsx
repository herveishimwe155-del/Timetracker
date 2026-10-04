import type { Metadata } from "next";
import { PageHeader } from "@/components/shell/PageHeader";
import { SettingsForm } from "@/components/settings/SettingsForm";
import { ThemeSettings } from "@/components/settings/ThemeSettings";

export const metadata: Metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <>
      <PageHeader title="Settings" />
      <div className="flex flex-col gap-10">
        <ThemeSettings />
        <SettingsForm />
      </div>
    </>
  );
}
