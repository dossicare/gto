/** Form schemas shared by the browser forms (instant feedback) and the server actions (the real check). */
import { z } from "zod";
import { isIsoDate, isNA, safeHttpUrl } from "./text";

const short = (label: string, max = 5000) => z.string().max(max, `${label} is too long`);
const long = (label: string, max = 50_000) => z.string().max(max, `${label} is too long`);

export const offerFormSchema = z.object({
  offer_id: z.string().max(64),
  expected_revision: z.number().int().nullable(),
  name: short("Name", 300),
  category: short("Category", 200),
  lifecycle: z.enum(["available", "suspended", "archived"]),
  keywords: short("Keywords"),
  launch_date: short("Launch date", 200),
  schedule_details: long("Dates and notice"),
  notice_period: long("Notice period"),
  wallet_activation_date: z
    .string()
    .refine((v) => v === "" || isNA(v) || isIsoDate(v), "Use a real date (YYYY-MM-DD) or leave it blank"),
  wallet_activation_details: long("Wallet activation details"),
  description: long("Description"),
  benefits: long("Benefits"),
  restrictions: long("Restrictions"),
  eligibility: long("Eligibility"),
  exclusions: long("Exclusions"),
  calculation_rules: long("Calculation rules"),
  notes: long("Notes"),
  terms: long("Terms", 500_000),
  tc_url: z
    .string()
    .max(2000, "Link is too long")
    .refine((v) => v.trim() === "" || isNA(v) || safeHttpUrl(v) !== null, "Enter a complete http or https link"),
  original_source: z
    .string()
    .max(2000, "Source is too long")
    .refine(
      (v) => v.trim() === "" || isNA(v) || safeHttpUrl(v) !== null || /^(document:|sample:)/.test(v.trim()),
      "Use a complete http or https link, or a document: reference",
    ),
});
export type OfferFormValues = z.infer<typeof offerFormSchema>;

export const OFFER_FORM_FIELDS = Object.keys(offerFormSchema.shape).filter(
  (k) => k !== "offer_id" && k !== "expected_revision",
) as Exclude<keyof OfferFormValues, "offer_id" | "expected_revision">[];

export const templateFormSchema = z.object({
  template_id: z.string().max(64),
  expected_revision: z.number().int().nullable(),
  title: z.string().trim().min(1, "Enter a title").max(300, "Title is too long"),
  category: z.string().trim().min(1, "Enter a situation").max(200, "Situation is too long"),
  blocks: z
    .array(
      z.object({
        kind: z.enum(["English", "Arabic", "Notes"]),
        text: z.string().trim().min(1, "This block is empty. Fill it in or remove it.").max(150_000, "Block is too long"),
      }),
    )
    .min(1, "Add at least one block")
    .max(40, "Too many blocks"),
});
export type TemplateFormValues = z.infer<typeof templateFormSchema>;

export const termsHtmlSchema = z.string().trim().min(1, "Paste the terms HTML first").max(2_000_000, "That is too large");
