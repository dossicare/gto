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
import { formatCairo, isNA } from "@/lib/text";
import type { OfferRecord } from "@/lib/types";

export const metadata: Metadata = { title: "Admin · Offers" };

function StatusBadges({ o }: { o: OfferRecord }) {
  return (
    <span className="flex flex-wrap gap-1.5">
      {o.deleted && <Badge variant="destructive">Deleted</Badge>}
      {o.lifecycle === "archived" && <Badge variant="secondary">Archived</Badge>}
      {o.lifecycle === "suspended" && <Badge variant="secondary">Suspended</Badge>}
      {o.fictional && <Badge variant="outline">Sample</Badge>}
      {!o.deleted && o.lifecycle === "available" && !o.fictional && <Badge className="bg-ok/10 text-ok">Visible</Badge>}
    </span>
  );
}

export default async function AdminOffers({ searchParams }: PageProps<"/admin/offers">) {
  const { repo } = await requireAdmin();
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q.trim().toLowerCase() : "";
  const showDeleted = params.deleted === "1";

  const all = await repo.listOffers(true);
  const deletedCount = all.filter((o) => o.deleted).length;
  const rows = all
    .filter((o) => showDeleted || !o.deleted)
    .filter((o) => !q || [o.name, o.category, o.offer_id, o.keywords].some((v) => v.toLowerCase().includes(q)));

  return (
    <>
      <AdminPageHeader
        title="Offers"
        description="Add, edit or delete offers. Deleted offers keep their history and can be restored."
        actions={
          <Button asChild size="lg">
            <Link href="/admin/offers/new">
              <PlusIcon /> Add offer
            </Link>
          </Button>
        }
      />

      <Card className="mb-5">
        <CardContent>
          <form method="get" action="/admin/offers" role="search" className="grid gap-3 sm:grid-cols-[1fr_auto_auto] sm:items-center">
            <Input name="q" type="search" defaultValue={params.q as string | undefined} placeholder="Search name, category or ID" aria-label="Search offers" autoComplete="off" />
            <label className="flex min-h-11 items-center gap-2 text-sm font-medium">
              <input type="checkbox" name="deleted" value="1" defaultChecked={showDeleted} className="size-5 accent-navy" />
              Show deleted{deletedCount > 0 ? ` (${deletedCount})` : ""}
            </label>
            <Button type="submit">
              <SearchIcon /> Filter
            </Button>
          </form>
        </CardContent>
      </Card>

      <p className="mb-3 text-sm text-muted-foreground" role="status">{rows.length} {rows.length === 1 ? "offer" : "offers"}</p>

      {rows.length === 0 ? (
        <EmptyState>No offers match. <Link href="/admin/offers/new" className="font-semibold text-gold-deep underline">Add one</Link>.</EmptyState>
      ) : (
        <>
          {/* Phones: cards. */}
          <ul className="grid gap-3 md:hidden">
            {rows.map((o) => (
              <li key={o.offer_id}>
                <Link href={`/admin/offers/${encodeURIComponent(o.offer_id)}`} className="block">
                  <Card className="gap-2">
                    <CardContent className="grid gap-2">
                      <StatusBadges o={o} />
                      <span className="text-lg font-extrabold leading-snug text-navy">{o.name}</span>
                      <span className="text-sm text-muted-foreground">
                        {!isNA(o.category) ? o.category : "No category"} · {formatCairo(o.updated_at)}
                      </span>
                    </CardContent>
                  </Card>
                </Link>
              </li>
            ))}
          </ul>

          {/* Larger screens: table. */}
          <Card className="hidden py-0 md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Offer</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead className="w-24 text-right"><span className="sr-only">Actions</span></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((o) => (
                  <TableRow key={o.offer_id}>
                    <TableCell className="max-w-xs whitespace-normal font-semibold">{o.name}</TableCell>
                    <TableCell>{!isNA(o.category) ? o.category : "—"}</TableCell>
                    <TableCell><StatusBadges o={o} /></TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">{formatCairo(o.updated_at)}</TableCell>
                    <TableCell className="text-right">
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/admin/offers/${encodeURIComponent(o.offer_id)}`}>Edit</Link>
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
