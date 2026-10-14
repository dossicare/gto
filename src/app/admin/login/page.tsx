import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getAdmin } from "@/lib/auth";
import { supabaseEnv, usingFixtures } from "@/lib/supabase/env";
import { LoginForm } from "./LoginForm";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Admin sign in", robots: { index: false, follow: false } };

export default async function LoginPage() {
  if (await getAdmin()) redirect("/admin");
  const configured = usingFixtures() || supabaseEnv() !== null;

  return (
    <main className="mx-auto grid min-h-dvh w-full max-w-md content-center gap-6 px-4 py-10">
      <Link href="/" className="mx-auto rounded-xl bg-navy px-5 py-3" aria-label="Back to the site">
        <Image src="/gto-logo.png" alt="GTO" width={365} height={150} priority className="h-12 w-auto" />
      </Link>
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Admin sign in</CardTitle>
          <CardDescription>Only the administrator account can sign in here.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          {configured ? (
            <LoginForm />
          ) : (
            <Alert>
              <AlertDescription>
                The database is not connected yet. Add the Supabase URL and anon key to the environment.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
      <p className="text-center text-sm text-muted-foreground">
        <Link href="/" className="font-semibold underline-offset-2 hover:underline">← Back to the site</Link>
      </p>
    </main>
  );
}
