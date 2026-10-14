"use client";

import { useEffect, useRef, useState } from "react";
import { CheckIcon, CopyIcon, DownloadIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

type State = "idle" | "copied" | "failed";

/** Copies text to the clipboard (with a fallback for browsers that block the async API). */
export function CopyButton({
  text,
  label = "Copy",
  variant = "default",
  className,
}: {
  text: string;
  label?: string;
  variant?: React.ComponentProps<typeof Button>["variant"];
  className?: string;
}) {
  const [state, setState] = useState<State>("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  async function copy() {
    let ok = false;
    try {
      await navigator.clipboard.writeText(text);
      ok = true;
    } catch {
      const area = document.createElement("textarea");
      area.value = text;
      area.setAttribute("readonly", "");
      area.style.cssText = "position:fixed;opacity:0;top:0;left:0";
      document.body.appendChild(area);
      area.select();
      try {
        ok = document.execCommand("copy");
      } catch {
        ok = false;
      }
      area.remove();
    }
    setState(ok ? "copied" : "failed");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setState("idle"), 2200);
  }

  return (
    <Button type="button" variant={variant} onClick={copy} className={className}>
      {state === "copied" ? <CheckIcon /> : <CopyIcon />}
      <span aria-live="polite">{state === "copied" ? "Copied" : state === "failed" ? "Press Ctrl+C to copy" : label}</span>
    </Button>
  );
}

/** Saves text as a UTF-8 .txt file (works offline; no server round trip). */
export function DownloadTextButton({
  text,
  filename,
  label,
  className,
}: {
  text: string;
  filename: string;
  label: string;
  className?: string;
}) {
  function download() {
    const url = URL.createObjectURL(new Blob([text], { type: "text/plain;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }
  return (
    <Button type="button" variant="outline" onClick={download} className={className}>
      <DownloadIcon />
      {label}
    </Button>
  );
}
