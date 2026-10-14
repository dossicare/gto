import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeftIcon, ExternalLinkIcon } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/AdminPage";
import { DeleteOfferButton, RestoreOfferButton } from "@/components/admin/DangerZones";
import { HistoryList } from "@/components/admin/HistoryList";
import { OfferForm } from "@/components/admin/OfferForm";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdmin } from "@/lib/auth";
import { isNA } from "@/lib/text";

export const metadata: Metadata = { title: "Admin · Edit offer" };

export default async function EditOffer({ params }: PageProps<"/admin/offers/[id]">) {
  const { repo } = await requireAdmin();
  const { id } = await params;
  const offerId = decodeURIComponent(id);
  const record = await repo.getOffer(offerId);
  if (!record) notFound();

  const [history, all] = await Promise.all([repo.offerHistory(offerId), repo.listOffers(false)]);
  const categories = [...new Set(all.map((o) => o.category).filter((c) => !isNA(c)))].sort();
  const revision = record.revision ?? 1;

  return (
    <>
      <Button asChild variant="ghost" size="sm" className="-ms-3 mb-2 text-gold-deep">
        <Link href="/admin/offers"><ArrowLeftIcon /> All offers</Link>
      </Button>
      <AdminPageHeader
        title={isNA(record.name) ? "Untitled offer" : record.name}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">Revision {revision}</Badge>
            <span className="break-all font-mono text-xs">{record.offer_id}</span>
          </span>
        }
        actions={
          !record.deleted && (
            <Button asChild variant="outline">
              <Link href={`/offers/${encodeURIComponent(record.offer_id)}`} target="_blank">
                View on site <ExternalLinkIcon />
              </Link>
            </Button>
          )
        }
      />

      {record.deleted ? (
        <div className="grid gap-4">
          <Alert variant="destructive">
            <AlertDescription>This offer is deleted and hidden from the public site. Its history is kept.</AlertDescription>
          </Alert>
          <RestoreOfferButton id={record.offer_id} revision={revision} />
        </div>
      ) : (
        <div className="grid gap-5">
          {/* Remounts with fresh values after every save (the revision changes). */}
          <OfferForm key={revision} record={record} categories={categories} />
          <Card>
            <CardHeader>
              <CardTitle>Delete this offer</CardTitle>
              <CardDescription>It leaves the public site. Its history is kept and it can be restored.</CardDescription>
            </CardHeader>
            <CardContent>
              <DeleteOfferButton id={record.offer_id} name={record.name} revision={revision} />
            </CardContent>
          </Card>
        </div>
      )}

      <Card className="mt-5">
        <CardHeader>
          <CardTitle>Version history</CardTitle>
          <CardDescription>Every save is kept. Raw stored data is visible here, to administrators only.</CardDescription>
        </CardHeader>
        <CardContent>
          <HistoryList
            kind="offer"
            id={record.offer_id}
            currentRevision={revision}
            entries={history.map((h) => ({ revision: h.revision, saved_at: h.saved_at, action: h.action, json: JSON.stringify(h.payload, null, 2) }))}
          />
        </CardContent>
      </Card>
    </>
  );
}
