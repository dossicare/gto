"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // The server log has the details; the page itself never shows technical text.
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto grid min-h-dvh w-full max-w-md content-center px-4 py-10">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Something went wrong</CardTitle>
          <CardDescription>
            The page could not be loaded. This is usually temporary (for example, the database is waking up). Try again in a moment.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 sm:flex-row">
          <Button onClick={reset} size="lg" className="flex-1">Try again</Button>
          <Button asChild variant="outline" size="lg" className="flex-1">
            <Link href="/">Back to the site</Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
