import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";

export default function PublicLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl px-4 py-5 sm:py-8">{children}</main>
      <footer className="mx-auto max-w-6xl px-4 pb-8 pt-2 text-sm text-muted-foreground">
        <div className="grid gap-3 border-t pt-4">
          <p className="font-semibold text-foreground">Powered by the ZTP group</p>
          <p>Reference material only. Check the official source before relying on any detail.</p>
          <nav className="flex flex-wrap gap-x-5 gap-y-1" aria-label="Official links">
            <a href="https://gtomembers.com/" target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center font-semibold underline-offset-2 hover:underline">
              Official GTO website
            </a>
            <a href="https://gtomembers.com/terms-conditions" target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center font-semibold underline-offset-2 hover:underline">
              Published terms
            </a>
            <Link href="/admin" className="inline-flex min-h-11 items-center font-semibold underline-offset-2 hover:underline">
              Admin
            </Link>
          </nav>
        </div>
      </footer>
    </>
  );
}
