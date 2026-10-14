"use client";

import type { ReactNode } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export interface Panel {
  id: string;
  label: string;
  content: ReactNode;
}

/**
 * Phone: one panel at a time behind tabs. Large screens (`lg`): every panel side by side, no tabs.
 * Every panel stays mounted, so the text is always selectable and searchable.
 */
export function ResponsivePanels({ panels }: { panels: Panel[] }) {
  if (panels.length === 0) return null;
  return (
    <Tabs defaultValue={panels[0].id} className="gap-3">
      {panels.length > 1 && (
        <TabsList className="grid h-auto w-full grid-cols-2 bg-card p-1 ring-1 ring-border group-data-horizontal/tabs:h-auto lg:hidden" aria-label="Language">
          {panels.map((p) => (
            <TabsTrigger
              key={p.id}
              value={p.id}
              className="h-auto min-h-11 text-base data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              {p.label}
            </TabsTrigger>
          ))}
        </TabsList>
      )}
      <div className={panels.length > 1 ? "grid gap-5 lg:grid-cols-2" : "grid gap-5"}>
        {panels.map((p) => (
          <TabsContent
            key={p.id}
            value={p.id}
            forceMount
            className="min-w-0 text-base data-[state=inactive]:hidden lg:data-[state=inactive]:block"
          >
            {p.content}
          </TabsContent>
        ))}
      </div>
    </Tabs>
  );
}
