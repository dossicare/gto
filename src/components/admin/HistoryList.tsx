"use client";

import { RotateCcwIcon } from "lucide-react";
import { restoreOfferRevisionAction } from "@/app/admin/_actions/offers";
import { restoreTemplateRevisionAction } from "@/app/admin/_actions/templates";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { formatCairo } from "@/lib/text";
import { ConfirmAction } from "./ConfirmAction";

export interface HistoryEntry {
  revision: number;
  saved_at: string;
  action: string;
  /** The stored record for that revision, as pretty-printed JSON (administrators only). */
  json: string;
}

/** Every saved revision. Restoring saves an old revision as a NEW one; nothing is rewritten. */
export function HistoryList({
  kind,
  id,
  currentRevision,
  entries,
}: {
  kind: "offer" | "template";
  id: string;
  currentRevision: number;
  entries: HistoryEntry[];
}) {
  if (entries.length === 0) return <p className="text-sm text-muted-foreground">No history yet.</p>;
  return (
    <Accordion type="single" collapsible>
      {entries.map((e) => (
        <AccordionItem key={e.revision} value={String(e.revision)}>
          <AccordionTrigger className="text-base">
            <span className="flex flex-wrap items-center gap-2">
              <span className="font-semibold">Revision {e.revision}</span>
              {e.revision === currentRevision && <Badge variant="secondary">Current</Badge>}
              <span className="text-sm font-normal text-muted-foreground">
                {e.action} · {formatCairo(e.saved_at)}
              </span>
            </span>
          </AccordionTrigger>
          <AccordionContent className="grid gap-3">
            <pre className="max-h-80 overflow-auto rounded-lg border bg-background p-3 text-xs leading-relaxed whitespace-pre-wrap break-words">{e.json}</pre>
            {e.revision !== currentRevision && (
              <ConfirmAction
                trigger={<><RotateCcwIcon /> Restore this revision</>}
                title={`Restore revision ${e.revision}?`}
                description="It is saved as a new revision on top of the current one. The current version stays in the history."
                confirmLabel="Restore"
                confirmVariant="default"
                successMessage={`Revision ${e.revision} restored as a new revision`}
                className="w-full sm:w-fit"
                run={() =>
                  kind === "offer"
                    ? restoreOfferRevisionAction(id, e.revision, currentRevision)
                    : restoreTemplateRevisionAction(id, e.revision, currentRevision)
                }
              />
            )}
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
