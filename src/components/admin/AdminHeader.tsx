"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ExternalLinkIcon, LogOutIcon, MenuIcon } from "lucide-react";
import { logoutAction } from "@/app/admin/_actions/auth";
import { Button } from "@/components/ui/button";
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/admin", label: "Dashboard", active: (p: string) => p === "/admin" },
  { href: "/admin/offers", label: "Offers", active: (p: string) => p.startsWith("/admin/offers") },
  { href: "/admin/templates", label: "Templates", active: (p: string) => p.startsWith("/admin/templates") },
  { href: "/admin/general-terms", label: "General Terms", active: (p: string) => p.startsWith("/admin/general-terms") },
  { href: "/admin/documents", label: "Documents", active: (p: string) => p.startsWith("/admin/documents") },
];

export function AdminHeader({ email }: { email: string }) {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-30 border-b-[3px] border-gold bg-navy text-white">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4">
        <Link href="/admin" className="flex items-center gap-2 font-extrabold tracking-tight">
          <span className="rounded bg-gold px-2 py-0.5 text-xs font-extrabold uppercase text-navy">Admin</span>
          <span className="hidden sm:inline">Support Knowledge</span>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex" aria-label="Admin">
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

        <div className="hidden items-center gap-2 lg:flex">
          <Button asChild variant="ghost" size="sm" className="text-white hover:bg-white/10 hover:text-white">
            <Link href="/" target="_blank">
              View site <ExternalLinkIcon />
            </Link>
          </Button>
          <form action={logoutAction}>
            <Button type="submit" variant="outline" size="sm" className="border-white/25 bg-transparent text-white hover:bg-white/10 hover:text-white">
              <LogOutIcon /> Sign out
            </Button>
          </form>
        </div>

        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="border-white/25 bg-transparent text-white hover:bg-white/10 hover:text-white lg:hidden" aria-label="Open menu">
              <MenuIcon />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-72 border-white/10 bg-navy text-white [&_button[data-slot=sheet-close]]:text-white">
            <SheetHeader>
              <SheetTitle className="text-white">Admin menu</SheetTitle>
              <SheetDescription className="break-all text-white/60">{email}</SheetDescription>
            </SheetHeader>
            <nav className="grid gap-1 px-2" aria-label="Admin">
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
              <SheetClose asChild>
                <Link href="/" target="_blank" className="flex min-h-12 items-center gap-2 rounded-lg px-4 text-base font-semibold text-white/90">
                  View site <ExternalLinkIcon className="size-4" />
                </Link>
              </SheetClose>
            </nav>
            <form action={logoutAction} className="mt-auto p-4">
              <Button type="submit" variant="gold" size="lg" className="w-full">
                <LogOutIcon /> Sign out
              </Button>
            </form>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
