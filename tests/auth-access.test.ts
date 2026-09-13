import assert from "node:assert/strict";
import test from "node:test";
import { parseAccess, portals, type Access } from "../src/modules/auth/access.ts";
const access = (roles: string[], status: string | null = null): Access => ({
  profile_id: "test",
  name: "Test",
  active: true,
  roles,
  professional_status: status,
});
test("patient and provider accounts cannot acquire an administrator portal", () => {
  assert.deepEqual(portals(access(["patient"])), ["patient"]);
  assert.deepEqual(portals(access([], "pending")), []);
  assert.deepEqual(portals(access(["therapist"], "verified")), ["provider"]);
  assert.deepEqual(portals(access(["admin"])), []);
});
test("professional portal requires both approval and an active clinical role", () => {
  assert.deepEqual(portals(access(["therapist"], "pending")), []);
  assert.deepEqual(portals(access(["therapist"], "suspended")), []);
  assert.deepEqual(portals(access(["therapist"])), []);
  assert.deepEqual(portals(access([], "verified")), []);
  assert.deepEqual(portals(access(["clinical_reviewer"], "verified")), ["provider"]);
});
test("revoked or inactive permissions immediately remove portals", () => {
  assert.deepEqual(portals({ ...access(["access_admin", "patient"]), active: false }), []);
  assert.deepEqual(portals(access([])), []);
  assert.deepEqual(portals(null), []);
});
test("granular administrators only receive their authorized portal groups", () => {
  for (const role of ["operations_admin", "billing_admin", "access_admin"])
    assert.deepEqual(portals(access([role])), ["admin"]);
  assert.deepEqual(portals(access(["access_admin", "patient"])), ["admin", "patient"]);
});
test("malformed server access data fails closed", () => {
  assert.equal(parseAccess({ role: "admin" }), null);
  assert.equal(parseAccess({ ...access([]), roles: [1] }), null);
  assert.equal(parseAccess({ ...access([]), active: "true" }), null);
});
