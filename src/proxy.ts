import type { NextRequest } from "next/server";
import { guardAdmin } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  return guardAdmin(request);
}

// Only the administrator area needs a session; the public pages never touch cookies.
export const config = {
  matcher: ["/admin", "/admin/:path*"],
};
