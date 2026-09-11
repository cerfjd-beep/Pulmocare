import test from "node:test";
import assert from "node:assert/strict";
import { validateSupabaseConfig } from "../src/integrations/supabase/config.ts";

test("Supabase distinguishes missing configuration from an incomplete connection", () => {
  assert.equal(validateSupabaseConfig(undefined, undefined), null);
  assert.throws(() => validateSupabaseConfig("https://example.supabase.co", undefined));
});

test("Supabase public connection rejects secret keys and URLs containing credentials", () => {
  assert.throws(() => validateSupabaseConfig("https://example.supabase.co", "sb_secret_test"));
  assert.throws(() =>
    validateSupabaseConfig("https://user:password@example.supabase.co", "sb_publishable_test"),
  );
  assert.throws(() =>
    validateSupabaseConfig("https://example.supabase.co.invalid", "sb_publishable_test"),
  );
  assert.throws(() => validateSupabaseConfig("http://example.supabase.co", "sb_publishable_test"));
});

test("Supabase accepts only the expected public project configuration", () => {
  assert.deepEqual(validateSupabaseConfig("https://example.supabase.co/", "sb_publishable_test"), {
    url: "https://example.supabase.co",
    publishableKey: "sb_publishable_test",
  });
});
