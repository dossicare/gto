import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { CopyButton, DownloadTextButton } from "./CopyButton";

/** One copyable script. Arabic is laid out right-to-left; the text itself is never altered. */
export function ScriptCard({
  language,
  index,
  count,
  text,
  filename,
}: {
  language: "English" | "Arabic";
  index: number;
  count: number;
  text: string;
  filename: string;
}) {
  const arabic = language === "Arabic";
  const label = count > 1 ? `${language} ${index}` : language;
  return (
    <Card>
      <CardContent className="grid gap-3">
        {count > 1 && <p className="text-sm font-semibold text-muted-foreground">Script {index}</p>}
        <div
          dir={arabic ? "rtl" : "ltr"}
          lang={arabic ? "ar" : "en"}
          className={cn(
            "rounded-lg border bg-background p-4 leading-loose whitespace-pre-wrap break-words",
            arabic ? "text-lg" : "text-base",
          )}
        >
          {text}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <CopyButton text={text} label={`Copy ${label}`} />
          <DownloadTextButton text={text} filename={filename} label="Download" />
        </div>
      </CardContent>
    </Card>
  );
}
