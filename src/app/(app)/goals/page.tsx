import type { Metadata } from "next";
import { GoalsBoard } from "@/components/goals/GoalsBoard";
import { PageHeader } from "@/components/shell/PageHeader";

export const metadata: Metadata = { title: "Goals" };

export default function GoalsPage() {
  return (
    <>
      <PageHeader title="Goals" />
      <GoalsBoard />
    </>
  );
}
