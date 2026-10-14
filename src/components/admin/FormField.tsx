"use client";

import { get, useFormContext, type FieldValues } from "react-hook-form";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";

type Kind = "input" | "textarea" | "select" | "date";

/** A labelled form control wired to react-hook-form, with its hint and error message. */
export function FormField({
  name,
  label,
  description,
  kind = "input",
  rows,
  placeholder,
  options,
  list,
  dir,
  className,
}: {
  name: string;
  label: string;
  description?: string;
  kind?: Kind;
  rows?: number;
  placeholder?: string;
  options?: { value: string; label: string }[];
  /** id of a <datalist> offering suggestions */
  list?: string;
  dir?: "ltr" | "rtl" | "auto";
  className?: string;
}) {
  const { register, formState } = useFormContext<FieldValues>();
  const error = get(formState.errors, name) as { message?: string } | undefined;
  const id = `field-${name.replace(/\./g, "-")}`;
  const invalid = Boolean(error);

  return (
    <Field data-invalid={invalid} className={className}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      {kind === "textarea" ? (
        <Textarea id={id} rows={rows} placeholder={placeholder} dir={dir} aria-invalid={invalid} {...register(name)} />
      ) : kind === "select" ? (
        <NativeSelect id={id} aria-invalid={invalid} {...register(name)}>
          {(options ?? []).map((o) => (
            <NativeSelectOption key={o.value} value={o.value}>{o.label}</NativeSelectOption>
          ))}
        </NativeSelect>
      ) : (
        <Input id={id} type={kind === "date" ? "date" : "text"} list={list} placeholder={placeholder} aria-invalid={invalid} {...register(name)} />
      )}
      {description && <FieldDescription>{description}</FieldDescription>}
      {error?.message && <FieldError errors={[error]} />}
    </Field>
  );
}
