import assert from "node:assert/strict";
import test from "node:test";
import { validPhoto, PHOTO_LIMIT } from "../src/modules/auth/photo-validation.ts";
test("credential photos reject unsupported, disguised, empty and oversized files", () => {
  assert.equal(validPhoto(new Uint8Array(), "image/png"), false);
  assert.equal(validPhoto(new TextEncoder().encode("<svg onload='alert(1)'>"), "image/png"), false);
  assert.equal(validPhoto(new Uint8Array([255, 216, 255]), "application/pdf"), false);
  assert.equal(validPhoto(new Uint8Array(PHOTO_LIMIT + 1), "image/jpeg"), false);
  assert.equal(validPhoto(new Uint8Array([255, 216, 255, 224]), "image/jpeg"), true);
  assert.equal(validPhoto(new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]), "image/png"), true);
});
