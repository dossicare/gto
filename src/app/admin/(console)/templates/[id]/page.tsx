import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeftIcon, ExternalLinkIcon } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/AdminPage";
import { DeleteTemplateButton, RestoreTemplateButton } from "@/components/admin/DangerZones";
import { HistoryList } from "@/components/admin/HistoryList";
import { TemplateForm } from "@/components/admin/TemplateForm";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdmin } from "@/lib/auth";

export const metadata: Metadata = { title: "Admin · Edit template" };

export default async function EditTemplate({ params }: PageProps<"/admin/templates/[id]">) {
  const { repo } = await requireAdmin();
  const { id } = await params;
  const templateId = decodeURIComponent(id);
  const record = await repo.getTemplate(templateId);
  if (!record) notFound();

  const [history, all] = await Promise.all([repo.templateHistory(templateId), repo.listTemplates(false)]);
  const situations = [...new Set(all.map((t) => t.category))].sort();

  return (
    <>
      <Button asChild variant="ghost" size="sm" className="-ms-3 mb-2 text-gold-deep">
        <Link href="/admin/templates"><ArrowLeftIcon /> All templates</Link>
      </Button>
      <AdminPageHeader
        title={record.title}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">Revision {record.revision}</Badge>
            <span className="break-all font-mono text-xs">{record.template_id}</span>
          </span>
        }
        actions={
          !record.deleted && (
            <Button asChild variant="outline">
              <Link href={`/templates/${encodeURIComponent(record.template_id)}`} target="_blank">
                View on site <ExternalLinkIcon />
              </Link>
            </Button>
          )
        }
      />

      {record.deleted ? (
        <div className="grid gap-4">
          <Alert variant="destructive">
            <AlertDescription>This template is deleted and hidden from the public site. Its history is kept.</AlertDescription>
          </Alert>
          <RestoreTemplateButton id={record.template_id} revision={record.revision} />
        </div>
      ) : (
        <div className="grid gap-5">
          <TemplateForm key={record.revision} record={record} situations={situations} />
          <Card>
            <CardHeader>
              <CardTitle>Delete this template</CardTitle>
              <CardDescription>It leaves the public site. Its history is kept and it can be restored.</CardDescription>
            </CardHeader>
            <CardContent>
              <DeleteTemplateButton id={record.template_id} title={record.title} revision={record.revision} />
            </CardContent>
          </Card>
        </div>
      )}

      {record.paragraphs.length > 0 && (
        <Card className="mt-5">
          <CardHeader>
            <CardTitle>Original source section</CardTitle>
            <CardDescription>
              {record.source}, paragraphs {record.start}–{record.paragraphs.at(-1)?.number}. Unchanged by edits.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div dir="auto" className="max-h-72 overflow-auto whitespace-pre-wrap break-words rounded-lg border bg-background p-3 text-sm leading-relaxed">
              {record.paragraphs.map((p) => p.text).join("\n\n")}
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="mt-5">
        <CardHeader>
          <CardTitle>Version history</CardTitle>
          <CardDescription>Every save is kept. Raw stored data is visible here, to administrators only.</CardDescription>
        </CardHeader>
        <CardContent>
          <HistoryList
            kind="template"
            id={record.template_id}
            currentRevision={record.revision}
            entries={history.map((h) => ({ revision: h.revision, saved_at: h.saved_at, action: h.action, json: JSON.stringify(h.payload, null, 2) }))}
          />
        </CardContent>
      </Card>
    </>
  );
}
