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
      if (name === "auth" && response.ok) {
        report.auth.emailEnabled = payload?.external?.email;
        report.auth.signupDisabled = payload?.disable_signup;
        report.auth.autoConfirm = payload?.mailer_autoconfirm;
      }
      if (!response.ok) process.exitCode = 1;
    } catch {
      report[name] = { error: "Network request failed" };
      process.exitCode = 1;
    }
  }
  for (const [name, args] of [
    ["get_my_access", {}],
    ["list_my_assignments", {}],
    ["list_provider_registrations", {}],
    ["list_operations_requests", { page_size: 1 }],
    ["list_provider_photos", {}],
    ["get_provider_photo", { target: "00000000-0000-0000-0000-000000000000" }],
    ["review_provider", { target: "00000000-0000-0000-0000-000000000000", approve: false }],
    [
      "reserve_provider_photo",
      { photo_kind: "degree", photo_mime: "image/png", photo_size: 1, photo_hash: "0".repeat(64) },
    ],
    ["list_service_prices", {}],
    ["publish_service_price", { target: "00000000-0000-0000-0000-000000000000", amount: 0 }],
    [
      "set_nebulization_discount",
      { discount: 0, expected: "00000000-0000-0000-0000-000000000000" },
    ],
    ["register_patient", { display_name: "diagnostic" }],
    [
      "register_provider",
      { full_name: "diagnostic", specialty: "diagnostic", registration_ref: "diagnostic" },
    ],
  ]) {
    // Anonymous requests must be denied; never create an Auth user or application profile.
    try {
      const response = await fetch(new URL(`/rest/v1/rpc/${name}`, url), {
        method: "POST",
        headers: { apikey: key, "Content-Type": "application/json" },
        body: JSON.stringify(args),
        signal: AbortSignal.timeout(15000),
      });
      const payload = await response.json().catch(() => null);
      report[name] = {
        status: response.status,
        code: payload?.code,
        installedAndProtected: response.status === 401 && payload?.code === "42501",
      };
      if (!report[name].installedAndProtected) process.exitCode = 1;
    } catch {
      report[name] = { error: "Network request failed" };
      process.exitCode = 1;
    }
  }
  for (const name of ["get_service_offers", "get_nebulization_discount"]) {
    try {
      const response = await fetch(new URL(`/rest/v1/rpc/${name}`, url), {
        method: "POST",
        headers: { apikey: key, "Content-Type": "application/json" },
        body: "{}",
        signal: AbortSignal.timeout(15000),
      });
      const payload = await response.json().catch(() => null);
      report[name] = {
        status: response.status,
        code: payload?.code,
        rows: Array.isArray(payload) ? payload.length : undefined,
      };
      const complete =
        Array.isArray(payload) &&
        (name === "get_nebulization_discount"
          ? payload.length === 1
          : payload.some((item) => item.code === "nebulization-7-days"));
      report[name].complete = complete;
      if (!response.ok || !complete) process.exitCode = 1;
    } catch {
      report[name] = { error: "Network request failed" };
      process.exitCode = 1;
    }
  }
  console.log(JSON.stringify(report, null, 2));
}
