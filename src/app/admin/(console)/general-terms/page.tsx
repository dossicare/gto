import type { Metadata } from "next";
import { AdminPageHeader } from "@/components/admin/AdminPage";
import { DeleteSnapshotButton } from "@/components/admin/DangerZones";
import { TermsTools } from "@/components/admin/TermsTools";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdmin } from "@/lib/auth";
import { sanitizeTerms } from "@/lib/sanitize";
import { formatCairo } from "@/lib/text";

export const metadata: Metadata = { title: "Admin · General Terms" };

export default async function AdminGeneralTerms() {
  const { repo } = await requireAdmin();
  const snapshots = await repo.snapshots();

  return (
    <>
      <AdminPageHeader title="General Terms" description="Visitors see the newest snapshot. Older ones are kept until you delete them." />

      <Card className="mb-5">
        <CardHeader>
          <CardTitle>Add a snapshot</CardTitle>
        </CardHeader>
        <CardContent>
          <TermsTools />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Snapshots</CardTitle>
          <CardDescription>{snapshots.length === 0 ? "None saved yet." : `${snapshots.length} saved.`}</CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible>
            {snapshots.map((s, i) => (
              <AccordionItem key={s.revision} value={String(s.revision)}>
                <AccordionTrigger className="text-base">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">Snapshot {s.revision}</span>
                    {i === 0 && <Badge className="bg-ok/10 text-ok">Shown to visitors</Badge>}
                    <span className="text-sm font-normal text-muted-foreground">{formatCairo(s.fetched_at)}</span>
                  </span>
                </AccordionTrigger>
                <AccordionContent className="grid gap-3">
                  <p className="break-all text-xs text-muted-foreground">Source: {s.source_url}{s.sha256 ? ` · SHA-256 ${s.sha256}` : ""}</p>
                  <div className="prose-terms max-h-96 overflow-auto rounded-lg border bg-background p-4" dangerouslySetInnerHTML={{ __html: sanitizeTerms(s.html) }} />
                  <DeleteSnapshotButton revision={s.revision} />
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>
    </>
  );
}
