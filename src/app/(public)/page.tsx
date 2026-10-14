import Link from "next/link";
import { SearchIcon } from "lucide-react";
import { EmptyState, PageTitle, SetupNotice } from "@/components/PageParts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { searchOffers } from "@/lib/offers";
import { getPublicRepo } from "@/lib/repo";
import { isNA } from "@/lib/text";

export const dynamic = "force-dynamic";

const SHORTCUTS = [
  { href: "/general-terms", title: "General Terms", text: "The published terms and conditions" },
  { href: "/templates", title: "Templates", text: "English and Arabic scripts to copy" },
  { href: "/calculators", title: "Calculators", text: "Room price, city tax and wallet discount" },
];

export default async function OffersPage({ searchParams }: PageProps<"/">) {
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q.slice(0, 200) : "";
  const category = typeof params.category === "string" ? params.category : "";

  const repo = getPublicRepo();
  if (!repo) {
    return (
      <>
        <PageTitle title="Offers" />
        <SetupNotice />
      </>
    );
  }

  const offers = await repo.offers();
  const categories = [...new Set(offers.map((o) => o.category).filter((c) => !isNA(c)))].sort((a, b) => a.localeCompare(b));
  const searching = q.trim() !== "" || category !== "";
  // The overview hides archived offers; an explicit search still finds them (and labels them).
  const rows = searching ? searchOffers(offers, { query: q, category }) : offers.filter((o) => o.lifecycle !== "archived");

  return (
    <>
      <PageTitle title="Offers">Browse every offer, or search by name, keyword or condition.</PageTitle>

      <Card className="mb-5">
        <CardContent>
          <form method="get" action="/" role="search" className="grid gap-3 sm:grid-cols-[1fr_14rem_auto] sm:items-end">
            <Field>
              <FieldLabel htmlFor="q">Search</FieldLabel>
              <Input id="q" name="q" type="search" defaultValue={q} placeholder="e.g. flight, wallet, 14 days" autoComplete="off" />
            </Field>
            <Field>
              <FieldLabel htmlFor="category">Category</FieldLabel>
              <NativeSelect id="category" name="category" defaultValue={category}>
                <NativeSelectOption value="">All categories</NativeSelectOption>
                {categories.map((c) => (
                  <NativeSelectOption key={c} value={c}>{c}</NativeSelectOption>
                ))}
              </NativeSelect>
            </Field>
            <div className="flex gap-2">
              <Button type="submit" className="flex-1 sm:flex-none">
                <SearchIcon /> Search
              </Button>
              {searching && (
                <Button asChild variant="outline">
                  <Link href="/">Clear</Link>
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      {!searching && (
        <div className="mb-6 grid grid-cols-3 gap-2 sm:gap-3" aria-label="Other sections">
          {SHORTCUTS.map((s) => (
            <Link key={s.href} href={s.href} className="block">
              <Card className="h-full justify-center gap-0 py-3 transition-shadow hover:shadow-md sm:py-5">
                <CardContent className="px-3 sm:px-5">
                  <span className="block text-sm font-extrabold leading-tight text-navy sm:text-base">{s.title}</span>
                  <span className="hidden text-sm text-muted-foreground sm:block">{s.text}</span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <p className="mb-3 text-sm text-muted-foreground" role="status">
        {rows.length} {rows.length === 1 ? "offer" : "offers"}
        {searching ? " match your search" : ""}
      </p>

      {rows.length === 0 ? (
        <EmptyState>{offers.length === 0 ? "No offers have been added yet." : "No offers match these search criteria."}</EmptyState>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((o) => (
            <li key={o.offer_id}>
              <Link href={`/offers/${encodeURIComponent(o.offer_id)}`} className="block h-full">
                <Card className="h-full gap-2 transition-shadow hover:shadow-md">
                  <CardContent className="flex h-full flex-col gap-2">
                    <span className="flex flex-wrap items-center gap-2">
                      {!isNA(o.category) && <Badge className="bg-gold/20 text-gold-deep">{o.category}</Badge>}
                      {o.lifecycle === "archived" && <Badge variant="destructive">Archived</Badge>}
                    </span>
                    <span className="text-lg font-extrabold leading-snug text-navy">{o.name}</span>
                    {!isNA(o.description) && <span className="line-clamp-3 text-sm text-muted-foreground">{o.description}</span>}
                    {!isNA(o.launch_date) && (
                      <span className="mt-auto pt-1 text-xs font-semibold text-gold-deep">T&amp;C title date: {o.launch_date}</span>
                    )}
                  </CardContent>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
