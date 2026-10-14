import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeftIcon } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/AdminPage";
import { OfferForm } from "@/components/admin/OfferForm";
import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/lib/auth";
import { isNA } from "@/lib/text";

export const metadata: Metadata = { title: "Admin · Add offer" };

export default async function NewOffer() {
  const { repo } = await requireAdmin();
  const categories = [...new Set((await repo.listOffers(false)).map((o) => o.category).filter((c) => !isNA(c)))].sort();
  return (
    <>
      <Button asChild variant="ghost" size="sm" className="-ms-3 mb-2 text-gold-deep">
        <Link href="/admin/offers"><ArrowLeftIcon /> All offers</Link>
      </Button>
      <AdminPageHeader title="Add offer" />
      <OfferForm record={null} categories={categories} />
    </>
  );
}
