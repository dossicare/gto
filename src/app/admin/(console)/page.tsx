import type { Metadata } from "next";
import Link from "next/link";
import { FileTextIcon, FolderIcon, LanguagesIcon, TagIcon } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/AdminPage";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdmin } from "@/lib/auth";

export const metadata: Metadata = { title: "Admin" };

export default async function AdminDashboard() {
  const { repo, email } = await requireAdmin();
  const counts = await repo.counts();

  const tiles = [
    { href: "/admin/offers", icon: TagIcon, label: "Offers", value: counts.offers, note: counts.offersDeleted ? `${counts.offersDeleted} deleted (restorable)` : "All visible on the site", add: "/admin/offers/new" },
    { href: "/admin/templates", icon: LanguagesIcon, label: "Templates", value: counts.templates, note: "English and Arabic scripts", add: "/admin/templates/new" },
    { href: "/admin/general-terms", icon: FileTextIcon, label: "General terms snapshots", value: counts.snapshots, note: "Newest one is shown to visitors" },
    { href: "/admin/documents", icon: FolderIcon, label: "Source documents", value: counts.documents, note: "Original files, admin only" },
  ];

  return (
    <>
      <AdminPageHeader title="Dashboard" description={<>Signed in as <span className="break-all font-semibold">{email}</span></>} />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {tiles.map((t) => (
          <Card key={t.href}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base font-semibold text-muted-foreground">
                <t.icon className="size-4 text-gold-deep" aria-hidden="true" /> {t.label}
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              <div>
                <p className="text-3xl font-extrabold tabular-nums text-navy">{t.value}</p>
                <p className="text-sm text-muted-foreground">{t.note}</p>
              </div>
              <div className="flex gap-2">
                <Button asChild variant="outline" size="sm" className="flex-1">
                  <Link href={t.href}>Open</Link>
                </Button>
                {t.add && (
                  <Button asChild size="sm" className="flex-1">
                    <Link href={t.add}>Add new</Link>
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}
