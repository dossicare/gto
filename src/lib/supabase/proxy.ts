import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { supabaseEnv, usingFixtures } from "./env";

/**
 * Runs before every /admin request: refreshes the session cookies and sends signed-out visitors to
 * the login page. This is only a convenience gate. Every admin page and action ALSO re-checks the
 * administrator on the server (lib/auth.ts), and the database enforces it again with row-level
 * security.
 */
export async function guardAdmin(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;
  const isLogin = pathname === "/admin/login";
  const env = supabaseEnv();

  if (usingFixtures()) return NextResponse.next({ request });

  const login = () => {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/login";
    url.search = "";
    return NextResponse.redirect(url);
  };

  // Not configured: nobody can be signed in, so only the login page (which explains this) is open.
  if (!env) return isLogin ? NextResponse.next({ request }) : login();

  let response = NextResponse.next({ request });
  const pendingHeaders: Record<string, string> = {};
  const supabase = createServerClient(env.url, env.key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(list, headers) {
        for (const { name, value } of list) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of list) response.cookies.set(name, value, options);
        Object.assign(pendingHeaders, headers);
      },
    },
  });

  const { data } = await supabase.auth.getUser();
  for (const [key, value] of Object.entries(pendingHeaders)) response.headers.set(key, value);

  if (!data.user && !isLogin) return login();
  return response;
}
