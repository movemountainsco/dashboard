import assert from "node:assert/strict";
import test from "node:test";
import { ingestReports } from "../netlify/functions/lib/library.mjs";
import { loadOrg } from "../netlify/functions/lib/org.mjs";
import { createMemoryStore } from "../netlify/functions/lib/memory-store.mjs";
import { appWith, call, signIn } from "./harness.mjs";

function report(overrides = {}) {
  return {
    batch_id: "2026-09-monthly",
    type: "monthly-shooter",
    period: "2026-09",
    title: "Joshua Ortiz · September 2026",
    audience: "ortiz@movemountains.co",
    department: "production",
    person: "ortiz@movemountains.co",
    html: "<p>SENTINEL_HTML_BODY one</p>",
    ...overrides,
  };
}

test("ingest is idempotent on batch, type, period, person, and department", async () => {
  const { app, store } = appWith();
  const first = await call(app, "/api/ingest", {
    method: "POST",
    token: "test-ingest-token",
    body: report(),
  });
  assert.equal(first.status, 200, first.text);
  assert.equal(first.json.results.length, 1);
  assert.equal(first.json.results[0].created, true);
  const id = first.json.results[0].id;
  const createdAt = (await store.get(`report:${id}`, { type: "json" })).created_at;

  const second = await call(app, "/api/ingest", {
    method: "POST",
    token: "test-ingest-token",
    body: report({
      batch_id: "2026-09-Monthly",
      type: "Monthly Shooter",
      title: "Joshua Ortiz · September 2026 revised",
      html: "<p>SENTINEL_HTML_BODY two</p>",
    }),
  });
  assert.equal(second.json.results[0].id, id);
  assert.equal(second.json.results[0].created, false);

  const folded = await call(app, "/api/ingest", {
    method: "POST",
    token: "test-ingest-token",
    body: report({
      department: "Production",
      person: "Ortiz@MoveMountains.co",
      title: "Joshua Ortiz · September 2026 revised",
      html: "<p>SENTINEL_HTML_BODY three</p>",
    }),
  });
  assert.equal(folded.json.results[0].id, id);

  const stored = await store.get(`report:${id}`, { type: "json" });
  const html = await store.get(`html:${id}`);
  assert.equal(stored.title, "Joshua Ortiz · September 2026 revised");
  assert.equal(html, "<p>SENTINEL_HTML_BODY three</p>");
  assert.equal(stored.created_at, createdAt);
  const index = await store.get("index:reports", { type: "json" });
  assert.deepEqual(index, [id]);

  const otherPerson = await call(app, "/api/ingest", {
    method: "POST",
    token: "test-ingest-token",
    body: report({ person: "mason@movemountains.co", audience: "mason@movemountains.co", title: "Mason" }),
  });
  assert.notEqual(otherPerson.json.results[0].id, id);

  const otherDept = await call(app, "/api/ingest", {
    method: "POST",
    token: "test-ingest-token",
    body: report({ department: "photo-editing", title: "Same person, other desk" }),
  });
  assert.notEqual(otherDept.json.results[0].id, id);

  const batch = [
    report({ type: "future-desk-report", title: "Future", person: "", department: "sales", audience: "sales", html: "<p>future</p>" }),
    report({ type: "future-desk-report", title: "Future again", person: "", department: "sales", audience: "sales", html: "<p>future-2</p>" }),
  ];
  const many = await call(app, "/api/ingest", { method: "POST", token: "test-ingest-token", body: batch });
  assert.equal(many.json.results[0].id, many.json.results[1].id);
  assert.equal(many.json.results[0].created, true);
  assert.equal(many.json.results[1].created, false);
  assert.equal(many.json.results[0].type, "future-desk-report");
});

test("ingest requires the bearer token and a complete report", async () => {
  const { app } = appWith();
  const missing = await call(app, "/api/ingest", { method: "POST", body: report() });
  assert.equal(missing.status, 401);
  const wrong = await call(app, "/api/ingest", { method: "POST", token: "nope", body: report() });
  assert.equal(wrong.status, 401);
  const bad = await call(app, "/api/ingest", {
    method: "POST",
    token: "test-ingest-token",
    body: { title: "Nope" },
  });
  assert.equal(bad.status, 400);
  assert.match(bad.json.error, /batch_id/);
});

test("list is newest first, dates are MM/DD/YYYY, and html stays off the list", async () => {
  const store = createMemoryStore();
  const org = loadOrg();
  const stamps = ["2026-09-02T15:00:00.000Z", "2026-10-06T15:00:00.000Z"];
  let n = 0;
  await ingestReports(report({ title: "Older", period: "2026-09-29..2026-10-04" }), {
    store,
    org,
    now: () => stamps[n++],
  });
  await ingestReports(
    report({
      title: "Newer",
      type: "speed-to-lead",
      period: "2026-10-06",
      person: "raul@movemountains.co",
      department: "sales",
      audience: "sales",
    }),
    { store, org, now: () => stamps[n++] },
  );

  const { app } = appWith({ REPORTS_DEV: "1" }, store);
  const { cookie } = await signIn(app, "sean@movemountains.co", "Sean Brown");
  const list = await call(app, "/api/reports", { cookie });
  assert.deepEqual(
    list.json.reports.map((item) => item.title),
    ["Newer", "Older"],
  );
  assert.equal(list.json.reports[0].period_label, "10/06/2026");
  assert.equal(list.json.reports[0].updated_label, "10/06/2026");
  assert.equal(list.json.reports[1].period_label, "09/29/2026 – 10/04/2026");
  assert.equal(list.text.includes("SENTINEL_HTML_BODY"), false);

  const month = await call(app, "/api/ingest", {
    method: "POST",
    token: "test-ingest-token",
    body: report({ title: "Month", period: "2026-09", person: "ali@movemountains.co", audience: "ali@movemountains.co", department: "photo-editing", type: "monthly-editor" }),
  });
  const viewed = await call(app, `/api/reports/${month.json.results[0].id}`, { cookie });
  assert.equal(viewed.json.report.period_label, "09/2026");
  const again = await call(app, "/api/reports", { cookie });
  const labels = again.json.reports.map((item) => item.type_label);
  assert.ok(labels.includes("Speed to lead"));

  await call(app, "/api/ingest", {
    method: "POST",
    token: "test-ingest-token",
    body: report({
      type: "venue-widget",
      title: "A type the catalog does not know yet",
      person: "sean@movemountains.co",
      audience: "admins",
      department: "",
      html: "<p>widget</p>",
    }),
  });
  const withExtra = await call(app, "/api/reports", { cookie });
  const extra = withExtra.json.options.types.find((type) => type.id === "venue-widget");
  assert.equal(extra.label, "Venue Widget");
  assert.equal(extra.group, "Other");
});

test("completing a batch returns a branded email and does not send it", async () => {
  const { app } = appWith();
  await call(app, "/api/ingest", {
    method: "POST",
    token: "test-ingest-token",
    body: [
      report({ title: "Joshua Ortiz", html: "<p>one</p>" }),
      report({
        title: "Ali Sherin",
        type: "monthly-editor",
        person: "ali@movemountains.co",
        audience: "ali@movemountains.co",
        department: "photo-editing",
        html: "<p>two</p>",
      }),
    ],
  });

  let fetches = 0;
  const original = globalThis.fetch;
  globalThis.fetch = async () => {
    fetches += 1;
    throw new Error("email provider should not be called");
  };
  try {
    const done = await call(app, "/api/batches/2026-09-monthly/complete", {
      method: "POST",
      token: "test-ingest-token",
    });
    assert.equal(done.status, 200, done.text);
    assert.equal(fetches, 0);
    assert.equal(done.json.delivery.sent, false);
    assert.equal(done.json.delivery.provider, null);
    assert.equal(done.json.email.reply_to, "management@movemountains.co");
    assert.equal(done.json.email.to, "management@movemountains.co");
    assert.match(done.json.url, /https:\/\/reports\.movemountains\.co\/batch\/2026-09-monthly$/);
    assert.match(done.json.email.html, /Joshua Ortiz/);
    assert.match(done.json.email.html, /Ali Sherin/);
    assert.match(done.json.email.html, /\/batch\/2026-09-monthly/);
    assert.match(done.json.email.text, /\/report\/rpt_/);
    assert.equal(done.json.reports.length, 2);

    const again = await call(app, "/api/batches/2026-09-monthly/complete", {
      method: "POST",
      token: "test-ingest-token",
    });
    assert.equal(again.json.completed_at, done.json.completed_at);
    assert.equal(again.json.delivery.sent, false);
  } finally {
    globalThis.fetch = original;
  }

  const missing = await call(app, "/api/batches/no-such-batch/complete", {
    method: "POST",
    token: "test-ingest-token",
  });
  assert.equal(missing.status, 404);

  const { app: open } = appWith({ REPORTS_DEV: "1" });
  const unsigned = await call(open, "/api/reports");
  assert.equal(unsigned.status, 401);
});
