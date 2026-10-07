import { createHash } from "node:crypto";
import { canSeeReport, findPerson, matchDepartment } from "./access.mjs";
import { formatPeriod, formatStamp } from "./dates.mjs";
import { buildBatchEmail, sendBatchEmail } from "./email.mjs";
import { labelForType } from "./types.mjs";
import { HttpError, slug } from "./util.mjs";

const HTML_MAX = 1_500_000;

function audiencePresent(value) {
  if (value == null || value === "") return false;
  if (typeof value === "string") return value.trim() !== "";
  if (Array.isArray(value)) return value.some((item) => String(item ?? "").trim());
  if (typeof value === "object") {
    return Boolean(
      value.scope ||
        (value.emails || []).length ||
        (value.departments || []).length ||
        (value.names || []).length,
    );
  }
  return false;
}

export function validateReport(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new HttpError(400, "Each report must be an object.");
  }
  const missing = ["batch_id", "type", "period", "title", "html"].filter(
    (key) => input[key] == null || String(input[key]).trim() === "",
  );
  if (!audiencePresent(input.audience)) missing.push("audience");
  if (missing.length) throw new HttpError(400, `Missing ${missing.join(", ")}.`);
  if (typeof input.html !== "string") throw new HttpError(400, "html must be a string.");
  if (input.html.length > HTML_MAX) throw new HttpError(413, "html is too large.");
  for (const key of ["batch_id", "type", "period", "title", "person", "department"]) {
    if (input[key] != null && typeof input[key] !== "string") {
      throw new HttpError(400, `${key} must be a string.`);
    }
  }
  if (input.title.length > 300) throw new HttpError(400, "title is too long.");
}

export function canonicalReport(input, org) {
  const personRaw = String(input.person || "").trim();
  const person = personRaw.includes("@") ? personRaw.toLowerCase() : personRaw;
  const dept = matchDepartment(input.department, org);
  const department = String(input.department || "").trim()
    ? dept
      ? dept.id
      : slug(input.department)
    : "";
  return {
    batch_id: String(input.batch_id).trim().toLowerCase(),
    type: slug(input.type),
    period: String(input.period).trim(),
    title: String(input.title).trim(),
    person,
    department,
    audience: input.audience,
    html: input.html,
  };
}

/** Same batch + type + period + person + department overwrites. */
export function naturalKey(report) {
  return [
    report.batch_id,
    report.type,
    report.period,
    String(report.person || "").toLowerCase(),
    report.department,
  ].join("\n");
}

export function reportIdFor(report) {
  return "rpt_" + createHash("sha256").update(naturalKey(report)).digest("hex").slice(0, 20);
}

export function personOptionId(person, org) {
  const raw = String(person || "").trim();
  if (!raw) return "";
  const found = findPerson(raw, org);
  if (found?.email) return found.email.toLowerCase();
  if (raw.includes("@")) return raw.toLowerCase();
  return `name:${slug(raw)}`;
}

export function presentReport(meta, org, types) {
  const dept = matchDepartment(meta.department, org);
  const person = findPerson(meta.person, org);
  const typeInfo = (types || []).find((type) => type.id === meta.type);
  const personName =
    person?.name || (meta.person && !String(meta.person).includes("@") ? meta.person : "");
  return {
    id: meta.id,
    batch_id: meta.batch_id,
    type: meta.type,
    type_label: typeInfo?.label || labelForType(meta.type, types),
    group: typeInfo?.group || (typeInfo ? "" : "Other"),
    cadence: typeInfo?.cadence || "",
    period: meta.period,
    period_label: formatPeriod(meta.period),
    title: meta.title,
    audience: meta.audience,
    department: meta.department || "",
    department_name: dept?.name || "",
    person: meta.person || "",
    person_name: personName,
    person_id: personOptionId(meta.person, org),
    created_at: meta.created_at,
    updated_at: meta.updated_at,
    updated_label: formatStamp(meta.updated_at),
  };
}

async function readIndex(store) {
  const data = await store.get("index:reports", { type: "json" });
  return Array.isArray(data) ? data : [];
}

export async function ingestReports(items, { store, org, now = () => new Date().toISOString() } = {}) {
  const list = Array.isArray(items) ? items : [items];
  if (!list.length) throw new HttpError(400, "Provide a report or an array of reports.");
  if (list.length > 200) throw new HttpError(400, "A batch can include at most 200 reports.");
  for (const item of list) validateReport(item);

  const results = [];
  for (const item of list) {
    const canon = canonicalReport(item, org);
    const id = reportIdFor(canon);
    const existing = await store.get(`report:${id}`, { type: "json" });
    const stamp = now();
    const meta = {
      id,
      batch_id: canon.batch_id,
      type: canon.type,
      period: canon.period,
      title: canon.title,
      audience: item.audience,
      department: canon.department,
      person: canon.person,
      created_at: existing?.created_at || stamp,
      updated_at: stamp,
    };
    await store.setJSON(`report:${id}`, meta);
    await store.set(`html:${id}`, item.html);

    const index = await readIndex(store);
    if (!index.includes(id)) {
      index.push(id);
      await store.setJSON("index:reports", index);
    }

    const batchKey = `batch:${encodeURIComponent(canon.batch_id)}`;
    const batch = (await store.get(batchKey, { type: "json" })) || {
      id: canon.batch_id,
      report_ids: [],
      created_at: stamp,
      completed_at: null,
    };
    if (!batch.report_ids.includes(id)) batch.report_ids.push(id);
    batch.updated_at = stamp;
    await store.setJSON(batchKey, batch);

    results.push({
      id,
      created: !existing,
      batch_id: canon.batch_id,
      type: canon.type,
      period: canon.period,
      person: canon.person,
      department: canon.department,
    });
  }
  return results;
}

export async function visibleMetas(store, user, org) {
  const index = await readIndex(store);
  const rows = [];
  for (const id of index) {
    const meta = await store.get(`report:${id}`, { type: "json" });
    if (!meta) continue;
    if (!canSeeReport(user, meta, org)) continue;
    rows.push(meta);
  }
  rows.sort((a, b) => {
    if (a.updated_at === b.updated_at) return String(a.title).localeCompare(String(b.title));
    return a.updated_at < b.updated_at ? 1 : -1;
  });
  return rows;
}

export function applyFilters(reports, filters = {}) {
  return reports.filter((report) => {
    if (filters.type && report.type !== filters.type) return false;
    if (filters.period && report.period !== filters.period) return false;
    if (filters.department && report.department !== filters.department) return false;
    if (filters.person && report.person_id !== filters.person) return false;
    if (filters.batch && report.batch_id !== filters.batch) return false;
    return true;
  });
}

export function buildOptions(reports, types, org) {
  const typeIds = new Set(reports.map((report) => report.type));
  const known = new Set((types || []).map((type) => type.id));
  const typeOptions = [
    ...(types || []).map((type) => ({
      id: type.id,
      label: type.label,
      group: type.group || "",
      cadence: type.cadence || "",
    })),
    ...[...typeIds]
      .filter((id) => !known.has(id))
      .sort()
      .map((id) => ({ id, label: labelForType(id, types), group: "Other", cadence: "" })),
  ];

  const periods = new Map();
  for (const report of reports) {
    if (report.period) periods.set(report.period, report.period_label);
  }
  const periodOptions = [...periods.entries()]
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([id, label]) => ({ id, label }));

  const deptOrder = (org?.departments || []).map((dept) => dept.id);
  const deptIds = [...new Set(reports.map((report) => report.department).filter(Boolean))];
  deptIds.sort((a, b) => {
    const ai = deptOrder.indexOf(a);
    const bi = deptOrder.indexOf(b);
    if (ai === -1 && bi === -1) return a.localeCompare(b);
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });
  const departmentOptions = deptIds.map((id) => {
    const dept = (org?.departments || []).find((item) => item.id === id);
    return { id, label: dept?.name || id };
  });

  const people = new Map();
  for (const report of reports) {
    if (!report.person_id) continue;
    people.set(report.person_id, report.person_name || report.person);
  }
  const peopleOptions = [...people.entries()]
    .map(([id, label]) => ({ id, label }))
    .sort((a, b) => a.label.localeCompare(b.label));

  const batches = new Map();
  for (const report of reports) {
    const prev = batches.get(report.batch_id);
    if (!prev || report.updated_at > prev) batches.set(report.batch_id, report.updated_at);
  }
  const batchOptions = [...batches.entries()]
    .sort((a, b) => (a[1] < b[1] ? 1 : -1))
    .map(([id]) => ({ id, label: id }));

  return {
    types: typeOptions,
    periods: periodOptions,
    departments: departmentOptions,
    people: peopleOptions,
    batches: batchOptions,
  };
}

export async function getReport({ store, user, org, types, id }) {
  const meta = await store.get(`report:${id}`, { type: "json" });
  if (!meta || !canSeeReport(user, meta, org)) return null;
  const html = (await store.get(`html:${id}`)) || "";
  return { ...presentReport(meta, org, types), html };
}

export async function getBatch({ store, user, org, types, id }) {
  const batch = await store.get(`batch:${encodeURIComponent(id)}`, { type: "json" });
  if (!batch) return null;
  const reports = [];
  for (const reportId of batch.report_ids || []) {
    const meta = await store.get(`report:${reportId}`, { type: "json" });
    if (!meta || !canSeeReport(user, meta, org)) continue;
    reports.push(presentReport(meta, org, types));
  }
  reports.sort((a, b) => String(a.title).localeCompare(String(b.title)));
  if (!reports.length) return null;
  return {
    id: batch.id,
    created_at: batch.created_at,
    updated_at: batch.updated_at,
    updated_label: formatStamp(batch.updated_at),
    completed_at: batch.completed_at,
    completed_label: batch.completed_at ? formatStamp(batch.completed_at) : "",
    reports,
  };
}

export async function completeBatch({ store, org, types, id, origin, now = () => new Date().toISOString() }) {
  const key = `batch:${encodeURIComponent(String(id || "").trim().toLowerCase())}`;
  const batch = await store.get(key, { type: "json" });
  if (!batch) throw new HttpError(404, "No batch with that id.");
  if (!batch.completed_at) {
    const stamp = now();
    batch.completed_at = stamp;
    batch.updated_at = stamp;
    await store.setJSON(key, batch);
  }
  const reports = [];
  for (const reportId of batch.report_ids || []) {
    const meta = await store.get(`report:${reportId}`, { type: "json" });
    if (!meta) continue;
    const view = presentReport(meta, org, types);
    reports.push({ ...view, url: `${origin}/report/${meta.id}` });
  }
  reports.sort((a, b) => String(a.title).localeCompare(String(b.title)));
  const email = buildBatchEmail({ batch, reports, origin });
  const delivery = sendBatchEmail(email);
  return {
    ok: true,
    batch_id: batch.id,
    url: `${origin}/batch/${encodeURIComponent(batch.id)}`,
    completed_at: batch.completed_at,
    reports: reports.map(({ audience, ...rest }) => rest),
    email,
    delivery,
  };
}
