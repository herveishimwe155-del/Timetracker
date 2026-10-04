import type { Metadata } from "next";
import Link from "next/link";
import { Compass } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-3 px-4 text-center">
      <Compass className="size-5 text-muted-foreground" strokeWidth={1.5} aria-hidden />
      <h1 className="text-base font-medium">Page not found</h1>
      <p className="max-w-sm text-muted-foreground">That page doesn&apos;t exist or has moved.</p>
      <Button asChild className="mt-2">
        <Link href="/timer">Go to the timer</Link>
      </Button>
    </main>
  );
}
