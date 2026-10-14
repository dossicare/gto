"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormProvider, useForm } from "react-hook-form";
import { toast } from "sonner";
import { saveOfferAction } from "@/app/admin/_actions/offers";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { offerFormSchema, type OfferFormValues } from "@/lib/admin-schemas";
import { isNA } from "@/lib/text";
import type { OfferRecord } from "@/lib/types";
import { FormField } from "./FormField";

const LIFECYCLES = [
  { value: "available", label: "Available" },
  { value: "suspended", label: "Suspended" },
  { value: "archived", label: "Archived" },
];

/** Stored "N/A" placeholders are shown as empty fields; blank fields are saved back as "N/A". */
const shown = (v: string | undefined) => (!v || isNA(v) ? "" : v);

export function OfferForm({ record, categories }: { record: OfferRecord | null; categories: string[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const isNew = record === null;

  const methods = useForm<OfferFormValues>({
    resolver: zodResolver(offerFormSchema),
    defaultValues: {
      offer_id: record?.offer_id ?? "",
      expected_revision: record?.revision ?? null,
      name: shown(record?.name),
      category: shown(record?.category),
      lifecycle: (["available", "suspended", "archived"] as const).find((l) => l === record?.lifecycle) ?? "available",
      keywords: shown(record?.keywords),
      launch_date: shown(record?.launch_date),
      schedule_details: shown(record?.schedule_details),
      notice_period: shown(record?.notice_period),
      wallet_activation_date: shown(record?.wallet_activation_date),
      wallet_activation_details: shown(record?.wallet_activation_details),
      description: shown(record?.description),
      benefits: shown(record?.benefits),
      restrictions: shown(record?.restrictions),
      eligibility: shown(record?.eligibility),
      exclusions: shown(record?.exclusions),
      calculation_rules: shown(record?.calculation_rules),
      notes: shown(record?.notes),
      terms: shown(record?.terms),
      tc_url: shown(record?.tc_url),
      original_source: shown(record?.original_source),
    },
  });

  const onSubmit = methods.handleSubmit((values) =>
    start(async () => {
      const result = await saveOfferAction(values);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(isNew ? "Offer added" : "Offer saved", { description: result.data.note });
      if (isNew) router.replace(`/admin/offers/${encodeURIComponent(result.data.id)}`);
      else router.refresh();
    }),
  );

  const onInvalid = () => toast.error("Check the highlighted fields.");

  return (
    <FormProvider {...methods}>
      <form onSubmit={(e) => { void onSubmit(e).catch(onInvalid); }} noValidate className="grid gap-5 pb-24 sm:pb-0">
        <p className="text-sm text-muted-foreground">All fields are optional. Empty fields are saved as N/A. Every save keeps the earlier version in the history.</p>

        <Card>
          <CardHeader>
            <CardTitle>Basics</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <FormField name="name" label="Offer name" className="sm:col-span-2" />
            <FormField name="category" label="Category" list="category-options" description="For example Products or Promotions." />
            <datalist id="category-options">
              {categories.map((c) => <option key={c} value={c} />)}
            </datalist>
            <FormField name="lifecycle" label="Visibility" kind="select" options={LIFECYCLES} description="Archived offers are hidden from the overview but still found by search." />
            <FormField name="keywords" label="Search keywords" className="sm:col-span-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Dates</CardTitle>
            <CardDescription>The wallet date is separate from when the offer is available. Never guess a date.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <FormField
              name="launch_date"
              label="Launch / T&C title date"
              className="sm:col-span-2"
              description={
                record?.launch_date_evidence
                  ? `${record.launch_date_evidence} Leave blank to read it from the T&C page title when saving.`
                  : "Leave blank to read it from the official T&C page title when saving."
              }
            />
            <FormField name="schedule_details" label="Dates and notice (as supplied)" kind="textarea" rows={3} className="sm:col-span-2" />
            <FormField name="notice_period" label="Notice period" description="Free text, such as 14 days." />
            <FormField name="wallet_activation_date" label="Wallet activation date" kind="date" description="Only if an exact date is documented." />
            <FormField name="wallet_activation_details" label="Wallet activation details" kind="textarea" rows={3} className="sm:col-span-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Content</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <FormField name="description" label="Description" kind="textarea" rows={3} />
            <FormField name="benefits" label="Benefits" kind="textarea" rows={4} />
            <FormField name="restrictions" label="Restrictions" kind="textarea" rows={4} />
            <FormField name="eligibility" label="Eligibility" kind="textarea" rows={3} />
            <FormField name="exclusions" label="Exclusions" kind="textarea" rows={3} />
            <FormField name="calculation_rules" label="Calculation rules (if applicable)" kind="textarea" rows={3} />
            <FormField name="notes" label="Additional notes" kind="textarea" rows={3} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Terms &amp; links</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <FormField name="terms" label="Complete Terms & Conditions" kind="textarea" rows={10} />
            <FormField name="tc_url" label="Official T&C link" placeholder="https://" />
            <FormField name="original_source" label="Original source" description="A link, or a reference starting with document:" />
          </CardContent>
        </Card>

        <div className="fixed inset-x-0 bottom-0 z-20 flex gap-2 border-t bg-background/95 p-3 backdrop-blur sm:static sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
          <Button type="submit" size="lg" disabled={pending} className="flex-1 sm:flex-none">
            {pending ? "Saving…" : isNew ? "Add offer" : "Save offer"}
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/admin/offers">Cancel</Link>
          </Button>
        </div>
      </form>
    </FormProvider>
  );
}
