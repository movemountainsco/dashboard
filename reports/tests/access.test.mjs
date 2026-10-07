import assert from "node:assert/strict";
import test from "node:test";
import { canSeeReport, departmentsForHead } from "../netlify/functions/lib/access.mjs";
import { loadOrg } from "../netlify/functions/lib/org.mjs";
import { loadTypes } from "../netlify/functions/lib/types.mjs";
import { appWith, call, signIn } from "./harness.mjs";

const org = {
  departments: [
    { id: "sales", name: "Sales", head: { name: "Raul Samayoa", email: "raul@movemountains.co" }, parent: null, rollsUp: [] },
    { id: "scheduling", name: "Scheduling", head: { name: "Mason Pimental", email: "mason@movemountains.co" }, parent: null, rollsUp: [] },
    { id: "production", name: "Production", head: { name: "Yan Ortiz", email: "yan@movemountains.co" }, parent: null, rollsUp: ["data", "photo-editing", "video-editing", "gear", "orders"] },
    { id: "data", name: "Data", head: { name: "Roane Purificacion", email: "roane@movemountains.co" }, parent: "production", rollsUp: [] },
    { id: "photo-editing", name: "Photo Editing", head: { name: "Ali Sherin", email: "ali@movemountains.co" }, parent: "production", rollsUp: [] },
    { id: "video-editing", name: "Video Editing", head: { name: "Komiljon Sayfiev", email: "koyla@movemountains.co" }, parent: "production", rollsUp: [] },
    { id: "gear", name: "Gear", head: { name: "Kenny Barrios", email: "kenneth@movemountains.co" }, parent: "production", rollsUp: [] },
    { id: "orders", name: "Orders", head: { name: "Kenny Barrios", email: "kenneth@movemountains.co" }, parent: "production", rollsUp: [] },
  ],
  people: [
    { name: "Joshua Ortiz", email: "ortiz@movemountains.co", department: "production", aliases: ["Josh Ortiz"] },
    { name: "Ali Sherin", email: "ali@movemountains.co", department: "photo-editing", aliases: [] },
    { name: "Souvik Mondal", email: "souvik@movemountains.co", department: "photo-editing", aliases: [] },
    { name: "Julia Vieira", email: "julia@movemountains.co", department: "video-editing", aliases: [] },
    { name: "Yan Ortiz", email: "yan@movemountains.co", department: "production", aliases: [] },
    { name: "Kenneth (Kenny) Barrios", email: "kenneth@movemountains.co", department: "gear", aliases: ["Kenny Barrios"] },
    { name: "Roane Purificacion", email: "roane@movemountains.co", department: "data", aliases: [] },
    { name: "Raul Samayoa", email: "raul@movemountains.co", department: "sales", aliases: [] },
    { name: "Mason Pimental", email: "mason@movemountains.co", department: "scheduling", aliases: [] },
  ],
};

const sean = { email: "sean@movemountains.co", name: "Sean Brown", role: "admin" };
const yan = { email: "yan@movemountains.co", name: "Yan Ortiz", role: "member" };
const ali = { email: "ali@movemountains.co", name: "Ali Sherin", role: "member" };
const josh = { email: "ortiz@movemountains.co", name: "Joshua Ortiz", role: "member" };
const kenny = { email: "kenneth@movemountains.co", name: "Kenneth (Kenny) Barrios", role: "member" };
const roane = { email: "roane@movemountains.co", name: "Roane Purificacion", role: "member" };
const raul = { email: "raul@movemountains.co", name: "Raul Samayoa", role: "member" };
const komiljon = { email: "koyla@movemountains.co", name: "Komiljon Sayfiev", role: "member" };
const souvik = { email: "souvik@movemountains.co", name: "Souvik Mondal", role: "member" };

const shooter = { department: "production", person: "ortiz@movemountains.co", audience: "ortiz@movemountains.co" };
const editor = { department: "photo-editing", person: "ali@movemountains.co", audience: "ali@movemountains.co" };
const videoEditor = { department: "video-editing", person: "julia@movemountains.co", audience: "julia@movemountains.co" };
const buried = { department: "", person: "", audience: ["souvik@movemountains.co"] };
const alias = { department: "", person: "Josh Ortiz", audience: "Josh Ortiz" };
const production = { department: "production", person: "", audience: { departments: ["production"] } };
const photo = { department: "photo-editing", person: "", audience: "photo-editing" };
const data = { department: "data", person: "", audience: "data" };
const gear = { department: "gear", person: "", audience: "gear" };
const orders = { department: "orders", person: "", audience: "orders" };
const sales = { department: "sales", person: "", audience: "sales" };
const rollup = { department: "", person: "", audience: "admins" };

function sees(user, report) {
  return canSeeReport(user, report, org);
}

test("admins see every report; everyone else is filtered", () => {
  for (const report of [shooter, editor, videoEditor, buried, alias, production, photo, data, gear, orders, sales, rollup]) {
    assert.equal(sees(sean, report), true, "admin");
  }

  assert.equal(sees(josh, shooter), true);
  assert.equal(sees(josh, alias), true);
  assert.equal(sees(josh, editor), false);
  assert.equal(sees(josh, production), false);
  assert.equal(sees(josh, rollup), false);
  assert.equal(sees(josh, sales), false);

  assert.equal(sees(yan, shooter), true);
  assert.equal(sees(yan, editor), true);
  assert.equal(sees(yan, videoEditor), true);
  assert.equal(sees(yan, buried), true);
  assert.equal(sees(yan, production), true);
  assert.equal(sees(yan, photo), true);
  assert.equal(sees(yan, data), true);
  assert.equal(sees(yan, gear), true);
  assert.equal(sees(yan, orders), true);
  assert.equal(sees(yan, sales), false);
  assert.equal(sees(yan, rollup), false);

  assert.equal(sees(ali, editor), true);
  assert.equal(sees(ali, photo), true);
  assert.equal(sees(ali, buried), true);
  assert.equal(sees(ali, videoEditor), false);
  assert.equal(sees(ali, production), false);
  assert.equal(sees(ali, gear), false);

  assert.equal(sees(komiljon, videoEditor), true);
  assert.equal(sees(komiljon, photo), false);
  assert.equal(sees(komiljon, buried), false);

  assert.equal(sees(kenny, gear), true);
  assert.equal(sees(kenny, orders), true);
  assert.equal(sees(kenny, production), false);
  assert.equal(sees(kenny, photo), false);

  assert.equal(sees(roane, data), true);
  assert.equal(sees(roane, production), false);
  assert.equal(sees(roane, gear), false);

  assert.equal(sees(raul, sales), true);
  assert.equal(sees(raul, production), false);

  assert.equal(sees(souvik, buried), true);
  assert.equal(sees(souvik, photo), false);
  assert.equal(sees(souvik, editor), false);
});

test("Yan rolls up Production; Photo Editing and Video Editing stay separate", () => {
  assert.deepEqual(departmentsForHead("yan@movemountains.co", org).sort(), [
    "data",
    "gear",
    "orders",
    "photo-editing",
    "production",
    "video-editing",
  ]);
  assert.deepEqual(departmentsForHead("ali@movemountains.co", org), ["photo-editing"]);
  assert.deepEqual(departmentsForHead("koyla@movemountains.co", org), ["video-editing"]);
  assert.deepEqual(departmentsForHead("kenneth@movemountains.co", org).sort(), ["gear", "orders"]);
  assert.deepEqual(departmentsForHead("roane@movemountains.co", org), ["data"]);
});

test("the shipped org and type catalog are data, not code", () => {
  const shipped = loadOrg();
  const byId = Object.fromEntries(shipped.departments.map((dept) => [dept.id, dept]));
  for (const id of ["sales", "planning", "scheduling", "management", "production", "data", "photo-editing", "video-editing", "gear", "orders"]) {
    assert.ok(byId[id], id);
  }
  assert.equal(byId.production.head.email, "yan@movemountains.co");
  assert.deepEqual(byId.production.rollsUp, ["data", "photo-editing", "video-editing", "gear", "orders"]);
  assert.equal(byId["photo-editing"].head.email, "ali@movemountains.co");
  assert.equal(byId["video-editing"].head.email, "koyla@movemountains.co");
  assert.equal(byId.gear.head.email, "kenneth@movemountains.co");
  assert.equal(byId.orders.head.email, "kenneth@movemountains.co");
  assert.equal(byId.data.head.email, "roane@movemountains.co");
  assert.equal(byId.sales.head.email, "raul@movemountains.co");
  assert.equal(byId.planning.head.email, "chelseamace@movemountains.co");
  assert.equal(byId.scheduling.head.email, "mason@movemountains.co");
  assert.equal(byId.management.head.email, "sean@movemountains.co");
  assert.notEqual(byId["photo-editing"].id, byId["video-editing"].id);

  const ids = loadTypes().map((type) => type.id);
  for (const id of [
    "weekly-autopsy",
    "delivery-summary",
    "monthly-shooter",
    "monthly-editor",
    "monthly-dept-head",
    "monthly-department",
    "monthly-rollup",
    "speed-to-lead",
    "weekday-leads",
    "travel-deadline",
    "venue-conversion",
  ]) {
    assert.ok(ids.includes(id), id);
  }
});

test("the list endpoint hides reports the signer cannot open", async () => {
  const { app } = appWith({ REPORTS_DEV: "1" });
  const filings = [
    { batch_id: "b", type: "monthly-shooter", period: "2026-09", title: "Joshua", audience: "ortiz@movemountains.co", department: "production", person: "ortiz@movemountains.co", html: "<p>joshua</p>" },
    { batch_id: "b", type: "monthly-editor", period: "2026-09", title: "Ali", audience: "ali@movemountains.co", department: "Photo Editing", person: "ali@movemountains.co", html: "<p>ali</p>" },
    { batch_id: "b", type: "monthly-department", period: "2026-09", title: "Production dept", audience: { departments: ["production"] }, department: "production", html: "<p>prod</p>" },
    { batch_id: "b", type: "monthly-department", period: "2026-09", title: "Gear dept", audience: "gear", department: "gear", html: "<p>gear</p>" },
    { batch_id: "b", type: "monthly-rollup", period: "2026-09", title: "Roll-up", audience: "admins", html: "<p>rollup</p>" },
    { batch_id: "b", type: "venue-conversion", period: "2026-09", title: "Venues", audience: "sales", department: "sales", html: "<p>sales</p>" },
  ];
  const ingested = await call(app, "/api/ingest", {
    method: "POST",
    token: "test-ingest-token",
    body: filings,
  });
  assert.equal(ingested.status, 200, ingested.text);

  async function titles(email, name) {
    const { cookie, res } = await signIn(app, email, name);
    assert.equal(res.status, 200, res.text);
    const list = await call(app, "/api/reports", { cookie });
    assert.equal(list.status, 200);
    return list.json.reports.map((report) => report.title).sort();
  }

  assert.deepEqual(await titles("sean@movemountains.co", "Sean Brown"), [
    "Ali",
    "Gear dept",
    "Joshua",
    "Production dept",
    "Roll-up",
    "Venues",
  ]);
  assert.deepEqual(await titles("ortiz@movemountains.co", "Joshua Ortiz"), ["Joshua"]);
  assert.deepEqual(await titles("yan@movemountains.co", "Yan Ortiz"), ["Ali", "Gear dept", "Joshua", "Production dept"]);
  assert.deepEqual(await titles("ali@movemountains.co", "Ali Sherin"), ["Ali"]);
  assert.deepEqual(await titles("kenneth@movemountains.co", "Kenneth (Kenny) Barrios"), ["Gear dept"]);
  assert.deepEqual(await titles("raul@movemountains.co", "Raul Samayoa"), ["Venues"]);

  const josh = await signIn(app, "ortiz@movemountains.co", "Joshua Ortiz");
  const aliId = ingested.json.results.find((row) => row.title === undefined && row.person === "ali@movemountains.co").id;
  const hidden = await call(app, `/api/reports/${aliId}`, { cookie: josh.cookie });
  assert.equal(hidden.status, 404);
  const own = ingested.json.results.find((row) => row.person === "ortiz@movemountains.co");
  const visible = await call(app, `/api/reports/${own.id}`, { cookie: josh.cookie });
  assert.equal(visible.status, 200);
  assert.match(visible.json.report.html, /joshua/);
});
