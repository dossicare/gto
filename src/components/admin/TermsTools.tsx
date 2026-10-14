"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CloudDownloadIcon } from "lucide-react";
import { toast } from "sonner";
import { addTermsSnapshotAction, fetchOfficialTermsAction } from "@/app/admin/_actions/terms";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";

/** Save the published general terms as a new snapshot, from the official site or pasted HTML. */
export function TermsTools() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [html, setHtml] = useState("");

  function fetchOfficial() {
    start(async () => {
      const result = await fetchOfficialTermsAction();
      if (!result.ok) return void toast.error(result.error);
      toast.success(`Official terms saved (snapshot ${result.data.revision})`, {
        description: "If the text had not changed, the existing snapshot was kept.",
      });
      router.refresh();
    });
  }

  function savePasted() {
    start(async () => {
      const result = await addTermsSnapshotAction(html);
      if (!result.ok) return void toast.error(result.error);
      toast.success(`Snapshot ${result.data.revision} saved`);
      setHtml("");
      router.refresh();
    });
  }

  return (
    <div className="grid gap-6">
      <div className="grid gap-2">
        <Button type="button" size="lg" onClick={fetchOfficial} disabled={pending} className="w-full sm:w-fit">
          <CloudDownloadIcon /> {pending ? "Working…" : "Fetch the official terms now"}
        </Button>
        <p className="text-sm text-muted-foreground">
          Reads the published terms from the official GTO site and saves them as a new snapshot (only if the text changed).
        </p>
      </div>

      <Field>
        <FieldLabel htmlFor="paste-terms">Or paste the terms as HTML</FieldLabel>
        <Textarea id="paste-terms" rows={8} value={html} onChange={(e) => setHtml(e.target.value)} placeholder="<h2>…</h2><p>…</p>" className="font-mono text-sm" />
        <FieldDescription>
          Scripts, styles and unsafe links are removed when visitors see the page. The pasted text is stored as you enter it.
        </FieldDescription>
        <Button type="button" variant="outline" onClick={savePasted} disabled={pending || html.trim() === ""} className="w-full sm:w-fit">
          Save as a new snapshot
        </Button>
      </Field>
    </div>
  );
}
