import assert from "node:assert/strict";
import test from "node:test";
import {
  services,
  servicePackages,
  paymentMethods,
  quote,
  money,
} from "../src/modules/services/catalog.ts";
test("cash and individual services remain available alongside packages", () => {
  assert.ok(paymentMethods.includes("Efectivo"));
  assert.ok(services.some((s) => s.id === "nebulization" && s.cents === 1500));
  assert.ok(services.some((s) => s.id === "rehab" && s.cents === 3000));
  assert.equal(servicePackages.find((s) => s.id === "nebulization-7-days")?.sessions, 7);
  assert.equal(servicePackages.find((s) => s.id === "rehab-complete")?.sessions, null);
});
test("packages never display zero or a single visit price as the program total", () => {
  for (const pack of servicePackages) {
    assert.deepEqual(quote(pack.cents, 12), { service: null, travel: null, total: null });
    assert.equal(money(quote(pack.cents, 12).total), "Precio por confirmar");
  }
});
