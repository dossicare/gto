"use client";

import { useState } from "react";
import { CalculatorIcon } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CopyButton } from "./CopyButton";
import { cityTax, display, roomDifference, ROUNDING, SOURCE, walletDiscount, type CalcResult } from "@/lib/pricing";

type Tab = "room" | "tax" | "wallet";

const TABS: { id: Tab; label: string }[] = [
  { id: "room", label: "Room price difference" },
  { id: "tax", label: "City tax" },
  { id: "wallet", label: "Wallet discount" },
];

interface FieldDef {
  key: string;
  label: string;
  help?: string;
}

const FIELDS: Record<Tab, FieldDef[]> = {
  room: [
    { key: "client", label: "Client price" },
    { key: "your", label: "Your price" },
  ],
  tax: [
    { key: "room", label: "Room price" },
    { key: "tax", label: "City tax price" },
    {
      key: "threshold",
      label: "City tax threshold (%)",
      help: `Editable in the source workbook at ${SOURCE.thresholdCell}. The original value is ${SOURCE.thresholdPercent}%.`,
    },
  ],
  wallet: [
    { key: "booking", label: "Booking price" },
    { key: "wallet", label: "Wallet balance" },
    { key: "discount", label: "Discount (%)", help: "Enter 75 for 75%. Supply the applicable discount; the workbook example is not a default rate." },
  ],
};

const initial = (): Record<Tab, Record<string, string>> => ({
  room: { client: "", your: "" },
  tax: { room: "", tax: "", threshold: SOURCE.thresholdPercent },
  wallet: { booking: "", wallet: "", discount: "" },
});

function run(tab: Tab, v: Record<string, string>): CalcResult {
  if (tab === "room") return roomDifference(v.client, v.your);
  if (tab === "tax") return cityTax(v.room, v.tax, v.threshold);
  return walletDiscount(v.booking, v.wallet, v.discount);
}

export function Calculators() {
  const [tab, setTab] = useState<Tab>("room");
  const [values, setValues] = useState(initial);
  const [result, setResult] = useState<CalcResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  function change(key: string, value: string) {
    setValues((all) => ({ ...all, [tab]: { ...all[tab], [key]: value } }));
    // A result must never outlive the inputs that produced it.
    setResult(null);
    setError(null);
  }

  function choose(next: string) {
    setTab(next as Tab);
    setResult(null);
    setError(null);
  }

  function calculate(event: React.FormEvent) {
    event.preventDefault();
    try {
      setResult(run(tab, values[tab]));
      setError(null);
    } catch (e) {
      setResult(null);
      setError((e as Error).message);
    }
  }

  return (
    <div className="grid gap-5">
      <Tabs value={tab} onValueChange={choose} className="gap-4">
        <TabsList className="grid h-auto w-full grid-cols-1 bg-card p-1 ring-1 ring-border group-data-horizontal/tabs:h-auto sm:grid-cols-3" aria-label="Calculator">
          {TABS.map((t) => (
            <TabsTrigger
              key={t.id}
              value={t.id}
              className="h-auto min-h-11 text-base data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {TABS.map((t) => (
          <TabsContent key={t.id} value={t.id} className="text-base">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <CalculatorIcon className="size-5 text-gold-deep" aria-hidden="true" />
                  {t.label}
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Enter amounts in the same currency. City tax parameter text uses GBP, as in the workbook.
                </p>
              </CardHeader>
              <CardContent>
                <form onSubmit={calculate} noValidate className="grid gap-5">
                  <FieldGroup className="gap-4 sm:grid sm:grid-cols-2 lg:grid-cols-3">
                    {FIELDS[t.id].map((f) => (
                      <Field key={f.key}>
                        <FieldLabel htmlFor={`calc-${t.id}-${f.key}`}>{f.label}</FieldLabel>
                        <Input
                          id={`calc-${t.id}-${f.key}`}
                          type="text"
                          inputMode="decimal"
                          autoComplete="off"
                          value={values[t.id][f.key]}
                          onChange={(e) => change(f.key, e.target.value)}
                        />
                        {f.help && <FieldDescription>{f.help}</FieldDescription>}
                      </Field>
                    ))}
                  </FieldGroup>
                  <Button type="submit" size="lg" className="w-full sm:w-auto sm:justify-self-start">
                    Calculate
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      <div aria-live="polite">
        {error && (
          <Alert variant="destructive" role="alert">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {result && (
          <section className="grid gap-4" aria-label="Results">
            <h2 className="text-xl font-extrabold text-navy">Results</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {Object.entries(result.values).map(([label, value]) => (
                <Card key={label} className="gap-1 py-4">
                  <CardContent>
                    <p className="text-sm font-semibold text-muted-foreground">{label}</p>
                    <p className="mt-1 text-2xl font-extrabold tabular-nums text-navy">
                      {display(value, label.toLowerCase().includes("percentage"))}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {result.action && (
              <Card>
                <CardContent className="grid gap-3">
                  <p className="rounded-lg bg-accent px-3 py-2 font-semibold">{result.action}</p>
                  <div>
                    <p className="mb-1 font-extrabold text-navy">Parameter text</p>
                    <p className="break-words">{result.parameter}</p>
                  </div>
                  <CopyButton text={result.parameter ?? ""} label="Copy parameter text" variant="outline" className="sm:w-fit" />
                </CardContent>
              </Card>
            )}

            <Card>
              <CardContent>
                <p className="mb-2 font-extrabold text-navy">Calculation steps</p>
                <ol className="grid list-decimal gap-1.5 ps-5 text-sm">
                  {result.steps.map((s, i) => (
                    <li key={i} className="break-words font-mono">{s}</li>
                  ))}
                </ol>
              </CardContent>
            </Card>

            <p className="text-sm text-muted-foreground">{ROUNDING}</p>
            <p className="text-sm text-muted-foreground">
              Source: {SOURCE.filename} / {SOURCE.sheet} / {result.cells}
            </p>
            <Accordion type="single" collapsible>
              <AccordionItem value="inputs">
                <AccordionTrigger className="text-base">Input values used</AccordionTrigger>
                <AccordionContent>
                  <ul className="grid gap-1 text-sm">
                    {Object.entries(result.inputs).map(([k, v]) => (
                      <li key={k}>
                        {k.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase())}: {String(v)}
                      </li>
                    ))}
                  </ul>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </section>
        )}
      </div>

      <p className="text-sm text-muted-foreground">Workbook source: {SOURCE.filename} / {SOURCE.sheet}</p>
    </div>
  );
}
