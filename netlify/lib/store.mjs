/**
 * Data access layer.
 *
 * Two sources, merged:
 *   1. seed.mjs   — historical submissions migrated out of Jotform. Read-only,
 *                   version-controlled, ships with the function bundle.
 *   2. Netlify Blobs — everything submitted through this app from now on.
 *
 * A live blob always wins over a seed record with the same key, so an old
 * imported week can be corrected through the UI without touching seed.mjs.
 *
 * Blob key formats:
 *   `<department>/<period>`               most departments — one report a period
 *   `<department>/<period>/<submitter>`   per-person departments (see below)
 *
 * PER-PERSON DEPARTMENTS
 * Planning has two planners who each file their own end-of-week report (the
 * planning manager does not file one). A single key per period would let the
 * second planner's submission silently overwrite the first, so per-person
 * departments get a third path segment derived from the submitter's email.
 *
 * A per-person period is only COMPLETE once every expected submitter has
 * filed. `listPeriodStatus()` is what compliance should read — `listPeriods()`
 * only tells you a period has at least one report, which for Planning is not
 * the same thing as being done.
 */

import { getStore } from '@netlify/blobs';
import { seed } from './seed.mjs';
import { DEPARTMENTS, withDerived } from './schema.mjs';

const STORE_NAME = 'mmc-reports';

function store() {
  // Strong consistency: a department head who just submitted needs to see
  // their own report immediately, and management needs the compliance grid
  // to flip to green right away. Eventual consistency would show a
  // confusing "still missing" state for up to a minute after submitting.
  return getStore({ name: STORE_NAME, consistency: 'strong' });
}

/* ------------------------------------------------------------------ */
/* Per-person helpers                                                  */
/* ------------------------------------------------------------------ */

export function isPerPerson(department) {
  return Boolean(DEPARTMENTS[department]?.per_person);
}

/** Email -> a safe, stable path segment. The real email lives in the record. */
export function submitterSlug(email) {
  return String(email || 'unknown')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function blobKey(department, period, submitter) {
  if (isPerPerson(department) && submitter) {
    return `${department}/${period}/${submitterSlug(submitter)}`;
  }
  return `${department}/${period}`;
}

/** Split a blob key back into its parts. */
function parseKey(department, key) {
  const rest = key.slice(department.length + 1);
  const slash = rest.indexOf('/');
  if (slash === -1) return { period: rest, slug: null };
  return { period: rest.slice(0, slash), slug: rest.slice(slash + 1) };
}

/**
 * Who is expected to file for this department.
 *
 * An explicit list in the schema wins. If there isn't one, fall back to
 * everyone who has submitted before — so the roster configures itself from
 * real usage instead of silently expecting nobody.
 */
export async function expectedSubmitters(department) {
  const configured = DEPARTMENTS[department]?.expected_submitters;
  if (Array.isArray(configured) && configured.length) {
    return { submitters: configured.map((s) => s.toLowerCase()), source: 'configured' };
  }

  const seen = new Set();
  const { blobs } = await store().list({ prefix: `${department}/` });
  await Promise.all(blobs.map(async ({ key }) => {
    const record = await store().get(key, { type: 'json' });
    if (record?.submittedBy) seen.add(String(record.submittedBy).toLowerCase());
  }));

  return { submitters: [...seen], source: 'observed' };
}

/* ------------------------------------------------------------------ */

/** Normalise a stored record and attach derived values. */
function hydrate(record) {
  if (!record) return null;
  return {
    ...record,
    data: withDerived(record.department, record.data || {}),
  };
}

/** All seed records for a department, keyed by period. */
function seedFor(department) {
  return seed[department] || {};
}

/** A record's dedupe identity: period, plus submitter for per-person depts. */
function recordKey(record) {
  return isPerPerson(record.department)
    ? `${record.period}::${submitterSlug(record.submittedBy)}`
    : record.period;
}

/* ------------------------------------------------------------------ */
/* Reads                                                               */
/* ------------------------------------------------------------------ */

/**
 * Fetch one report. For a per-person department pass `submitter` to get that
 * person's report; omit it and you get the first one found for the period,
 * which is only meaningful for single-submitter departments.
 */
export async function getReport(department, period, submitter) {
  if (isPerPerson(department) && !submitter) {
    const all = await listReportsForPeriod(department, period);
    return all[0] || null;
  }

  const live = await store().get(blobKey(department, period, submitter), { type: 'json' });
  if (live) return hydrate(live);

  const fromSeed = seedFor(department)[period];
  return fromSeed ? hydrate({ ...fromSeed, department, period, source: 'jotform' }) : null;
}

/** Every report filed for one period. Length > 1 only for per-person depts. */
export async function listReportsForPeriod(department, period) {
  const out = [];
  const { blobs } = await store().list({ prefix: `${department}/${period}` });

  await Promise.all(blobs.map(async ({ key }) => {
    const { period: p } = parseKey(department, key);
    if (p !== period) return; // guard against prefix bleed, e.g. 2026-W3 vs 2026-W34
    const record = await store().get(key, { type: 'json' });
    if (record) out.push(hydrate(record));
  }));

  if (!out.length) {
    const fromSeed = seedFor(department)[period];
    if (fromSeed) out.push(hydrate({ ...fromSeed, department, period, source: 'jotform' }));
  }

  return out.sort((a, b) => String(a.submittedBy).localeCompare(String(b.submittedBy)));
}

/**
 * Fetch every report for a department, newest period first.
 * Merges seed + live. For per-person departments this returns one record per
 * person per period, not one per period.
 */
export async function listReports(department, { submitter } = {}) {
  const byKey = new Map();

  for (const [period, record] of Object.entries(seedFor(department))) {
    const full = { ...record, department, period, source: 'jotform' };
    byKey.set(recordKey(full), full);
  }

  const { blobs } = await store().list({ prefix: `${department}/` });
  await Promise.all(
    blobs.map(async ({ key }) => {
      const record = await store().get(key, { type: 'json' });
      if (record) byKey.set(recordKey(record), record);
    }),
  );

  let out = [...byKey.values()];

  if (submitter) {
    const want = submitterSlug(submitter);
    out = out.filter((r) => submitterSlug(r.submittedBy) === want);
  }

  return out
    .map(hydrate)
    .sort((a, b) => (a.period < b.period ? 1 : -1));
}

/** Just the period keys that exist for a department (cheap — no body reads). */
export async function listPeriods(department) {
  const periods = new Set(Object.keys(seedFor(department)));
  const { blobs } = await store().list({ prefix: `${department}/` });
  for (const { key } of blobs) {
    const { period } = parseKey(department, key);
    if (period) periods.add(period);
  }
  return periods;
}

/**
 * Per-period completeness. This is what compliance should use.
 *
 * For a normal department a period is complete once a report exists. For a
 * per-person department it is complete only when every expected submitter has
 * filed — one planner out of two is a half-finished week, not a green tick.
 */
export async function listPeriodStatus(department) {
  const perPerson = isPerPerson(department);
  const { submitters: expected } = perPerson
    ? await expectedSubmitters(department)
    : { submitters: [] };

  const byPeriod = new Map();

  for (const period of Object.keys(seedFor(department))) {
    byPeriod.set(period, { period, submitters: [], complete: !perPerson });
  }

  const { blobs } = await store().list({ prefix: `${department}/` });
  await Promise.all(blobs.map(async ({ key }) => {
    const record = await store().get(key, { type: 'json' });
    if (!record) return;
    const entry = byPeriod.get(record.period)
      || { period: record.period, submitters: [], complete: false };
    if (record.submittedBy) entry.submitters.push(String(record.submittedBy).toLowerCase());
    byPeriod.set(record.period, entry);
  }));

  for (const entry of byPeriod.values()) {
    if (!perPerson) {
      entry.complete = true;
      continue;
    }
    entry.expected = expected;
    entry.missing = expected.filter((e) => !entry.submitters.includes(e));
    entry.complete = expected.length > 0 && entry.missing.length === 0;
  }

  return byPeriod;
}

/* ------------------------------------------------------------------ */
/* Writes                                                              */
/* ------------------------------------------------------------------ */

/** Create or overwrite a report. */
export async function putReport({ department, period, data, user }) {
  const key = blobKey(department, period, user?.email);
  const existing = await store().get(key, { type: 'json' });

  const record = {
    department,
    period,
    data,
    submittedBy: existing?.submittedBy || user.email,
    submittedByName: existing?.submittedByName || user.name,
    submittedAt: existing?.submittedAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    updatedBy: user.email,
    source: 'app',
  };

  await store().setJSON(key, record);
  return hydrate(record);
}

export { DEPARTMENTS };
