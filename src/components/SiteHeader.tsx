"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MenuIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/", label: "Offers", active: (p: string) => p === "/" || p.startsWith("/offers") },
  { href: "/general-terms", label: "General Terms", active: (p: string) => p.startsWith("/general-terms") },
  { href: "/templates", label: "Templates", active: (p: string) => p.startsWith("/templates") },
  { href: "/calculators", label: "Calculators", active: (p: string) => p.startsWith("/calculators") },
];

export function SiteHeader() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-30 border-b-[3px] border-gold bg-navy text-white">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4">
        <Link href="/" className="flex shrink-0 items-center" aria-label="Support Knowledge home">
          <Image src="/gto-logo.png" alt="GTO" width={365} height={150} priority className="h-11 w-auto" />
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              aria-current={l.active(pathname) ? "page" : undefined}
              className={cn(
                "rounded-lg px-3 py-2 text-sm font-semibold transition-colors",
                l.active(pathname) ? "bg-white/10 text-gold" : "text-white/85 hover:bg-white/10 hover:text-white",
              )}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="border-white/25 bg-transparent text-white hover:bg-white/10 hover:text-white md:hidden" aria-label="Open menu">
              <MenuIcon />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-72 border-white/10 bg-navy text-white [&_button[data-slot=sheet-close]]:text-white">
            <SheetHeader>
              <SheetTitle className="text-white">Menu</SheetTitle>
              <SheetDescription className="sr-only">Go to another section</SheetDescription>
            </SheetHeader>
            <nav className="grid gap-1 px-2 pb-4" aria-label="Main">
              {LINKS.map((l) => (
                <SheetClose key={l.href} asChild>
                  <Link
                    href={l.href}
                    aria-current={l.active(pathname) ? "page" : undefined}
                    className={cn(
                      "flex min-h-12 items-center rounded-lg px-4 text-base font-semibold",
                      l.active(pathname) ? "bg-white/10 text-gold" : "text-white/90 active:bg-white/10",
                    )}
                  >
                    {l.label}
                  </Link>
                </SheetClose>
              ))}
            </nav>
            <div className="mt-auto grid gap-1 border-t border-white/10 px-2 py-4">
              <a href="https://gtomembers.com/" target="_blank" rel="noopener noreferrer" className="flex min-h-11 items-center rounded-lg px-4 text-sm font-semibold text-white/80">
                Official GTO website
              </a>
              <a href="https://gtomembers.com/terms-conditions" target="_blank" rel="noopener noreferrer" className="flex min-h-11 items-center rounded-lg px-4 text-sm font-semibold text-white/80">
                Published terms
              </a>
              <p className="px-4 pt-2 text-xs text-white/60">Powered by the ZTP group</p>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
