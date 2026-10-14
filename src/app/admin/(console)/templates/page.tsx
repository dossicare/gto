import type { Metadata } from "next";
import Link from "next/link";
import { PlusIcon, SearchIcon } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/AdminPage";
import { EmptyState } from "@/components/PageParts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireAdmin } from "@/lib/auth";
import { searchTemplates } from "@/lib/templates";

export const metadata: Metadata = { title: "Admin · Templates" };

export default async function AdminTemplates({ searchParams }: PageProps<"/admin/templates">) {
  const { repo } = await requireAdmin();
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q.slice(0, 200) : "";
  const showDeleted = params.deleted === "1";

  const all = await repo.listTemplates(true);
  const deletedCount = all.filter((t) => t.deleted).length;
  const live = all.filter((t) => showDeleted || !t.deleted);
  const rows = q ? searchTemplates(live, { query: q }) : live;
  const deletedIds = new Set(all.filter((t) => t.deleted).map((t) => t.template_id));

  return (
    <>
      <AdminPageHeader
        title="Templates"
        description="Add, edit or delete the English and Arabic scripts."
        actions={
          <Button asChild size="lg">
            <Link href="/admin/templates/new"><PlusIcon /> Add template</Link>
          </Button>
        }
      />

      <Card className="mb-5">
        <CardContent>
          <form method="get" action="/admin/templates" role="search" className="grid gap-3 sm:grid-cols-[1fr_auto_auto] sm:items-center">
            <Input name="q" type="search" defaultValue={q} placeholder="Search title or wording (English or Arabic)" aria-label="Search templates" autoComplete="off" />
            <label className="flex min-h-11 items-center gap-2 text-sm font-medium">
              <input type="checkbox" name="deleted" value="1" defaultChecked={showDeleted} className="size-5 accent-navy" />
              Show deleted{deletedCount > 0 ? ` (${deletedCount})` : ""}
            </label>
            <Button type="submit"><SearchIcon /> Filter</Button>
          </form>
        </CardContent>
      </Card>

      <p className="mb-3 text-sm text-muted-foreground" role="status">{rows.length} templates</p>

      {rows.length === 0 ? (
        <EmptyState>No templates match.</EmptyState>
      ) : (
        <>
          <ul className="grid gap-3 md:hidden">
            {rows.map((t) => (
              <li key={t.template_id}>
                <Link href={`/admin/templates/${encodeURIComponent(t.template_id)}`} className="block">
                  <Card className="gap-2">
                    <CardContent className="grid gap-2">
                      <span className="flex flex-wrap items-center gap-2">
                        <Badge className="bg-gold/20 text-gold-deep">{t.category}</Badge>
                        {deletedIds.has(t.template_id) && <Badge variant="destructive">Deleted</Badge>}
                      </span>
                      <span className="text-lg font-extrabold leading-snug text-navy">{t.title}</span>
                    </CardContent>
                  </Card>
                </Link>
              </li>
            ))}
          </ul>

          <Card className="hidden py-0 md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Template</TableHead>
                  <TableHead>Situation</TableHead>
                  <TableHead>Languages</TableHead>
                  <TableHead className="w-24 text-right"><span className="sr-only">Actions</span></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((t) => (
                  <TableRow key={t.template_id}>
                    <TableCell className="max-w-sm whitespace-normal font-semibold">
                      {t.title} {deletedIds.has(t.template_id) && <Badge variant="destructive" className="ms-1">Deleted</Badge>}
                    </TableCell>
                    <TableCell>{t.category}</TableCell>
                    <TableCell>
                      <span className="flex gap-1.5">
                        {t.blocks.some((b) => b.kind === "English") && <Badge variant="secondary">English</Badge>}
                        {t.blocks.some((b) => b.kind === "Arabic") && <Badge variant="secondary">العربية</Badge>}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/admin/templates/${encodeURIComponent(t.template_id)}`}>Edit</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </>
      )}
    </>
  );
}
