import nextEnv from "@next/env";

nextEnv.loadEnvConfig(process.cwd(), false, { info() {}, error() {} });
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const report = {
  configured: Boolean(url && key),
  sqlAccessConfigured: Boolean(process.env.SUPABASE_ACCESS_TOKEN || process.env.SUPABASE_DB_URL),
};
if (!report.configured) {
  console.log(JSON.stringify(report));
  process.exitCode = 1;
} else if (
  !key.startsWith("sb_publishable_") ||
  new URL(url).hostname !== "dnxwecpzjobtnclyywkz.supabase.co"
) {
  console.log(JSON.stringify({ ...report, error: "Unexpected project URL or non-public key" }));
  process.exitCode = 1;
} else {
  for (const [name, path] of [
    ["auth", "/auth/v1/settings"],
    ["catalog", "/rest/v1/services?select=id,code,name,description,duration_minutes&limit=6"],
  ]) {
    try {
      const response = await fetch(new URL(path, url), {
        headers: { apikey: key },
        signal: AbortSignal.timeout(15000),
      });
      const payload = await response.json().catch(() => null);
      report[name] = {
        status: response.status,
        code: response.ok ? undefined : payload?.code,
        rows: Array.isArray(payload) ? payload.length : undefined,
      };
      if (!response.ok) process.exitCode = 1;
    } catch {
      report[name] = { error: "Network request failed" };
      process.exitCode = 1;
    }
  }
  console.log(JSON.stringify(report, null, 2));
}
