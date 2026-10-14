"use client";

import { useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ActionResult } from "@/app/admin/state";

/**
 * A two-step confirmation for anything that removes or replaces data. When `requireText` is set
 * (permanent actions), the confirm button stays disabled until that word is typed exactly.
 */
export function ConfirmAction({
  trigger,
  triggerVariant = "outline",
  title,
  description,
  confirmLabel,
  confirmVariant = "danger",
  requireText,
  successMessage,
  redirectTo,
  run,
  className,
}: {
  trigger: ReactNode;
  triggerVariant?: React.ComponentProps<typeof Button>["variant"];
  title: string;
  description: ReactNode;
  confirmLabel: string;
  confirmVariant?: React.ComponentProps<typeof Button>["variant"];
  requireText?: string;
  successMessage: string;
  /** Where to go afterwards; the current page is refreshed when omitted. */
  redirectTo?: string;
  run: () => Promise<ActionResult>;
  className?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [pending, start] = useTransition();
  const blocked = requireText !== undefined && typed !== requireText;

  function confirm() {
    start(async () => {
      const result = await run();
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(successMessage);
      setOpen(false);
      setTyped("");
      if (redirectTo) router.push(redirectTo);
      else router.refresh();
    });
  }

  return (
    <AlertDialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setTyped(""); }}>
      <AlertDialogTrigger asChild>
        <Button type="button" variant={triggerVariant} className={className}>
          {trigger}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="text-base text-muted-foreground">{description}</div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        {requireText !== undefined && (
          <div className="grid gap-2">
            <label htmlFor="confirm-text" className="text-sm font-semibold">
              Type <span className="font-mono">{requireText}</span> to confirm
            </label>
            <Input id="confirm-text" value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" autoCapitalize="characters" />
          </div>
        )}
        <AlertDialogFooter className="gap-2 sm:gap-2">
          <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
          <Button type="button" variant={confirmVariant} onClick={confirm} disabled={blocked || pending}>
            {pending ? "Working…" : confirmLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
