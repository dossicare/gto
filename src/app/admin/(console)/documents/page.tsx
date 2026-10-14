import type { Metadata } from "next";
import { DownloadIcon } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/AdminPage";
import { EmptyState } from "@/components/PageParts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { requireAdmin } from "@/lib/auth";

export const metadata: Metadata = { title: "Admin · Documents" };

const size = (bytes: number) => (bytes >= 1_048_576 ? `${(bytes / 1_048_576).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`);

export default async function AdminDocuments() {
  const { repo } = await requireAdmin();
  const docs = await repo.documents();

  return (
    <>
      <AdminPageHeader title="Source documents" description="The original files the templates were taken from. Only you can download them (links expire after 5 minutes)." />
      {docs.length === 0 ? (
        <EmptyState>No source documents have been uploaded yet.</EmptyState>
      ) : (
        <ul className="grid gap-3">
          {docs.map((d) => (
            <li key={d.id}>
              <Card>
                <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="break-words font-extrabold text-navy">{d.filename}</p>
                    <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                      <Badge variant="secondary">{d.media_type.split("/").pop()}</Badge>
                      {size(d.size)}
                      {d.version && <span>· {d.version}</span>}
                    </p>
                    <p className="mt-1 break-all font-mono text-xs text-muted-foreground">SHA-256 {d.sha256}</p>
                  </div>
                  {d.url ? (
                    <Button asChild variant="outline" className="shrink-0">
                      <a href={d.url} download={d.filename}>
                        <DownloadIcon /> Download
                      </a>
                    </Button>
                  ) : (
                    <Badge variant="outline">File not uploaded</Badge>
                  )}
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
