import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function NotFound() {
  return (
    <main className="mx-auto grid min-h-dvh w-full max-w-md content-center px-4 py-10">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Page not found</CardTitle>
          <CardDescription>That page does not exist, or it is no longer available.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild size="lg" className="w-full">
            <Link href="/">Back to the offers</Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
