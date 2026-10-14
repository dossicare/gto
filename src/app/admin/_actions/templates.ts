"use server";

import { templateFormSchema } from "@/lib/admin-schemas";
import { requireAdmin } from "@/lib/auth";
import type { TemplateBlock, TemplateParagraph, TemplateRecord } from "@/lib/types";
import { done, failed, messageOf, type ActionResult } from "../state";

/** Split typed text on blank lines into paragraphs, keeping the original paragraph numbers where they exist. */
function toParagraphs(text: string, originals: TemplateParagraph[], firstNumber: number): TemplateParagraph[] {
  const parts = text.split(/\n{2,}/).map((s) => s.trim()).filter(Boolean);
  const last = originals.at(-1)?.number ?? firstNumber - 1;
  return parts.map((part, i) => ({ number: originals[i]?.number ?? last + (i - originals.length + 1), text: part }));
}

function newTemplateId(): string {
  return "TPL-" + crypto.randomUUID().replace(/-/g, "").slice(0, 16).toUpperCase();
}

export async function saveTemplateAction(input: unknown): Promise<ActionResult<{ id: string; revision: number }>> {
  const { repo } = await requireAdmin();
  const parsed = templateFormSchema.safeParse(input);
  if (!parsed.success) return failed(parsed.error.issues[0]?.message ?? "Check the form and try again.");
  const form = parsed.data;

  try {
    const isNew = form.template_id === "";
    const current = isNew ? null : await repo.getTemplate(form.template_id);
    if (!isNew && !current) return failed("This template no longer exists.");
    if (!isNew && form.expected_revision === null) return failed("Reload the page and try again.");

    // New templates go to the end of the list.
    const all = isNew ? await repo.listTemplates(true) : [];
    const start = current?.start ?? Math.max(0, ...all.map((t) => t.start)) + 1;

    const blocks: TemplateBlock[] = form.blocks.map((b, i) => ({
      kind: b.kind,
      paragraphs: toParagraphs(b.text, current?.blocks[i]?.paragraphs ?? [], start),
    }));

    const record: TemplateRecord = {
      ...(current ?? { paragraphs: [], source: "Added in the admin area", revision: 1, start, template_id: newTemplateId(), title: "", category: "", path: "", blocks: [] }),
      title: form.title,
      category: form.category,
      path: `${form.category} / ${form.title}`,
      blocks,
    };
    const saved = await repo.saveTemplate(record, isNew ? null : form.expected_revision, "save");
    return done({ id: saved.template_id, revision: saved.revision });
  } catch (error) {
    return failed(messageOf(error));
  }
}

export async function deleteTemplateAction(id: string, expectedRevision: number): Promise<ActionResult> {
  const { repo } = await requireAdmin();
  try {
    const current = await repo.getTemplate(id);
    if (!current) return failed("Template not found.");
    await repo.saveTemplate({ ...current, deleted: true }, expectedRevision, "delete (history retained)");
    return done();
  } catch (error) {
    return failed(messageOf(error));
  }
}

export async function undeleteTemplateAction(id: string, expectedRevision: number): Promise<ActionResult> {
  const { repo } = await requireAdmin();
  try {
    const current = await repo.getTemplate(id);
    if (!current) return failed("Template not found.");
    await repo.saveTemplate({ ...current, deleted: false }, expectedRevision, "restore (undelete)");
    return done();
  } catch (error) {
    return failed(messageOf(error));
  }
}

export async function restoreTemplateRevisionAction(id: string, revision: number, expectedRevision: number): Promise<ActionResult> {
  const { repo } = await requireAdmin();
  try {
    const history = await repo.templateHistory(id);
    const source = history.find((h) => h.revision === revision)?.payload;
    if (!source) return failed("That revision was not found.");
    await repo.saveTemplate({ ...source, deleted: false }, expectedRevision, `restore revision ${revision}`);
    return done();
  } catch (error) {
    return failed(messageOf(error));
  }
}
