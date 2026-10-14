// Starts the dev server with FICTIONAL in-memory sample data (no Supabase needed).
// Only for trying the screens locally; it is ignored in production builds.
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const web = fileURLToPath(new URL("..", import.meta.url));
const next = fileURLToPath(new URL("../node_modules/next/dist/bin/next", import.meta.url));
const port = process.env.PORT ?? "3100";

const child = spawn(process.execPath, [next, "dev", "-p", port], {
  cwd: web,
  stdio: "inherit",
  env: { ...process.env, SK_FIXTURES: "1" },
});
child.on("exit", (code) => process.exit(code ?? 0));
