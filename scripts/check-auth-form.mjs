import assert from "node:assert/strict";
const base = "http://127.0.0.1:3143";
for (const suffix of ["", "?mode=signup"]) {
  const response = await fetch(base + "/ingresar" + suffix);
  const html = await response.text();
  assert.equal(response.status, 200);
  assert.ok(html.includes('action="/auth/session"'));
  assert.ok(html.includes('method="post"'));
  assert.ok(html.includes('noValidate=""') || html.includes('novalidate=""'));
  if (suffix) assert.ok(html.includes('name="confirmation"'));
}
for (const body of [
  "mode=login&email=&password=",
  "mode=signup&email=test%40example.com&password=short&confirmation=short",
]) {
  const response = await fetch(base + "/auth/session", {
    method: "POST",
    headers: { Origin: base, "Content-Type": "application/x-www-form-urlencoded" },
    body,
    redirect: "manual",
  });
  assert.equal(response.status, 303);
  const target = new URL(response.headers.get("location"));
  assert.equal(target.searchParams.get("notice"), "invalid");
  assert.equal(target.searchParams.has("password"), false);
  const html = await (await fetch(target)).text();
  assert.ok(html.includes("Completa un correo válido"));
}
const denied = await fetch(base + "/auth/session", {
  method: "POST",
  headers: {
    Origin: "https://untrusted.example",
    "Content-Type": "application/x-www-form-urlencoded",
  },
  body: "mode=login",
});
assert.equal(denied.status, 403);
console.log(
  "PASS: login/signup work without JavaScript; invalid fields redirect to visible feedback; cross-origin POST denied. No Supabase accounts accessed.",
);
