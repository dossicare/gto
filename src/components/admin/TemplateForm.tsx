"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormProvider, useFieldArray, useForm, useWatch } from "react-hook-form";
import { ArrowDownIcon, ArrowUpIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";
import { saveTemplateAction } from "@/app/admin/_actions/templates";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { templateFormSchema, type TemplateFormValues } from "@/lib/admin-schemas";
import type { TemplateRecord } from "@/lib/types";
import { FormField } from "./FormField";

const KINDS = [
  { value: "English", label: "English script" },
  { value: "Arabic", label: "Arabic script (right-to-left)" },
  { value: "Notes", label: "Internal guidance (not for the customer)" },
];

export function TemplateForm({ record, situations }: { record: TemplateRecord | null; situations: string[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const isNew = record === null;

  const methods = useForm<TemplateFormValues>({
    resolver: zodResolver(templateFormSchema),
    defaultValues: {
      template_id: record?.template_id ?? "",
      expected_revision: record?.revision ?? null,
      title: record?.title ?? "",
      category: record?.category ?? "",
      blocks: record
        ? record.blocks.map((b) => ({ kind: b.kind, text: b.paragraphs.map((p) => p.text).join("\n\n") }))
        : [{ kind: "English" as const, text: "" }],
    },
  });
  const { fields, append, remove, move } = useFieldArray({ control: methods.control, name: "blocks" });
  const watchedBlocks = useWatch({ control: methods.control, name: "blocks" });

  const onSubmit = methods.handleSubmit((values) =>
    start(async () => {
      const result = await saveTemplateAction(values);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(isNew ? "Template added" : "Template saved");
      if (isNew) router.replace(`/admin/templates/${encodeURIComponent(result.data.id)}`);
      else router.refresh();
    }),
  );

  return (
    <FormProvider {...methods}>
      <form onSubmit={(e) => { void onSubmit(e).catch(() => toast.error("Check the highlighted fields.")); }} noValidate className="grid gap-5 pb-24 sm:pb-0">
        <p className="text-sm text-muted-foreground">
          Wording and placeholders such as {"{{customer_name}}"} are stored exactly as typed. Separate paragraphs with a blank line.
          Nothing is translated automatically.
        </p>

        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <FormField name="title" label="Template title" />
            <FormField name="category" label="Situation" list="situation-options" description="Templates are grouped by situation." />
            <datalist id="situation-options">
              {situations.map((s) => <option key={s} value={s} />)}
            </datalist>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Scripts</CardTitle>
            <CardDescription>Add one block per script. Use Internal guidance for notes that must not be copied to a customer.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            {fields.map((field, index) => {
              const kind = watchedBlocks?.[index]?.kind;
              return (
                <div key={field.id} className="grid gap-3 rounded-lg border bg-background p-3 sm:p-4">
                  <div className="flex items-end gap-2">
                    <div className="flex-1">
                      <FormField name={`blocks.${index}.kind`} label={`Block ${index + 1}`} kind="select" options={KINDS} />
                    </div>
                    <Button type="button" variant="outline" size="icon" aria-label="Move block up" disabled={index === 0} onClick={() => move(index, index - 1)}>
                      <ArrowUpIcon />
                    </Button>
                    <Button type="button" variant="outline" size="icon" aria-label="Move block down" disabled={index === fields.length - 1} onClick={() => move(index, index + 1)}>
                      <ArrowDownIcon />
                    </Button>
                    <Button type="button" variant="outline" size="icon" aria-label="Remove block" disabled={fields.length === 1} onClick={() => remove(index)}>
                      <Trash2Icon />
                    </Button>
                  </div>
                  <FormField
                    name={`blocks.${index}.text`}
                    label="Text"
                    kind="textarea"
                    rows={7}
                    dir={kind === "Arabic" ? "rtl" : "auto"}
                  />
                </div>
              );
            })}
            {methods.formState.errors.blocks?.message && (
              <p role="alert" className="text-sm font-medium text-destructive">{methods.formState.errors.blocks.message}</p>
            )}
            <Button type="button" variant="outline" className="w-full sm:w-fit" onClick={() => append({ kind: "English", text: "" })}>
              <PlusIcon /> Add block
            </Button>
          </CardContent>
        </Card>

        <div className="fixed inset-x-0 bottom-0 z-20 flex gap-2 border-t bg-background/95 p-3 backdrop-blur sm:static sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
          <Button type="submit" size="lg" disabled={pending} className="flex-1 sm:flex-none">
            {pending ? "Saving…" : isNew ? "Add template" : "Save template"}
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/admin/templates">Cancel</Link>
          </Button>
        </div>
      </form>
    </FormProvider>
  );
}
