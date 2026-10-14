import type { Metadata } from "next";
import Link from "next/link";
import { SearchIcon } from "lucide-react";
import { EmptyState, PageTitle, SetupNotice } from "@/components/PageParts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { getPublicRepo } from "@/lib/repo";
import { searchTemplates } from "@/lib/templates";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Templates" };

export default async function TemplatesPage({ searchParams }: PageProps<"/templates">) {
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q.slice(0, 200) : "";
  const situation = typeof params.situation === "string" ? params.situation : "";
  const lang = params.lang === "English" || params.lang === "Arabic" ? params.lang : "";

  const repo = getPublicRepo();
  if (!repo) {
    return (
      <>
        <PageTitle title="GTO Templates" />
        <SetupNotice />
      </>
    );
  }

  const all = await repo.templates();
  const situations = [...new Set(all.map((t) => t.category))].sort((a, b) => a.localeCompare(b));
  const rows = searchTemplates(all, { query: q, category: situation, lang });
  const filtered = Boolean(q || situation || lang);

  return (
    <>
      <PageTitle title="GTO Templates">Search English or Arabic wording, then copy the script you need.</PageTitle>

      <Card className="mb-5">
        <CardContent>
          <form method="get" action="/templates" role="search" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_14rem_11rem_auto] lg:items-end">
            <Field className="sm:col-span-2 lg:col-span-1">
              <FieldLabel htmlFor="q">Search templates</FieldLabel>
              <Input id="q" name="q" type="search" defaultValue={q} placeholder="wallet, cancellation, محفظة, إلغاء" autoComplete="off" />
            </Field>
            <Field>
              <FieldLabel htmlFor="situation">Situation</FieldLabel>
              <NativeSelect id="situation" name="situation" defaultValue={situation}>
                <NativeSelectOption value="">All situations</NativeSelectOption>
                {situations.map((s) => (
                  <NativeSelectOption key={s} value={s}>{s}</NativeSelectOption>
                ))}
              </NativeSelect>
            </Field>
            <Field>
              <FieldLabel htmlFor="lang">Language</FieldLabel>
              <NativeSelect id="lang" name="lang" defaultValue={lang}>
                <NativeSelectOption value="">Both languages</NativeSelectOption>
                <NativeSelectOption value="English">English</NativeSelectOption>
                <NativeSelectOption value="Arabic">Arabic</NativeSelectOption>
              </NativeSelect>
            </Field>
            <div className="flex gap-2 sm:col-span-2 lg:col-span-1">
              <Button type="submit" className="flex-1 lg:flex-none">
                <SearchIcon /> Search
              </Button>
              {filtered && (
                <Button asChild variant="outline">
                  <Link href="/templates">Clear</Link>
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      <p className="mb-3 text-sm text-muted-foreground" role="status">{rows.length} matching templates</p>

      {rows.length === 0 ? (
        <EmptyState>No templates match. Try another word or situation.</EmptyState>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((t) => {
            const hasEn = t.blocks.some((b) => b.kind === "English");
            const hasAr = t.blocks.some((b) => b.kind === "Arabic");
            return (
              <li key={t.template_id}>
                <Link href={`/templates/${encodeURIComponent(t.template_id)}`} className="block h-full">
                  <Card className="h-full transition-shadow hover:shadow-md">
                    <CardContent className="flex flex-col gap-2">
                      <span className="flex flex-wrap items-center gap-2">
                        <Badge className="bg-gold/20 text-gold-deep">{t.category}</Badge>
                        {hasEn && <Badge variant="secondary">English</Badge>}
                        {hasAr && <Badge variant="secondary">العربية</Badge>}
                      </span>
                      <span className="text-lg font-extrabold leading-snug text-navy">{t.title}</span>
                    </CardContent>
                  </Card>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
