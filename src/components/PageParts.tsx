import type { ReactNode } from "react";
import { InfoIcon } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";

/** Page heading with an optional one-line description. */
export function PageTitle({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="mb-5 sm:mb-6">
      <h1 className="text-2xl font-extrabold tracking-tight text-navy sm:text-3xl">{title}</h1>
      {children && <p className="mt-1 text-muted-foreground">{children}</p>}
    </div>
  );
}

/** Shown on public pages until a Supabase project has been connected. */
export function SetupNotice() {
  return (
    <Alert>
      <InfoIcon />
      <AlertTitle>The database is not connected yet.</AlertTitle>
      <AlertDescription>
        Add <code>SUPABASE_URL</code> and <code>SUPABASE_ANON_KEY</code> to the environment, then reload.
      </AlertDescription>
    </Alert>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <Card>
      <CardContent className="py-6 text-center text-muted-foreground">{children}</CardContent>
    </Card>
  );
}

/** A labelled block of stored text (keeps line breaks, wraps long words on narrow screens). */
export function Field({ label, value, fallback = "N/A" }: { label: string; value?: string | null; fallback?: string }) {
  const shown = value && value.trim() ? value : fallback;
  return (
    <section className="min-w-0">
      <h3 className="mb-1 text-base font-extrabold text-navy sm:text-lg">{label}</h3>
      <p className="whitespace-pre-wrap break-words leading-relaxed">{shown}</p>
    </section>
  );
}
