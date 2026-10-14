import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Inter } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: { default: "Support Knowledge", template: "%s | Support Knowledge" },
  description: "Offers, terms, bilingual templates and pricing calculators.",
  // Reference material, not for search engines.
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#09091a",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={cn("font-sans", inter.variable)}>
      <body className="min-h-dvh">
        {children}
        <Toaster theme="light" position="top-center" richColors closeButton />
      </body>
    </html>
  );
}
