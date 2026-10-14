import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeftIcon, ExternalLinkIcon, InfoIcon } from "lucide-react";
import { Field, SetupNotice } from "@/components/PageParts";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getPublicRepo } from "@/lib/repo";
import { formatCairo, isNA, safeHttpUrl } from "@/lib/text";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/offers/[id]">): Promise<Metadata> {
  const { id } = await params;
  const offer = await getPublicRepo()?.offer(decodeURIComponent(id));
  return { title: offer?.name ?? "Offer" };
}

export default async function OfferPage({ params }: PageProps<"/offers/[id]">) {
  const { id } = await params;
  const repo = getPublicRepo();
  if (!repo) return <SetupNotice />;
  const o = await repo.offer(decodeURIComponent(id));
  if (!o) notFound();

  const tcUrl = safeHttpUrl(o.tc_url);
  const sourceUrl = safeHttpUrl(o.original_source);

  return (
    <article>
      <Button asChild variant="ghost" size="sm" className="-ms-3 mb-2 text-gold-deep">
        <Link href="/">
          <ArrowLeftIcon /> All offers
        </Link>
      </Button>

      <header className="mb-6">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          {!isNA(o.category) && <Badge className="bg-gold/20 text-gold-deep">{o.category}</Badge>}
          {o.lifecycle === "archived" && <Badge variant="destructive">Archived</Badge>}
        </div>
        <h1 className="text-2xl font-extrabold leading-tight tracking-tight text-navy sm:text-3xl">{o.name}</h1>
        {o.updated_at && <p className="mt-1 text-sm text-muted-foreground">Saved {formatCairo(o.updated_at)}</p>}
      </header>

      <Card className="mb-5">
        <CardContent className="grid gap-5">
          <section>
            <h2 className="mb-1 text-base font-extrabold text-navy sm:text-lg">Launch / T&amp;C title date</h2>
            <p className="font-semibold">{o.launch_date || "N/A"}</p>
            {o.launch_date_evidence && <p className="mt-1 text-sm text-muted-foreground">{o.launch_date_evidence}</p>}
          </section>
          {!isNA(o.schedule_details) && <Field label="Dates and notice (as supplied)" value={o.schedule_details} />}
        </CardContent>
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardContent className="grid content-start gap-5">
            <Field label="Offer description" value={o.description} />
            <Field label="Offer benefits" value={o.benefits} />
            {!isNA(o.restrictions) && <Field label="Restrictions" value={o.restrictions} />}
            {!isNA(o.eligibility) && <Field label="Eligibility requirements" value={o.eligibility} />}
            {!isNA(o.exclusions) && <Field label="Exclusions" value={o.exclusions} />}
            <Field label="Notice period" value={o.notice_period} />
            <Field label="Calculation rules (if applicable)" value={o.calculation_rules} />
            <Field label="Wallet activation date" value={o.wallet_activation_date} />
            <Field label="Wallet activation details" value={o.wallet_activation_details} />
            <Field label="Additional notes" value={o.notes} />
            <Field label="Keywords" value={o.keywords} fallback="None" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="grid content-start gap-5">
            <Field
              label="Complete Terms & Conditions"
              value={isNA(o.terms) ? "" : o.terms}
              fallback="Complete Terms & Conditions are not available."
            />
            <section>
              <h3 className="mb-2 text-base font-extrabold text-navy sm:text-lg">Official T&amp;C link</h3>
              {tcUrl ? (
                <>
                  <Button asChild variant="gold" size="lg" className="w-full sm:w-auto">
                    <a href={tcUrl} target="_blank" rel="noopener noreferrer">
                      Open official T&amp;C <ExternalLinkIcon />
                    </a>
                  </Button>
                  <p className="mt-2 break-all text-sm text-muted-foreground">{tcUrl}</p>
                  <p className="mt-1 text-sm text-muted-foreground">The link is stored exactly as supplied.</p>
                </>
              ) : (
                <Alert>
                  <InfoIcon />
                  <AlertDescription>Official T&amp;C link not supplied.</AlertDescription>
                </Alert>
              )}
            </section>
            <section className="min-w-0">
              <h3 className="mb-1 text-base font-extrabold text-navy sm:text-lg">Original source</h3>
              {sourceUrl ? (
                <a href={sourceUrl} target="_blank" rel="noopener noreferrer" className="break-all text-gold-deep underline">
                  {sourceUrl}
                </a>
              ) : (
                <p className="whitespace-pre-wrap break-words">{o.original_source || "N/A"}</p>
              )}
            </section>
          </CardContent>
        </Card>
      </div>
    </article>
  );
}
