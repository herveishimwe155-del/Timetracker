import type { Metadata } from "next";
import { EntryList } from "@/components/entries/EntryList";
import { NewEntryButton } from "@/components/entries/NewEntryButton";
import { PageHeader } from "@/components/shell/PageHeader";

export const metadata: Metadata = { title: "Timer" };

export default function TimerPage() {
  return (
    <>
      <PageHeader title="Timer">
        <NewEntryButton />
      </PageHeader>
      <EntryList />
    </>
  );
}
