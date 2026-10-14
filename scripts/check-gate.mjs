// Smoke test for the administrator gate. Run after `npm run build`:  node scripts/check-gate.mjs
// Starts the production server with a PLACEHOLDER Supabase address (nothing is contacted) and
// confirms that, with no session, every /admin page redirects to the login page and public pages
// never expose admin controls. It uses no real credentials.
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { setTimeout as sleep } from "node:timers/promises";

const web = fileURLToPath(new URL("..", import.meta.url));
const next = fileURLToPath(new URL("../node_modules/next/dist/bin/next", import.meta.url));
const port = 3211;
const base = `http://127.0.0.1:${port}`;

const server = spawn(process.execPath, [next, "start", "-p", String(port)], {
  cwd: web,
  stdio: ["ignore", "pipe", "pipe"],
  env: {
    ...process.env,
    NODE_ENV: "production",
    SK_FIXTURES: "", // fixtures can never be on in production, but make sure
    NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:9", // nothing listens here
    NEXT_PUBLIC_SUPABASE_ANON_KEY: "placeholder-anon-key",
  },
});

let failures = 0;
const check = (name, ok, detail = "") => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  (" + detail + ")" : ""}`);
  if (!ok) failures++;
};

try {
  for (let i = 0; i < 60; i++) {
    try {
      await fetch(base + "/calculators");
      break;
    } catch {
      await sleep(500);
    }
  }

  const adminPaths = [
    "/admin", "/admin/offers", "/admin/offers/new", "/admin/offers/OFF-ANY", "/admin/templates",
    "/admin/templates/new", "/admin/templates/TPL-ANY", "/admin/general-terms", "/admin/documents",
  ];
  for (const path of adminPaths) {
    const r = await fetch(base + path, { redirect: "manual" });
    const to = r.headers.get("location") ?? "";
    check(`signed-out ${path} redirects to login`, r.status >= 300 && r.status < 400 && to.endsWith("/admin/login"), `${r.status} -> ${to}`);
  }

  const login = await fetch(base + "/admin/login", { redirect: "manual" });
  const html = await login.text();
  check("login page is reachable and shows the form", login.status === 200 && html.includes('name="password"'), String(login.status));
  check("login page is not indexable", /noindex/i.test(html));

  const home = await fetch(base + "/calculators");
  const home_html = await home.text();
  check("public calculators page loads", home.status === 200);
  check("public pages contain no admin controls", !/Delete offer|Save offer|Add offer|Sign out/.test(home_html));
  check("security headers are present", home.headers.get("x-content-type-options") === "nosniff" && home.headers.get("x-frame-options") === "DENY");

  const adminHdr = await fetch(base + "/admin/login");
  check("admin responses are not cacheable", /no-store/.test(adminHdr.headers.get("cache-control") ?? ""), adminHdr.headers.get("cache-control") ?? "");
} finally {
  server.kill();
}

console.log(failures === 0 ? "\nAll gate checks passed." : `\n${failures} check(s) FAILED.`);
process.exit(failures === 0 ? 0 : 1);
