import test from "node:test";
import assert from "node:assert/strict";
import { initialIntake } from "../src/modules/intake/model.ts";
import {
  validatePatientStep,
  validPrescription,
  type PatientIntake,
} from "../src/modules/intake/live-model.ts";

const valid = (): PatientIntake => ({
  ...initialIntake,
  reason: "Asma",
  alarm: "No",
  prescription: "No",
  patient: "Paciente",
  phone: "+50370000000",
  birthDate: "2000-01-01",
  consent: true,
  municipality: "San Salvador",
  address: "Dirección",
  noSymptoms: true,
  noHistory: true,
  slot: new Date(Date.now() + 86400000).toISOString().slice(0, 16),
});
test("real requests require contact, consent, complete answers and future dates", () => {
  const data = valid();
  for (let step = 0; step < 3; step++) assert.equal(validatePatientStep(step, data), null);
  assert.ok(validatePatientStep(1, { ...data, phone: "70000000" }));
  assert.ok(validatePatientStep(1, { ...data, consent: false }));
  assert.ok(validatePatientStep(2, { ...data, slot: "2000-01-01T12:00" }));
  assert.ok(validatePatientStep(0, { ...data, noSymptoms: false }));
  assert.ok(validatePatientStep(0, { ...data, symptoms: ["Dolor torácico"] }));
});
test("prescriptions require supported signatures and bounded size", () => {
  assert.equal(validPrescription(new Uint8Array([37, 80, 68, 70, 45]), "application/pdf"), true);
  assert.equal(
    validPrescription(new Uint8Array([60, 115, 99, 114, 105, 112, 116]), "application/pdf"),
    false,
  );
  assert.equal(validPrescription(new Uint8Array(5 * 1024 * 1024 + 1), "image/png"), false);
  assert.equal(validPrescription(new Uint8Array(), "application/pdf"), false);
});
