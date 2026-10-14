import type { Metadata } from "next";
import { ExternalLinkIcon } from "lucide-react";
import { EmptyState, PageTitle, SetupNotice } from "@/components/PageParts";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getPublicRepo } from "@/lib/repo";
import { sanitizeTerms } from "@/lib/sanitize";
import { formatCairo } from "@/lib/text";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "General Terms" };

const OFFICIAL_URL = "https://gtomembers.com/terms-conditions";

export default async function GeneralTermsPage() {
  const repo = getPublicRepo();
  const terms = repo ? await repo.terms() : null;

  return (
    <>
      <PageTitle title="General Terms & Conditions" />
      {!repo && <SetupNotice />}
      {repo && (
        <>
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              {terms ? <>Local copy retrieved {formatCairo(terms.fetched_at)}.</> : "No local copy has been saved yet."}
            </p>
            <Button asChild variant="gold" size="lg">
              <a href={OFFICIAL_URL} target="_blank" rel="noopener noreferrer">
                Open the official page <ExternalLinkIcon />
              </a>
            </Button>
          </div>
          {terms ? (
            <Card>
              <CardContent>
                <article className="prose-terms" dangerouslySetInnerHTML={{ __html: sanitizeTerms(terms.html) }} />
              </CardContent>
            </Card>
          ) : (
            <EmptyState>The official terms have not been saved yet. Use the button above to open the official page.</EmptyState>
          )}
        </>
      )}
    </>
  );
}
