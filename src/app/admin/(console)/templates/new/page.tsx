import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeftIcon } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/AdminPage";
import { TemplateForm } from "@/components/admin/TemplateForm";
import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/lib/auth";

export const metadata: Metadata = { title: "Admin · Add template" };

export default async function NewTemplate() {
  const { repo } = await requireAdmin();
  const situations = [...new Set((await repo.listTemplates(false)).map((t) => t.category))].sort();
  return (
    <>
      <Button asChild variant="ghost" size="sm" className="-ms-3 mb-2 text-gold-deep">
        <Link href="/admin/templates"><ArrowLeftIcon /> All templates</Link>
      </Button>
      <AdminPageHeader title="Add template" />
      <TemplateForm record={null} situations={situations} />
    </>
  );
}
