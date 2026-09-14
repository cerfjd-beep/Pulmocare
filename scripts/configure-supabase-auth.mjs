import nextEnv from "@next/env";

nextEnv.loadEnvConfig(process.cwd(), false, { info() {}, error() {} });
const token = process.env.SUPABASE_ACCESS_TOKEN;
if (!token) {
  console.error(
    "Falta SUPABASE_ACCESS_TOKEN en .env.local; la clave de la aplicación no administra la configuración del proyecto.",
  );
  process.exit(1);
}
const endpoint = "https://api.supabase.com/v1/projects/dnxwecpzjobtnclyywkz/config/auth";
const site = "https://pulmocare-alpha.vercel.app";
async function call(method, body) {
  const response = await fetch(endpoint, {
    method,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) throw new Error(`Supabase Management API: HTTP ${response.status}`);
  return response.json();
}
try {
  const before = await call("GET");
  const allowed = new Set(
    (before.uri_allow_list ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
  );
  allowed.add(`${site}/auth/recovery`);
  await call("PATCH", { site_url: site, uri_allow_list: [...allowed].join(",") });
  const after = await call("GET");
  const verified =
    after.site_url === site && after.uri_allow_list.split(",").includes(`${site}/auth/recovery`);
  console.log({ configured: verified, siteUrl: after.site_url, recoveryAllowed: verified });
  if (!verified) process.exitCode = 1;
} catch (error) {
  console.error(error instanceof Error ? error.message : "No se pudo configurar Supabase");
  process.exitCode = 1;
}
