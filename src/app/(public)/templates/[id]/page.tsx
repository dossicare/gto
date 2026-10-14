import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeftIcon, TriangleAlertIcon } from "lucide-react";
import { SetupNotice } from "@/components/PageParts";
import { ResponsivePanels, type Panel } from "@/components/ResponsivePanels";
import { ScriptCard } from "@/components/ScriptCard";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getPublicRepo } from "@/lib/repo";
import { figureDifferences } from "@/lib/templates";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/templates/[id]">): Promise<Metadata> {
  const { id } = await params;
  const t = await getPublicRepo()?.template(decodeURIComponent(id));
  return { title: t?.title ?? "Template" };
}

export default async function TemplatePage({ params }: PageProps<"/templates/[id]">) {
  const { id } = await params;
  const repo = getPublicRepo();
  if (!repo) return <SetupNotice />;
  const t = await repo.template(decodeURIComponent(id));
  if (!t) notFound();

  const notes = t.blocks.filter((b) => b.kind === "Notes").flatMap((b) => b.paragraphs.map((p) => p.text));
  const differences = figureDifferences(t.blocks);
  const lastParagraph = t.paragraphs.at(-1)?.number ?? t.start;

  const panels: Panel[] = (["English", "Arabic"] as const).map((language) => {
    const blocks = t.blocks.filter((b) => b.kind === language);
    return {
      id: language.toLowerCase(),
      label: language === "Arabic" ? "Arabic · العربية" : "English",
      content: (
        <section aria-label={language}>
          <h2 className="mb-3 text-xl font-extrabold text-navy">{language}</h2>
          {blocks.length === 0 ? (
            <Alert>
              <AlertDescription>No {language} script supplied in this section.</AlertDescription>
            </Alert>
          ) : (
            <div className="grid gap-3">
              {blocks.map((b, i) => (
                <ScriptCard
                  key={i}
                  language={language}
                  index={i + 1}
                  count={blocks.length}
                  text={b.paragraphs.map((p) => p.text).join("\n\n")}
                  filename={`${t.template_id}-${language}-${i + 1}.txt`}
                />
              ))}
            </div>
          )}
        </section>
      ),
    };
  });

  return (
    <article>
      <Button asChild variant="ghost" size="sm" className="-ms-3 mb-2 text-gold-deep">
        <Link href="/templates">
          <ArrowLeftIcon /> All templates
        </Link>
      </Button>
      <header className="mb-5">
        <Badge className="mb-2 bg-gold/20 text-gold-deep">{t.category}</Badge>
        <h1 className="text-2xl font-extrabold leading-tight tracking-tight text-navy sm:text-3xl">{t.title}</h1>
      </header>

      {notes.length > 0 && (
        <Card className="mb-4 py-2">
          <CardContent>
            <Accordion type="single" collapsible defaultValue="notes">
              <AccordionItem value="notes" className="border-0">
                <AccordionTrigger className="text-base font-extrabold text-navy">Internal guidance (not for the customer)</AccordionTrigger>
                <AccordionContent>
                  <div dir="auto" className="whitespace-pre-wrap break-words text-base leading-relaxed">
                    {notes.join("\n\n")}
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>
      )}

      {differences && (
        <Alert className="mb-4" role="note">
          <TriangleAlertIcon />
          <AlertTitle>The English and Arabic text contain different figures.</AlertTitle>
          <AlertDescription>
            <p>Compare the wording before using this template.</p>
            <p className="mt-1">English: {differences.English.join(", ") || "none"}</p>
            <p>Arabic: {differences.Arabic.join(", ") || "none"}</p>
          </AlertDescription>
        </Alert>
      )}

      <ResponsivePanels panels={panels} />

      <p className="mt-6 text-sm text-muted-foreground">
        Source: {t.source} / {t.path} / paragraphs {t.start}–{lastParagraph}
      </p>
      {t.paragraphs.length > 0 && (
        <Card className="mt-3 py-2">
          <CardContent>
            <Accordion type="single" collapsible>
              <AccordionItem value="source" className="border-0">
                <AccordionTrigger className="text-base font-extrabold text-navy">Original source section</AccordionTrigger>
                <AccordionContent>
                  <div dir="auto" className="whitespace-pre-wrap break-words text-base leading-relaxed">
                    {t.paragraphs.map((p) => p.text).join("\n\n")}
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>
      )}
    </article>
  );
}
