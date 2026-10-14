import { afterEach, describe, expect, it, vi } from "vitest";
import { supabaseEnv } from "@/lib/supabase/env";

const NAMES = ["SUPABASE_URL", "SUPABASE_ANON_KEY", "NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"];

function setEnv(values: Record<string, string>) {
  for (const name of NAMES) vi.stubEnv(name, values[name] as string);
  for (const name of NAMES) if (values[name] === undefined) delete process.env[name];
}

afterEach(() => vi.unstubAllEnvs());

describe("Supabase settings", () => {
  it("prefers the private names", () => {
    setEnv({
      SUPABASE_URL: "https://private.example",
      SUPABASE_ANON_KEY: "private-key",
      NEXT_PUBLIC_SUPABASE_URL: "https://public.example",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "public-key",
    });
    expect(supabaseEnv()).toEqual({ url: "https://private.example", key: "private-key" });
  });

  it("still works with the older NEXT_PUBLIC_ names", () => {
    setEnv({ NEXT_PUBLIC_SUPABASE_URL: "https://old.example", NEXT_PUBLIC_SUPABASE_ANON_KEY: "old-key" });
    expect(supabaseEnv()).toEqual({ url: "https://old.example", key: "old-key" });
  });

  it("trims stray spaces from pasted values", () => {
    setEnv({ SUPABASE_URL: "  https://x.example \n", SUPABASE_ANON_KEY: " k " });
    expect(supabaseEnv()).toEqual({ url: "https://x.example", key: "k" });
  });

  it("is not configured unless both values are present", () => {
    setEnv({ SUPABASE_URL: "https://x.example" });
    expect(supabaseEnv()).toBeNull();
    setEnv({});
    expect(supabaseEnv()).toBeNull();
  });
});
