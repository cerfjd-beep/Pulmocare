import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import pg from "pg";

export async function runChecks(db, config) {
  let count = 0;
  async function check(name, fn) {
    await fn();
    console.log(`PASS ${++count}: ${name}`);
  }
  async function actor(user, sql, values = [], connection = db, role = "authenticated") {
    await connection.query("BEGIN");
    try {
      await connection.query(`SET LOCAL ROLE ${role}`);
      await connection.query("SELECT set_config('request.jwt.claim.sub', $1, true)", [user ?? ""]);
      const result = await connection.query(sql, values);
      await connection.query("COMMIT");
      return result;
    } catch (error) {
      await connection.query("ROLLBACK");
      throw error;
    }
  }
  const denied = (fn) => assert.rejects(fn, (e) => e.code === "42501");
  const invalid = (fn) =>
    assert.rejects(fn, (e) => ["23514", "23503", "23505", "23P01"].includes(e.code));
  async function insert(table, row) {
    const keys = Object.keys(row);
    return (
      await db.query(
        `INSERT INTO public.${table} (${keys.join(",")}) VALUES (${keys.map((_, i) => `$${i + 1}`).join(",")}) RETURNING *`,
        Object.values(row),
      )
    ).rows[0];
  }
  async function identity(name, roles = []) {
    const auth = randomUUID();
    await db.query("INSERT INTO auth.users(id, raw_user_meta_data) VALUES ($1, $2)", [
      auth,
      { role: "access_admin" },
    ]);
    const p = await insert("profiles", { auth_user_id: auth, display_name: `TEST ${name}` });
    for (const role of roles)
      await insert("role_assignments", {
        profile_id: p.id,
        role,
        granted_by: p.id,
      });
    return { auth, profile: p.id };
  }
  await check("43 application tables have RLS and no direct client writes", async () => {
    const { rows } = await db.query(`SELECT c.relname, c.relrowsecurity,
      has_table_privilege('authenticated', c.oid, 'INSERT,UPDATE,DELETE') AS writes
      FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname='public' AND c.relkind='r'`);
    assert.equal(rows.length, 43);
    assert.ok(rows.every((r) => r.relrowsecurity && !r.writes));
  });
  await check("all application RPCs deny PUBLIC execution and use limited owners", async () => {
    const { rows } = await db.query(`SELECT p.proname FROM pg_proc p
      JOIN pg_namespace n ON n.oid=p.pronamespace
      WHERE n.nspname='public' AND (NOT p.prosecdef OR
        pg_get_userbyid(p.proowner)<>'pulmocare_executor' OR EXISTS (
          SELECT 1 FROM aclexplode(coalesce(p.proacl, acldefault('f',p.proowner))) a
          WHERE a.grantee=0 AND a.privilege_type='EXECUTE'))`);
    assert.deepEqual(rows, []);
  });
  await check("anonymous catalog exposes six services and no draft prices", async () => {
    assert.equal((await actor(null, "SELECT id, name FROM services", [], db, "anon")).rowCount, 6);
    assert.equal(
      (await actor(null, "SELECT id FROM service_price_versions", [], db, "anon")).rowCount,
      0,
    );
    await denied(() => actor(null, "SELECT * FROM patients", [], db, "anon"));
  });
  const alice = await identity("patient A");
  const bob = await identity("patient B");
  const caregiver = await identity("caregiver", ["caregiver"]);
  const ops = await identity("operations", ["operations_admin"]);
  const reviewer = await identity("reviewer", ["clinical_reviewer"]);
  const therapist = await identity("therapist", ["therapist"]);
  const finance = await identity("finance", ["billing_admin"]);
  const access = await identity("access", ["access_admin"]);
  alice.patient = (
    await actor(alice.auth, "SELECT register_patient('TEST A', '1990-01-01') AS id")
  ).rows[0].id;
  bob.patient = (
    await actor(bob.auth, "SELECT register_patient('TEST B', '1991-01-01') AS id")
  ).rows[0].id;
  await check("registration is idempotent and ignores editable role metadata", async () => {
    assert.equal(
      (await actor(alice.auth, "SELECT register_patient('TEST A') AS id")).rows[0].id,
      alice.patient,
    );
    assert.equal(
      (await actor(alice.auth, "SELECT private.has_role('access_admin') AS ok")).rows[0].ok,
      false,
    );
    await denied(() => actor(alice.auth, "SELECT grant_role($1, 'access_admin')", [alice.profile]));
  });
  await check("patient A cannot read patient B or change ownership/roles", async () => {
    assert.deepEqual((await actor(alice.auth, "SELECT id FROM patients")).rows, [
      { id: alice.patient },
    ]);
    await denied(() =>
      actor(alice.auth, "UPDATE patients SET profile_id=$1 WHERE id=$2", [
        alice.profile,
        bob.patient,
      ]),
    );
    await denied(() => actor(alice.auth, "SELECT * FROM role_assignments"));
  });
  await check("birth dates, coordinates and uniqueness reject invalid data", async () => {
    await invalid(() => insert("patients", { full_name: "TEST future", birth_date: "2999-01-01" }));
    await invalid(() =>
      insert("profiles", { display_name: "duplicate", auth_user_id: alice.auth }),
    );
    await invalid(() =>
      insert("addresses", {
        patient_id: alice.patient,
        department_code: "TEST",
        municipality_code: "TEST",
        address_line: "Fictitious",
        latitude: 0,
      }),
    );
  });
  const address = await insert("addresses", {
    patient_id: alice.patient,
    department_code: "TEST",
    municipality_code: "TEST",
    address_line: "TEST fictitious address",
    latitude: 0,
    longitude: 0,
  });
  const link = await insert("caregiver_links", {
    caregiver_id: caregiver.profile,
    patient_id: alice.patient,
    relationship: "test_only",
    scopes: ["request_service"],
    authorized_by: access.profile,
  });
  await check("caregiver scope and revocation apply without changing JWT", async () => {
    assert.equal((await actor(caregiver.auth, "SELECT id FROM patients")).rowCount, 1);
    assert.equal(
      (
        await actor(caregiver.auth, "SELECT private.owns_patient($1, 'manage_payments') AS ok", [
          alice.patient,
        ])
      ).rows[0].ok,
      false,
    );
    await actor(access.auth, "SELECT revoke_access('caregiver_links', $1)", [link.id]);
    assert.equal((await actor(caregiver.auth, "SELECT id FROM patients")).rowCount, 0);
  });
  reviewer.professional = (
    await insert("professionals", {
      profile_id: reviewer.profile,
      display_name: "TEST reviewer",
      specialty: "TEST",
      verification_status: "verified",
    })
  ).id;
  therapist.professional = (
    await insert("professionals", {
      profile_id: therapist.profile,
      display_name: "TEST therapist",
      specialty: "TEST",
      verification_status: "verified",
    })
  ).id;
  const service = "10000000-0000-4000-8000-000000000001";
  const tariff = "30000000-0000-4000-8000-000000000001";
  const price = "20000000-0000-4000-8000-000000000001";
  const request = await insert("service_requests", {
    patient_id: alice.patient,
    requested_by: alice.profile,
    requested_service_id: service,
    address_id: address.id,
    payment_preference: "pay_on_visit",
  });
  const intake = await insert("clinical_intakes", {
    request_id: request.id,
    revision: 1,
    reason: "TEST",
    prescription_declared: false,
    symptoms: { state: "none", items: [] },
    history: { state: "none", items: [] },
    questionnaire_version: "intake-v1",
    completed_at: new Date(),
  });
  await check("cross-patient address is rejected and submission requires consent", async () => {
    await invalid(() =>
      insert("service_requests", {
        patient_id: bob.patient,
        requested_by: bob.profile,
        address_id: address.id,
      }),
    );
    await invalid(() => actor(alice.auth, "SELECT submit_request($1)", [request.id]));
    await insert("consents", {
      patient_id: alice.patient,
      granted_by: alice.profile,
      purpose: "service_request",
      policy_version: "TEST-only",
    });
    await actor(alice.auth, "SELECT submit_request($1)", [request.id]);
    await invalid(() => actor(alice.auth, "SELECT submit_request($1)", [request.id]));
  });
  await check(
    "clinical data is denied to operations, finances and unrelated professionals",
    async () => {
      for (const user of [alice, bob, ops, finance, reviewer, therapist, access]) {
        await denied(() => actor(user.auth, "SELECT * FROM clinical_intakes"));
      }
      assert.equal(
        (
          await actor(reviewer.auth, "SELECT read_clinical_request($1, 'review') AS result", [
            request.id,
          ])
        ).rows[0].result.error,
        "not_authorized",
      );
    },
  );
  await actor(ops.auth, "SELECT assign_reviewer($1, $2)", [request.id, reviewer.professional]);
  await check("authorized clinical reads are audited; suspension removes access", async () => {
    const read = () =>
      actor(reviewer.auth, "SELECT read_clinical_request($1, 'review') AS result", [request.id]);
    assert.equal((await read()).rows[0].result.id, request.id);
    assert.equal(
      (await db.query("SELECT count(*)::int AS n FROM audit_events WHERE action='clinical_read'"))
        .rows[0].n,
      1,
    );
    await db.query("UPDATE professionals SET verification_status='suspended' WHERE id=$1", [
      reviewer.professional,
    ]);
    assert.equal((await read()).rows[0].result.error, "not_authorized");
    await db.query("UPDATE professionals SET verification_status='verified' WHERE id=$1", [
      reviewer.professional,
    ]);
  });
  const protocol = await insert("clinical_protocol_versions", {
    code: "TEST",
    version: 1,
    definition: { testOnly: true },
    status: "approved",
    approved_by: reviewer.professional,
    approved_at: new Date(),
  });
  const approval = (
    await actor(
      reviewer.auth,
      "SELECT record_assessment($1,$2,$3,'eligible','TEST, not clinical guidance',now()+interval '7 days') AS id",
      [request.id, intake.id, protocol.id],
    )
  ).rows[0].id;
  await check("completed intakes, decisions and approved protocols are immutable", async () => {
    await invalid(() =>
      db.query("UPDATE clinical_intakes SET reason='changed' WHERE id=$1", [intake.id]),
    );
    await invalid(() =>
      db.query("UPDATE assessments SET result='medical_review' WHERE id=$1", [approval]),
    );
    await invalid(() =>
      db.query("UPDATE clinical_protocol_versions SET definition='{}' WHERE id=$1", [protocol.id]),
    );
  });
  await check("travel thresholds and traffic calculations preserve exact distances", async () => {
    for (const [distance, expected] of [
      [5000, 0],
      [5000.1, 300],
      [10000, 300],
      [10000.1, 500],
      [25000, 500],
    ]) {
      const cost = (
        await db.query(
          `SELECT c.* FROM travel_tariff_versions v,
        LATERAL private.travel_cost($1, 600, 1500, v.rules) c WHERE v.id=$2`,
          [distance, tariff],
        )
      ).rows[0];
      assert.equal(Number(cost.distance_cents), expected);
      assert.equal(Number(cost.traffic_cents), 150);
    }
    await invalid(() =>
      db.query(
        `SELECT private.travel_cost(25000.1,600,600,rules)
      FROM travel_tariff_versions WHERE id=$1`,
        [tariff],
      ),
    );
  });
  // Explicitly approved TEST-only commercial data in an isolated throwaway cluster.
  await db.query(
    "UPDATE service_price_versions SET status='published', approved_by=$1, approved_at=now() WHERE id=$2",
    [ops.profile, price],
  );
  await db.query(
    "UPDATE travel_tariff_versions SET status='published', approved_by=$1, approved_at=now() WHERE id=$2",
    [ops.profile, tariff],
  );
  await db.query(
    `INSERT INTO private.booking_policy
    (hold_minutes,tax_basis_points,tax_policy_version,allow_pay_on_visit,approved_by,approved_at)
    VALUES (10,0,'TEST-NO-TAX',true,$1,now())`,
    [ops.profile],
  );
  const when = new Date(Date.now() + 2 * 86400000);
  const departure = new Date(+when - 1500000);
  await insert("professional_availability", {
    professional_id: therapist.professional,
    kind: "available",
    starts_at: new Date(+when - 86400000),
    ends_at: new Date(+when + 86400000),
  });
  async function makeQuote(source = "live") {
    const q = await insert("quotes", {
      request_id: request.id,
      professional_id: therapist.professional,
      currency: "USD",
      service_cents: 2500,
      distance_cents: 300,
      traffic_cents: 150,
      tax_cents: 0,
      total_cents: 2950,
      tax_policy_version: "TEST-NO-TAX",
      expires_at: new Date(Date.now() + 3600000),
    });
    for (const [kind, amount] of [
      ["service", 2500],
      ["distance", 300],
      ["traffic", 150],
    ]) {
      await insert("quote_items", {
        quote_id: q.id,
        kind,
        label: "TEST",
        quantity: 1,
        unit_cents: amount,
        amount_cents: amount,
        service_price_version_id: kind === "service" ? price : null,
      });
    }
    await insert("travel_estimates", {
      quote_id: q.id,
      tariff_id: tariff,
      provider: "TEST_PROVIDER",
      source,
      origin_latitude: 0.01,
      origin_longitude: 0.01,
      destination_latitude: 0,
      destination_longitude: 0,
      origin_kind: "operating_base",
      calculated_at: new Date(),
      appointment_at: when,
      departure_at: departure,
      arrival_at: when,
      distance_meters: 8000,
      baseline_seconds: 600,
      duration_seconds: 1500,
      delay_seconds: 900,
      buffer_seconds: 0,
      expires_at: new Date(Date.now() + 7200000),
    });
    await actor(ops.auth, "SELECT offer_quote($1)", [q.id]);
    await actor(alice.auth, "SELECT accept_quote($1)", [q.id]);
    return q;
  }
  const q1 = await makeQuote();
  const q2 = await makeQuote();
  await check("simulated routes cannot become payable offers", async () => {
    await invalid(() => makeQuote("simulation"));
  });
  await check("accepted quotes and route details cannot be rewritten", async () => {
    await invalid(() =>
      db.query("UPDATE quotes SET service_cents=1, total_cents=451 WHERE id=$1", [q1.id]),
    );
    await invalid(() =>
      db.query("UPDATE travel_estimates SET origin_latitude=1 WHERE quote_id=$1", [q1.id]),
    );
    await denied(() => actor(bob.auth, "SELECT accept_quote($1)", [q1.id]));
  });
  const c1 = new pg.Client(config),
    c2 = new pg.Client(config);
  await c1.connect();
  await c2.connect();
  let appointment;
  try {
    await check("two concurrent reservations admit only one overlapping visit", async () => {
      const results = await Promise.allSettled([
        actor(ops.auth, "SELECT hold_appointment($1,$2) AS id", [q1.id, approval], c1),
        actor(ops.auth, "SELECT hold_appointment($1,$2) AS id", [q2.id, approval], c2),
      ]);
      assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
      appointment = results.find((r) => r.status === "fulfilled").value.rows[0].id;
      assert.equal(results.find((r) => r.status === "rejected").reason.code, "23P01");
    });
    await check("expired holds are released while reserving even without a worker", async () => {
      const old = (await db.query("SELECT quote_id FROM appointments WHERE id=$1", [appointment]))
        .rows[0];
      const oldId = appointment;
      await db.query(
        "UPDATE appointments SET hold_expires_at=now()-interval '1 minute' WHERE id=$1",
        [oldId],
      );
      appointment = (
        await actor(ops.auth, "SELECT hold_appointment($1,$2) AS id", [
          old.quote_id === q1.id ? q2.id : q1.id,
          approval,
        ])
      ).rows[0].id;
      assert.equal(
        (await db.query("SELECT status FROM appointments WHERE id=$1", [oldId])).rows[0].status,
        "expired",
      );
    });
    await check("a missing payment preference cannot bypass payment validation", async () => {
      await db.query("UPDATE service_requests SET payment_preference=NULL WHERE id=$1", [
        request.id,
      ]);
      await invalid(() => actor(ops.auth, "SELECT confirm_appointment($1)", [appointment]));
      await db.query("UPDATE service_requests SET payment_preference='pay_on_visit' WHERE id=$1", [
        request.id,
      ]);
    });
    await check("revoking the reviewer blocks confirmation of an existing hold", async () => {
      await db.query(
        "UPDATE role_assignments SET revoked_at=now() WHERE profile_id=$1 AND role='clinical_reviewer'",
        [reviewer.profile],
      );
      await invalid(() => actor(ops.auth, "SELECT confirm_appointment($1)", [appointment]));
      await insert("role_assignments", {
        profile_id: reviewer.profile,
        role: "clinical_reviewer",
        granted_by: access.profile,
      });
    });
    await actor(ops.auth, "SELECT confirm_appointment($1)", [appointment]);
    const booked = (await db.query("SELECT * FROM appointments WHERE id=$1", [appointment]))
      .rows[0];
    const sale = await insert("sales", {
      quote_id: booked.quote_id,
      appointment_id: appointment,
      payer_profile_id: alice.profile,
      total_cents: 2950,
      currency: "USD",
      status: "payable",
    });
    let payment;
    await check("payment replay is idempotent and clients cannot impersonate workers", async () => {
      const sql = "SELECT apply_payment_event('TEST','event1',$1,$2,'payment1',2950,'USD') AS id";
      await denied(() => actor(alice.auth, sql, ["a".repeat(64), sale.id]));
      payment = (await actor(null, sql, ["a".repeat(64), sale.id], db, "service_role")).rows[0].id;
      assert.equal(
        (await actor(null, sql, ["a".repeat(64), sale.id], db, "service_role")).rows[0].id,
        payment,
      );
      await invalid(() => actor(null, sql, ["b".repeat(64), sale.id], db, "service_role"));
    });
    await check("concurrent refunds reserve balance and cannot exceed received money", async () => {
      const results = await Promise.allSettled([
        actor(finance.auth, "SELECT request_refund($1,2000,'refund1','TEST')", [payment], c1),
        actor(finance.auth, "SELECT request_refund($1,2000,'refund2','TEST')", [payment], c2),
      ]);
      assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
      assert.equal(results.find((r) => r.status === "rejected").reason.code, "23514");
    });
    // Advance the fixture's appointment to the past to exercise real signing-time checks.
    await db.query(
      `UPDATE appointments SET starts_at=now()-interval '2 hours',
      ends_at=now()-interval '1 hour', busy_from=now()-interval '3 hours',
      busy_until=now()-interval '1 hour' WHERE id=$1`,
      [appointment],
    );
    const encounter = await insert("clinical_encounters", {
      appointment_id: appointment,
      professional_id: therapist.professional,
      started_at: new Date(Date.now() - 60000),
      procedure_text: "TEST",
      evolution_text: "TEST",
      recommendations_text: "TEST",
    });
    const vital = await insert("vital_signs", {
      encounter_id: encounter.id,
      measured_at: new Date(),
      kind: "spo2",
      value: 95,
      unit: "%",
    });
    let followup;
    await check("signing is atomic and replay creates only one follow-up/outbox job", async () => {
      const sql = "SELECT complete_encounter($1,now()) AS id";
      followup = (await actor(therapist.auth, sql, [encounter.id])).rows[0].id;
      assert.equal((await actor(therapist.auth, sql, [encounter.id])).rows[0].id, followup);
      assert.equal(
        (
          await db.query("SELECT count(*)::int AS n FROM follow_ups WHERE encounter_id=$1", [
            encounter.id,
          ])
        ).rows[0].n,
        1,
      );
      await invalid(() => db.query("UPDATE vital_signs SET value=99 WHERE id=$1", [vital.id]));
      await invalid(() =>
        db.query("UPDATE clinical_encounters SET evolution_text='changed' WHERE id=$1", [
          encounter.id,
        ]),
      );
    });
    await check("follow-up revisions preserve answers and reopen review", async () => {
      await denied(() =>
        actor(bob.auth, "SELECT answer_follow_up($1,'TEST',true,false,'{}')", [followup]),
      );
      await actor(alice.auth, "SELECT answer_follow_up($1,'TEST',true,false,'{}')", [followup]);
      await actor(alice.auth, "SELECT answer_follow_up($1,'TEST revised',false,true,'{}')", [
        followup,
      ]);
      assert.equal(
        (
          await db.query(
            "SELECT count(*)::int AS n FROM follow_up_responses WHERE follow_up_id=$1",
            [followup],
          )
        ).rows[0].n,
        2,
      );
      assert.equal(
        (await db.query("SELECT status FROM follow_ups WHERE id=$1", [followup])).rows[0].status,
        "review_required",
      );
    });
    await check("workers claim jobs once and reject stale lease completions", async () => {
      const r1 = await actor(
        null,
        "SELECT id,attempts FROM claim_outbox('worker1',100)",
        [],
        c1,
        "service_role",
      );
      const r2 = await actor(
        null,
        "SELECT id FROM claim_outbox('worker2',100)",
        [],
        c2,
        "service_role",
      );
      assert.equal(r2.rowCount, 0);
      assert.ok(r1.rowCount > 0);
      await invalid(() =>
        actor(
          null,
          "SELECT finish_outbox($1,'worker2',1,true)",
          [r1.rows[0].id],
          db,
          "service_role",
        ),
      );
      await actor(
        null,
        "SELECT finish_outbox($1,'worker1',$2,true)",
        [r1.rows[0].id, r1.rows[0].attempts],
        db,
        "service_role",
      );
    });
  } finally {
    await c1.end();
    await c2.end();
  }
  await check(
    "private storage denies enumeration, cross-owner upload and public buckets",
    async () => {
      assert.equal(
        (await db.query("SELECT count(*)::int AS n FROM storage.buckets WHERE public")).rows[0].n,
        0,
      );
      assert.equal((await actor(alice.auth, "SELECT * FROM storage.objects")).rowCount, 0);
      await denied(() =>
        actor(
          alice.auth,
          "INSERT INTO storage.objects(bucket_id,name) VALUES ('prescriptions',$1)",
          [`${bob.profile}/${randomUUID()}.pdf`],
        ),
      );
    },
  );
  await check("Auth account deletion preserves application identity and history", async () => {
    await db.query("DELETE FROM auth.users WHERE id=$1", [bob.auth]);
    assert.equal(
      (await db.query("SELECT auth_user_id FROM profiles WHERE id=$1", [bob.profile])).rows[0]
        .auth_user_id,
      null,
    );
    assert.equal(
      (await db.query("SELECT id FROM patients WHERE id=$1", [bob.patient])).rowCount,
      1,
    );
  });
  console.log(
    `${count} database checks passed (real PostgreSQL, simulated Auth/Storage contracts).`,
  );
}
